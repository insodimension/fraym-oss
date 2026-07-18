// `eval` tool renderer — a notebook card for the persistent py/js kernel.
//
// Engine's EvalTool (engine .../tools/eval.ts) runs ordered cells and returns a rich
// EvalToolDetails (engine .../eval/types.ts): `cells[]` (code + per-cell text output
// + status/duration/exitCode + a `hasMarkdown` flag + per-cell `statusEvents[]`)
// plus aggregate `jsonOutputs[]` (display() data), `images[]` (base64 figures),
// top-level `statusEvents[]`, an optional `notice`, and `meta.truncation`. The
// TUI eval renderer (engine .../tools/eval-render.ts → evalToolRenderer) renders a
// cell stack with a per-cell "Status" tree of prelude operations + an `agent()`
// subagent-progress tree, the captured JSON outputs as a tree, and figures.
//
// This card mirrors that ground truth: cell stack (code + output/markdown +
// status/duration/exit), the Status operation tree, the agent() progress tree,
// JSON display() outputs (DataInspectorBody), inline figures, and truncation —
// and streams while running via the generic partial-output pipeline.
// Registered for `eval` in default-tool-renderers. See docs/design/tools/eval.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import { PlainCodeBlock } from "../../../elements/plain-code-block";
import { StreamingMarkdown } from "../../../elements/streaming-markdown";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { Icon, type IconName } from "../../../icons";
import { asText, readField, readStringField, toTermLines } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { DataInspectorBody } from "./data-inspector-body";
import { ImageBlock } from "../../message/messages/image-block";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { BashTruncationNote } from "./bodies/bash-body";

const EVAL_BODY_MAX_HEIGHT = 240;

// --- defensive shapes (decoded from Engine's EvalToolDetails; no Engine coupling) ---

interface EvalStatusEvent {
	readonly op: string;
	readonly [key: string]: unknown;
}

interface EvalCell {
	readonly index?: number | undefined;
	readonly title?: string | undefined;
	readonly code?: string | undefined;
	readonly language?: string | undefined;
	readonly output?: string | undefined;
	readonly status?: string | undefined;
	readonly durationMs?: number | undefined;
	readonly exitCode?: number | undefined;
	readonly hasMarkdown?: boolean | undefined;
	readonly statusEvents?: readonly EvalStatusEvent[] | undefined;
}

interface EvalImage {
	readonly data: string;
	readonly mimeType: string;
}

interface EvalDetails {
	readonly cells: readonly EvalCell[];
	readonly images: readonly EvalImage[];
	readonly jsonOutputs: readonly unknown[];
	readonly statusEvents: readonly EvalStatusEvent[];
	readonly notice?: string | undefined;
	readonly truncated: boolean;
	readonly artifact?: string | undefined;
	readonly isError: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readStatusEvents(raw: unknown): EvalStatusEvent[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap(item => {
		const rec = asRecord(item);
		return rec && typeof rec.op === "string" ? [rec as EvalStatusEvent] : [];
	});
}

function readCells(details: unknown): EvalCell[] {
	const cells = readField(details, "cells");
	if (!Array.isArray(cells)) return [];
	return cells.map(raw => {
		const cell = asRecord(raw) ?? {};
		return {
			index: typeof cell.index === "number" ? cell.index : undefined,
			title: typeof cell.title === "string" ? cell.title : undefined,
			code: typeof cell.code === "string" ? cell.code : undefined,
			language: typeof cell.language === "string" ? cell.language : undefined,
			output: typeof cell.output === "string" ? cell.output : undefined,
			status: typeof cell.status === "string" ? cell.status : undefined,
			durationMs: typeof cell.durationMs === "number" ? cell.durationMs : undefined,
			exitCode: typeof cell.exitCode === "number" ? cell.exitCode : undefined,
			hasMarkdown: cell.hasMarkdown === true,
			statusEvents: readStatusEvents(cell.statusEvents),
		};
	});
}

function readImages(details: unknown): EvalImage[] {
	const images = readField(details, "images");
	if (!Array.isArray(images)) return [];
	return images.flatMap(raw => {
		const image = asRecord(raw);
		const data = image?.data;
		const mimeType = image?.mimeType;
		return typeof data === "string" && typeof mimeType === "string" ? [{ data, mimeType }] : [];
	});
}

function readEvalDetails(call: ActiveToolCall): EvalDetails {
	const details = readField(call.output, "details");
	const truncation = readField(readField(details, "meta"), "truncation");
	const truncated = truncation != null && truncation !== false;
	const artifactId = readStringField(truncation, "artifactId");
	const jsonOutputs = readField(details, "jsonOutputs");
	return {
		cells: readCells(details),
		images: readImages(details),
		jsonOutputs: Array.isArray(jsonOutputs) ? jsonOutputs : [],
		statusEvents: readStatusEvents(readField(details, "statusEvents")),
		notice: readStringField(details, "notice"),
		truncated,
		artifact: artifactId ? `artifact://${artifactId}` : undefined,
		isError: readField(details, "isError") === true,
	};
}

// --- presentation -----------------------------------------------------------

const LANGUAGE_LABEL: Readonly<Record<string, string>> = { python: "Python", py: "Python", js: "JavaScript" };

function languageLabel(language: string | undefined): string {
	return language ? (LANGUAGE_LABEL[language] ?? language) : "code";
}

function formatDuration(durationMs: number | undefined): string | undefined {
	if (durationMs == null) return undefined;
	return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)}s` : `${Math.round(durationMs)}ms`;
}

function formatCount(value: number): string {
	return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
}

function cellStatusTone(status: string | undefined): "add" | "blue" | "del" | "mute" {
	if (status === "error") return "del";
	if (status === "running") return "blue";
	if (status === "complete") return "add";
	return "mute";
}

// --- status-event tree (prelude operations: file / folder / git / package) ---

const STATUS_OP_ICON: Readonly<Record<string, IconName>> = {
	read: "file",
	write: "file",
	append: "file",
	cat: "file",
	touch: "file",
	head: "file",
	tail: "file",
	wc: "file",
	ls: "folder",
	cd: "folder",
	pwd: "folder",
	mkdir: "folder",
	tree: "folder",
	git_status: "branch",
	git_diff: "branch",
	git_log: "branch",
	git_show: "branch",
	git_branch: "branch",
	git_file_at: "branch",
	git_has_changes: "branch",
	diff: "diff",
	env: "envbox",
	run: "terminal",
	sh: "terminal",
	batch: "archive",
	llm: "spark",
	log: "terminal",
	phase: "bolt",
};

function statusOpIcon(op: string): IconName {
	return STATUS_OP_ICON[op] ?? "code";
}

function shortPath(value: unknown): string {
	const parts = String(value).split(/[/\\]/);
	return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : String(value);
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Mirror of the TUI `formatStatusEvent` description (the `op`-specific summary). */
function readWriteDesc(event: EvalStatusEvent, preposition: "from" | "to"): string {
	return `${num(event.chars ?? event.bytes)} chars${event.path ? ` ${preposition} ${shortPath(event.path)}` : ""}`;
}

function envDesc(event: EvalStatusEvent): string {
	if (event.action === "set") return `set ${event.key}=${String(event.value ?? "")}`;
	if (event.action === "get") return `${event.key}=${String(event.value ?? "")}`;
	return `${num(event.count)} variables`;
}

function gitStatusDesc(event: EvalStatusEvent): string {
	if (event.clean) return event.branch ? `clean · on ${event.branch}` : "clean";
	const parts: string[] = [];
	if (event.staged) parts.push(`${event.staged} staged`);
	if (event.modified) parts.push(`${event.modified} modified`);
	if (event.untracked) parts.push(`${event.untracked} untracked`);
	return `${parts.join(", ") || "unknown"}${event.branch ? ` · on ${event.branch}` : ""}`;
}

function llmDesc(event: EvalStatusEvent): string {
	return [event.model, event.tier && event.tier !== event.model ? `(${event.tier})` : "", `${num(event.chars)} chars`]
		.filter(Boolean)
		.join(" ");
}

function pathOnlyDesc(event: EvalStatusEvent): string {
	return event.path ? shortPath(event.path) : "";
}

function defaultStatusDesc(event: EvalStatusEvent): string {
	return [event.count != null ? String(event.count) : "", event.path ? shortPath(event.path) : ""]
		.filter(Boolean)
		.join(" · ");
}

const STATUS_EVENT_DESC: Readonly<Record<string, (event: EvalStatusEvent) => string>> = {
	read: event => readWriteDesc(event, "from"),
	write: event => readWriteDesc(event, "to"),
	append: event => readWriteDesc(event, "to"),
	cat: event => `${num(event.files)} files · ${num(event.chars)} chars`,
	ls: event => `${num(event.count)} entries`,
	env: envDesc,
	git_status: gitStatusDesc,
	git_log: event => `${num(event.commits)} commits`,
	git_diff: event => `${num(event.lines)} lines${event.staged ? " (staged)" : ""}`,
	diff: event => (event.identical ? "files identical" : "files differ"),
	batch: event => `${num(event.files)} files processed`,
	llm: llmDesc,
	wc: event => `${num(event.lines)}L ${num(event.words)}W ${num(event.chars)}C`,
	cd: pathOnlyDesc,
	pwd: pathOnlyDesc,
	mkdir: pathOnlyDesc,
	touch: pathOnlyDesc,
	log: event => String(event.message ?? ""),
	phase: event => String(event.title ?? ""),
};

function statusEventDesc(event: EvalStatusEvent): string {
	return STATUS_EVENT_DESC[event.op]?.(event) ?? defaultStatusDesc(event);
}

function StatusEventRow({ event }: { readonly event: EvalStatusEvent }) {
	const error = event.error != null;
	const desc = error ? String(event.error) : statusEventDesc(event);
	return (
		<div className="flex items-center gap-1.5 text-fr-2xs leading-5">
			<Icon name={statusOpIcon(event.op)} size={11} className="shrink-0 text-fr-text-3" />
			<span className={error ? "text-fr-warn" : "text-fr-text-2"}>{event.op}</span>
			{desc ? <span className="min-w-0 fr-overflow text-fr-text-3">{desc}</span> : null}
		</div>
	);
}

const STATUS_TREE_MAX = 8;

function EvalStatusTree({ events }: { readonly events: readonly EvalStatusEvent[] }) {
	if (events.length === 0) return null;
	const shown = events.slice(0, STATUS_TREE_MAX);
	const hidden = events.length - shown.length;
	return (
		<div className="mt-1.5 flex flex-col gap-0.5 border-l border-fr-border-soft pl-2">
			<span className="text-fr-2xs text-fr-text-3">Status</span>
			{shown.map((event, index) => (
				<StatusEventRow key={`${event.op}:${index}`} event={event} />
			))}
			{hidden > 0 ? <span className="text-fr-2xs text-fr-text-3">… {hidden} more</span> : null}
		</div>
	);
}

// --- agent() progress tree (eval-spawned subagents) -------------------------

function agentGlyph(status: string): { readonly glyph: string; readonly tone: string } {
	if (status === "completed") return { glyph: "✓", tone: "text-fr-add" };
	if (status === "failed" || status === "aborted") return { glyph: "✕", tone: "text-fr-del" };
	if (status === "pending") return { glyph: "○", tone: "text-fr-text-3" };
	return { glyph: "●", tone: "text-fr-blue" };
}

function agentStats(event: EvalStatusEvent): string {
	const parts: string[] = [];
	const toolCount = num(event.toolCount);
	if (toolCount > 0) parts.push(`${formatCount(toolCount)} tools`);
	const contextTokens = num(event.contextTokens);
	if (contextTokens > 0) {
		const window = num(event.contextWindow);
		parts.push(window > 0 ? `${Math.round((contextTokens / window) * 100)}%` : formatCount(contextTokens));
	}
	const cost = num(event.cost);
	if (cost > 0) parts.push(`$${cost.toFixed(2)}`);
	if (typeof event.model === "string") parts.push(event.model.split("/").at(-1) ?? event.model);
	return parts.join(" · ");
}

function AgentProgressRow({ event }: { readonly event: EvalStatusEvent }) {
	const status = typeof event.status === "string" ? event.status : "running";
	const { glyph, tone } = agentGlyph(status);
	const id = typeof event.id === "string" ? event.id : "agent";
	const stats = agentStats(event);
	const intent = typeof event.lastIntent === "string" ? event.lastIntent : undefined;
	const tool = typeof event.currentTool === "string" ? event.currentTool : undefined;
	const detail = status === "running" ? (tool ? `${tool}${intent ? `: ${intent}` : ""}` : intent) : undefined;
	const duration = status !== "running" ? formatDuration(num(event.durationMs) || undefined) : undefined;
	return (
		<div className="flex flex-col gap-0.5">
			<div className="flex items-center gap-1.5 text-fr-2xs leading-5">
				<span className={`shrink-0 ${tone}`}>{glyph}</span>
				<span className="font-primary text-fr-text">{id}</span>
				{stats ? <span className="min-w-0 fr-overflow text-fr-text-3">{stats}</span> : null}
				{duration ? <span className="text-fr-text-3">{duration}</span> : null}
			</div>
			{detail ? <div className="fr-overflow pl-4 text-fr-2xs text-fr-text-3">↳ {detail}</div> : null}
		</div>
	);
}

function EvalAgentTree({ events }: { readonly events: readonly EvalStatusEvent[] }) {
	if (events.length === 0) return null;
	return (
		<div className="mt-1.5 flex flex-col gap-1 border-l border-fr-accent/40 pl-2">
			<span className="text-fr-2xs text-fr-text-3">Subagents</span>
			{events.map((event, index) => (
				<AgentProgressRow key={`${typeof event.id === "string" ? event.id : "agent"}:${index}`} event={event} />
			))}
		</div>
	);
}

function splitCellEvents(cell: EvalCell): {
	readonly status: readonly EvalStatusEvent[];
	readonly agents: readonly EvalStatusEvent[];
} {
	const all = cell.statusEvents ?? [];
	const agents = all.filter(event => event.op === "agent");
	const status = agents.length > 0 ? all.filter(event => event.op !== "agent") : all;
	return { status, agents };
}

function cellOutput(cell: EvalCell): ReactNode {
	if (!cell.output) return null;
	if (cell.hasMarkdown && cell.status !== "error") {
		return (
			<div className="mt-1 font-primary text-fr-sm text-fr-text-2">
				<StreamingMarkdown text={cell.output} />
			</div>
		);
	}
	return (
		<div className="mt-1">
			<ToolBodyTerm lines={toTermLines(cell.output)} />
		</div>
	);
}

function CellHeader({ cell, position }: { readonly cell: EvalCell; readonly position: number }) {
	const duration = formatDuration(cell.durationMs);
	const title = cell.title ?? `Cell ${cell.index != null ? cell.index + 1 : position}`;
	return (
		<div className="flex items-center gap-2 text-fr-xs text-fr-text-3">
			<Badge tone="mute" variant="code">
				{languageLabel(cell.language)}
			</Badge>
			<span className="fr-overflow text-fr-text-2">{title}</span>
			<span className="ml-auto flex items-center gap-2">
				{cell.exitCode != null && cell.exitCode !== 0 ? (
					<Badge tone="del" variant="code">
						exit {cell.exitCode}
					</Badge>
				) : null}
				{duration ? <span>{duration}</span> : null}
				<Badge tone={cellStatusTone(cell.status)} variant="code">
					{cell.status ?? "pending"}
				</Badge>
			</span>
		</div>
	);
}

function EvalCellView({ cell, position }: { readonly cell: EvalCell; readonly position: number }) {
	const { status, agents } = splitCellEvents(cell);
	return (
		<div className="rounded-[8px] border border-fr-border-soft bg-fr-surface px-2.5 py-2">
			<CellHeader cell={cell} position={position} />
			{cell.code ? (
				<PlainCodeBlock
					code={cell.code}
					lineNumbers
					className="mt-1.5 max-h-[220px] rounded-[6px] bg-fr-surface-2 px-2 py-1.5"
				/>
			) : null}
			{cellOutput(cell)}
			<EvalStatusTree events={status} />
			<EvalAgentTree events={agents} />
		</div>
	);
}

function EvalFigures({ images }: { readonly images: readonly EvalImage[] }) {
	if (images.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2">
			{images.map((image, index) => (
				<ImageBlock
					key={index}
					src={`data:${image.mimeType};base64,${image.data}`}
					alt={`eval figure ${index + 1}`}
					maxHeight={240}
				/>
			))}
		</div>
	);
}

function EvalJsonOutputs({ outputs }: { readonly outputs: readonly unknown[] }) {
	if (outputs.length === 0) return null;
	const labeled = outputs.length > 1;
	return (
		<div className="flex flex-col gap-1 rounded-[8px] border border-fr-border-soft bg-fr-surface px-2.5 py-2">
			<span className="text-fr-2xs text-fr-text-3">display()</span>
			{outputs.map((value, index) => (
				<DataInspectorBody key={index} value={value} label={labeled ? `display[${index + 1}]` : undefined} />
			))}
		</div>
	);
}

function EvalNotebookBody({ details }: { readonly details: EvalDetails }) {
	return (
		<div className="flex flex-col gap-2">
			{details.notice ? <div className="text-fr-xs text-fr-text-3">{details.notice}</div> : null}
			{details.cells.map((cell, index) => (
				<EvalCellView key={cell.index ?? index} cell={cell} position={index + 1} />
			))}
			<EvalJsonOutputs outputs={details.jsonOutputs} />
			<EvalFigures images={details.images} />
				{details.truncated ? <BashTruncationNote {...(details.artifact === undefined ? {} : { artifact: details.artifact })} /> : null}
		</div>
	);
}

function evalStatus(call: ActiveToolCall, details: EvalDetails): ToolStatus {
	if (call.status === "running") return "pending";
	if (call.status === "error" || details.isError) return "error";
	return "success";
}

function evalStat(details: EvalDetails): string | undefined {
	const count = details.cells.length;
	if (count === 0) return undefined;
	const parts = [`${count} cell${count === 1 ? "" : "s"}`];
	if (details.images.length > 0)
		parts.push(`${details.images.length} figure${details.images.length === 1 ? "" : "s"}`);
	if (details.jsonOutputs.length > 0)
		parts.push(`${details.jsonOutputs.length} output${details.jsonOutputs.length === 1 ? "" : "s"}`);
	return parts.join(" · ");
}

// Fallback when the transport gives no structured cell details (e.g. an old
// snapshot): show the combined text in a term surface, plus any top-level
// status events / JSON outputs / truncation that did come through.
function evalFallbackBody(call: ActiveToolCall, details: EvalDetails, streaming = false): ReactNode {
	const text = call.text ?? asText(call.output) ?? "";
	const hasExtras = details.statusEvents.length > 0 || details.jsonOutputs.length > 0 || details.truncated;
	if (!text && !hasExtras) {
		// While still running with nothing yet, render no body (the head shows "running…");
		// the card fills as cells/output stream in.
		return streaming ? null : <div className="px-1 py-2 text-fr-xs text-fr-text-3">No output.</div>;
	}
	const agents = details.statusEvents.filter(event => event.op === "agent");
	const status = agents.length > 0 ? details.statusEvents.filter(event => event.op !== "agent") : details.statusEvents;
	return (
		<div className="flex flex-col gap-2">
			{text ? <ToolBodyTerm lines={toTermLines(text)} /> : null}
			<EvalStatusTree events={status} />
			<EvalAgentTree events={agents} />
			<EvalJsonOutputs outputs={details.jsonOutputs} />
			<EvalFigures images={details.images} />
				{details.truncated ? <BashTruncationNote {...(details.artifact === undefined ? {} : { artifact: details.artifact })} /> : null}
		</div>
	);
}

const renderEval: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readEvalDetails(call);
	const streaming = call.status === "running";
	// Args phase (TUI parity): before the first partial result lands, the cell
	// code is already streaming in via `call.input` (the generic partialInput
	// pipeline) — render it as a pending cell instead of an empty card.
	const input = asRecord(call.input);
	const inputCode = typeof input?.code === "string" ? input.code : undefined;
	const cells =
		details.cells.length === 0 && streaming && inputCode
			? [
					{
						index: 0,
						code: inputCode,
						language: typeof input?.language === "string" ? input.language : undefined,
						title: typeof input?.title === "string" ? input.title : undefined,
						status: "running",
					} satisfies EvalCell,
				]
			: details.cells;
	const shown: EvalDetails = cells === details.cells ? details : { ...details, cells };
	const hasCells = shown.cells.length > 0;

	// Cells + output stream live into the notebook body while running (tail-following),
	// matching the TUI — not hidden until the tool finishes.
	const body = hasCells ? <EvalNotebookBody details={shown} /> : evalFallbackBody(call, shown, streaming);

	return {
		label: "Eval",
		kind: "command",
		status: evalStatus(call, details),
		stat: streaming ? "running…" : evalStat(details),
		body: body ? (
			<ToolBodySection maxHeight={EVAL_BODY_MAX_HEIGHT} followTail={streaming} tailKey={call.output}>
				{body}
			</ToolBodySection>
		) : null,
	};
};

export { renderEval };

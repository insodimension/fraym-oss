// SubagentBatchCard — renders a parallel `task`-tool dispatch as a first-class
// surface: a header with live aggregate stats + a progress bar, the shared
// context, and N `SubagentRun` rows. Each row shows the agent's live intent, a
// context-budget gauge, tool/token/cost meta, and a status badge; the running
// agent is highlighted with an accent rail.
//
// Mirrors Engine's TUI swarm view (`task/render.ts`) on the data the session-driver
// now carries (`SubagentBatch`/`SubagentRun`). Presentational components consume
// the driver types directly — the same idiom as `TaskBreakdown` taking `TaskPhase[]`.

import type {
	SubagentBatch,
	SubagentBatchStatus,
	SubagentReview,
	SubagentReviewFinding,
	SubagentRun,
	SubagentStatus,
} from "@fraym/driver";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../elements/badge";
import { RollingNumber } from "../../elements/rolling-number";
import { Spinner } from "../../elements/spinner";
import { taskCallToBatch } from "../../hooks/session-task-batch";
import type { ActiveToolCall } from "../../hooks/session-types";
import { useSubagentBatches } from "../../hooks/use-session";
import { useTaskBatches } from "../../hooks/use-task-batches";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { type ComposerControlTone, type FraymDensity, type FraymSurfaceConfig, resolveDensity } from "../surface-kit";

// Re-export the contract shapes so consumers can build view-models from "@fraym/ui"
// without reaching into "@fraym/driver" directly.
export type {
	SubagentBatch,
	SubagentBatchStatus,
	SubagentReview,
	SubagentReviewFinding,
	SubagentRun,
	SubagentStatus,
} from "@fraym/driver";

// --- formatting -------------------------------------------------------------

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(n);
}

function formatDuration(ms: number): string {
	if (ms <= 0) return "";
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) {
		const rem = s % 60;
		return rem ? `${m}m ${rem}s` : `${m}m`;
	}
	return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function splitIntent(intent: string): { readonly verb?: string; readonly rest: string } {
	const colon = intent.indexOf(":");
	if (colon <= 0) return { rest: intent };
	return { verb: intent.slice(0, colon), rest: intent.slice(colon + 1).trim() };
}

function firstSentence(text: string): string {
	const flat = text
		.replace(/\t/g, "  ")
		.replace(/[\r\n]+/g, " ")
		.trim();
	const end = flat.search(/[.!?]/);
	const sentence = end >= 0 ? flat.slice(0, end + 1) : flat;
	return sentence.length > 120 ? `${sentence.slice(0, 117)}...` : sentence;
}

const PRIORITY_ORD: Record<SubagentReviewFinding["priority"], number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function findingTone(priority: SubagentReviewFinding["priority"]): "del" | "warn" | "blue" | "mute" {
	if (priority === "P0") return "del";
	if (priority === "P1") return "warn";
	if (priority === "P2") return "blue";
	return "mute";
}

function stripPriorityPrefix(title: string): string {
	return title.replace(/^\[P\d\]\s*/, "");
}

function baseName(filePath: string): string {
	const parts = filePath.split(/[/\\]/);
	return parts[parts.length - 1] || filePath;
}

// --- status tone / glyph ----------------------------------------------------

function barToneClass(tone: ComposerControlTone): string {
	if (tone === "del") return "bg-fr-del";
	if (tone === "warn") return "bg-fr-warn";
	if (tone === "blue") return "bg-fr-blue";
	if (tone === "add") return "bg-fr-add";
	return "bg-fr-accent";
}

// --- budget meter -----------------------------------------------------------

/** The `<ctx>/<window>` gauge from the TUI: a thin fill + a mono `40K/200K` label. */
function BudgetMeter({ used, total }: { readonly used?: number; readonly total?: number }) {
	if (used == null || !total) return null;
	const pct = Math.max(0, Math.min(1, used / total));
	const tone: ComposerControlTone = pct >= 0.85 ? "del" : pct >= 0.65 ? "warn" : "accent";
	return (
		<span data-slot="subagent-budget" className="inline-flex items-center gap-1.5">
			<span className="relative h-1 w-14 overflow-hidden rounded-full bg-fr-surface-3">
				<span
					className={cn(
						"absolute inset-y-0 left-0 rounded-full transition-[width] duration-300",
						barToneClass(tone),
					)}
					style={{ width: `${pct * 100}%` }}
				/>
			</span>
			<span className="font-secondary text-fr-2xs tabular-nums text-fr-text-3">
				{formatTokens(used)}/{formatTokens(total)}
			</span>
		</span>
	);
}

// --- run row ----------------------------------------------------------------

function RunGlyph({
	status,
	runningGlyph = "ring",
}: {
	readonly status: SubagentStatus;
	readonly runningGlyph?: "ring" | "dots";
}) {
	// In-flight agents get the live loader. In `dots` mode (the swarm card) a
	// *pending* run is a dispatched background agent that is genuinely working, so
	// it also shows the orbiting dot-matrix (Engine's TUI "Working…" spinner) instead
	// of reading as inert. The `ring` variant keeps the static pending dot.
	const inFlight = status === "running" || (status === "pending" && runningGlyph === "dots");
	if (inFlight) {
		if (runningGlyph === "dots") return <Spinner kind="dots" size="xs" className="shrink-0" />;
		return (
			<span
				aria-hidden
				className="block size-2 shrink-0 animate-[fr-breathe_1.6s_infinite] rounded-full bg-fr-blue shadow-[0_0_0_3px_color-mix(in_srgb,var(--fr-blue),transparent_80%)]"
			/>
		);
	}
	return (
		<span
			aria-hidden
			className={cn(
				"block size-2 shrink-0 rounded-full",
				status === "completed" && "bg-fr-add",
				(status === "failed" || status === "aborted") && "bg-fr-del",
				status === "pending" && "bg-fr-text-3",
			)}
		/>
	);
}

// --- live stats (rolling tokens / cost / elapsed time) ----------------------

/** Split a token count into a rolling magnitude + unit suffix, matching `formatTokens`. */
function tokenParts(n: number): { readonly value: number; readonly decimals: number; readonly suffix: string } {
	if (n >= 1_000_000) return { value: n / 1_000_000, decimals: n >= 10_000_000 ? 0 : 1, suffix: "M" };
	if (n >= 1_000) return { value: n / 1_000, decimals: 0, suffix: "K" };
	return { value: n, decimals: 0, suffix: "" };
}

/** Billed-token stat with an odometer roll (e.g. 86K → 87K as updates stream). */
function StatTokens({ value, animate }: { readonly value: number; readonly animate: boolean }) {
	const parts = tokenParts(value);
	return <RollingNumber value={parts.value} decimals={parts.decimals} suffix={parts.suffix} animate={animate} />;
}

/** Cost stat with a `$` prefix and two rolling decimal reels. */
function StatCost({ value, animate }: { readonly value: number; readonly animate: boolean }) {
	return <RollingNumber value={value} decimals={2} prefix="$" animate={animate} />;
}

/** Wall-time stat with a clock glyph; ticks live while running (see `useElapsedClock`). */
function StatDuration({ ms }: { readonly ms: number }) {
	if (ms <= 0) return null;
	return (
		<span className="inline-flex items-center gap-1 tabular-nums">
			<Icon name="clock" size={11} className="shrink-0" />
			{formatDuration(ms)}
		</span>
	);
}

/** A 1-second live clock for an in-flight run/batch. Anchors to `now − baseMs` the
 *  first time it goes active so the displayed elapsed continues from the engine's
 *  reported `durationMs`, then advances each second until the work resolves. */
function useElapsedClock(active: boolean, baseMs: number): number {
	const anchorRef = useRef<number | null>(null);
	const [, tick] = useState(0);
	if (active) {
		if (anchorRef.current == null) anchorRef.current = Date.now() - Math.max(0, baseMs);
	} else {
		anchorRef.current = null;
	}
	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => tick(t => t + 1), 1000);
		return () => clearInterval(id);
	}, [active]);
	return active && anchorRef.current != null ? Date.now() - anchorRef.current : baseMs;
}

function shortModel(model: string): string {
	const slash = model.lastIndexOf("/");
	return slash >= 0 ? model.slice(slash + 1) : model;
}

/**
 * Per-run model tag. When the run's model differs from its spawning parent's, it is
 * tinted and branch-marked — the visible lineage signal (e.g. a planner escalated
 * onto a bigger model than the agent that spawned it).
 */
function ModelChip({ model, parentModel }: { readonly model?: string; readonly parentModel?: string }) {
	if (!model) return null;
	const switched = parentModel != null && parentModel !== model;
	return (
		<span
			data-slot="subagent-model"
			data-switched={switched || undefined}
			title={switched ? `${model} — switched from parent's ${parentModel}` : model}
			className={cn(
				"inline-flex min-w-0 items-center gap-1 rounded-[5px] px-1.5 py-px font-secondary text-fr-2xs",
				switched ? "bg-fr-accent-dim text-fr-accent" : "text-fr-text-3",
			)}
		>
			{switched && <Icon name="branch" size={9} className="shrink-0" />}
			<span className="fr-overflow">{shortModel(model)}</span>
		</span>
	);
}

export interface SubagentRunRowProps {
	readonly run: SubagentRun;
	/** Nesting depth — 0 for a top-level run, incremented for each spawned generation. */
	readonly depth?: number;
	/** The spawning run's resolved model; lets a child flag a model switch (lineage). */
	readonly parentModel?: string;
	/** Shared (batch/parent) agent persona; the row shows its own `@agent` only when it differs. */
	readonly sharedAgent?: string;
	readonly className?: string;
	/** Running indicator: the classic ring spinner, or the circling dot matrix. */
	readonly runningGlyph?: "ring" | "dots";
	/** Density inherited from the batch card; restructures the row. */
	readonly density?: FraymDensity;
}

interface RunRenderState {
	readonly density: ReturnType<typeof resolveDensity>;
	readonly running: boolean;
	readonly failed: boolean;
	readonly title: string;
	readonly intent: ReturnType<typeof splitIntent> | null;
	readonly showAgent: boolean;
	readonly rowPad: string;
	readonly titleSize: string;
}

interface SubagentRunViewProps {
	readonly run: SubagentRun;
	readonly depth: number;
	readonly parentModel?: string;
	readonly sharedAgent?: string;
	readonly className?: string;
	readonly runningGlyph: "ring" | "dots";
	readonly density: FraymDensity;
	readonly state: RunRenderState;
}

function runRowPad(d: ReturnType<typeof resolveDensity>): string {
	if (d.isCompact) return "px-2 py-1.5";
	if (d.isSpacious) return "px-4 py-3";
	return "px-2.5 py-1.5";
}

function runTitleSize(d: ReturnType<typeof resolveDensity>): string {
	if (d.isSpacious) return "text-fr-base";
	if (d.isCompact) return "text-fr-xs";
	return "text-fr-sm";
}

function getRunRenderState(run: SubagentRun, density: FraymDensity, sharedAgent?: string): RunRenderState {
	const d = resolveDensity(density);
	return {
		density: d,
		running: run.status === "running",
		failed: run.status === "failed" || run.status === "aborted",
		title: run.description ?? run.id ?? run.task,
		intent: run.status === "running" && run.lastIntent ? splitIntent(run.lastIntent) : null,
		showAgent: sharedAgent != null && run.agent !== sharedAgent,
		rowPad: runRowPad(d),
		titleSize: runTitleSize(d),
	};
}

export function SubagentRunRow({
	run,
	depth = 0,
	parentModel,
	sharedAgent,
	className,
	runningGlyph = "ring",
	density = "comfortable",
}: SubagentRunRowProps) {
	const state = getRunRenderState(run, density, sharedAgent);
	const props = { run, depth, parentModel, sharedAgent, className, runningGlyph, density, state };
	return state.density.isCompact ? <CompactSubagentRunRow {...props} /> : <ExpandedSubagentRunRow {...props} />;
}

function CompactSubagentRunRow(props: SubagentRunViewProps) {
	return (
		<div data-slot="subagent-node" data-depth={props.depth} className="min-w-0">
			<CompactSubagentRunLine {...props} />
			<SubagentChildRows {...props} compact />
		</div>
	);
}

function CompactSubagentRunLine({ run, className, runningGlyph, state }: SubagentRunViewProps) {
	const animate = run.status === "running";
	const elapsed = useElapsedClock(animate, run.durationMs);
	return (
		<div
			data-slot="subagent-run"
			data-status={run.status}
			className={cn(
				"min-w-0 rounded-[6px] px-2 py-1 text-fr-xs transition-colors",
				state.running ? "bg-fr-bg" : "hover:bg-fr-surface/60",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<span className="flex shrink-0 items-center justify-center" title={run.status}>
					<RunGlyph status={run.status} runningGlyph={runningGlyph} />
				</span>
				<RunIndex index={run.index} />
				<span className="min-w-0 flex-1 fr-overflow font-medium text-fr-text">{state.title}</span>
				{state.showAgent && (
					<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">@{run.agent}</span>
				)}
				<span className="flex shrink-0 items-center gap-1.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
					<span>{run.toolCount}t</span>
					<span aria-hidden>·</span>
					<StatCost value={run.cost} animate={animate} />
					{elapsed > 0 && <span aria-hidden>·</span>}
					<StatDuration ms={elapsed} />
				</span>
				{state.failed && (
					<Badge tone="del" className="shrink-0">
						{run.status}
					</Badge>
				)}
				{run.review?.verdict && (
					<Badge tone={run.review.verdict === "correct" ? "add" : "del"} className="shrink-0">
						{run.review.verdict}
					</Badge>
				)}
			</div>
			{state.intent && (
				<p className="mt-0.5 min-w-0 fr-overflow pl-6 text-fr-2xs text-fr-text-3">
					{state.intent.verb && <span className="text-fr-accent">{state.intent.verb}: </span>}
					{state.intent.rest}
				</p>
			)}
		</div>
	);
}

function ExpandedSubagentRunRow(props: SubagentRunViewProps) {
	const { run, className, runningGlyph, state } = props;
	return (
		<div data-slot="subagent-node" data-depth={props.depth} className="min-w-0">
			<div
				data-slot="subagent-run"
				data-status={run.status}
				className={cn(
					"grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2.5 rounded-[8px] transition-colors",
					state.rowPad,
					state.running ? "bg-fr-bg" : "hover:bg-fr-surface/60",
					className,
				)}
			>
				<span className="mt-px flex h-[18px] items-center justify-center" title={run.status}>
					<RunGlyph status={run.status} runningGlyph={runningGlyph} />
				</span>
				<div className="min-w-0">
					<ExpandedRunHeader {...props} />
					<RunIntentLine run={run} state={state} />
					<RunMetaLine {...props} />
					<RunTerminalDetail {...props} />
				</div>
			</div>
			<SubagentChildRows {...props} />
		</div>
	);
}

function RunIndex({ index }: { readonly index: number }) {
	return (
		<span className="shrink-0 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
			{String(index).padStart(2, "0")}
		</span>
	);
}

function ExpandedRunHeader({ run, parentModel, state }: SubagentRunViewProps) {
	const animate = run.status === "running";
	const elapsed = useElapsedClock(animate, run.durationMs);
	return (
		<div className="flex min-w-0 items-baseline gap-2">
			<span className={cn("min-w-0 flex-1 fr-overflow font-medium text-fr-text", state.titleSize)}>
				{state.title}
			</span>
			{state.showAgent && <span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">@{run.agent}</span>}
			<ModelChip model={run.resolvedModel} parentModel={parentModel} />
			{run.retry && <span className="shrink-0 font-secondary text-fr-2xs text-fr-warn">rate-limited</span>}
			{run.truncated && <span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">truncated</span>}
			<span className="flex shrink-0 items-center gap-1.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
				<StatTokens value={run.tokens} animate={animate} />
				<span aria-hidden>·</span>
				<StatCost value={run.cost} animate={animate} />
				{elapsed > 0 && <span aria-hidden>·</span>}
				<StatDuration ms={elapsed} />
			</span>
		</div>
	);
}

function RunIntentLine({ run, state }: { readonly run: SubagentRun; readonly state: RunRenderState }) {
	if (state.intent) {
		return (
			<p data-slot="subagent-intent" className="mt-0.5 min-w-0 fr-overflow text-fr-xs text-fr-text-2">
				{state.intent.verb && <span className="text-fr-accent">{state.intent.verb}: </span>}
				{state.intent.rest}
			</p>
		);
	}
	if (state.running && run.currentTool) {
		return (
			<p data-slot="subagent-intent" className="mt-0.5 min-w-0 fr-overflow text-fr-xs text-fr-text-3">
				{run.currentTool}...
			</p>
		);
	}
	if (!state.running && run.error)
		return <p className="mt-1 min-w-0 fr-overflow text-fr-xs text-fr-del">{run.error}</p>;
	return null;
}

function RunMetaLine({ run, state }: SubagentRunViewProps) {
	if (!state.density.isSpacious) return null;
	return (
		<div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-secondary text-fr-2xs text-fr-text-3">
			<span>
				{run.toolCount} {run.toolCount === 1 ? "tool" : "tools"}
			</span>
			<BudgetMeter used={run.contextTokens} total={run.contextWindow} />
		</div>
	);
}

// --- terminal detail: assignment, abort reason, review/findings, output -----

function RunTerminalDetail({ run, state }: SubagentRunViewProps) {
	if (run.status === "running" || run.status === "pending") return null;
	const full = state.density.isSpacious;
	const assignment = run.assignment && run.assignment !== state.title ? run.assignment : undefined;
	const output = run.review ? undefined : run.output;
	if (!assignment && !run.abortReason && !run.review && !output) return null;
	return (
		<div data-slot="subagent-detail" className="mt-1.5 flex min-w-0 flex-col gap-1.5">
			{run.abortReason && <RunAbortReason reason={run.abortReason} />}
			{run.review && <RunReview review={run.review} full={full} />}
			{full ? (
				<>
					{assignment && <RunAssignment text={assignment} full />}
					{output && <RunOutputPreview text={output} full />}
				</>
			) : (
				<RunVerboseDisclosure assignment={assignment} output={output} />
			)}
		</div>
	);
}

function RunVerboseDisclosure({ assignment, output }: { readonly assignment?: string; readonly output?: string }) {
	const [open, setOpen] = useState(false);
	if (!assignment && !output) return null;
	return (
		<details data-slot="subagent-run-detail" className="group min-w-0" onToggle={e => setOpen(e.currentTarget.open)}>
			<summary className="flex cursor-pointer list-none items-center gap-1 text-fr-text-3 hover:text-fr-text-2">
				<Icon name="caretR" size={10} className="shrink-0 transition-transform group-open:rotate-90" />
				<span className="fr-eyebrow">details</span>
			</summary>
			{open && (
				<div className="mt-1 flex min-w-0 flex-col gap-1.5">
					{assignment && <RunAssignment text={assignment} full />}
					{output && <RunOutputPreview text={output} full />}
				</div>
			)}
		</details>
	);
}

function DetailLabel({ children }: { readonly children: string }) {
	return <span className="fr-eyebrow text-fr-text-3">{children}</span>;
}

function RunAssignment({ text, full }: { readonly text: string; readonly full: boolean }) {
	return (
		<div className="min-w-0">
			<DetailLabel>assignment</DetailLabel>
			<p
				className={cn(
					"mt-0.5 min-w-0 whitespace-pre-wrap break-words font-secondary text-fr-2xs leading-[1.5] text-fr-text-3",
					!full && "line-clamp-2",
				)}
			>
				{text}
			</p>
		</div>
	);
}

function RunAbortReason({ reason }: { readonly reason: string }) {
	return (
		<div className="flex min-w-0 items-start gap-1.5 text-fr-2xs text-fr-del">
			<Icon name="x" size={11} className="mt-px shrink-0" />
			<span className="min-w-0 break-words">{reason}</span>
		</div>
	);
}

function RunReview({ review, full }: { readonly review: SubagentReview; readonly full: boolean }) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-fr-2xs">
				{review.verdict ? (
					<>
						<span className="text-fr-text-3">Patch is</span>
						<Badge tone={review.verdict === "correct" ? "add" : "del"}>{review.verdict}</Badge>
						{typeof review.confidence === "number" && (
							<span className="font-secondary text-fr-text-3">
								{Math.round(review.confidence * 100)}% confidence
							</span>
						)}
					</>
				) : (
					<span className="text-fr-warn">Review incomplete</span>
				)}
			</div>
			{review.explanation && (
				<p
					className={cn(
						"min-w-0 whitespace-pre-wrap break-words font-secondary text-fr-2xs leading-[1.5] text-fr-text-3",
						!full && "line-clamp-2",
					)}
				>
					{full ? review.explanation : firstSentence(review.explanation)}
				</p>
			)}
			{review.findings.length > 0 && <RunFindings findings={review.findings} full={full} />}
		</div>
	);
}

function RunFindings({
	findings,
	full,
}: {
	readonly findings: readonly SubagentReviewFinding[];
	readonly full: boolean;
}) {
	const sorted = full
		? findings
		: [...findings].sort((a, b) => (PRIORITY_ORD[a.priority] ?? 0) - (PRIORITY_ORD[b.priority] ?? 0));
	const shown = full ? sorted : sorted.slice(0, 3);
	return (
		<div className="flex min-w-0 flex-col gap-1">
			{shown.map(finding => (
				<div
					key={`${finding.priority}:${finding.filePath ?? ""}:${finding.lineStart ?? ""}:${finding.title}`}
					className="min-w-0"
				>
					<div className="flex min-w-0 items-baseline gap-1.5 text-fr-2xs">
						<Badge tone={findingTone(finding.priority)} variant="soft">
							{finding.priority}
						</Badge>
						<span className="min-w-0 flex-1 fr-overflow text-fr-text-2">
							{stripPriorityPrefix(finding.title)}
						</span>
						{finding.filePath && (
							<span className="shrink-0 font-secondary text-fr-text-3">
								{baseName(finding.filePath)}
								{typeof finding.lineStart === "number" ? `:${finding.lineStart}` : ""}
							</span>
						)}
					</div>
					{full && finding.body && (
						<p className="mt-0.5 ml-[30px] min-w-0 whitespace-pre-wrap break-words font-secondary text-fr-2xs leading-[1.5] text-fr-text-3">
							{finding.body}
						</p>
					)}
				</div>
			))}
			{!full && findings.length > 3 && (
				<span className="font-secondary text-fr-2xs text-fr-text-3">+{findings.length - 3} more findings</span>
			)}
		</div>
	);
}

function RunOutputPreview({ text, full }: { readonly text: string; readonly full: boolean }) {
	const lines = text.split("\n");
	const max = full ? 12 : 3;
	const shown = lines.slice(0, max);
	const more = lines.length - shown.length;
	return (
		<div className="min-w-0">
			<DetailLabel>output</DetailLabel>
			<pre className="mt-0.5 min-w-0 overflow-x-auto whitespace-pre-wrap break-words rounded-[6px] border border-fr-border-soft bg-fr-bg px-2 py-1.5 font-secondary text-fr-2xs leading-[1.5] text-fr-text-2">
				{shown.join("\n")}
			</pre>
			{more > 0 && <span className="font-secondary text-fr-2xs text-fr-text-3">+{more} more lines</span>}
		</div>
	);
}

function SubagentChildRows({
	run,
	depth,
	runningGlyph,
	density,
	compact,
}: SubagentRunViewProps & { readonly compact?: boolean }) {
	const children = run.children ?? [];
	if (children.length === 0) return null;
	const childRows = children.map(child => (
		<SubagentRunRow
			key={child.id}
			run={child}
			depth={depth + 1}
			parentModel={run.resolvedModel}
			sharedAgent={run.agent}
			runningGlyph={runningGlyph}
			density={density}
		/>
	));
	if (compact) {
		return <div className="ml-[14px] border-l border-fr-border pl-1.5">{childRows}</div>;
	}
	return (
		<div data-slot="subagent-children" className="mt-1 ml-[18px] border-l border-fr-border pl-2">
			<div className="flex items-center gap-1.5 py-1 text-fr-text-3">
				<Icon name="branch" size={10} />
				<span className="fr-eyebrow">
					spawned {children.length} {children.length === 1 ? "agent" : "agents"}
				</span>
			</div>
			{childRows}
		</div>
	);
}

// --- context block ----------------------------------------------------------

function ContextBlock({ text, defaultOpen }: { readonly text: string; readonly defaultOpen?: boolean }) {
	return (
		<details data-slot="subagent-context" className="group border-b border-fr-border" open={defaultOpen}>
			<summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-fr-text-3 hover:text-fr-text-2">
				<Icon name="caretR" size={11} className="transition-transform group-open:rotate-90" />
				<span className="fr-eyebrow">shared context</span>
			</summary>
			<pre className="mx-3 mb-2.5 max-h-52 overflow-auto whitespace-pre-wrap rounded-[8px] border border-fr-border-soft bg-fr-bg px-3 py-2.5 font-secondary text-fr-xs leading-[1.6] text-fr-text-2">
				{text}
			</pre>
		</details>
	);
}

// --- batch card -------------------------------------------------------------

interface BatchCounts {
	readonly total: number;
	readonly running: number;
	readonly done: number;
	readonly failed: number;
	readonly pending: number;
}

function countRuns(runs: readonly SubagentRun[]): BatchCounts {
	let total = 0;
	let running = 0;
	let done = 0;
	let failed = 0;
	let pending = 0;
	const walk = (list: readonly SubagentRun[]) => {
		for (const run of list) {
			total += 1;
			if (run.status === "running") running += 1;
			else if (run.status === "completed") done += 1;
			else if (run.status === "failed" || run.status === "aborted") failed += 1;
			else pending += 1;
			if (run.children?.length) walk(run.children);
		}
	};
	walk(runs);
	return { total, running, done, failed, pending };
}

function batchSummary(status: SubagentBatchStatus, counts: BatchCounts, nested: boolean): string {
	const lead = batchSummaryLead(counts, nested);
	if (status === "dispatching") return `Dispatching ${lead}`;
	const parts = batchSummaryParts(status, counts);
	return parts.length > 0 ? `${lead} · ${parts.join(" · ")}` : lead;
}

function batchSummaryLead(counts: BatchCounts, nested: boolean): string {
	const noun = counts.total === 1 ? "agent" : "agents";
	return nested ? `${counts.total} ${noun}` : `${counts.total} parallel ${noun}`;
}

function batchSummaryParts(status: SubagentBatchStatus, counts: BatchCounts): string[] {
	const parts = [
		counts.running > 0 ? `${counts.running} running` : null,
		counts.done > 0 ? `${counts.done} done` : null,
		counts.failed > 0 ? `${counts.failed} failed` : null,
		counts.pending > 0 && status === "running" ? `${counts.pending} queued` : null,
	];
	return parts.filter((part): part is string => part != null);
}

function sumRuns(runs: readonly SubagentRun[], key: "tokens" | "cost"): number {
	return runs.reduce((sum, run) => sum + run[key] + (run.children ? sumRuns(run.children, key) : 0), 0);
}

function aggregate(batch: SubagentBatch, key: "tokens" | "cost"): number {
	const top = batch[key];
	if (typeof top === "number") return top;
	return sumRuns(batch.runs, key);
}

// --- card variant -----------------------------------------------------------

/** Visual style for the swarm card. */
export type SubagentCardVariant = "classic" | "dots";

export interface SubagentBatchCardProps {
	readonly batch: SubagentBatch;
	readonly settings?: FraymSurfaceConfig;
	/** Open the shared-context disclosure by default (handy before runs start). */
	readonly defaultContextOpen?: boolean;
	readonly className?: string;
	/**
	 * Visual style. `classic` (default) uses the ring spinner for running agents;
	 * `dots` swaps in a circling dot-matrix loader (braille-spinner style).
	 */
	readonly variant?: SubagentCardVariant;
	/** Rendered as a tool-card body — the tool-card head already shows Task/agent/status,
	 *  so drop the redundant title row (keep the summary + aggregate stats). */
	readonly embedded?: boolean;
}

interface BatchRenderState {
	readonly density: FraymDensity;
	readonly counts: BatchCounts;
	readonly tokens: number;
	readonly cost: number;
	readonly nested: boolean;
	readonly rowGap: string;
	readonly runningGlyph: "ring" | "dots";
	readonly headerPad: string;
}

const BATCH_DENSITY_CLASSES: Record<FraymDensity, { readonly rowGap: string; readonly headerPad: string }> = {
	compact: {
		rowGap: "gap-0.5 p-1.5",
		headerPad: "px-2.5 py-2",
	},
	comfortable: {
		rowGap: "gap-0.5 p-1.5",
		headerPad: "px-3 py-2.5",
	},
	spacious: {
		rowGap: "gap-2 p-3",
		headerPad: "px-4 py-3.5",
	},
};

function hasNestedRuns(runs: readonly SubagentRun[]): boolean {
	return runs.some(run => (run.children?.length ?? 0) > 0);
}

function getBatchRenderState(
	batch: SubagentBatch,
	settings: FraymSurfaceConfig | undefined,
	variant: SubagentCardVariant,
): BatchRenderState {
	const density = settings?.density ?? "comfortable";
	const counts = countRuns(batch.runs);
	const classes = BATCH_DENSITY_CLASSES[density];
	return {
		density,
		counts,
		tokens: aggregate(batch, "tokens"),
		cost: aggregate(batch, "cost"),
		nested: hasNestedRuns(batch.runs),
		rowGap: classes.rowGap,
		runningGlyph: variant === "dots" ? "dots" : "ring",
		headerPad: classes.headerPad,
	};
}

export function SubagentBatchCard({
	batch,
	settings,
	defaultContextOpen,
	className,
	variant = "dots",
	embedded,
}: SubagentBatchCardProps) {
	if (settings?.visible === false || settings?.placement === "hidden") return null;
	const state = getBatchRenderState(batch, settings, variant);

	return (
		<section
			data-slot="subagent-batch"
			data-density={state.density}
			data-status={batch.status}
			className={cn(
				"min-w-0 animate-[fr-rise_0.25s_ease] overflow-hidden rounded-[12px] border border-fr-border bg-fr-rail data-[status=running]:border-fr-accent-line",
				className,
			)}
		>
			<SubagentBatchHeader batch={batch} state={state} embedded={embedded} />

			{batch.context && <ContextBlock text={batch.context} defaultOpen={defaultContextOpen} />}

			<SubagentBatchRuns batch={batch} state={state} />
		</section>
	);
}

/** The embedded head's left title: the shared-context's first line (the swarm's
 *  subject), else the agent persona — so the cost/token stats strip isn't headerless. */
function headerTitle(batch: SubagentBatch): string {
	const ctx = batch.context
		?.split("\n", 1)[0]
		?.trim()
		.replace(/^#+\s*/, "");
	if (ctx) return ctx.length > 52 ? `${ctx.slice(0, 51)}\u2026` : ctx;
	return `@${batch.agent}`;
}

function SubagentBatchHeader({
	batch,
	state,
	embedded,
}: {
	readonly batch: SubagentBatch;
	readonly state: BatchRenderState;
	readonly embedded?: boolean;
}) {
	const compact = state.density === "compact";
	const animate = batch.status === "running";
	const elapsed = useElapsedClock(animate, batch.totalDurationMs ?? 0);
	return (
		<header className={cn("flex flex-col gap-1.5 border-b border-fr-border", state.headerPad)}>
			<div className="flex min-w-0 items-center gap-2">
				{!embedded && (
					<>
						<Icon name="grid" size={compact ? 13 : 14} className="shrink-0 text-fr-accent" />
						<h3
							className={cn(
								"shrink-0 font-display font-semibold text-fr-text",
								compact ? "text-fr-sm" : "text-fr-base",
							)}
						>
							Task
						</h3>
						<span className="min-w-0 fr-overflow font-secondary text-fr-xs text-fr-text-3">@{batch.agent}</span>
						{batch.isolated && (
							<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">isolated</span>
						)}
					</>
				)}
				{embedded && (
					<span className="flex min-w-0 items-center gap-1.5">
						<Icon name="grid" size={compact ? 12 : 13} className="shrink-0 text-fr-accent" />
						<span className="min-w-0 fr-overflow font-secondary text-fr-xs text-fr-text-2">
							{headerTitle(batch)}
						</span>
					</span>
				)}
				<span className="ml-auto flex shrink-0 items-center gap-1.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
					<span>
						{state.counts.done}/{state.counts.total}
					</span>
					<span aria-hidden>·</span>
					<StatTokens value={state.tokens} animate={animate} />
					<span aria-hidden>·</span>
					<StatCost value={state.cost} animate={animate} />
					{elapsed > 0 && <span aria-hidden>·</span>}
					<StatDuration ms={elapsed} />
				</span>
			</div>
			{!embedded && (
				<p className="min-w-0 fr-overflow font-secondary text-fr-2xs text-fr-text-3">
					{batchSummary(batch.status, state.counts, state.nested)}
				</p>
			)}
		</header>
	);
}

function SubagentBatchRuns({ batch, state }: { readonly batch: SubagentBatch; readonly state: BatchRenderState }) {
	return (
		<div className={cn("flex flex-col", state.rowGap)}>
			{batch.runs.map(run => (
				<SubagentRunRow
					key={run.id}
					run={run}
					sharedAgent={batch.agent}
					runningGlyph={state.runningGlyph}
					density={state.density}
				/>
			))}
		</div>
	);
}

// --- connected wrappers -----------------------------------------------------

export interface SubagentBatchByCallProps {
	readonly call: ActiveToolCall;
	/** Rendered when no structured batch exists for this `task` call yet (e.g. a driver that doesn't emit batches). */
	readonly fallback?: React.ReactNode;
	/** Rendered as the tool-card body — drop the card's own (redundant) title row. */
	readonly embedded?: boolean;
}

/** Resolve a `task` call's batch ONCE: event-fed session state by `callId`, else
 *  derived from the call's own `TaskToolDetails`. Memoized so `taskCallToBatch`
 *  (map/merge/sort) runs only when the call or session batches change, and so the
 *  head + body always resolve the IDENTICAL batch (no divergence). */
function useResolvedBatch(call: ActiveToolCall): SubagentBatch | null {
	const batches = useSubagentBatches();
	return useMemo(() => batches.find(b => b.callId === call.callId) ?? taskCallToBatch(call), [batches, call]);
}

/** Resolve the `SubagentBatch` for a `task` tool call by `callId` and render it. */
export function SubagentBatchByCall({ call, fallback = null, embedded }: SubagentBatchByCallProps) {
	const batch = useResolvedBatch(call);
	if (!batch) return <>{fallback}</>;
	return <SubagentBatchCard batch={batch} defaultContextOpen={false} embedded={embedded} />;
}

/** Rich head metadata for a `task` swarm card — agent persona + agent count +
 *  completion, resolved from session state (event-fed) or the call's own
 *  `TaskToolDetails`. Lets the collapsed tool card read like every other tool
 *  instead of a bare `task`. */
/** Per-status LED tone for the dot-matrix head grid. */
const DOT_MATRIX_TONE: Record<SubagentStatus, string> = {
	completed: "bg-fr-add",
	running: "bg-fr-blue",
	failed: "bg-fr-del",
	aborted: "bg-fr-del",
	pending: "bg-fr-surface-3",
};

/** A STATIC dot-matrix status grid for the swarm's tool-strip head: one LED per
 *  subagent, filled by status — completed=add · running=blue (a steady glow, no
 *  motion) · failed/aborted=del · pending=surface-3. The grid fills up as agents
 *  complete, giving at-a-glance swarm state even on the collapsed card. Shown only
 *  for multi-agent batches (a lone agent already reads from its own status dot). */
export function DotMatrixStatus({
	runs,
	cols = 4,
	className,
}: {
	readonly runs: readonly SubagentRun[];
	readonly cols?: number;
	readonly className?: string;
}) {
	if (runs.length < 2) return null;
	return (
		<span
			aria-hidden
			data-slot="subagent-dot-matrix"
			className={cn("inline-grid flex-none gap-[2px]", className)}
			style={{ gridTemplateColumns: `repeat(${Math.min(cols, runs.length)}, 1fr)` }}
		>
			{runs.map(run => (
				<span
					key={run.id}
					className={cn(
						"size-[5px] rounded-[1.5px]",
						DOT_MATRIX_TONE[run.status] ?? "bg-fr-surface-3",
						run.status === "running" && "shadow-[0_0_4px_color-mix(in_srgb,var(--fr-blue),transparent_40%)]",
					)}
				/>
			))}
		</span>
	);
}

export function SubagentBatchHeadBadges({ call }: { readonly call: ActiveToolCall }) {
	const batch = useResolvedBatch(call);
	if (!batch) return null;
	const { total, done } = countRuns(batch.runs);
	return (
		<>
			<DotMatrixStatus runs={batch.runs} />
			<Badge variant="code" tone="mute">
				@{batch.agent}
			</Badge>
			{total > 0 && (
				<Badge variant="code" tone="mute">
					{total} agent{total === 1 ? "" : "s"}
				</Badge>
			)}
			{done > 0 && (
				<Badge variant="code" tone="add">
					{done}/{total} done
				</Badge>
			)}
		</>
	);
}

export interface SubagentBatchesProps {
	readonly batches: readonly SubagentBatch[];
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

export interface ConnectedSubagentBatchesProps {
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

export function SubagentBatches({ batches, settings, className }: SubagentBatchesProps) {
	if (batches.length === 0) return null;
	return (
		<div data-slot="subagent-batches" className={cn("flex flex-col gap-2", className)}>
			{batches.map(batch => (
				<SubagentBatchCard key={batch.callId} batch={batch} settings={settings} />
			))}
		</div>
	);
}

export function ConnectedSubagentBatches({ settings, className }: ConnectedSubagentBatchesProps) {
	const batches = useTaskBatches();
	return <SubagentBatches batches={batches} settings={settings} className={className} />;
}

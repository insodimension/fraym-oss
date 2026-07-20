// `lsp` tool renderer — LSP code-intelligence results at TUI parity.
//
// LSP has NO structured `details.displayContent` — all display content lives in
// `content[].text` (formatted by Engine's LspTool.execute). This renderer parses the
// text using the same regex-based type detection as the TUI (engine .../lsp/render.ts
// → renderResult) and returns a ToolView with correct head badges + body.
//
// Self-contained defensive parse (no coupling to the monolith), mirroring
// bash-render/search-render. See docs/design/tools/lsp.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField, toTermLines } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { DataInspectorBody } from "../../data-inspector";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { EditErrorBody, EditStreamingFooter } from "./bodies/edit-diff-body";
import { LspDiagnosticsBody, LspDiagnosticsOkBody } from "./bodies/lsp-diagnostics-body";
import { LspLocationsBody, LspLocationsEmptyBody } from "./bodies/lsp-locations-body";
import { type LspParseResult, parseLspResult } from "./bodies/lsp-parse";
import { LspSymbolsBody, LspSymbolsWorkspaceBody } from "./bodies/lsp-symbols-body";
import { ReadCodeBody, ReadMarkdownBody } from "./bodies/read-body";

// ─── Defensive Parse Helpers (local; no coupling to Engine) ────────────────────

function readResultText(output: unknown): string | undefined {
	const content = readField(output, "content");
	if (Array.isArray(content) && content.length > 0) {
		return readStringField(content[0], "text");
	}
	return undefined;
}

interface LspInput {
	readonly action?: string;
	readonly file?: string;
	readonly line?: number;
	readonly symbol?: string;
	readonly query?: string;
	readonly new_name?: string;
	readonly apply?: boolean;
}

function readLspInput(call: ActiveToolCall): LspInput {
	const input = call.input as Record<string, unknown> | undefined;
	return {
		action: readStringField(input, "action"),
		file: readStringField(input, "file"),
		line: readField(input, "line") as number | undefined,
		symbol: readStringField(input, "symbol"),
		query: readStringField(input, "query"),
		new_name: readStringField(input, "new_name"),
		apply: readField(input, "apply") as boolean | undefined,
	};
}

function readLspError(call: ActiveToolCall): boolean {
	return call.status === "error" || readField(call.output, "isError") === true;
}

// ─── Head Builders ──────────────────────────────────────────────────────────

function buildTarget(input: LspInput): string | undefined {
	if (input.file) {
		if (input.file === "*") return "*";
		let target = input.file;
		if (input.line !== undefined) {
			target += `:${input.line}`;
			if (input.symbol) target += ` (${input.symbol})`;
		}
		return target;
	}
	if (input.line !== undefined) {
		let target = `line ${input.line}`;
		if (input.symbol) target += ` (${input.symbol})`;
		return target;
	}
	if (input.query) return input.query;
	return undefined;
}

interface LspBadges {
	readonly action: string;
	readonly target?: string;
	readonly meta: ReactNode[];
}

function buildBadges(input: LspInput): LspBadges {
	const action = (input.action ?? "lsp").replace(/_/g, " ");
	const target = buildTarget(input);
	const meta: ReactNode[] = [];

	if (target && input.symbol) {
		meta.push(
			<Badge key="sym" variant="code" tone="mute">
				symbol:{input.symbol}
			</Badge>,
		);
	}
	if (target && input.query) {
		meta.push(
			<Badge key="q" variant="code" tone="mute">
				query:{input.query}
			</Badge>,
		);
	}
	if (input.new_name) {
		meta.push(
			<Badge key="nn" variant="code" tone="mute">
				new:{input.new_name}
			</Badge>,
		);
	}
	if (input.apply !== undefined) {
		meta.push(
			<Badge key="ap" variant="code" tone="mute">
				apply:{String(input.apply)}
			</Badge>,
		);
	}

	return { action, target, meta };
}

function buildStat(parsed: LspParseResult): string | undefined {
	switch (parsed.kind) {
		case "diagnostics":
			return parsed.errorCount > 0 || parsed.warningCount > 0
				? `${parsed.errorCount + parsed.warningCount} issue(s)`
				: "OK";
		case "diagnosticsOK":
			return "OK";
		case "locations":
			return `${parsed.count} found`;
		case "locationsEmpty":
			return "0 found";
		case "symbols":
			return `${parsed.symbols.length} symbol(s)`;
		case "symbolsWorkspace":
			return `${parsed.count} found`;
		case "error":
			return "failed";
		default:
			return undefined;
	}
}

// ─── Body Builder ───────────────────────────────────────────────────────────

function buildBody(parsed: LspParseResult): ReactNode {
	switch (parsed.kind) {
		case "hover": {
			return (
				<ToolBodySection icon="code" title="Hover" maxHeight={240} padContent>
					{parsed.beforeDoc ? <ReadMarkdownBody text={parsed.beforeDoc} /> : null}
					<ReadCodeBody text={parsed.code} language={parsed.language} lineNumbers={false} />
					{parsed.afterDoc ? <ReadMarkdownBody text={parsed.afterDoc} /> : null}
				</ToolBodySection>
			);
		}

		case "diagnostics":
			return (
				<LspDiagnosticsBody
					errorCount={parsed.errorCount}
					warningCount={parsed.warningCount}
					groups={parsed.groups}
				/>
			);

		case "diagnosticsOK":
			return <LspDiagnosticsOkBody />;

		case "locations":
			return <LspLocationsBody subKind={parsed.subKind} count={parsed.count} groups={parsed.groups} />;

		case "locationsEmpty":
			return <LspLocationsEmptyBody subKind={parsed.subKind} />;

		case "symbols":
			return <LspSymbolsBody fileName={parsed.fileName} symbols={parsed.symbols} />;

		case "symbolsWorkspace":
			return <LspSymbolsWorkspaceBody query={parsed.query} count={parsed.count} raw={parsed.raw} />;

		case "json":
			return <DataInspectorBody value={parsed.parsed} />;

		default: {
			const isError =
				parsed.kind === "error" || readLspError({ status: "success", output: undefined } as ActiveToolCall);
			if (isError) {
				const msg = parsed.kind === "error" ? parsed.message : parsed.raw;
				return <EditErrorBody message={msg} />;
			}
			const lines = toTermLines(parsed.raw);
			return <ToolBodyTerm lines={lines} />;
		}
	}
}

// ─── Renderer ───────────────────────────────────────────────────────────────

const renderLsp: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const input = readLspInput(call);
	const isError = readLspError(call);

	// Pending state (no result yet)
	if (call.status === "running" && !call.output) {
		const { action: actionLabel, target, meta } = buildBadges(input);
		const items: ReactNode[] = [
			<Badge key="act" variant="code" tone="accent">
				{actionLabel}
			</Badge>,
		];
		if (target) {
			items.push(
				<Badge key="tgt" variant="code" tone="mute">
					{target}
				</Badge>,
			);
		}
		items.push(...meta);

		return {
			label: "LSP",
			badges: items,
			kind: "lsp",
			status: "pending",
			stat: "running…",
			body: <EditStreamingFooter />,
		};
	}

	// Parse result text
	const text = readResultText(call.output) ?? "";
	const action = input.action;
	let parsed: LspParseResult;
	try {
		parsed = parseLspResult(text, action);
	} catch {
		parsed = { kind: "unknown", raw: text };
	}

	// Determine status
	let status: ToolStatus;
	if (isError) {
		status = "error";
	} else if (parsed.kind === "locationsEmpty") {
		status = "warn";
	} else if (parsed.kind === "error") {
		status = "error";
	} else if (parsed.kind === "diagnostics" && parsed.errorCount > 0) {
		status = "error";
	} else if (parsed.kind === "diagnostics" && parsed.warningCount > 0 && parsed.errorCount === 0) {
		status = "warn";
	} else {
		status = "success";
	}

	// Build badges
	const { action: actionLabel, target, meta } = buildBadges(input);
	const badges: ReactNode[] = [
		<Badge key="act" variant="code" tone="accent">
			{actionLabel}
		</Badge>,
	];
	if (target) {
		badges.push(
			<Badge key="tgt" variant="code" tone="mute">
				{target}
			</Badge>,
		);
	}
	badges.push(...meta);

	return {
		label: "LSP",
		badges,
		kind: "lsp",
		status,
		stat: buildStat(parsed),
		body: buildBody(parsed),
	};
};

export { renderLsp };

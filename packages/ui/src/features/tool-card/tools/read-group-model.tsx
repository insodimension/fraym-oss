// Read-group coalescing — the TUI merges *consecutive* `read` calls into one card
// (`event-controller.ts` → `ReadToolGroupComponent`). We mirror that at the thread
// level: a run of ≥2 adjacent coalescable read calls renders as one "Read N files"
// card (the prototype hero: Σ line-count stat + per-file rows). url / internal-URI
// reads are excluded (they render standalone), matching the TUI.

import { Fragment, type ReactNode } from "react";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { normalizeToolName } from "../../../registries/tool-renderer-registry";
import { ToolBodyFiles, ToolCard, type ToolStatus } from "../tool-card";
import { resolveToolDefaultOpen, useToolDisplaySettings } from "../tool-display-settings";

type BlockLike = { readonly type: string; readonly [key: string]: unknown };

const READ_NAMES = new Set(["read", "cat", "open", "view"]);

function readField(v: unknown, k: string): unknown {
	return typeof v === "object" && v !== null ? (v as Record<string, unknown>)[k] : undefined;
}
function readStr(v: unknown, ...keys: string[]): string | undefined {
	for (const k of keys) {
		const x = readField(v, k);
		if (typeof x === "string") return x;
	}
	return undefined;
}
function isToolCall(v: unknown): v is ActiveToolCall {
	return typeof v === "object" && v !== null && typeof (v as { callId?: unknown }).callId === "string";
}

/** A read call that coalesces into a group: a read-family tool whose target is NOT a url / internal URI. */
function isCoalescableReadCall(call: ActiveToolCall): boolean {
	if (!READ_NAMES.has(normalizeToolName(call.toolName))) return false;
	const path = readStr(call.input, "path", "file_path") ?? "";
	return !path.includes("://");
}

function callFile(call: ActiveToolCall): { path: string; lines: number; ok: boolean } {
	const path = readStr(call.input, "path", "file_path") ?? "";
	const text = readStr(readField(readField(call.output, "details"), "displayContent"), "text");
	const lc = readField(call.metadata, "lineCount");
	const lines = typeof lc === "number" ? lc : text ? text.split("\n").length : 0;
	return { path, lines, ok: call.status !== "error" };
}

/** Coalesced "Read N files" group card — head Σ-lines stat + per-file `[path, lines]` rows. */
function ReadGroupCard({ calls }: { calls: readonly ActiveToolCall[] }) {
	const settings = useToolDisplaySettings();
	const files = calls.map(callFile);
	const total = files.reduce((n, f) => n + f.lines, 0);
	const status: ToolStatus = files.some(f => !f.ok) ? "error" : "success";
	return (
		<ToolCard
			kind="read"
			label={
				<>
					Read <span className="font-secondary font-medium">{files.length} files</span>
				</>
			}
			stat={total > 0 ? `${total} lines` : `${files.length} files`}
			status={status}
			density={settings.density}
			defaultOpen={resolveToolDefaultOpen(status, settings)}
		>
			<ToolBodyFiles rows={files.map(f => [f.path, f.lines > 0 ? `${f.lines}` : "—"] as const)} />
		</ToolCard>
	);
}

/**
 * Render `blocks`, coalescing runs of ≥2 consecutive coalescable read tool calls into a
 * single `ReadGroupCard`. Runs of 1 (and every other block) render via `renderBlock`,
 * unchanged. Returns keyed nodes ready to drop into the message body.
 */
export function coalesceReadGroups(
	blocks: readonly BlockLike[],
	renderBlock: (block: BlockLike, index: number) => ReactNode,
): ReactNode[] {
	const out: ReactNode[] = [];
	let run: { call: ActiveToolCall; index: number }[] = [];
	const flush = () => {
		if (run.length >= 2) {
			out.push(<ReadGroupCard key={`read-group-${run[0]?.index}`} calls={run.map(r => r.call)} />);
		} else {
			for (const r of run)
				out.push(<Fragment key={r.index}>{renderBlock(blocks[r.index] as BlockLike, r.index)}</Fragment>);
		}
		run = [];
	};
	blocks.forEach((block, index) => {
		const call = block.type === "tool" ? (block as { call?: unknown }).call : undefined;
		if (isToolCall(call) && isCoalescableReadCall(call)) {
			run.push({ call, index });
		} else {
			flush();
			out.push(<Fragment key={index}>{renderBlock(block, index)}</Fragment>);
		}
	});
	flush();
	return out;
}

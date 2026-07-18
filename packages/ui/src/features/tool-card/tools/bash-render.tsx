// `bash` tool renderer — the first per-tool renderer MODULE (the pattern the rest
// of the inline renderers in registries/default-renderers.tsx will be extracted to).
// Self-contained: defines its own tiny defensive-parse helpers so it has zero coupling
// to the monolith. Registered for bash/shell/command/run/exec/terminal/ssh; `eval`
// stays on the legacy generic exec-log until its own pass. See docs/design/tools/bash.md.
//
// Mirrors the TUI shell renderer (engine .../tools/bash.ts → createShellRenderer):
//   head: `Bash` + terminal kind + Wall stat + bg-job / truncated badges + status icon.
//   body (term surface): command row ($ cd…/env + highlighted command) + output pane
//         (capped, tail-following) + dim [Wall · Timeout] stats + truncation note.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodyCard, ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { parseAnsi } from "./bodies/ansi";
import { BashStatsRow, BashTruncationNote } from "./bodies/bash-body";
import { readFirstTextResult, readNumberField } from "./renderer-utils";

// Per-card output height cap (px) — matches the edit/write caps so the card stays compact;
// the output scrolls within this window and follows the tail while streaming.
const BASH_BODY_MAX_HEIGHT = 200;

type BadgeTone = "accent" | "add" | "blue" | "warn" | "mute" | "del";

// --- defensive parse (local; no coupling to the monolith) -------------------

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value as Record<string, unknown>).every(v => typeof v === "string")
	);
}

// --- command prefix ---------------------------------------------------------

/** Double-quote an env value for display, escaping shell-significant chars (loose mirror
 *  of the TUI's escapeBashEnvValueForDisplay). */
function quoteEnvValue(value: string): string {
	return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

function formatEnv(env: Record<string, string> | undefined): string {
	if (!env) return "";
	return Object.entries(env)
		.map(([k, v]) => `${k}=${quoteEnvValue(v)}`)
		.join(" ");
}

/** Build the dim `$ cd <cwd> && NAME="v" ` prompt prefix from the call args. */
function buildPrefix(cwd: string | undefined, env: Record<string, string> | undefined): string {
	const segs = ["$"];
	if (cwd) segs.push(`cd ${cwd} &&`);
	const envStr = formatEnv(env);
	if (envStr) segs.push(envStr);
	return `${segs.join(" ")} `;
}

// --- output stripping (mirror the TUI display strips) -----------------------

/** Remove the trailing `Wall time: <secs> seconds` line the tool appends for the LLM —
 *  reconstructed from the exact tagged value so a coincidental token is never stripped. */
function stripWallTimeNotice(text: string, wallMs: number | undefined): string {
	if (wallMs === undefined) return text;
	const notice = `Wall time: ${(wallMs / 1000).toFixed(2)} seconds`;
	const idx = text.lastIndexOf(notice);
	if (idx === -1) return text;
	let start = idx;
	let end = idx + notice.length;
	if (text[start - 1] === "\n") start -= 1;
	if (text[end] === "\n") end += 1;
	return text.slice(0, start) + text.slice(end);
}

/** Best-effort strip of the trailing bracketed OutputMeta notice (`\n\n[…]`) Engine appends
 *  when output is truncated/limited. Applied only when truncation is flagged, so a legit
 *  trailing `[…]` in real output is never removed. */
function stripTrailingBracketNotice(text: string): string {
	return text.replace(/\n*\n\[[^\]]*\][ \t]*$/, "");
}

type BashRenderContext = {
	readonly command: string;
	readonly prefix: string;
	readonly streaming: boolean;
	readonly isError: boolean;
	readonly headWallSeconds: string | undefined;
	readonly timeoutSeconds: number | undefined;
	readonly requestedTimeoutSeconds: number | undefined;
	readonly truncated: boolean;
	readonly artifact: string | undefined;
	readonly jobId: string | undefined;
	readonly asyncState: string | undefined;
	readonly output: string;
};

function readBashOutput(call: ActiveToolCall, details: unknown, truncated: boolean): string {
	const detailsWallMs = readNumberField(details, "wallTimeMs");
	// Prefer the structured result (clean output; full at finish) over `call.text`, which
	// carries the ACP mapper's `$ command` preamble and, once finished, holds only the stale
	// streamed tail. Fall back to text for snapshots that carry no structured output.
	let output = readFirstTextResult(call.output) ?? call.text ?? "";
	output = stripWallTimeNotice(output, detailsWallMs);
	if (truncated) output = stripTrailingBracketNotice(output);
	return output.replace(/\s+$/, "");
}

function readBashHeadWallSeconds(call: ActiveToolCall, details: unknown): string | undefined {
	const detailsWallMs = readNumberField(details, "wallTimeMs");
	const durationMs = readNumberField(readField(call, "metadata"), "durationMs");
	const headWallMs = detailsWallMs ?? durationMs;
	return headWallMs != null ? (headWallMs / 1000).toFixed(2) : undefined;
}

function readBashErrorState(call: ActiveToolCall, details: unknown): boolean {
	return (
		call.status === "error" || readField(call.output, "isError") === true || readField(details, "isError") === true
	);
}

function readBashContext(call: ActiveToolCall): BashRenderContext {
	const command = readStringField(call.input, "command", "cmd", "code") ?? "";
	const cwd = readStringField(call.input, "cwd");
	const envRaw = readField(call.input, "env");
	const env = isStringRecord(envRaw) ? envRaw : undefined;
	const details = readField(call.output, "details");
	const truncation = readField(readField(details, "meta"), "truncation");
	const truncated = truncation != null && truncation !== false;
	const async = readField(details, "async");
	const artifactId = readStringField(truncation, "artifactId");
	return {
		command,
		prefix: buildPrefix(cwd, env),
		streaming: call.status === "running",
		isError: readBashErrorState(call, details),
		headWallSeconds: readBashHeadWallSeconds(call, details),
		timeoutSeconds: readNumberField(details, "timeoutSeconds"),
		requestedTimeoutSeconds: readNumberField(details, "requestedTimeoutSeconds"),
		truncated,
		artifact: artifactId ? `artifact://${artifactId}` : undefined,
		jobId: readStringField(async, "jobId"),
		asyncState: readStringField(async, "state"),
		output: readBashOutput(call, details, truncated),
	};
}

function buildBashBadges(ctx: BashRenderContext): ReactNode[] | undefined {
	const badges: ReactNode[] = [];
	if (!ctx.streaming && ctx.headWallSeconds != null) {
		badges.push(
			<span key="wall" className="font-secondary text-fr-2xs leading-none text-fr-text-3">
				{ctx.headWallSeconds}s
			</span>,
		);
	}
	if (ctx.jobId) {
		const tone: BadgeTone = ctx.asyncState === "failed" ? "del" : ctx.asyncState === "completed" ? "add" : "blue";
		badges.push(
			<Badge key="job" variant="code" tone={tone}>
				⚙ {ctx.jobId}
			</Badge>,
		);
	}
	if (ctx.truncated) {
		badges.push(
			<Badge key="trunc" variant="code" tone="warn">
				⚠ truncated
			</Badge>,
		);
	}
	return badges.length > 0 ? badges : undefined;
}

function renderBashBody(ctx: BashRenderContext): ReactNode {
	// Output streams live into the term surface while the tool is running (tail-following),
	// matching the TUI. Wall/timeout stats land only on finish (they are unknown mid-run).
	return (
		<ToolBodyCard>
			<ToolBodySection
				icon="termBox"
				title={
					<>
						<span className="text-fr-text-3">{ctx.prefix}</span>
						{ctx.command.split("\n")[0]}
					</>
				}
				stat={!ctx.streaming && ctx.headWallSeconds != null ? `${ctx.headWallSeconds}s` : undefined}
				footer={
					ctx.streaming ? null : (
						<>
							<BashStatsRow
								timeoutSeconds={ctx.timeoutSeconds}
								requestedTimeoutSeconds={ctx.requestedTimeoutSeconds}
							/>
							{ctx.truncated ? (
								<>
									{" · "}
									<BashTruncationNote {...(ctx.artifact === undefined ? {} : { artifact: ctx.artifact })} />
								</>
							) : null}
						</>
					)
				}
				maxHeight={BASH_BODY_MAX_HEIGHT}
				followTail={ctx.streaming}
				tailKey={ctx.output}
				padContent
			>
				{ctx.output ? <ToolBodyTerm lines={parseAnsi(ctx.output)} /> : null}
			</ToolBodySection>
		</ToolBodyCard>
	);
}

const renderBash: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readBashContext(call);

	if (ctx.streaming && !ctx.command) {
		return { label: "Bash", kind: "command", status: "pending", stat: "running…", body: null };
	}

	const status: ToolStatus = ctx.streaming ? "pending" : ctx.isError ? "error" : "success";
	const stat = ctx.streaming ? "running…" : ctx.isError ? "failed" : undefined;

	return {
		label: "Bash",
		badges: buildBashBadges(ctx),
		kind: "command",
		status,
		stat,
		// Live streaming reveal (TUI parity) is chassis-wide: resolveToolDefaultOpen
		// opens every running card; completion returns to the user's policy.
		body: renderBashBody(ctx),
	};
};

export { renderBash };

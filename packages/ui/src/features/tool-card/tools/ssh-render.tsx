// `ssh` tool renderer — a remote-exec card (host + command → output).
//
// Engine's SshTool (engine .../tools/ssh.ts) has its OWN dedicated TUI renderer
// (`sshToolRenderer`), NOT the bash one: it shows an "SSH" head + `[host]`
// decoration + a `$ command` row + the streamed remote output, plus a
// truncation warning. Crucially `details` is only `{ meta }` — there is NO
// `wallTimeMs` (so no Wall stat) and the result echoes no timeout. Fraym used to
// alias `ssh → renderBash`, which mislabeled it "Bash" and dropped the host —
// the classic wrong-shape alias. This renderer mirrors the TUI shape while
// reusing the bash exec-log primitive (ToolBodyCard + term output + truncation).
// Registered for `ssh` in default-tool-renderers. See docs/design/tools/ssh.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodyCard, ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { parseAnsi } from "./bodies/ansi";
import { BashTruncationNote } from "./bodies/bash-body";

// Per-card output height cap (px) — matches bash so remote logs stay compact and
// scroll within the window, following the tail while streaming.
const SSH_BODY_MAX_HEIGHT = 200;

// --- defensive parse (local; no coupling to the monolith) -------------------

/** Pull the first text part out of an `AgentToolResult`-shaped output. */
function readResultText(output: unknown): string | undefined {
	const content = readField(output, "content");
	if (Array.isArray(content)) {
		for (const part of content) {
			const text = readField(part, "text");
			if (typeof text === "string") return text;
		}
	}
	const text = readField(output, "text");
	return typeof text === "string" ? text : undefined;
}

/** Best-effort strip of the trailing bracketed OutputMeta notice (`\n\n[…]`) Engine appends
 *  when output is truncated. Applied only when truncation is flagged. */
function stripTrailingBracketNotice(text: string): string {
	return text.replace(/\n*\n\[[^\]]*\][ \t]*$/, "");
}

type SshRenderContext = {
	readonly host: string;
	readonly command: string;
	readonly streaming: boolean;
	readonly isError: boolean;
	readonly truncated: boolean;
	readonly artifact: string | undefined;
	readonly output: string;
};

function readSshOutput(call: ActiveToolCall, truncated: boolean): string {
	let output = readResultText(call.output) ?? call.text ?? "";
	if (truncated) output = stripTrailingBracketNotice(output);
	return output.replace(/\s+$/, "");
}

function readSshErrorState(call: ActiveToolCall, details: unknown): boolean {
	return (
		call.status === "error" || readField(call.output, "isError") === true || readField(details, "isError") === true
	);
}

function readSshContext(call: ActiveToolCall): SshRenderContext {
	const details = readField(call.output, "details");
	const truncation = readField(readField(details, "meta"), "truncation");
	const truncated = truncation != null && truncation !== false;
	const artifactId = readStringField(truncation, "artifactId");
	return {
		host: readStringField(call.input, "host") ?? "…",
		command: readStringField(call.input, "command", "cmd") ?? "",
		streaming: call.status === "running",
		isError: readSshErrorState(call, details),
		truncated,
		artifact: artifactId ? `artifact://${artifactId}` : undefined,
		output: readSshOutput(call, truncated),
	};
}

function buildSshBadges(ctx: SshRenderContext): ReactNode[] | undefined {
	const badges: ReactNode[] = [
		<Badge key="host" variant="code" tone="mute">
			{ctx.host}
		</Badge>,
	];
	if (ctx.truncated) {
		badges.push(
			<Badge key="trunc" variant="code" tone="warn">
				⚠ truncated
			</Badge>,
		);
	}
	return badges;
}

function renderSshBody(ctx: SshRenderContext): ReactNode {
	// Remote output streams live into the term surface while running (tail-following),
	// matching the TUI; the truncation note lands only on finish.
	return (
		<ToolBodyCard>
			<ToolBodySection
				icon="termBox"
				title={
					<>
						<span className="text-fr-text-3">$ </span>
						{ctx.command.split("\n")[0]}
					</>
				}
				footer={ctx.streaming ? null : ctx.truncated ? <BashTruncationNote artifact={ctx.artifact} /> : null}
				maxHeight={SSH_BODY_MAX_HEIGHT}
				followTail={ctx.streaming}
				tailKey={ctx.output}
				padContent
			>
				{ctx.output ? <ToolBodyTerm lines={parseAnsi(ctx.output)} /> : null}
			</ToolBodySection>
		</ToolBodyCard>
	);
}

const renderSsh: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readSshContext(call);
	const status: ToolStatus = ctx.streaming ? "pending" : ctx.isError ? "error" : "success";
	const stat = ctx.streaming ? "running…" : ctx.isError ? "failed" : undefined;

	return {
		label: "SSH",
		badges: buildSshBadges(ctx),
		kind: "command",
		status,
		stat,
		body: renderSshBody(ctx),
	};
};

export { renderSsh };

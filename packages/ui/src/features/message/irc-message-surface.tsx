// IrcMessageSurface — compact transcript card for Engine's IRC custom messages
// (agent↔agent traffic surfaced on the main session). Engine emits three display
// custom messages:
//   - irc:incoming  — a DM delivered to this session   (from → me)
//   - irc:relay     — observed agent→agent traffic      (from → to)
//   - irc:autoreply — a side-channel reply sent for us  (me → to)
//
// Registered as the `msg:irc:incoming` / `msg:irc:relay` / `msg:irc:autoreply`
// surface renderers. Like AsyncResultSurface, the transcript row reliably
// carries only `text` (the rendered `<irc>…</irc>` / `[IRC …]` envelope) — the
// structured `payload` (`details`) is dropped on snapshot hydration and is not
// even threaded through the live render path. So we resolve payload-first but
// fall back to parsing the envelope text, never showing raw `<irc>` tags or the
// model-only boilerplate. Mirrors the TUI card's who→who + quote-bordered body.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

export type IrcMessageKind = "incoming" | "relay" | "autoreply";

/** Normalized IRC card fields, merged payload-first / text-fallback. */
export interface IrcMessageFields {
	readonly kind: IrcMessageKind;
	/** Sender id, or "" when implicitly this session (autoreply). */
	readonly from: string;
	/** Recipient id, or undefined when implicitly this session (incoming). */
	readonly to?: string;
	readonly body: string;
	readonly replyTo?: string;
}

function kindFromCustomType(customType: string): IrcMessageKind {
	if (customType === "irc:relay") return "relay";
	if (customType === "irc:autoreply") return "autoreply";
	return "incoming";
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/**
 * Parse the rendered `irc:incoming` template:
 *   Incoming IRC message from agent `FROM` (replying to REPLYTO):
 *
 *   BODY…
 *
 *   If a response is expected, … | You are mid-task, …
 * Extracts `from`/`replyTo` and the clean body (header + trailing boilerplate
 * removed). Tolerant: missing pieces collapse to empty strings, never throws.
 */
export function parseIrcIncomingText(raw: string): { from: string; replyTo?: string; body: string } {
	// Drop the `<irc>…</irc>` wrapper the incoming template adds.
	const inner = raw
		.trim()
		.replace(/^<irc>\s*/i, "")
		.replace(/\s*<\/irc>\s*$/i, "")
		.trim();
	const fromMatch = /Incoming IRC message from agent\s+`([^`]+)`/i.exec(inner);
	const from = fromMatch?.[1]?.trim() ?? "";
	const replyTo = /\(replying to ([^)]+)\)/i.exec(inner)?.[1]?.trim() || undefined;
	let body = inner;
	if (fromMatch) {
		// Drop everything up to and including the header line (ends at first newline).
		const afterHeader = inner.slice(fromMatch.index);
		const nl = afterHeader.indexOf("\n");
		body = nl >= 0 ? afterHeader.slice(nl + 1) : "";
	}
	// Cut the model-only trailing boilerplate paragraph.
	body = body.replace(/\n*(?:If a response is expected|You are mid-task,)[\s\S]*$/i, "");
	return { from, replyTo, body: body.trim() };
}

const RELAY_HEADER = /^\[IRC\s+`([^`]+)`\s*(?:\u2192|->)\s*`([^`]+)`\]/;
const AUTOREPLY_HEADER = /^\[IRC\s+you\s*(?:\u2192|->)\s*`([^`]+)`\s*\(auto\)\]/i;

/** Parse the `[IRC \`FROM\` → \`TO\`]\n\nBODY` relay envelope. Tolerant. */
export function parseIrcRelayText(raw: string): { from: string; to: string; body: string } {
	const s = raw.trim();
	const header = RELAY_HEADER.exec(s);
	const from = header?.[1]?.trim() ?? "";
	const to = header?.[2]?.trim() ?? "";
	const body = header ? s.slice(header.index + header[0].length) : s;
	return { from, to, body: body.trim() };
}

/** Parse the `[IRC you → \`TO\` (auto)]\n\nBODY` autoreply envelope. Tolerant. */
export function parseIrcAutoreplyText(raw: string): { to: string; body: string } {
	const s = raw.trim();
	const header = AUTOREPLY_HEADER.exec(s);
	const to = header?.[1]?.trim() ?? "";
	const body = header ? s.slice(header.index + header[0].length) : s;
	return { to, body: body.trim() };
}

/**
 * Resolve a surface input into normalized IRC card fields. Prefers the
 * structured `payload` (Engine `details`) and falls back to parsing the envelope
 * `text` for any field the payload is missing (the real render path / snapshot
 * hydration only carry text). Returns null for non-message inputs.
 */
export function resolveIrcMessage(input: SurfaceRenderInput): IrcMessageFields | null {
	if (input.channel !== "message") return null;
	const kind = kindFromCustomType(input.customType);
	const payload: Record<string, unknown> =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : {};
	const text = input.text ?? "";

	if (kind === "relay") {
		// details: { from, to, body }
		let from = str(payload.from).trim();
		let to = str(payload.to).trim();
		let body = str(payload.body);
		if (!from || !to || !body) {
			const parsed = parseIrcRelayText(text);
			from ||= parsed.from;
			to ||= parsed.to;
			if (!body) body = parsed.body;
		}
		return { kind, from, to, body };
	}

	if (kind === "autoreply") {
		// details: { to, body, replyTo } — `from` is implicitly this session ("me").
		let to = str(payload.to).trim();
		let body = str(payload.body);
		const replyTo = str(payload.replyTo).trim() || undefined;
		if (!to || !body) {
			const parsed = parseIrcAutoreplyText(text);
			to ||= parsed.to;
			if (!body) body = parsed.body;
		}
		return { kind, from: "", to, body, replyTo };
	}

	// incoming — details: { id, from, message, replyTo? }; `to` is implicitly "me".
	let from = str(payload.from).trim();
	let body = str(payload.message);
	let replyTo = str(payload.replyTo).trim() || undefined;
	if (!from || !body) {
		const parsed = parseIrcIncomingText(text);
		from ||= parsed.from;
		if (!body) body = parsed.body;
		replyTo ||= parsed.replyTo;
	}
	return { kind, from, body, replyTo };
}

const KIND_LABEL: Record<IrcMessageKind, string> = {
	incoming: "incoming",
	relay: "relay",
	autoreply: "auto-reply",
};

/** A routing endpoint chip: real agent ids highlight, the implicit "me" mutes. */
function EndpointChip({ id }: { readonly id: string }) {
	const me = id === "me";
	return (
		<Badge variant="code" tone={me ? "mute" : "accent"} className="min-w-0 max-w-[12rem] fr-overflow">
			{id || "?"}
		</Badge>
	);
}

export function IrcMessageSurface({ fields }: { readonly fields: IrcMessageFields }) {
	const { kind, from, to, body, replyTo } = fields;
	// Routing labels: incoming = from → me; relay = from → to; autoreply = me → to.
	const left = kind === "autoreply" ? "me" : from || "?";
	const right = kind === "incoming" ? "me" : to || "?";
	return (
		<div data-slot="irc-message" className="flex min-w-0 flex-col gap-1 py-0.5">
			<div
				data-slot="irc-message-head"
				className="flex min-w-0 flex-wrap items-center gap-2 font-secondary text-fr-xs text-fr-text-3"
			>
				<span aria-hidden className="shrink-0 text-fr-blue text-fr-xs leading-none">
					{"\u21C4"}
				</span>
				<span className="shrink-0 font-medium text-fr-text-2">IRC</span>
				<span data-slot="irc-message-route" className="flex min-w-0 items-center gap-1">
					<EndpointChip id={left} />
					<span aria-hidden className="shrink-0 text-fr-text-3">
						{"\u2192"}
					</span>
					<EndpointChip id={right} />
				</span>
				<Badge variant="soft" tone="mute" className="shrink-0">
					{KIND_LABEL[kind]}
				</Badge>
				{replyTo && <span className="shrink-0 text-fr-text-3">reply</span>}
			</div>
			{body.trim() && (
				<div
					data-slot="irc-message-body"
					className="min-w-0 whitespace-pre-wrap border-fr-border-soft border-l-2 pl-2 font-secondary text-fr-sm text-fr-text-2"
				>
					{body}
				</div>
			)}
		</div>
	);
}

/** `msg:irc:*` surface renderer — picks the variant from `input.customType`. */
export function renderIrcMessage(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	const fields = resolveIrcMessage(input);
	if (fields === null) return null;
	return <IrcMessageSurface fields={fields} />;
}

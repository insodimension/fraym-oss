// FeedbackResultSurface — transcript card for the /feedback command's result
// (the `feedback-result` custom message). After a user files feedback the agent
// posts a confirmation; rather than the raw one-line sentence, render a compact
// card: a status icon + label, the triage category, the server ref id, and the
// turns/size that were sent. Like IrcMessageSurface, the transcript row reliably
// carries only `text` (the live render path + snapshot hydration drop the
// structured `payload`/`details`), so resolve payload-first but fall back to
// parsing the confirmation text for every field — never a raw sentence dump.
// Registered as the `msg:feedback-result` surface renderer.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import { cn } from "../../lib/cn";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

export type FeedbackStatus = "sent" | "flushed" | "queued" | "rejected" | "cancelled" | "usage" | "empty" | "info";

/** Normalized card fields, merged payload-first / text-fallback. */
export interface FeedbackResultFields {
	readonly status: FeedbackStatus;
	readonly message: string;
	readonly ref?: string;
	readonly category?: string;
	readonly title?: string;
	readonly report?: string;
	readonly selectedCount?: number;
	readonly totalTurns?: number;
	readonly sizeKb?: number;
	readonly queuedCount?: number;
}

const CATEGORY_RE = /\[(bug|improvement|tool-issue|question|other)\]/;

/** Derive the status from a confirmation sentence. Order matters (sent before queued). */
export function statusFromText(raw: string): FeedbackStatus {
	const t = raw.toLowerCase();
	if (/feedback sent/.test(t)) return "sent";
	if (/flushed \d|flushed \w/.test(t)) return "flushed";
	if (/rejected/.test(t)) return "rejected";
	if (/saved offline|still queued|couldn't (reach|send)/.test(t)) return "queued";
	if (/cancelled/.test(t)) return "cancelled";
	if (/^usage:/.test(t)) return "usage";
	if (/nothing to send/.test(t)) return "empty";
	return "info";
}

function num(value: unknown): number | undefined {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : undefined;
}

function str(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Parse the confirmation text into card fields — the reliable render path. */
export function parseFeedbackResultText(raw: string): FeedbackResultFields {
	// Block 1 is the parseable status line; the agent's title (block 2) and report
	// (blocks 3+) ride along on a `sent` message — the reliable channel, since the
	// render path drops the structured payload.
	const blocks = raw.trim().split(/\n{2,}/);
	const statusLine = blocks[0] ?? "";
	const status = statusFromText(statusLine);
	const ref = statusLine.match(/\(ref ([^)]+)\)/)?.[1]?.trim();
	const turns = statusLine.match(/(\d+)\/(\d+)\s+turns/);
	const kb = statusLine.match(/~\s*([\d.]+)\s*KB/i)?.[1];
	const queued = statusLine.match(/\((\d+)\s+queued\)/)?.[1];
	// Category tags only ride the sent/queued/rejected lines; usage text has
	// `[--full]` (a leading `--`, so CATEGORY_RE never matches it).
	const category =
		status === "sent" || status === "flushed" || status === "queued" || status === "rejected"
			? statusLine.match(CATEGORY_RE)?.[1]
			: undefined;
	const title = blocks[1]?.trim() || undefined;
	const report = blocks.slice(2).join("\n\n").trim() || undefined;
	return {
		status,
		message: statusLine,
		...(ref ? { ref } : {}),
		...(category ? { category } : {}),
		...(title ? { title } : {}),
		...(report ? { report } : {}),
		...(turns ? { selectedCount: Number(turns[1]), totalTurns: Number(turns[2]) } : {}),
		...(kb ? { sizeKb: Number(kb) } : {}),
		...(queued ? { queuedCount: Number(queued) } : {}),
	};
}

/**
 * Resolve a surface input into card fields. Prefers the structured `payload`
 * (Engine `details`) and falls back to the parsed confirmation `text` for any field
 * the payload is missing (the real render path / snapshot hydration carry only
 * text). Returns null for non-message inputs.
 */
export function resolveFeedbackResult(input: SurfaceRenderInput): FeedbackResultFields | null {
	if (input.channel !== "message") return null;
	const base = parseFeedbackResultText(input.text ?? "");
	const payload =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : null;
	if (!payload) return base;

	const pStatus = str(payload.status);
	const status = pStatus && pStatus in STATUS_META ? (pStatus as FeedbackStatus) : base.status;
	const ref = str(payload.ref) ?? base.ref;
	const category = str(payload.category) ?? base.category;
	const title = str(payload.title) ?? base.title;
	const report = str(payload.report) ?? base.report;
	const selectedCount = num(payload.selectedCount) ?? base.selectedCount;
	const totalTurns = num(payload.totalTurns) ?? base.totalTurns;
	const sizeKb = num(payload.sizeKb) ?? base.sizeKb;
	const queuedCount = num(payload.queuedCount) ?? base.queuedCount;
	return {
		status,
		message: base.message,
		...(ref ? { ref } : {}),
		...(category ? { category } : {}),
		...(title ? { title } : {}),
		...(report ? { report } : {}),
		...(selectedCount != null ? { selectedCount } : {}),
		...(totalTurns != null ? { totalTurns } : {}),
		...(sizeKb != null ? { sizeKb } : {}),
		...(queuedCount != null ? { queuedCount } : {}),
	};
}

interface StatusMeta {
	readonly label: string;
	readonly glyph: string;
	readonly glyphClass: string;
}

const STATUS_META: Record<FeedbackStatus, StatusMeta> = {
	sent: { label: "Feedback sent", glyph: "\u2713", glyphClass: "text-fr-add" },
	flushed: { label: "Feedback flushed", glyph: "\u2713", glyphClass: "text-fr-add" },
	queued: { label: "Feedback queued offline", glyph: "\u23F1", glyphClass: "text-fr-warn" },
	rejected: { label: "Feedback rejected", glyph: "\u2715", glyphClass: "text-fr-del" },
	cancelled: { label: "Feedback cancelled", glyph: "\u2715", glyphClass: "text-fr-text-3" },
	usage: { label: "Feedback", glyph: "\u2139", glyphClass: "text-fr-text-3" },
	empty: { label: "Nothing to send", glyph: "\u2139", glyphClass: "text-fr-text-3" },
	info: { label: "Feedback", glyph: "\u2139", glyphClass: "text-fr-text-3" },
};

export function FeedbackResultSurface({ fields }: { readonly fields: FeedbackResultFields }) {
	const meta = STATUS_META[fields.status];
	const metric =
		fields.selectedCount != null && fields.totalTurns != null
			? `${fields.selectedCount}/${fields.totalTurns} turns${fields.sizeKb != null ? ` \u00B7 ~${fields.sizeKb} KB` : ""}`
			: undefined;
	// For the structured states (sent/queued/rejected/flushed) the head row says
	// it all; for the plain states show the sentence so nothing is lost.
	const plain = fields.status === "usage" || fields.status === "empty" || fields.status === "info";
	const showBody = (plain || fields.status === "cancelled") && !fields.title && fields.message.length > 0;
	return (
		<div data-slot="feedback-result" className="flex min-w-0 flex-col gap-1 py-0.5">
			<div
				data-slot="feedback-result-head"
				className="flex min-w-0 flex-wrap items-center gap-2 font-secondary text-fr-text-3 text-fr-xs"
			>
				<span aria-hidden className={cn("shrink-0 text-fr-xs leading-none", meta.glyphClass)}>
					{meta.glyph}
				</span>
				<span className="shrink-0 font-medium text-fr-text-2">{meta.label}</span>
				{fields.category && (
					<Badge variant="soft" tone="blue" className="shrink-0">
						{fields.category}
					</Badge>
				)}
				{fields.ref && (
					<Badge variant="code" tone="mute" className="min-w-0 max-w-[14rem] shrink-0 fr-overflow">
						{fields.ref}
					</Badge>
				)}
				{metric && <span className="shrink-0 text-fr-text-3">{metric}</span>}
				{fields.queuedCount != null && <span className="shrink-0 text-fr-text-3">{fields.queuedCount} queued</span>}
			</div>
			{fields.title && (
				<div
					data-slot="feedback-result-title"
					className="min-w-0 font-medium font-secondary text-fr-sm text-fr-text-2"
				>
					{fields.title}
				</div>
			)}
			{fields.report && (
				<div
					data-slot="feedback-result-report"
					className="min-w-0 whitespace-pre-wrap border-fr-border-soft border-l-2 pl-2 font-secondary text-fr-sm text-fr-text-3"
				>
					{fields.report}
				</div>
			)}
			{showBody && (
				<div data-slot="feedback-result-body" className="min-w-0 font-secondary text-fr-text-3 text-fr-xs">
					{fields.message}
				</div>
			)}
		</div>
	);
}

/** `msg:feedback-result` surface renderer. */
export function renderFeedbackResult(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	const fields = resolveFeedbackResult(input);
	if (fields === null) return null;
	return <FeedbackResultSurface fields={fields} />;
}

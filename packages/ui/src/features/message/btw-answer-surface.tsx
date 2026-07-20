// BtwAnswerSurface — transcript card for Engine's `btw-answer` custom message (the
// answer to an ephemeral `/btw` side-question). Without a dedicated surface the
// answer renders as a generic muted command-block; here it reads as a proper
// question + answer card — the aside label, the question the user asked, and the
// model's answer rendered as markdown. Registered as the `msg:btw-answer` surface.
//
// Resolution is payload-first (structured `details` = { question, answer }, the
// reliable carrier on the live lane where a string-content custom message yields
// no `text`) and falls back to the message `text` for the answer alone (snapshot
// hydration drops the structured payload, keeping only the persisted content).

import type { ReactNode } from "react";
import { StaticMarkdownLite } from "../../elements/static-markdown-lite";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

export interface BtwAnswerFields {
	/** The side-question the user asked. Absent when only the persisted answer text survives (snapshot hydration). */
	readonly question?: string;
	readonly answer: string;
}

/** Resolve a surface input into normalized btw-answer fields. Prefers the structured
 *  `payload` (Engine `BtwAnswerDetails`) and falls back to the message `text` for the
 *  answer. Returns null for non-message inputs or when there is no answer to show. */
export function resolveBtwAnswer(input: SurfaceRenderInput): BtwAnswerFields | null {
	if (input.channel !== "message") return null;
	const payload: Record<string, unknown> =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : {};
	const question = typeof payload.question === "string" ? payload.question.trim() : "";
	const answer = (typeof payload.answer === "string" ? payload.answer.trim() : "") || (input.text ?? "").trim();
	if (!answer) return null;
	return { ...(question ? { question } : {}), answer };
}

export function BtwAnswerSurface({ fields }: { readonly fields: BtwAnswerFields }) {
	return (
		<div data-slot="btw-answer" className="flex min-w-0 flex-col gap-1.5 py-0.5">
			<div
				data-slot="btw-answer-head"
				className="flex min-w-0 items-baseline gap-2 font-secondary text-fr-text-3 text-fr-xs"
			>
				<span aria-hidden className="shrink-0 text-fr-accent leading-none">
					{"\u203B"}
				</span>
				<span className="shrink-0 font-medium text-fr-text-2">Aside</span>
				{fields.question && (
					<span data-slot="btw-answer-question" className="min-w-0 whitespace-pre-wrap text-fr-text-3">
						{fields.question}
					</span>
				)}
			</div>
			<div data-slot="btw-answer-body" className="min-w-0 border-fr-border-soft border-l-2 pl-2.5">
				<StaticMarkdownLite text={fields.answer} className="text-fr-sm text-fr-text-2" />
			</div>
		</div>
	);
}

/** `msg:btw-answer` surface renderer — a question + answer card for a `/btw` reply. */
export function renderBtwAnswer(input: SurfaceRenderInput): ReactNode {
	const fields = resolveBtwAnswer(input);
	if (fields === null) return null;
	return <BtwAnswerSurface fields={fields} />;
}

"use client";

// handoff-context-surface — TUI parity for the `/handoff` seed message.
//
// A handoff session opens with a journaled `custom_message` (customType
// "handoff", display: true) carrying the full `<handoff-context>` document —
// 10K+ characters of goal/constraints/state. The TUI renders it as a slim
// expandable "handoff" divider (HandoffSummaryMessageComponent, the same
// affordance as /compact); without this renderer Fraym dumped the ENTIRE
// document as a plain text bubble at the top of the new session.
//
// Registered as the `msg:handoff` surface renderer. The transcript row
// reliably carries only `text` (snapshot hydration drops structured details),
// so we extract the document straight from the tagged envelope.

import { type ReactNode, useState } from "react";
import { CollapseRegion } from "../../elements/collapse-region";
import { StreamingMarkdown } from "../../elements/streaming-markdown";
import { Icon } from "../../icons";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

/** The handoff document inside `<handoff-context>…</handoff-context>` — mirrors
 *  the TUI's extractHandoffDocument (untagged text passes through whole). */
export function extractHandoffDocument(text: string): string {
	const openTag = "<handoff-context>";
	const closeTag = "</handoff-context>";
	const openIndex = text.indexOf(openTag);
	if (openIndex === -1) return text.trim();
	const contentStart = openIndex + openTag.length;
	const closeIndex = text.indexOf(closeTag, contentStart);
	return (closeIndex === -1 ? text.slice(contentStart) : text.slice(contentStart, closeIndex)).trim();
}

export function HandoffContextSurface({ text }: { readonly text: string }) {
	const [open, setOpen] = useState(false);
	const document = extractHandoffDocument(text);
	return (
		<div data-slot="handoff-context" className="flex flex-col gap-1">
			<div className="flex items-center gap-4">
				<span className="h-px flex-1 bg-fr-accent-line" />
				<button
					type="button"
					aria-expanded={open}
					onClick={() => setOpen(value => !value)}
					className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-1 font-secondary text-fr-xs text-fr-text-3 transition-colors hover:text-fr-text-2"
				>
					<Icon name="branch" size={12} />
					Started from handoff context
					<Icon name={open ? "caretD" : "caretR"} size={12} />
				</button>
				<span className="h-px flex-1 bg-fr-accent-line" />
			</div>
			<CollapseRegion open={open}>
				<div className="mx-auto my-1 w-full max-w-3xl rounded-[9px] border border-fr-border-soft bg-fr-surface px-4 py-3">
					<StreamingMarkdown text={document || "_No handoff content._"} className="text-fr-sm" />
				</div>
			</CollapseRegion>
		</div>
	);
}

/** `msg:handoff` surface renderer — collapsed handoff-context divider (TUI parity). */
export function renderHandoffContext(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	return <HandoffContextSurface text={input.text ?? ""} />;
}

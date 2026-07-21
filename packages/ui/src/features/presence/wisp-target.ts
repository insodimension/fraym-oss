import type { WispTarget } from "@fraym-ai/vibr";

export interface WispPriorityInput {
	/** End-of-revealed-text caret, or null when no live text is on screen. */
	readonly caret: WispTarget | null;
	/** Caret has advanced since the wisp last rode a tool (staleness ledger). */
	readonly caretFresh: boolean;
	/** Smooth-text reveal is lagging the raw text — finish the sentence. */
	readonly draining: boolean;
	/** A tool is running right now (its landing spot), else null. */
	readonly tool: WispTarget | null;
	/** Resting spot at the END of the just-finished tool, during its grace window. */
	readonly finished: WispTarget | null;
	/** Viewport-y of the tool the wisp last rode (−Infinity before any ride). */
	readonly toolRiddenY: number;
	/** The turn is streaming. */
	readonly isStreaming: boolean;
}

/** A caret counts only if it is not ABOVE the last tool the wisp rode. */
const FORWARD_SLACK = 8;

/**
 * Choose where the wisp should go this frame, in priority order.
 *
 * The load-bearing invariant is FORWARD-ONLY reading flow: once the wisp has
 * ridden a tool (`toolRiddenY`), a caret above that tool is never targeted — so
 * when the tool finishes the wisp does NOT fly back up to the text that preceded
 * it (the previous-line bug). With no forward caret and no running tool, it
 * rests at the finished tool's end (`finished`) rather than darting home/up.
 */
export function pickWispPriority(input: WispPriorityInput): WispTarget | null {
	const { caret, caretFresh, draining, tool, finished, toolRiddenY, isStreaming } = input;
	const forwardCaret = caret && caret.y >= toolRiddenY - FORWARD_SLACK ? caret : null;
	return (draining ? forwardCaret : null) ?? tool ?? (isStreaming && caretFresh ? forwardCaret : null) ?? finished;
}

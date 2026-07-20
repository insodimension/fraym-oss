// useIsSessionContinued — true once this session's transcript ends with a
// journaled `session_continuation` divider (handoff / `/new` / plan "fresh
// context"). The source session is terminal at that point: the engine guard
// (`acp-agent.ts` `#isSupersededSessionId`) already rejects a stale send, so
// this is pure UX — gate the composer instead of waiting for that error.

import type { SessionTranscriptMessage } from "./session-types";
import { useSession } from "./use-session";

/** The successor a source session was continued into, extracted from the trailing
 *  continuation divider — powers both the composer gate and the "Open session"
 *  affordance so the user is never stranded on a terminal source session. */
export interface SessionContinuation {
	/** The transcript ends with a continuation divider: the source is terminal. */
	readonly continued: boolean;
	/** Successor/continuation session id, when the divider carries one. */
	readonly toSessionId?: string;
	/** Provenance: "handoff" | "new" | "plan" | "sidequest" | … */
	readonly reason?: string;
}

/** Pure predicate, exported for unit tests — see {@link useIsSessionContinued}. */
export function isTranscriptContinued(transcript: readonly SessionTranscriptMessage[]): boolean {
	const last = transcript.at(-1);
	return last?.role === "divider" && last.variant === "continuation";
}

/** Pure extractor, exported for unit tests + the workspace pane's composer gate. */
export function transcriptContinuation(transcript: readonly SessionTranscriptMessage[]): SessionContinuation {
	const last = transcript.at(-1);
	if (last?.role === "divider" && last.variant === "continuation") {
		return { continued: true, toSessionId: last.toSessionId, reason: last.reason };
	}
	return { continued: false };
}

export function useIsSessionContinued(): boolean {
	return isTranscriptContinued(useSession().transcript);
}

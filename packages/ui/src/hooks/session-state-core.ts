export { createInitialState } from "./session-initial-state";

import { reduceFeatureEvent } from "./session-features";
import { reduceJournalEvent } from "./session-journal";
import { reduceSessionLifecycle } from "./session-lifecycle";
import { reduceStatusEvent } from "./session-status";
import { reduceSubagentEvent } from "./session-subagents";
import { reduceToolEvent } from "./session-tools";
import { reduceTranscriptEvent } from "./session-transcript";
import type { SessionState, SessionStateAction } from "./session-types";

type SessionReducer = (state: SessionState, event: SessionStateAction) => SessionState | undefined;

const SESSION_REDUCERS: readonly SessionReducer[] = [
	reduceSessionLifecycle,
	reduceJournalEvent,
	reduceTranscriptEvent,
	reduceToolEvent,
	reduceFeatureEvent,
	reduceStatusEvent,
	reduceSubagentEvent,
];

export function reduceSessionEvent(state: SessionState, event: SessionStateAction): SessionState {
	for (const reduce of SESSION_REDUCERS) {
		const next = reduce(state, event);
		if (next) return next;
	}
	return state;
}

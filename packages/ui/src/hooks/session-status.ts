import { upsertNotice } from "./session-features";
import type { SessionState, SessionStateAction } from "./session-types";

// Domain-state reducer: typed slice writes read by dedicated surfaces, plus the
// host-UI request queue. Ephemeral "presentations" (compaction dividers, retry /
// notice / extension-compatibility banners) live in the feature registry
// (`session-features.ts`), applied by `reduceFeatureEvent`.

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;
type StatusReducer = (state: SessionState, event: SessionStateAction) => SessionState;

function hostUiRequestNotice(event: SessionEventOf<"hostUiRequest">): SessionState["notices"][number] | undefined {
	if (event.request.kind !== "notify") return undefined;
	return { level: event.request.level ?? "info", message: event.request.message };
}

function handleHostUiRequest(state: SessionState, event: SessionEventOf<"hostUiRequest">): SessionState {
	const notice = hostUiRequestNotice(event);
	return {
		...state,
		hostUiRequests: [...state.hostUiRequests.filter(r => r.requestId !== event.request.requestId), event.request],
		notices: notice ? upsertNotice(state.notices, notice) : state.notices,
	};
}

function resolveHostUiRequest(state: SessionState, event: SessionEventOf<"hostUiRequestResolved">): SessionState {
	return { ...state, hostUiRequests: state.hostUiRequests.filter(r => r.requestId !== event.requestId) };
}

function handleDismissNotice(state: SessionState, event: SessionEventOf<"dismissNotice">): SessionState {
	return { ...state, notices: state.notices.filter((_, i) => i !== event.index) };
}

const STATUS_REDUCERS: Record<string, StatusReducer | undefined> = {
	hostUiRequestResolved: (state, event) =>
		resolveHostUiRequest(state, event as SessionEventOf<"hostUiRequestResolved">),
	hostUiRequest: (state, event) => handleHostUiRequest(state, event as SessionEventOf<"hostUiRequest">),
	workingStatus: (state, event) => ({ ...state, workingStatus: (event as SessionEventOf<"workingStatus">).status }),
	contextUsage: (state, event) => ({ ...state, contextUsage: (event as SessionEventOf<"contextUsage">).usage }),
	queuedMessagesChanged: (state, event) => ({
		...state,
		snapshot: state.snapshot
			? { ...state.snapshot, queuedMessages: (event as SessionEventOf<"queuedMessagesChanged">).messages }
			: state.snapshot,
	}),
	backgroundWorkChanged: (state, event) => {
		const { hasBackgroundWork } = event as SessionEventOf<"backgroundWorkChanged">;
		return {
			...state,
			hasBackgroundWork,
			// Patch the snapshot too: the session rail derives its "working in
			// background" dot from `snapshot.hasBackgroundWork` (the live overlay
			// merged into the catalog), so the dot updates without a full snapshot.
			snapshot: state.snapshot ? { ...state.snapshot, hasBackgroundWork } : state.snapshot,
		};
	},
	tasksUpdated: (state, event) => ({ ...state, tasks: (event as SessionEventOf<"tasksUpdated">).phases }),
	planModeChanged: (state, event) => ({ ...state, planMode: (event as SessionEventOf<"planModeChanged">).state }),
	goalChanged: (state, event) => ({ ...state, goal: (event as SessionEventOf<"goalChanged">).goal }),
	modeStateChanged: (state, event) => ({ ...state, modes: (event as SessionEventOf<"modeStateChanged">).modes }),
	thinkingLevelChanged: (state, event) => ({
		...state,
		thinkingLevel: (event as SessionEventOf<"thinkingLevelChanged">).thinkingLevel,
	}),
	dismissNotice: (state, event) => handleDismissNotice(state, event as SessionEventOf<"dismissNotice">),
};

export function reduceStatusEvent(state: SessionState, event: SessionStateAction): SessionState | undefined {
	const reducer = STATUS_REDUCERS[event.type];
	return reducer?.(state, event);
}

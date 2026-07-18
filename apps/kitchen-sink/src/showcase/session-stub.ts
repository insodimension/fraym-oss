import type { SessionContextValue } from "../compat/session-ui";

// A fully-populated `SessionContextValue` with empty defaults + no-op actions, so a
// showcase can drive renderers that read session state (e.g. ConnectedSubagentBatches,
// renderTaskBatch → SubagentBatchByCall) without a live driver. Override the fields a
// given demo needs (typically `subagentBatches` / `tasks`).
const noop = async () => {};

export function stubSession(overrides: Partial<SessionContextValue> = {}): SessionContextValue {
	return {
		snapshot: null,
		tree: null,
		status: "idle",
		isOpening: false,
		isStreaming: false,
		workingStatus: null,
		contextUsage: null,
		tasks: [],
		planMode: null,
		goal: null,
		thinkingLevel: null,
		activeTools: [],
		toolCount: 0,
		subagentBatches: [],
		transcript: [],
		customMessages: {},
		hostUiRequests: [],
		isCompacting: false,
		compactionReason: null,
		vibrState: "idle",
		vibrMode: "",
		vibrVerb: "",
		energy: 0,
		notices: [],
		driver: null,
		sessionRef: null,
		sendMessage: noop,
		replaceQueuedMessages: noop,
		removeQueuedMessage: noop,
		cancelRun: noop,
		setModel: noop,
		setThinkingLevel: noop,
		compact: noop,
		reload: noop,
		respondToHostUiRequest: noop,
		dismissNotice: () => {},
		hasBackgroundWork: false,
		journalSeq: 0,
		liveAgentId: null,
		modes: [],
		interruptRunForQueuedMessage: noop,
		setApprovalMode: noop,
		...overrides,
	};
}

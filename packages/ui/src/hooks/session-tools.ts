import { describeTool, type ToolKindId } from "../registries/describe-tool";
import { upsertNotice } from "./session-features";
import { finalizeRunningTools, patchToolCall, withLiveAgent } from "./session-transcript";
import type {
	ActiveToolCall,
	SessionState,
	SessionStateAction,
	SessionTranscriptMessage,
	ToolCallStatus,
	VibrMode,
} from "./session-types";

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;

// Tool activity (VIBR mode + verb) derives from the canonical `describeTool`
// model so the presence, thread read-grouping, active-work strip, and tool cards
// can never disagree on a tool's identity again.
export const KIND_TO_VIBR: Record<ToolKindId, VibrMode> = {
	read: "read",
	search: "search",
	edit: "edit",
	run: "run",
	skill: "skill",
	mcp: "mcp",
	web: "search",
	todo: "think",
	realm: "think",
	tool: "think",
};

function startToolCall(state: SessionState, event: SessionEventOf<"toolStarted">): SessionState {
	const existing = state.activeTools.find(tool => tool.callId === event.callId);
	if (existing) {
		const merged: ActiveToolCall = {
			...existing,
			toolName: event.toolName,
			...(event.displayName !== undefined ? { displayName: event.displayName } : {}),
			input: event.input ?? existing.input,
		};
		const activeTools = state.activeTools.map(tool => (tool.callId === event.callId ? merged : tool));
		return {
			...state,
			activeTools,
			transcript: patchToolCall(state.transcript, event.callId, () => merged),
		};
	}
	const tool: ActiveToolCall = {
		callId: event.callId,
		toolName: event.toolName,
		...(event.displayName !== undefined ? { displayName: event.displayName } : {}),
		input: event.input,
		status: "running",
	};
	const tools = [...state.activeTools, tool];
	const toolCount = state.toolCount + 1;
	const descriptor = describeTool(event.toolName, event.input);
	const mode = KIND_TO_VIBR[descriptor.kind];
	const next = withLiveAgent(state.transcript, state.liveAgentId, event.timestamp, blocks => [
		...blocks,
		{ type: "tool", call: tool },
	]);
	return {
		...state,
		isStreaming: true,
		activeTools: tools,
		toolCount,
		transcript: next.transcript,
		liveAgentId: next.liveAgentId,
		vibrState: "thinking",
		vibrMode: mode,
		vibrVerb: descriptor.verb,
		energy: Math.min(1, toolCount * 0.12 + 0.3),
	};
}

interface ToolUpdateValues {
	readonly text: ActiveToolCall["text"];
	readonly progress: ActiveToolCall["progress"];
	readonly output: ActiveToolCall["output"];
	readonly input: ActiveToolCall["input"];
	readonly metadata: ActiveToolCall["metadata"];
}

function shouldMergeToolInput(partialInput: unknown, currentInput: unknown): boolean {
	return (
		!!partialInput && typeof partialInput === "object" && typeof currentInput === "object" && currentInput !== null
	);
}

function nextToolInput(event: SessionEventOf<"toolUpdated">, tool: ActiveToolCall): ActiveToolCall["input"] {
	if (shouldMergeToolInput(event.partialInput, tool.input)) {
		return { ...(tool.input as object), ...(event.partialInput as object) };
	}
	return event.partialInput ?? tool.input;
}

// Merge streamed metadata into the tool call, returning the SAME ref when nothing
// changed so the reducer can short-circuit. Compares the full ToolCallMetadata shape
// (not just `extra`) so a transport streaming durationMs/tokens mid-run isn't dropped.
function sameMetadata(a: ActiveToolCall["metadata"], b: ActiveToolCall["metadata"]): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	if (a.durationMs !== b.durationMs || a.tokens !== b.tokens || a.cachedTokens !== b.cachedTokens) return false;
	const ea = a.extra ?? {};
	const eb = b.extra ?? {};
	const keys = Object.keys(ea);
	return keys.length === Object.keys(eb).length && keys.every(key => ea[key] === eb[key]);
}

function nextToolMetadata(event: SessionEventOf<"toolUpdated">, tool: ActiveToolCall): ActiveToolCall["metadata"] {
	if (!event.metadata) return tool.metadata;
	const extra = { ...(tool.metadata?.extra ?? {}), ...(event.metadata.extra ?? {}) };
	const merged = { ...tool.metadata, ...event.metadata, ...(Object.keys(extra).length > 0 ? { extra } : {}) };
	return sameMetadata(merged, tool.metadata) ? tool.metadata : merged;
}

function nextToolUpdateValues(event: SessionEventOf<"toolUpdated">, tool: ActiveToolCall): ToolUpdateValues {
	return {
		text: event.text ?? tool.text,
		progress: event.progress ?? tool.progress,
		output: event.partialResult ?? tool.output,
		metadata: nextToolMetadata(event, tool),
		input: nextToolInput(event, tool),
	};
}

function toolUpdateChanged(values: ToolUpdateValues, tool: ActiveToolCall): boolean {
	return (
		!Object.is(values.text, tool.text) ||
		!Object.is(values.progress, tool.progress) ||
		!Object.is(values.output, tool.output) ||
		!Object.is(values.input, tool.input) ||
		!Object.is(values.metadata, tool.metadata)
	);
}

function applyToolUpdate(event: SessionEventOf<"toolUpdated">, t: ActiveToolCall): ActiveToolCall {
	const values = nextToolUpdateValues(event, t);
	return toolUpdateChanged(values, t) ? { ...t, ...values } : t;
}

function updateToolCall(state: SessionState, event: SessionEventOf<"toolUpdated">): SessionState {
	let changed = false;
	const apply = (t: ActiveToolCall): ActiveToolCall => {
		const next = applyToolUpdate(event, t);
		if (next !== t) changed = true;
		return next;
	};
	const activeTools = state.activeTools.map(t => (t.callId === event.callId ? apply(t) : t));
	const transcript = patchToolCall(state.transcript, event.callId, apply);
	return changed ? { ...state, activeTools, transcript } : state;
}

function finishToolCall(state: SessionState, event: SessionEventOf<"toolFinished">): SessionState {
	const apply = (t: ActiveToolCall): ActiveToolCall => ({
		...t,
		status: (event.success ? "success" : "error") as ToolCallStatus,
		output: event.output,
		metadata: event.metadata ?? t.metadata,
	});
	const tools = state.activeTools.map(t => (t.callId === event.callId ? apply(t) : t));
	const running = tools.filter(t => t.status === "running");
	return {
		...state,
		activeTools: tools,
		transcript: patchToolCall(state.transcript, event.callId, apply),
		vibrMode: running.length > 0 ? state.vibrMode : "think",
		vibrVerb: running.length > 0 ? state.vibrVerb : "Thinking",
	};
}

/**
 * Settle the live transcript at a run boundary. Journal updates replace the
 * transcript through `sessionJournalUpdated`; run terminal events only clear
 * in-flight tool spinners and stamp terminal metadata for transports without
 * journal support.
 */

function elapsedDurationMs(startedAt: string | undefined, endedAt: string | undefined): number | undefined {
	if (!startedAt || !endedAt) return undefined;
	const start = Date.parse(startedAt);
	const end = Date.parse(endedAt);
	return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : undefined;
}

function terminalDurationMs(message: SessionTranscriptMessage, endedAt: string | undefined): number | undefined {
	return message.durationMs ?? elapsedDurationMs(message.timestamp, endedAt);
}

function stampLatestAgentTerminalMeta(
	transcript: readonly SessionTranscriptMessage[],
	endedAt: string | undefined,
): readonly SessionTranscriptMessage[] {
	const last = transcript.at(-1);
	if (last?.role !== "agent") return transcript;
	const durationMs = terminalDurationMs(last, endedAt);
	const final = last.final ?? true;
	if (durationMs === last.durationMs && final === last.final) return transcript;
	return [...transcript.slice(0, -1), { ...last, durationMs, final }];
}

function settleTranscript(state: SessionState, endedAt: string | undefined): readonly SessionTranscriptMessage[] {
	const finalized = finalizeRunningTools(state.transcript);
	const settled = finalized.some(message => message.live)
		? finalized.map(message => (message.live ? { ...message, live: false } : message))
		: finalized;
	return stampLatestAgentTerminalMeta(settled, endedAt);
}

const RECOVERY_NOTICE_ID = "session-recovery";
const RUN_FAILURE_NOTICE_ID = "run-failure";
const TRANSIENT_NOTICE_TTL_MS = 4000;

function runFailureNotice(event: Extract<SessionStateAction, { readonly type: "runFailed" }>) {
	const message = event.error?.message.trim();
	return message ? { id: RUN_FAILURE_NOTICE_ID, level: "error" as const, message } : undefined;
}
export function reduceToolEvent(state: SessionState, event: SessionStateAction): SessionState | undefined {
	switch (event.type) {
		case "toolStarted":
			return startToolCall(state, event);
		case "toolUpdated":
			return updateToolCall(state, event);
		case "toolFinished":
			return finishToolCall(state, event);
		case "runCompleted": {
			const recoveredFromOffline = state.reconnecting && event.snapshot.reconnecting !== true;
			const recoveryNotice = recoveredFromOffline
				? {
						id: RECOVERY_NOTICE_ID,
						level: "info" as const,
						message: "Turn completed while disconnected",
						ttlMs: TRANSIENT_NOTICE_TTL_MS,
					}
				: undefined;
			return {
				...state,
				snapshot: event.snapshot,
				status: event.snapshot.status,
				reconnecting: event.snapshot.reconnecting === true,
				isStreaming: false,
				liveAgentId: null,
				activeTools: [],
				transcript: settleTranscript(state, event.timestamp),
				vibrState: "idle",
				vibrMode: "",
				vibrVerb: "",
				energy: 0,
				workingStatus: null,
				notices: recoveryNotice ? upsertNotice(state.notices, recoveryNotice) : state.notices,
			};
		}
		case "runFailed": {
			const failureNotice = runFailureNotice(event);
			return {
				...state,
				isStreaming: false,
				liveAgentId: null,
				status: "failed",
				activeTools: [],
				transcript: settleTranscript(state, event.timestamp),
				vibrState: "idle",
				vibrMode: "",
				vibrVerb: "",
				energy: 0,
				workingStatus: null,
				notices: failureNotice ? upsertNotice(state.notices, failureNotice) : state.notices,
			};
		}
		case "sessionSwitched":
			// The conversation moved to a continuation session (`/handoff`, `/new`,
			// plan "fresh context"). The source session is finished, so settle its
			// live run state the same way runCompleted does — it never receives one
			// here (the engine emits only session_switched + an idle status flip,
			// neither otherwise handled by these reducers, so isStreaming would stay
			// true and the thread keeps showing "Working…"). `follow:false` spawns a
			// SIDE session (sidequest) and the source keeps running — leave it.
			if (!event.follow) return undefined;
			return {
				...state,
				status: "idle",
				isStreaming: false,
				liveAgentId: null,
				activeTools: [],
				transcript: settleTranscript(state, event.timestamp),
				vibrState: "idle",
				vibrMode: "",
				vibrVerb: "",
				energy: 0,
				workingStatus: null,
				snapshot: state.snapshot ? { ...state.snapshot, status: "idle" } : state.snapshot,
			};
		default:
			return undefined;
	}
}

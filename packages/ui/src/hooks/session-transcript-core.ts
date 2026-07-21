import type { SessionQueuedMessage, SessionRef } from "@fraym-ai/driver";
import type {
	ActiveToolCall,
	SessionState,
	SessionStateAction,
	SessionTranscriptMessage,
	TranscriptBlock,
} from "./session-types";

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;

function eventKey(type: string, sessionRef: SessionRef | undefined, timestamp: string | undefined): string {
	return `${type}:${sessionRef?.sessionId ?? "local"}:${timestamp ?? Date.now()}`;
}

/** Append streamed text/reasoning, merging into the trailing block of the same kind. */
function appendInline(
	blocks: readonly TranscriptBlock[],
	kind: "text" | "reasoning",
	text: string,
): readonly TranscriptBlock[] {
	const last = blocks.at(-1);
	if (last?.type === kind) return [...blocks.slice(0, -1), { type: kind, text: last.text + text }];
	return [...blocks, { type: kind, text }];
}

/** Set the live segment's text outright — the replace-delta path (a hydration
 *  after a mid-turn open serves the FULL accumulated segment text, superseding
 *  whatever partial tail this client happened to catch since subscribing). */
function replaceInlineText(blocks: readonly TranscriptBlock[], text: string): readonly TranscriptBlock[] {
	const last = blocks.at(-1);
	if (last?.type === "text") return [...blocks.slice(0, -1), { type: "text", text }];
	return [...blocks, { type: "text", text }];
}

/** The transcript with `update` applied to the LIVE assistant row plus the id of
 *  that row. The row is resolved by IDENTITY (`liveAgentId`), never "the trailing
 *  agent row": a row appended mid-stream (queued echo, custom message, async
 *  result) must not swallow later deltas (text leaking into a notice surface) or
 *  orphan them into a fresh mid-word fragment row. Its timestamp is the stable
 *  segment start, never the latest chunk time, so journal reconciliation can
 *  compare causal turn order. Fallbacks: adopt a trailing plain live agent row
 *  (pre-identity states, e.g. snapshot hydration), else open a new tail row. */
export function withLiveAgent(
	messages: readonly SessionTranscriptMessage[],
	liveAgentId: string | null,
	timestamp: string | undefined,
	update: (blocks: readonly TranscriptBlock[]) => readonly TranscriptBlock[],
): { readonly transcript: readonly SessionTranscriptMessage[]; readonly liveAgentId: string } {
	const patch = (index: number): { transcript: readonly SessionTranscriptMessage[]; liveAgentId: string } => {
		const row = messages[index] as SessionTranscriptMessage;
		const next = [...messages];
		next[index] = { ...row, blocks: update(row.blocks), timestamp: row.timestamp ?? timestamp };
		return { transcript: next, liveAgentId: row.id };
	};
	if (liveAgentId !== null) {
		for (let index = messages.length - 1; index >= 0; index--) {
			if (messages[index]?.id === liveAgentId) return patch(index);
		}
	}
	const last = messages.at(-1);
	if (last?.role === "agent" && last.customType === undefined) return patch(messages.length - 1);
	const id = eventKey("agent", undefined, timestamp);
	return {
		transcript: [...messages, { id, role: "agent", live: true, blocks: update([]), timestamp }],
		liveAgentId: id,
	};
}

/**
 * Map every agent-message tool block through `fn`, preserving references for
 * untouched messages/blocks (returning the same `call` means "leave it alone").
 */
function mapAgentToolBlocks(
	messages: readonly SessionTranscriptMessage[],
	fn: (call: ActiveToolCall) => ActiveToolCall,
): readonly SessionTranscriptMessage[] {
	return messages.map(message => {
		if (message.role !== "agent") return message;
		let changed = false;
		const blocks = message.blocks.map(block => {
			if (block.type !== "tool") return block;
			const call = fn(block.call);
			if (call === block.call) return block;
			changed = true;
			return { type: "tool" as const, call };
		});
		return changed ? { ...message, blocks } : message;
	});
}

/** Patch the tool block with `callId` wherever it lives, leaving every other block untouched. */
export function patchToolCall(
	messages: readonly SessionTranscriptMessage[],
	callId: string,
	patch: (call: ActiveToolCall) => ActiveToolCall,
): readonly SessionTranscriptMessage[] {
	return mapAgentToolBlocks(messages, call => (call.callId === callId ? patch(call) : call));
}

/** Mark still-running tool blocks as errored - a run can end (or be cancelled) with a tool mid-flight. */
export function finalizeRunningTools(
	messages: readonly SessionTranscriptMessage[],
): readonly SessionTranscriptMessage[] {
	return mapAgentToolBlocks(messages, call => (call.status === "running" ? { ...call, status: "error" } : call));
}

/** Concatenated plain text of a message (for dedupe against optimistic echoes). */
function transcriptText(message: SessionTranscriptMessage): string {
	return message.blocks.reduce((acc, block) => (block.type === "text" ? acc + block.text : acc), "");
}

const QUEUED_IMAGE_MARKER = /^\[Image\]\s*/;

/** Drop queued messages whose text is already a DELIVERED user turn. A steered
 *  message is injected into the live turn (and shows in the transcript) the moment
 *  it's consumed, but lingers in `snapshot.queuedMessages` until the turn-boundary
 *  queue refresh — without this it renders twice (delivered bubble + pending
 *  "Queued · steers this turn" bubble). Returns the same array ref when nothing is
 *  filtered so memoized consumers don't see a new list each render. Pure. */
export function undeliveredQueuedMessages(
	queued: readonly SessionQueuedMessage[],
	transcript: readonly SessionTranscriptMessage[],
): readonly SessionQueuedMessage[] {
	if (queued.length === 0) return queued;
	const deliveredUserText = new Map<string, number>();
	for (const message of transcript) {
		if (message.role !== "user") continue;
		const text = transcriptText(message).trim();
		if (text) deliveredUserText.set(text, (deliveredUserText.get(text) ?? 0) + 1);
	}
	if (deliveredUserText.size === 0) return queued;
	const filtered = queued.filter(message => {
		const text = message.text.replace(QUEUED_IMAGE_MARKER, "").trim();
		const remaining = deliveredUserText.get(text) ?? 0;
		if (remaining === 0) return true;
		deliveredUserText.set(text, remaining - 1);
		return false;
	});
	return filtered.length === queued.length ? queued : filtered;
}

function appendLocalUserMessage(state: SessionState, event: SessionEventOf<"localUserMessage">): SessionState {
	const imageBlocks: TranscriptBlock[] = (event.attachments ?? []).flatMap(att =>
		att.kind === "image" ? [{ type: "image", src: `data:${att.mimeType};base64,${att.data}` } as const] : [],
	);
	const blocks: TranscriptBlock[] = [
		...(event.text ? [{ type: "text", text: event.text } as const] : []),
		...imageBlocks,
	];
	const id = event.clientMessageId;
	if (state.transcript.some(message => message.id === id)) return state;
	return {
		...state,
		status: "running",
		isStreaming: true,
		vibrState: "thinking",
		vibrMode: "think",
		vibrVerb: "Thinking",
		energy: Math.max(state.energy, 0.4),
		transcript: [
			...state.transcript,
			{
				id,
				role: "user",
				live: true,
				blocks,
				timestamp: event.timestamp,
			},
		],
		// Keep the live-agent row identity: at idle it is already null (all run-end
		// paths clear it) so the next delta opens a fresh segment; MID-STREAM it must
		// be preserved so the assistant's in-progress answer keeps flowing into its
		// own row instead of the echo splitting it in two (the "my message landed
		// above the reply" bug). A delivered steer/follow-up rotates the segment for
		// real via appendQueuedUserMessage when the queued message is consumed.
		liveAgentId: state.liveAgentId,
	};
}

function appendQueuedUserMessage(state: SessionState, event: SessionEventOf<"queuedMessageStarted">): SessionState {
	const imageBlocks: TranscriptBlock[] = (event.message.attachments ?? []).flatMap(att =>
		att.kind === "image" ? [{ type: "image", src: `data:${att.mimeType};base64,${att.data}` } as const] : [],
	);
	const message: SessionTranscriptMessage = {
		id: event.message.id,
		role: "user",
		live: true,
		blocks: [...(event.message.text ? [{ type: "text", text: event.message.text } as const] : []), ...imageBlocks],
		timestamp: event.message.createdAt,
	};
	// Queue delivery/replay is keyed by the engine's stable message id. Replace
	// an optimistic interrupt echo or prior delivery wherever it sits; a tool or
	// assistant row may already follow it, so "same-text last row" is not safe.
	const existingIndex = state.transcript.findIndex(row => row.id === message.id);
	if (existingIndex >= 0) {
		const transcript = [...state.transcript];
		transcript[existingIndex] = message;
		return { ...state, transcript, liveAgentId: null };
	}
	return { ...state, transcript: [...state.transcript, message], liveAgentId: null };
}

/**
 * Append a slash-command result as its own agent message carrying a single
 * `command` block. The block keeps the engine-neutral `renderKind` the adapter
 * stamped, so the transcript→message mapper can route it to a rich panel or the
 * terminal-styled default — never a raw text dump.
 */
function appendCommandResult(state: SessionState, event: SessionEventOf<"commandResult">): SessionState {
	// A journal-backed result is already rendered by the durable journal transcript
	// (applyCommandResult); appending the live event too double-renders it (the extra
	// copy reconciles away only on the next run). Dock auto-open still fires — it
	// subscribes to the event directly, not through this reducer.
	if (event.journaled) return state;
	const block: TranscriptBlock = {
		type: "command",
		renderKind: event.renderKind ?? "command-output",
		command: event.command,
		text: event.text,
	};
	const message: SessionTranscriptMessage = {
		id: eventKey("command", event.sessionRef, event.timestamp),
		role: "agent",
		live: true,
		blocks: [block],
		timestamp: event.timestamp,
	};
	return { ...state, transcript: [...state.transcript, message] };
}

/** Append a live Engine custom message as its own agent message keyed by
 *  `customType` (ThreadMessage routes it to a `msg:<customType>` surface
 *  renderer, or the plain text body), and record it as the latest message of
 *  its type in the `customMessages` domain-state slice for docked surfaces. */
function appendCustomMessage(state: SessionState, event: SessionEventOf<"customMessage">): SessionState {
	const id = eventKey("custom", event.sessionRef, event.timestamp);
	const message: SessionTranscriptMessage = {
		id,
		role: "agent",
		live: true,
		customType: event.customType,
		blocks: [{ type: "text", text: event.text }],
		timestamp: event.timestamp,
		...(event.payload !== undefined ? { payload: event.payload } : {}),
	};
	return {
		...state,
		transcript: [...state.transcript, message],
		customMessages: {
			...state.customMessages,
			[event.customType]: {
				id,
				text: event.text,
				...(event.payload !== undefined ? { payload: event.payload } : {}),
			},
		},
	};
}

export function reduceTranscriptEvent(state: SessionState, event: SessionStateAction): SessionState | undefined {
	switch (event.type) {
		case "localUserMessage":
			return appendLocalUserMessage(state, event);
		case "assistantDelta": {
			const next = withLiveAgent(state.transcript, state.liveAgentId, event.timestamp, blocks =>
				event.replace ? replaceInlineText(blocks, event.text) : appendInline(blocks, "text", event.text),
			);
			return {
				...state,
				isStreaming: true,
				transcript: next.transcript,
				liveAgentId: next.liveAgentId,
				vibrState: "typing",
				vibrMode: state.activeTools.length > 0 ? state.vibrMode : "think",
				vibrVerb: state.activeTools.length > 0 ? state.vibrVerb : "Thinking",
			};
		}
		case "thinkingDelta": {
			const next = withLiveAgent(state.transcript, state.liveAgentId, event.timestamp, blocks =>
				appendInline(blocks, "reasoning", event.text),
			);
			return {
				...state,
				isStreaming: true,
				transcript: next.transcript,
				liveAgentId: next.liveAgentId,
				vibrState: "thinking",
				vibrMode: "think",
				vibrVerb: "Thinking",
			};
		}
		case "turnEnded": {
			// Stamp the LIVE agent row (by identity, falling back to the trailing agent
			// row) with the run's wall-clock + final-turn marker so the thread can render
			// a frozen "Worked for Xs" once the run settles. A final turn also retires
			// the live-row id — the next segment opens a fresh row.
			let index = state.transcript.length - 1;
			if (state.liveAgentId !== null) {
				for (let candidate = state.transcript.length - 1; candidate >= 0; candidate--) {
					if (state.transcript[candidate]?.id === state.liveAgentId) {
						index = candidate;
						break;
					}
				}
			}
			const row = state.transcript[index];
			if (row?.role !== "agent") return state;
			const transcript = [...state.transcript];
			transcript[index] = {
				...row,
				durationMs: event.durationMs ?? row.durationMs,
				final: event.final ?? row.final,
			};
			return {
				...state,
				transcript,
				...(event.final ? { liveAgentId: null } : {}),
			};
		}
		case "queuedMessageStarted":
			return appendQueuedUserMessage(state, event);
		case "commandResult":
			return appendCommandResult(state, event);
		case "customMessage":
			return appendCustomMessage(state, event);
		default:
			return undefined;
	}
}

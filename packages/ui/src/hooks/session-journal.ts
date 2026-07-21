import type { SessionJournalUpdatedEvent, SessionQueuedMessage } from "@fraym-ai/driver";
import type {
	LatestCustomMessage,
	SessionState,
	SessionStateAction,
	SessionTranscriptMessage,
	TranscriptBlock,
} from "./session-types";

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;

function cloneBlock(block: SessionJournalUpdatedEvent["transcript"][number]["blocks"][number]): TranscriptBlock {
	if (block.type === "tool") return { type: "tool", call: { ...block.call } };
	return block;
}

function cloneMessage(message: SessionJournalUpdatedEvent["transcript"][number]): SessionTranscriptMessage {
	return { ...message, blocks: message.blocks.map(cloneBlock) };
}

function sameBlock(a: TranscriptBlock, b: SessionJournalUpdatedEvent["transcript"][number]["blocks"][number]): boolean {
	if (a.type !== b.type) return false;
	if (a.type === "tool" && b.type === "tool") {
		return (
			a.call.callId === b.call.callId &&
			a.call.toolName === b.call.toolName &&
			a.call.status === b.call.status &&
			a.call.text === b.call.text &&
			a.call.progress === b.call.progress &&
			Object.is(a.call.input, b.call.input) &&
			Object.is(a.call.output, b.call.output) &&
			Object.is(a.call.metadata, b.call.metadata)
		);
	}
	if (a.type === "text" && b.type === "text") return a.text === b.text;
	if (a.type === "reasoning" && b.type === "reasoning") return a.text === b.text;
	if (a.type === "command" && b.type === "command") {
		return a.command === b.command && a.renderKind === b.renderKind && a.text === b.text;
	}
	if (a.type === "image" && b.type === "image") return a.src === b.src && a.alt === b.alt && a.caption === b.caption;
	if (a.type === "notice" && b.type === "notice") {
		return a.level === b.level && a.message === b.message && a.source === b.source;
	}
	if (a.type === "tokenUsage" && b.type === "tokenUsage") return Object.is(a.usage, b.usage);
	return false;
}

function sameMessage(a: SessionTranscriptMessage, b: SessionJournalUpdatedEvent["transcript"][number]): boolean {
	return (
		a.id === b.id &&
		a.role === b.role &&
		a.timestamp === b.timestamp &&
		a.meta === b.meta &&
		a.customType === b.customType &&
		a.durationMs === b.durationMs &&
		a.clientMessageId === b.clientMessageId &&
		a.final === b.final &&
		a.variant === b.variant &&
		a.settled === b.settled &&
		a.auto === b.auto &&
		a.freed === b.freed &&
		a.tokens === b.tokens &&
		a.summary === b.summary &&
		a.toSessionId === b.toSessionId &&
		a.reason === b.reason &&
		a.blocks.length === b.blocks.length &&
		a.blocks.every((block, index) => sameBlock(block, b.blocks[index]!))
	);
}

function cloneTranscriptReusingStablePrefix(
	current: readonly SessionTranscriptMessage[],
	incoming: SessionJournalUpdatedEvent["transcript"],
): readonly SessionTranscriptMessage[] {
	return incoming.map((message, index) => {
		const existing = current[index];
		return existing && sameMessage(existing, message) ? existing : cloneMessage(message);
	});
}

function cloneCustomMessages(
	messages: SessionJournalUpdatedEvent["customMessages"],
): Readonly<Record<string, LatestCustomMessage>> {
	const cloned: Record<string, LatestCustomMessage> = {};
	for (const [customType, message] of Object.entries(messages)) cloned[customType] = { ...message };
	return cloned;
}

/** Concatenated plain text of a transcript/journal message (text blocks only). */
function messageText(message: {
	readonly blocks: readonly { readonly type: string; readonly text?: string }[];
}): string {
	let out = "";
	for (const block of message.blocks) if (block.type === "text" && block.text !== undefined) out += block.text;
	return out;
}

/** Concatenated streamed text of a message — text AND reasoning blocks, in
 *  order. Live assistant rows accumulate deltas monotonically, so a live row's
 *  flow is always a PREFIX of its journaled turn's flow. */
function flowText(message: { readonly blocks: readonly { readonly type: string; readonly text?: string }[] }): string {
	let out = "";
	for (const block of message.blocks)
		if ((block.type === "text" || block.type === "reasoning") && block.text !== undefined) out += block.text;
	return out;
}

/** Detect the authoritative boundary the live ACP event lane does not emit as a
 * `queuedMessageStarted`. A queued user without a finalized assistant before it
 * can be a journal-backed pending row, not a boundary. Once the journal carries
 * that finalized assistant→user order, stale queue membership cannot veto the
 * authoritative delivery. Otherwise the user must be causally newer than the
 * active assistant's stable segment-start timestamp. Exact timestamp ties use
 * a one-to-one local echo position only; repeated text alone is never identity.
 * The scan starts at the trailing live suffix so historical users cannot rotate
 * the current stream. Unknown ordering stays conservative. */
function journalUserBoundaryAfterLiveAgent(
	current: readonly SessionTranscriptMessage[],
	incoming: SessionJournalUpdatedEvent["transcript"],
	queuedMessages: readonly SessionQueuedMessage[],
	liveAgentId: string | null,
): boolean {
	if (liveAgentId === null) return false;
	let liveAgentIndex = -1;
	for (let index = current.length - 1; index >= 0; index--) {
		if (current[index]?.id === liveAgentId) {
			liveAgentIndex = index;
			break;
		}
	}
	const liveAgent = current[liveAgentIndex];
	if (liveAgent?.role !== "agent" || liveAgent.customType !== undefined) return false;
	const liveStartedAt = Date.parse(liveAgent.timestamp ?? "");
	let suffixStart = current.length;
	while (suffixStart > 0 && current[suffixStart - 1]?.live) suffixStart--;
	for (let incomingIndex = suffixStart; incomingIndex < incoming.length; incomingIndex++) {
		const candidate = incoming[incomingIndex];
		if (candidate?.role !== "user") continue;
		const text = messageText(candidate).trim();
		const stillQueued = queuedMessages.some(
			message => message.id === candidate.id || (text !== "" && message.text.trim() === text),
		);
		let finalizedAssistantBeforeUser = false;
		for (let index = incomingIndex - 1; index >= suffixStart; index--) {
			const preceding = incoming[index];
			if (preceding?.role === "user") break;
			if (preceding?.role === "agent" && preceding.customType === undefined) {
				finalizedAssistantBeforeUser = preceding.final === true;
				break;
			}
		}
		if (stillQueued && !finalizedAssistantBeforeUser) continue;
		const userStartedAt = Date.parse(candidate.timestamp ?? "");
		if (Number.isFinite(liveStartedAt) && Number.isFinite(userStartedAt)) {
			if (userStartedAt > liveStartedAt) return true;
			if (userStartedAt < liveStartedAt) continue;
		}
		let exactEchoBeforeLive = false;
		let exactEchoAfterLive = false;
		for (let currentIndex = suffixStart; currentIndex < current.length; currentIndex++) {
			const row = current[currentIndex];
			if (row?.role !== "user" || row.timestamp !== candidate.timestamp || !journalRepresents(row, [candidate])) {
				continue;
			}
			if (currentIndex < liveAgentIndex) exactEchoBeforeLive = true;
			if (currentIndex > liveAgentIndex) exactEchoAfterLive = true;
		}
		if (exactEchoAfterLive && !exactEchoBeforeLive) return true;
	}
	return false;
}

/** A journal assistant candidate cannot represent this live segment when a
 * subsequent user predates the live segment start. Unknown or equal ordering is
 * not enough to merge structurally repeated prose across that user boundary. */
function journalAgentCanRepresentLiveSegment(
	live: SessionTranscriptMessage,
	incoming: SessionJournalUpdatedEvent["transcript"],
	candidateIndex: number,
): boolean {
	const liveStartedAt = Date.parse(live.timestamp ?? "");
	for (let index = candidateIndex + 1; index < incoming.length; index++) {
		const candidate = incoming[index];
		if (candidate?.role !== "user") continue;
		const userStartedAt = Date.parse(candidate.timestamp ?? "");
		if (!Number.isFinite(liveStartedAt) || !Number.isFinite(userStartedAt) || userStartedAt <= liveStartedAt) {
			return false;
		}
	}
	return true;
}

/** Does the incoming journal transcript already represent this LIVE row?
 *  - user echo: same trimmed text on a journaled user row (an image-only echo
 *    matches by its image srcs — the data-URL round-trips verbatim);
 *  - custom/command row: a journal row of the same customType with the same text;
 *  - streaming agent row: its flow (text+reasoning) shares a prefix with a
 *    journaled agent row's flow in EITHER direction — the live row is a prefix of
 *    the journal turn (normal streaming), OR the journal turn is a prefix of the
 *    live row (a RESUMED turn after a reconnect, whose re-streamed deltas grew the
 *    live flow past the durable text; without the reverse match that resumed row
 *    fails to dedupe and double-renders) — or it holds only tool blocks whose
 *    callIds a journaled row carries. Represented ⇒ drop the local copy (the
 *    journal row stands). */
function journalRepresents(row: SessionTranscriptMessage, incoming: SessionJournalUpdatedEvent["transcript"]): boolean {
	if (row.role === "user") {
		const text = messageText(row).trim();
		const srcs = row.blocks.flatMap(block => (block.type === "image" ? [block.src] : []));
		if (text === "" && srcs.length === 0) return true; // nothing renderable to lose
		return incoming.some(
			message =>
				message.role === "user" &&
				(message.clientMessageId === row.id ||
					(messageText(message).trim() === text &&
						(text !== "" ||
							srcs.every(src => message.blocks.some(block => block.type === "image" && block.src === src))))),
		);
	}
	if (row.customType !== undefined) {
		const text = messageText(row).trim();
		return incoming.some(message => message.customType === row.customType && messageText(message).trim() === text);
	}
	const flow = flowText(row);
	if (flow !== "")
		return incoming.some(message => {
			if (message.role !== "agent") return false;
			const journalFlow = flowText(message);
			// Bidirectional prefix: live flow is a prefix of the journal turn (normal
			// streaming), OR the journal turn is a prefix of the live flow (a resumed
			// turn after reconnect whose re-streamed deltas grew the live row past the
			// durable text). journalAgentCanRepresentLiveSegment already blocks merging
			// across a real turn boundary; the empty-journalFlow guard stops a tool-only
			// journal row (flow "") from matching every live row.
			return journalFlow !== "" && (journalFlow.startsWith(flow) || flow.startsWith(journalFlow));
		});
	// Tool callIds are the engine's — live and journal rows share them, so
	// representation survives the row-id remap.
	const callIds = row.blocks.flatMap(block => (block.type === "tool" ? [block.call.callId] : []));
	if (callIds.length > 0) {
		return incoming.some(
			message =>
				message.role === "agent" &&
				message.blocks.some(block => block.type === "tool" && callIds.includes(block.call.callId)),
		);
	}
	// Nothing renderable to lose — treat as represented.
	return true;
}

/**
 * Reconcile the trailing LIVE rows against a fresh journal.
 *
 * The live event lane runs ahead of the durable journal: a streaming assistant
 * row, an optimistic user echo, and live custom/command rows are all appended
 * locally BEFORE the engine journals them. Rebuilding the transcript to exactly
 * the journal's rows dropped that suffix — the user lane got a bespoke bandaid
 * (the vanished-echo P0), and the assistant lane kept the bug: a mid-run journal
 * append (async-result, tan dispatch, subagent terminal) truncated the live
 * stream, and the next delta re-opened a fragment row starting mid-word.
 *
 * Two outcomes per trailing live row, both keyed off `live`:
 * - The journal has NOT caught up yet ⇒ keep the live row appended (it is still
 *   the delta-fed surface).
 * - The journal HAS caught up (`journalRepresents`) ⇒ **promote in place**: adopt
 *   the journal's authoritative content but keep the live row's stable id and
 *   `live` flag. Replacing it with the freshly-cloned journal row would carry the
 *   durable entry id — a DIFFERENT React key than the render id already on screen
 *   — remounting the streaming message and restarting the paced text reveal from
 *   the first character (the reported "streams from the middle, then re-streams
 *   after Working…" bug). Keeping the id (and `live`, so the promotion re-applies
 *   on every later journal tick until a new turn pushes the row out of the live
 *   suffix) means: same key, no remount, no replay; the settle to non-streaming
 *   then renders the full text with no animation.
 *
 * A journal that rewrote history SHORTER than our journaled prefix (compaction)
 * drops the whole stale suffix instead.
 */
function preserveTrailingLiveRows(
	current: readonly SessionTranscriptMessage[],
	incoming: SessionJournalUpdatedEvent["transcript"],
	rebuilt: readonly SessionTranscriptMessage[],
	discardLiveAgentId: string | null = null,
): readonly SessionTranscriptMessage[] {
	let suffixStart = current.length;
	while (suffixStart > 0 && current[suffixStart - 1]?.live) suffixStart--;
	// The incoming journal is shorter than the journal-derived prefix we already
	// had ⇒ history was REWRITTEN (compaction), not merely behind: a stale live
	// row must never phantom atop the rewritten history.
	if (incoming.length < suffixStart) return rebuilt;
	const promoted = [...rebuilt];
	const consumed = new Set<number>();
	const appended: SessionTranscriptMessage[] = [];
	for (let index = suffixStart; index < current.length; index++) {
		const row = current[index] as SessionTranscriptMessage;
		// An authoritative user row now follows this assistant segment. Let the
		// durable journal row stand under its real id and discard the stale live
		// projection; the next post-boundary delta opens a fresh tail segment.
		if (row.id === discardLiveAgentId) continue;
		let matched = -1;
		// A journal turn can represent MULTIPLE live projections of itself: after a
		// mid-turn reconnect the client still holds the PRE-DROP live row while the
		// resumed stream opens a SECOND live row for the same turn (2026-07-17
		// "double render is back" — the wake-probe reconnect storm made this the
		// common case). The consumed-set pairing below is 1:1, so the second
		// projection used to fall through and get APPENDED as a duplicate. Track
		// agent rows that match an already-consumed candidate and DROP them; user
		// and custom rows keep strict positional pairing (repeated identical user
		// messages are legitimate, duplicate agent projections never are).
		let duplicateOfConsumed = false;
		for (let j = suffixStart; j < incoming.length; j++) {
			const candidate = incoming[j] as SessionJournalUpdatedEvent["transcript"][number];
			const agentRow = row.role === "agent" && row.customType === undefined;
			if (consumed.has(j) && !agentRow) continue;
			if (agentRow && !journalAgentCanRepresentLiveSegment(row, incoming, j)) {
				continue;
			}
			if (!journalRepresents(row, [candidate])) continue;
			if (consumed.has(j)) {
				duplicateOfConsumed = true;
				continue;
			}
			matched = j;
			break;
		}
		// A previously settled assistant can survive as a stale LIVE tail fragment
		// after its complete durable row has already moved into the journal prefix.
		// It is represented only when the earlier row has the same turn timestamp
		// and ends with that fragment. User echoes deliberately keep the positional
		// search above: repeated user text must not consume an older turn.
		let staleSettledFragment = false;
		if (matched < 0 && row.role === "agent") {
			const fragment = flowText(row);
			if (fragment !== "") {
				for (let j = 0; j < Math.min(suffixStart, incoming.length); j++) {
					const candidate = incoming[j] as SessionJournalUpdatedEvent["transcript"][number];
					if (
						candidate.role === "agent" &&
						candidate.timestamp === row.timestamp &&
						flowText(candidate).endsWith(fragment)
					) {
						matched = j;
						staleSettledFragment = true;
						break;
					}
				}
			}
		}
		if (matched >= 0) {
			consumed.add(matched);
			// The durable row already stands in the rebuilt prefix. Dropping this
			// stale fragment prevents it from being appended after the next user
			// bubble or hijacking the next run through its obsolete liveAgentId.
			if (staleSettledFragment) continue;
			// rebuilt is incoming.map(...), so index `matched` addresses the same row.
			const journalRow = promoted[matched] as SessionTranscriptMessage;
			// Keep the live id (and `live`) ONLY for the streaming assistant text row:
			// its paced text reveal is keyed on the render id, so adopting the durable
			// journal id would remount the row and restart the reveal from the first
			// character (the "streams from the middle, then re-streams after Working…"
			// bug). Every other row — the user echo, custom/command rows — has no reveal
			// to protect, so the authoritative journal row must STAND (adopt its durable
			// id, drop the live copy). A promoted user echo that clung to its live id
			// stayed `live` forever and never took the durable id branch/fork/edit key
			// off — surfacing as duplicated or misplaced bubbles on journal catch-up.
			const isStreamingAgentRow = row.role === "agent" && row.customType === undefined;
			if (isStreamingAgentRow && journalRow.id !== row.id) {
				promoted[matched] = { ...journalRow, id: row.id, live: row.live };
			}
			continue;
		}
		// Matched ONLY an already-consumed candidate: this live row is a second
		// projection of a turn the journal already represents — drop, never append.
		if (duplicateOfConsumed) continue;
		appended.push(row);
	}
	return appended.length > 0 ? [...promoted, ...appended] : promoted;
}

function applyJournalUpdate(state: SessionState, event: SessionEventOf<"sessionJournalUpdated">): SessionState {
	if (event.seq <= state.journalSeq) return state;
	const crossedUserBoundary = journalUserBoundaryAfterLiveAgent(
		state.transcript,
		event.transcript,
		state.snapshot?.queuedMessages ?? [],
		state.liveAgentId,
	);
	const rebuilt = cloneTranscriptReusingStablePrefix(state.transcript, event.transcript);
	return {
		...state,
		journalSeq: event.seq,
		transcript: preserveTrailingLiveRows(
			state.transcript,
			event.transcript,
			rebuilt,
			crossedUserBoundary ? state.liveAgentId : null,
		),
		customMessages: cloneCustomMessages(event.customMessages),
		...(crossedUserBoundary ? { liveAgentId: null, activeTools: [] } : {}),
	};
}

export function reduceJournalEvent(state: SessionState, event: SessionStateAction): SessionState | undefined {
	if (event.type !== "sessionJournalUpdated") return undefined;
	return applyJournalUpdate(state, event);
}

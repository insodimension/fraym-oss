import type {
	ContextUsage,
	Goal,
	HostUiRequest,
	ModeState,
	PlanModeState,
	SessionAttachment,
	SessionDriverEvent,
	SessionSnapshot,
	SessionStatus,
	SessionTreeSnapshot,
	SubagentBatch,
	TaskPhase,
	ToolCallMetadata,
	TurnUsage,
	WorkingStatus,
} from "@fraym-ai/driver";

export type ToolCallStatus = "running" | "success" | "error";

export interface ActiveToolCall {
	readonly callId: string;
	readonly toolName: string;
	/** Human display name (MCP `title` / humanized); preferred over `toolName` in generic cards. */
	readonly displayName?: string;
	readonly input?: unknown;
	readonly status: ToolCallStatus;
	readonly text?: string;
	readonly progress?: number;
	readonly output?: unknown;
	readonly metadata?: ToolCallMetadata;
}

export type TranscriptBlock =
	| { readonly type: "text"; readonly text: string }
	| { readonly type: "reasoning"; readonly text: string }
	| { readonly type: "tool"; readonly call: ActiveToolCall }
	| {
			readonly type: "command";
			readonly renderKind: string;
			readonly command: string;
			readonly text: string;
			readonly invocation?: string;
	  }
	/** One assistant response's token usage, above its tool run — mirrors the TUI's per-message footer. */
	| { readonly type: "tokenUsage"; readonly usage: TurnUsage }
	/** An inline image (user paste/attach, or an agent capture). `src` is a URL or a `data:` URL. */
	| { readonly type: "image"; readonly src: string; readonly alt?: string; readonly caption?: string }
	/** A run-ending error with no other renderable content — the transcript builder synthesizes this so an errored-empty turn surfaces via the notice card instead of a silent empty bubble. */
	| {
			readonly type: "notice";
			readonly level: "info" | "warning" | "error";
			readonly message: string;
			readonly source?: string;
	  };

/** Latest displayed Engine custom message per `customType` — the generic
 *  domain-state slice behind docked surfaces (e.g. the usage-limit strip).
 *  `payload` is the sender's structured `details` (live events only; snapshot
 *  hydration carries text). */
export interface LatestCustomMessage {
	readonly id: string;
	readonly text: string;
	readonly payload?: unknown;
}

export interface SessionTranscriptMessage {
	readonly id: string;
	readonly role: "user" | "agent" | "divider";
	readonly blocks: readonly TranscriptBlock[];
	readonly timestamp?: string;
	/** Opaque prompt id linking a journaled user row to its optimistic echo. */
	readonly clientMessageId?: string;
	readonly meta?: string;
	/** Engine custom-message type (from a `custom_message` entry); the thread keys a `msg:<customType>` renderer on it. */
	readonly customType?: string;
	/** Structured payload for the `msg:<customType>` surface renderer (mirrors the Engine custom message's `details`). */
	readonly payload?: unknown;
	/** Whole-run wall-clock at the latest turn boundary (ms), from `turnEnded` or persisted snapshot metadata. */
	readonly durationMs?: number;
	/** The run-ending turn (no tool calls) was observed for this message, from `turnEnded` or persisted snapshot metadata. */
	readonly final?: boolean;
	/** A persisted assistant response reached a terminal stop reason. */
	readonly settled?: boolean;
	readonly variant?: "compacting" | "done" | "continuation";
	readonly auto?: boolean;
	readonly freed?: number;
	/** Pre-compaction token count for a "done" compaction divider. */
	readonly tokens?: number;
	/** One-line compaction summary (the "compact context"). */
	readonly summary?: string;
	/** Continuation divider: the successor/side session (journal `session_continuation` entry). */
	readonly toSessionId?: string;
	/** Continuation provenance: "handoff" | "new" | "plan" | "sidequest" | … */
	readonly reason?: string;
	/** Row appended by the LIVE event lane and not yet journaled (streaming agent
	 *  row, optimistic user echo, live custom/command rows). The journal fold
	 *  preserves an un-represented trailing `live` suffix instead of dropping it,
	 *  and dedupes each row once the journal catches up. Journal-built rows never
	 *  carry it. */
	readonly live?: boolean;
}

export type VibrMode = "" | "search" | "read" | "run" | "edit" | "skill" | "mcp" | "think";
export type VibrState = "idle" | "thinking" | "typing";

export type SessionStateAction =
	| SessionDriverEvent
	| {
			readonly type: "sessionOpening";
			readonly snapshot?: SessionSnapshot | null;
			readonly cached?: SessionState | null;
	  }
	| { readonly type: "sessionReset" }
	| { readonly type: "dismissNotice"; readonly index: number }
	| { readonly type: "sessionOpenFailed"; readonly message: string }
	| { readonly type: "sessionTreeLoaded"; readonly tree: SessionTreeSnapshot }
	| {
			readonly type: "localUserMessage";
			/** Stable identity for one client submission. Retransmission of the same
			 * event keeps this id; two intentional equal-text sends get distinct ids. */
			readonly clientMessageId: string;
			readonly text: string;
			readonly attachments?: readonly SessionAttachment[];
			readonly timestamp?: string;
	  }
	| { readonly type: "hostUiRequestResolved"; readonly requestId: string };

/** Compact, collapsible rendering metadata for a provider auto-retry notice. */
export interface RetryNoticeMeta {
	readonly phase: "started" | "succeeded" | "failed";
	readonly attempt?: number;
	readonly maxAttempts?: number;
	/** Latest provider error (already condensed upstream); shown when expanded. */
	readonly detail?: string;
}

/** A notice-rail entry. An `id` makes the notice self-updating — a later
 *  same-id notice replaces it in place — so a provider retry storm folds into
 *  ONE evolving row (`retry` meta) instead of stacking a card per attempt. */
export interface SessionNotice {
	readonly level: "info" | "warning" | "error";
	readonly message: string;
	/** Stable identity for in-place updates (see {@link upsertNotice}). */
	readonly id?: string;
	readonly retry?: RetryNoticeMeta;
	/** When set, the notice self-dismisses after this many ms (see PlainNoticeRow).
	 *  For transient acknowledgements — e.g. a TTSR rule injection (rewind → inject
	 *  → retry) — that must not pin above the working tail like a standing notice. */
	readonly ttlMs?: number;
}

export interface SessionState {
	readonly snapshot: SessionSnapshot | null;
	readonly tree: SessionTreeSnapshot | null;
	readonly status: SessionStatus | "disconnected";
	readonly isOpening: boolean;
	readonly isStreaming: boolean;
	/** True while the driver reconnects a run held across an engine transport drop. */
	readonly reconnecting: boolean;

	readonly workingStatus: WorkingStatus | null;
	readonly contextUsage: ContextUsage | null;
	readonly tasks: readonly TaskPhase[];
	readonly planMode: PlanModeState | null;
	readonly goal: Goal | null;
	readonly modes: readonly ModeState[];
	readonly thinkingLevel: string | null;

	readonly activeTools: readonly ActiveToolCall[];
	readonly toolCount: number;
	readonly subagentBatches: readonly SubagentBatch[];
	readonly hasBackgroundWork: boolean;
	readonly transcript: readonly SessionTranscriptMessage[];
	/** Last durable journal sequence applied to `transcript`; stale/duplicate replays are ignored. */
	readonly journalSeq: number;
	/** Id of the assistant row live deltas/tool blocks target. Identity — not
	 *  "the trailing agent row" — so a row appended mid-stream (queued echo,
	 *  custom message, async-result) can never orphan the remaining deltas into
	 *  a mid-word fragment row or leak them into a notice surface. Cleared when
	 *  the run settles or a user turn starts a new segment. */
	readonly liveAgentId: string | null;
	readonly customMessages: Readonly<Record<string, LatestCustomMessage>>;
	readonly hostUiRequests: readonly HostUiRequest[];

	readonly isCompacting: boolean;
	readonly compactionReason: string | null;

	readonly vibrState: VibrState;
	readonly vibrMode: VibrMode;
	readonly vibrVerb: string;
	readonly energy: number;

	readonly notices: readonly SessionNotice[];
}

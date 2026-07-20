// @fraym/driver — the data-only session contract every Fraym consumer speaks.
//
// The full session-driver surface a production agent workbench needs: session
// lifecycle + catalog, transcript snapshots, queued messages, model/thinking/
// approval selection, and optional capabilities a given host may or may not
// implement. Transport drivers map their backend onto these shapes; UI code
// only ever sees this contract.

import type { SessionScmLedger } from "./scm-ledger";

export type WorkspaceId = string;
export type SessionId = string;
export type RunId = string;
export type Timestamp = string;

/** Per-project rail appearance, surfaced by the host from its workspace
 *  configuration under the `appearance` key. Render precedence:
 *  image > emoji > icon > folder. */
export interface WorkspaceAppearance {
	/** A built-in Fraym icon glyph name. */
	readonly icon?: string;
	/** A renderable image src (`data:`/`http(s):` URL; local paths are inlined engine-side). */
	readonly image?: string;
	/** A short emoji marker (rendered as text when no image is set). */
	readonly emoji?: string;
	/** CSS color for the rail status dot / accent. */
	readonly color?: string;
}

export interface WorkspaceRef {
	readonly workspaceId: WorkspaceId;
	readonly path: string;
	readonly displayName?: string;
	/** Per-project rail appearance (icon/image/emoji/color) from project config. */
	readonly appearance?: WorkspaceAppearance;
	readonly git?: {
		readonly currentBranch?: string;
		readonly branches?: readonly string[];
		readonly dirty?: boolean;
		/** True when this checkout is a linked git worktree (not the main one). */
		readonly worktree?: boolean;
	};
}

export interface SessionRef {
	readonly workspaceId: WorkspaceId;
	readonly sessionId: SessionId;
}

export type SessionStatus = "idle" | "running" | "failed";

export type SessionMessageDeliveryMode = "steer" | "followUp";

export interface SessionQueuedMessage {
	readonly id: string;
	readonly mode: SessionMessageDeliveryMode;
	readonly text: string;
	readonly attachments?: readonly SessionAttachment[];
	readonly createdAt: Timestamp;
	readonly updatedAt: Timestamp;
}

export interface SessionSnapshot {
	readonly ref: SessionRef;
	readonly workspace: WorkspaceRef;
	readonly title: string;
	readonly status: SessionStatus;
	readonly updatedAt: Timestamp;
	readonly archivedAt?: Timestamp;
	// [fraym] Pinned to the top of the session rail (above every sort mode). Engine-local
	// state set via `pinSession`/`unpinSession`, mirroring `archivedAt`. Pin/unpin does
	// NOT bump `updatedAt`, so unpinning returns the session to its true recency slot.
	readonly pinnedAt?: Timestamp;
	/** Agent profile id the session was created under (e.g. "designer") — the durable
	 *  session kind, persisted on the engine's session header and surfaced on listings
	 *  as `_meta["fraym/profile"]`. Hosts scope bench catalogs on it. */
	readonly profile?: string;
	/** Session origin: `"autonomy"` marks a self-running scheduled session,
	 *  absent/`"user"` marks a human-driven session. Over ACP it rides the
	 *  listing's `_meta["fraym/source"]` beside `fraym/profile`. Session rail
	 *  groups classify runs by this. */
	readonly source?: "user" | "autonomy";
	readonly preview?: string;
	readonly config?: SessionConfig;
	readonly runningRunId?: RunId;
	readonly queuedMessages?: readonly SessionQueuedMessage[];
	// [fraym] Live session state, so a reconnecting consumer rehydrates the full
	// view (context meter, task list, verb, plan/goal) without replaying events.
	readonly contextUsage?: ContextUsage;
	readonly tasks?: readonly TaskPhase[];
	readonly workingStatus?: WorkingStatus;
	readonly planMode?: PlanModeState;
	readonly goal?: Goal | null;
	// [fraym] Generic mode-pill state (loop/advisor/ephemeral/...), so a
	// reconnecting consumer rehydrates pills without replaying every
	// `mode_state_changed` event since session start.
	readonly modes?: readonly ModeState[];
	// [fraym] Live + finished parallel `task` dispatches, keyed by the parent tool
	// call's `callId`, so a reconnecting consumer rehydrates the swarm view.
	readonly subagentBatches?: readonly SubagentBatch[];
	// [fraym] In-progress auto/manual compaction. Carried in the snapshot so a
	// reconnecting consumer (session switch, reload) rehydrates the live
	// "compacting" divider instead of dropping it the moment compaction is still
	// running — the live `compactionStarted`/`compactionFinished` events do not
	// re-fire on reopen, and the journal only has the durable "done" divider.
	readonly isCompacting?: boolean;
	// [fraym] The session has >=1 DETACHED background subagent (`task` spawn) still
	// running while its own foreground turn may be idle. Carried in the snapshot so
	// the session rail can show a distinct "working in background" state (vs. the
	// green foreground-streaming dot) and a reconnecting/non-focused consumer reads
	// it without subscribing to that session's live subagent event stream. Sourced
	// from the engine's live agent registry (subagents whose lineage roots at this
	// session), so it is truthful only for sessions with a live engine child — a
	// never-loaded catalog row legitimately reports `undefined`/`false`.
	readonly hasBackgroundWork?: boolean;
	// [fraym] The host has a LIVE engine child for this session (resumed/warm —
	// loaded into a sidecar) even while its own turn is idle. Mirrors `status` /
	// `hasBackgroundWork`: pushed live over the control lane (`session_loaded`) and
	// patched onto the snapshot, so the rail shows a distinct "attached"
	// (active-even-when-waiting) state vs a cold, never-loaded disk row. A
	// never-loaded catalog row legitimately reports `undefined`/`false`.
	readonly loaded?: boolean;
	// [fraym] The transport to this session's engine dropped and the driver is
	// re-dialing (capped backoff). While set, a mid-run session KEEPS
	// `status:"running"` — the server-side supervisor resume can reattach the
	// run losslessly, so the UI must not flash a failure for a Wi-Fi blip.
	// Cleared when the reconnect settles (resumed, completed offline, or
	// declared failed after exhaustion).
	readonly reconnecting?: boolean;
	// [fraym] Catalog-level "parked on YOUR input": a host-UI request raised by
	// this session's agent (permission / ask / elicitation) is awaiting a human
	// response. Threaded from the engine (`EngineSessionSnapshot.blockedOnInput`);
	// only ever `true`, absent when nothing is pending. The session rail maps this
	// to the `needs-you` dot ABOVE `working` (see `sessionDot`). Truthful only for
	// a session with a live engine child tracking its pending host-UI requests; a
	// cold, never-loaded catalog row legitimately reports absent.
	readonly blockedOnInput?: boolean;
	// [fraym] Latest per-run recap — a 1-2 sentence "where the session stands",
	// generated by the agent after each completed run (`recap.perRun`, smol-tier
	// completion) and pushed as `session_recap_changed`. Rendered by the
	// Environment card's Recap section; absent until the first run completes.
	readonly recap?: { readonly text: string; readonly generatedAt: string };
	/** Durable SCM facts attributed from this session's custom journal entries.
	 * This is explicitly session-scoped and never substitutes for checkout-wide
	 * source-control state. */
	readonly scmLedger?: SessionScmLedger;
}

export interface SessionImageAttachment {
	readonly kind: "image";
	readonly mimeType: string;
	readonly data: string;
	readonly name?: string;
}

export interface SessionFileAttachment {
	readonly kind: "file";
	readonly name: string;
	readonly mimeType: string;
	readonly fsPath: string;
	readonly sizeBytes?: number;
}

export type SessionAttachment = SessionImageAttachment | SessionFileAttachment;

export interface SessionConfig {
	readonly provider?: string;
	readonly modelId?: string;
	readonly thinkingLevel?: string;
	/** Selectable thinking-level option values offered by the engine (e.g. off, auto, minimal…xhigh). */
	readonly thinkingLevels?: readonly string[];
	readonly approvalMode?: string;
	/** Selectable approval-mode option values offered by the engine (always-ask, write, yolo). */
	readonly approvalModes?: readonly string[];
	readonly ephemeral?: boolean;
	/** Session-scoped model team applied via `setSessionTeam`; null/absent = config defaults. */
	readonly activeTeam?: string | null;
}

export interface SessionTranscriptToolCall {
	readonly callId: string;
	readonly toolName: string;
	readonly input?: unknown;
	readonly status: "running" | "success" | "error";
	readonly text?: string;
	readonly progress?: number;
	readonly output?: unknown;
	readonly metadata?: ToolCallMetadata;
}

export type SessionTranscriptBlock =
	| { readonly type: "text"; readonly text: string }
	| { readonly type: "reasoning"; readonly text: string }
	| { readonly type: "tool"; readonly call: SessionTranscriptToolCall }
	/** Slash-command output. `renderKind` is the engine-neutral routing key the
	 *  adapter stamps (LAW 2) — the UI binds chips/panels to it, never to
	 *  engine command names. */
	| {
			readonly type: "command";
			readonly command: string;
			readonly text: string;
			readonly renderKind: string;
			readonly invocation?: string;
	  }
	/** One assistant response's token usage, placed after its text and above its tool calls — mirrors the TUI's per-message footer. */
	| { readonly type: "tokenUsage"; readonly usage: TurnUsage }
	/** An inline image (pasted/attached by the user, or an agent capture). `src` is a URL or a `data:` URL. */
	| { readonly type: "image"; readonly src: string; readonly alt?: string; readonly caption?: string }
	/** A run-ending error with no other renderable content — the transcript builder synthesizes this so an errored-empty turn surfaces via the UI notice card instead of a silent empty bubble. */
	| {
			readonly type: "notice";
			readonly level: "info" | "warning" | "error";
			readonly message: string;
			readonly source?: string;
	  };

export interface SessionTranscriptMessage {
	readonly id: string;
	readonly role: "user" | "agent" | "divider";
	readonly blocks: readonly SessionTranscriptBlock[];
	/** Opaque id minted by the ACP driver for prompt-recovery idempotency. */
	readonly clientMessageId?: string;
	/** Divider rendering (role "divider" only) — e.g. the compaction marker the
	 *  adapter builds from the journaled `compaction` entry, or the session
	 *  continuation marker built from the journaled `session_continuation`
	 *  custom entry. Mirrors the UI's divider fields so journal-built dividers
	 *  survive refresh and reopen. */
	readonly variant?: "compacting" | "done" | "continuation";
	readonly auto?: boolean;
	readonly freed?: number;
	/** Pre-compaction token count ("Compacted from N tokens"). */
	readonly tokens?: number;
	/** One-line summary of what was compacted. */
	readonly summary?: string;
	/** Continuation divider (variant "continuation"): the successor session. */
	readonly toSessionId?: string;
	/** Continuation provenance: "handoff" | "new" | "plan" | "sidequest" | … */
	readonly reason?: string;
	readonly timestamp?: Timestamp;
	readonly meta?: string;
	/** Engine custom-message type; the UI keys a `msg:<customType>` renderer on it. */
	readonly customType?: string;
	/** Structured payload for the `msg:<customType>` renderer (Engine custom message `details`, render-safe). */
	readonly payload?: unknown;
	readonly durationMs?: number;
	/** A persisted assistant response reached a terminal stop reason. */
	readonly settled?: boolean;
	readonly final?: boolean;
}

/** One assistant response's token usage (NOT summed across the turn). Mirrors the TUI's per-message readout. */
export interface TurnUsage {
	/** Fresh prompt tokens (the TUI shows `input + cacheWrite`). */
	readonly input: number;
	/** Completion tokens. */
	readonly output: number;
	/** Prompt-prefix tokens served from cache. */
	readonly cacheRead: number;
	/** Tokens written to cache (billed as input). */
	readonly cacheWrite: number;
	/** Time to first token (ms). Omitted when the engine didn't report one (e.g. a cached/instant response). */
	readonly ttftMs?: number;
	/** Whole-response wall-clock duration (ms), including TTFT. Used with `ttftMs` to derive a throughput readout. */
	readonly durationMs?: number;
}

export interface SessionJournalCustomMessage {
	readonly id: string;
	readonly text: string;
	readonly payload?: unknown;
}

export type SessionTreeNodeKind =
	| "message"
	| "thinking_level_change"
	| "model_change"
	| "compaction"
	| "branch_summary"
	| "custom"
	| "custom_message"
	| "label"
	| "session_info";

export interface SessionTreeNodeSnapshot {
	readonly id: string;
	readonly parentId: string | null;
	readonly kind: SessionTreeNodeKind;
	readonly timestamp: Timestamp;
	readonly label?: string;
	readonly role?: string;
	readonly customType?: string;
	readonly title: string;
	readonly preview?: string;
	readonly children: readonly SessionTreeNodeSnapshot[];
}

export interface SessionTreeSnapshot {
	readonly roots: readonly SessionTreeNodeSnapshot[];
	readonly leafId: string | null;
}

export interface NavigateSessionTreeOptions {
	readonly summarize?: boolean;
	readonly customInstructions?: string;
}

export interface NavigateSessionTreeResult {
	readonly cancelled: boolean;
	readonly aborted?: boolean;
	readonly editorText?: string;
	readonly editorImages?: readonly { readonly data: string; readonly mimeType: string }[];
	readonly summaryCreated?: boolean;
}

/** Result of forking a session (see {@link SessionDriver.forkSession}). */
export interface ForkSessionResult {
	/** The newly-created forked session — the caller opens/activates it. */
	readonly snapshot: SessionSnapshot;
	/** Composer prefill text: set when forking FROM a user message (its text, as the fork
	 *  lands just before it), absent when forking from an agent message (kept in place). */
	readonly editorText?: string;
	/** Composer prefill image attachments (tray thumbnails), restored alongside `editorText`
	 *  when forking FROM a user message that carried images. */
	readonly editorImages?: readonly { readonly data: string; readonly mimeType: string }[];
}

export interface SessionModelSelection {
	readonly provider: string;
	readonly modelId: string;
}

/** Result of a TUI-parity role-model cycle (Ctrl+P). */
export interface SessionRoleCycleResult {
	/** The role the session landed on (e.g. "slow"). */
	readonly role: string;
	/** The full cycle order, for rendering the segment track. */
	readonly order: readonly string[];
	readonly provider: string;
	readonly modelId: string;
	readonly thinkingLevel?: string | null;
}

/** Result of a session-scoped team switch. */
export interface SessionTeamSwitchResult {
	/** The now-active team name; null = config defaults. */
	readonly team: string | null;
	readonly provider?: string | null;
	readonly modelId?: string | null;
}

/** Engine on-device STT: the configured model + whether it is on disk yet. */
export interface SpeechToTextStatus {
	readonly modelKey: string;
	/** False = first use will download the model (the stream reports progress). */
	readonly cached: boolean;
}

/** Push events for one engine STT capture stream. */
export interface SpeechToTextEvents {
	/** The worker is live — audio fed from here on is transcribed. */
	readonly onReady?: () => void;
	/** Model download progress while the stream prepares (first use). */
	readonly onProgress?: (progress: { readonly label?: string; readonly percent?: number }) => void;
	/** Volatile transcript of the in-progress segment (refreshed in place). */
	readonly onPartial?: (text: string) => void;
	/** A finalized segment committed by the engine's endpointer. */
	readonly onSegment?: (text: string, index: number) => void;
	/** The stream failed engine-side; it is torn down. */
	readonly onError?: (message: string) => void;
}

/** A live engine STT capture stream. */
export interface SpeechToTextHandle {
	/** Feed one chunk of 16 kHz mono s16le PCM. */
	readonly sendAudio: (pcm: Int16Array) => void;
	/** Flush the trailing segment; resolves the full joined transcript. */
	readonly stop: () => Promise<string>;
	/** Tear the stream down without a final flush. */
	readonly cancel: () => void;
}

export interface SessionMessageInput {
	readonly text: string;
	/** Model-facing prompt override (ACP `_meta["fraym/expansion"]`): when present,
	 *  the engine sends THIS to the model and journals `text` as the message's
	 *  typed face (`displayText`) — the slash-command expansion convention. Used
	 *  by Studio pipeline runs so the transcript shows only what the user said. */
	readonly expansion?: string;
	readonly attachments?: readonly SessionAttachment[];
	readonly deliverAs?: SessionMessageDeliveryMode;
	/** Stable id shared with a caller's optimistic user echo, when it has one. */
	readonly clientMessageId?: string;
}

export interface CreateSessionOptions {
	readonly title?: string;
	readonly initialModel?: SessionModelSelection;
	readonly initialThinkingLevel?: string;
	/** Agent profile id for this session (e.g. "aether"). Forwarded to the host so it can
	 *  activate per-agent faculties; carried over ACP as `_meta["fraym/profile"]`. */
	readonly profile?: string;
}

/** A selectable General Agent, for the creation-time agent picker. `name` is the
 *  value `createSession` takes as `profile` (→ ACP `_meta["fraym/profile"]`). */
export interface AgentChoice {
	readonly name: string;
	readonly description: string;
	readonly source: "bundled" | "user" | "project";
	readonly hasManifest: boolean;
}

export interface SessionEventBase {
	readonly type: string;
	readonly sessionRef: SessionRef;
	readonly timestamp: Timestamp;
	readonly runId?: RunId;
}

export interface SessionOpenedEvent extends SessionEventBase {
	readonly type: "sessionOpened";
	readonly snapshot: SessionSnapshot;
}

export interface SessionJournalUpdatedEvent extends SessionEventBase {
	readonly type: "sessionJournalUpdated";
	readonly seq: number;
	readonly transcript: readonly SessionTranscriptMessage[];
	/** The same durable ledger carried on the session snapshot, emitted with a
	 * journal update so adapters can patch the snapshot live. */
	readonly scmLedger?: SessionScmLedger;
	readonly customMessages: Readonly<Record<string, SessionJournalCustomMessage>>;
}
export interface SessionUpdatedEvent extends SessionEventBase {
	readonly type: "sessionUpdated";
	readonly snapshot: SessionSnapshot;
}

export interface AssistantDeltaEvent extends SessionEventBase {
	readonly type: "assistantDelta";
	readonly text: string;
	/** When set, `text` is the FULL accumulated text of the live assistant
	 *  segment (engine-authoritative), not an increment: consumers replace the
	 *  live row's trailing text instead of appending. Emitted once per
	 *  hydration when a client opens/reconnects to a mid-turn session — the
	 *  journal only holds settled messages, so this is how the already-streamed
	 *  head of the reply reaches a late subscriber. */
	readonly replace?: boolean;
}

// [fraym] A streamed chunk of model reasoning. Engine emits both `text_delta` and
// `thinking_delta`; pi-gui renders only text. Fraym renders reasoning as a
// first-class collapsible block.
export interface ThinkingDeltaEvent extends SessionEventBase {
	readonly type: "thinkingDelta";
	readonly text: string;
}

// [fraym] Boundary marker for one assistant turn. Engine emits a structured per-turn
// stream (`turn_end` / `agent_end`, each assistant message carrying a stopReason
// and its tool calls); the GUI flattens that into bare `assistantDelta` chunks,
// dropping the one fact a Codex-style "Worked for Xs" disclosure needs — when a
// turn closed, how long the run has taken, and whether the run-ending turn (the
// assistant message that ran NO tool calls, per the agent loop) was reached.
// This re-surfaces exactly that. Optional everywhere: a transport that does not
// forward turn boundaries simply never emits it, and the thread falls back to
// elapsed-from-first-delta plus `runCompleted`.
export interface TurnEndedEvent extends SessionEventBase {
	readonly type: "turnEnded";
	/** Whole-run wall-clock so far (ms), for the "Worked for Xs" label. */
	readonly durationMs?: number;
	/** True on the final turn — the assistant message that ran no tool calls and ended the run. */
	readonly final?: boolean;
}

export interface QueuedMessageStartedEvent extends SessionEventBase {
	readonly type: "queuedMessageStarted";
	readonly message: SessionQueuedMessage;
}

export interface ToolStartedEvent extends SessionEventBase {
	readonly type: "toolStarted";
	readonly toolName: string;
	readonly callId: string;
	readonly input?: unknown;
	// [fraym] Human display name for the tool (MCP `title`, or a humanized name),
	// carried over ACP via `_meta["fraym/displayName"]`. Cards prefer it over the
	// raw wire `toolName` for tools without a bespoke renderer.
	readonly displayName?: string;
}

export interface ToolUpdatedEvent extends SessionEventBase {
	readonly type: "toolUpdated";
	readonly callId: string;
	readonly text?: string;
	readonly progress?: number;
	// [fraym] Latest partial tool result while the call is in flight. For tools
	// that emit structured progress (edit/apply_patch stream a growing diff;
	// multi-file edits resolve file-by-file) this is the partial `AgentToolResult`
	// (same shape as `ToolFinishedEvent.output`), so renderers can show the
	// streaming body through the exact path they use for the final result.
	readonly partialResult?: unknown;
	// [fraym] Latest best-effort parse of the still-streaming tool-call ARGUMENTS
	// (input), emitted during the model's tool_use generation — before execution.
	// The reducer merges this into `call.input`, so renderers stream args through
	// their normal input path (e.g. write's content preview). Distinct from
	// `partialResult` (a partial AgentToolResult); object-shaped (a partial of input).
	readonly partialInput?: unknown;
	// [fraym] Best-effort per-call metrics streamed mid-run (exit code, match count, …).
	// Same shape as `ToolFinishedEvent.metadata`; the reducer merges it so tool-card
	// footers populate while the call is still running. Optional — omitted by transports
	// that don't surface partial details.
	readonly metadata?: ToolCallMetadata;
}

// [fraym] Optional per-tool-call metrics for the tool-card footer. Grounded in
// Engine tool-result detail + execution timing; every field is best-effort so a
// transport that lacks usage data simply omits it.
export interface ToolCallMetadata {
	readonly durationMs?: number;
	readonly tokens?: number;
	readonly cachedTokens?: number;
	/** Extra engine-provided facts shown inline (exit code, match count, …). */
	readonly extra?: Readonly<Record<string, string | number>>;
}

export interface ToolFinishedEvent extends SessionEventBase {
	readonly type: "toolFinished";
	readonly callId: string;
	readonly success: boolean;
	readonly output?: unknown;
	readonly metadata?: ToolCallMetadata;
}

export interface RunCompletedEvent extends SessionEventBase {
	readonly type: "runCompleted";
	readonly snapshot: SessionSnapshot;
}

export interface SessionErrorInfo {
	readonly message: string;
	readonly code?: string;
	readonly details?: unknown;
}

export interface ExtensionCompatibilityIssue {
	readonly capability: string;
	readonly classification: "terminal-only";
	readonly message: string;
	readonly extensionPath?: string;
	readonly eventName?: string;
}

export interface RunFailedEvent extends SessionEventBase {
	readonly type: "runFailed";
	readonly error: SessionErrorInfo;
}

export type HostUiResponse =
	| {
			readonly requestId: string;
			readonly value: string;
	  }
	| {
			// [fraym] Multi-select single-submit: the entire chosen set in ONE
			// response — no per-toggle round-trip. The picker accumulates locally
			// and sends `values` only on Done.
			readonly requestId: string;
			readonly values: readonly string[];
	  }
	| {
			readonly requestId: string;
			readonly confirmed: boolean;
	  }
	| {
			// [fraym] Answer to a `permission` request: the chosen option id.
			readonly requestId: string;
			readonly optionId: string;
	  }
	| {
			// [fraym] Multi-question `ask` navigation: re-ask the previous/next question.
			readonly requestId: string;
			readonly navigate: "back" | "forward";
	  }
	| {
			readonly requestId: string;
			readonly cancelled: true;
	  };

/**
 * A rich select option. `ui.select` callers may pass plain strings (back-compat)
 * or `{ label, description }` objects; the host UI renders the description as
 * dim sub-text below the label. The Engine `ask` tool bakes a `" (Recommended)"`
 * suffix into the label of the recommended option — the picker strips it for
 * display and shows a badge.
 */
export interface HostUiSelectOption {
	readonly label: string;
	readonly description?: string;
}

export type HostUiRequest =
	| {
			readonly kind: "confirm";
			readonly requestId: string;
			readonly title: string;
			readonly message: string;
			readonly defaultValue?: boolean;
			readonly timeoutMs?: number;
			// [fraym] Structured dialog semantics (dialog@1): stable source id, gated
			// tool, reason — rides verbatim from the engine; never parse the title.
			readonly meta?: Readonly<Record<string, unknown>>;
	  }
	| {
			readonly kind: "input";
			readonly requestId: string;
			readonly title: string;
			readonly placeholder?: string;
			readonly initialValue?: string;
			readonly timeoutMs?: number;
			// [fraym] Structured dialog semantics (dialog@1).
			readonly meta?: Readonly<Record<string, unknown>>;
	  }
	| {
			readonly kind: "select";
			readonly requestId: string;
			readonly title: string;
			// [fraym] Back-compat: plain strings still allowed; rich callers pass
			// `{ label, description }`. Trailing rows (e.g. "Other"/"Done") are
			// usually plain strings and sit beyond `markableCount`.
			readonly options: readonly (string | HostUiSelectOption)[];
			// [fraym] Structured dialog semantics (dialog@1).
			readonly meta?: Readonly<Record<string, unknown>>;
			readonly allowMultiple?: boolean;
			// [fraym] Picker marker style. "radio" = single-choice; "checkbox" =
			// multi-select (per-toggle: one response per toggle, see Engine `ask`).
			readonly selectionMarker?: "radio" | "checkbox";
			// [fraym] Leading option count that receives a marker + number. Rows at
			// index >= markableCount render as plain action rows (no marker).
			readonly markableCount?: number;
			// [fraym] Pre-checked option indices for checkbox (multi) requests.
			readonly checkedIndices?: readonly number[];
			// [fraym] Initially-focused row index.
			readonly initialIndex?: number;
			// [fraym] Multi-question `ask`: whether this question can step back/forward.
			// Forward also happens automatically on selection; Back answers with a
			// `navigate: "back"` response. Drives the Back affordance in the picker.
			readonly canNavigateBack?: boolean;
			readonly canNavigateForward?: boolean;
			readonly timeoutMs?: number;
	  }
	| {
			readonly kind: "editor";
			readonly requestId: string;
			readonly title: string;
			readonly initialValue?: string;
	  }
	| {
			readonly kind: "notify";
			readonly requestId: string;
			readonly message: string;
			readonly level?: "info" | "warning" | "error";
	  }
	| {
			readonly kind: "status";
			readonly requestId: string;
			readonly key: string;
			readonly text?: string;
	  }
	| {
			readonly kind: "widget";
			readonly requestId: string;
			readonly key: string;
			readonly lines?: readonly string[];
			readonly placement?: "aboveComposer" | "belowComposer";
	  }
	| {
			readonly kind: "title";
			readonly requestId: string;
			readonly title: string;
	  }
	| {
			readonly kind: "editorText";
			readonly requestId: string;
			readonly text: string;
	  }
	| {
			readonly kind: "reset";
			readonly requestId: string;
	  }
	| {
			// [fraym] Tool-permission gate (Engine's ACP `requestPermission`). The engine
			// asks before running a gated tool (bash/edit/delete/move); the consumer
			// answers with an `optionId` (or `cancelled`). Reuses the host-UI channel.
			readonly kind: "permission";
			readonly requestId: string;
			readonly toolCallId: string;
			readonly toolName: string;
			readonly title: string;
			readonly paths?: readonly string[];
			readonly locations?: readonly PermissionLocation[];
			readonly options: readonly PermissionOption[];
	  };

export interface HostUiRequestEvent extends SessionEventBase {
	readonly type: "hostUiRequest";
	readonly request: HostUiRequest;
}

export interface ExtensionCompatibilityIssueEvent extends SessionEventBase {
	readonly type: "extensionCompatibilityIssue";
	readonly issue: ExtensionCompatibilityIssue;
}

export interface SessionClosedEvent extends SessionEventBase {
	readonly type: "sessionClosed";
	readonly reason: "manual" | "ended" | "failed" | "deleted";
}

export type SessionDriverEvent =
	| SessionOpenedEvent
	| SessionUpdatedEvent
	| SessionJournalUpdatedEvent
	| AssistantDeltaEvent
	| ThinkingDeltaEvent // [fraym]
	| TurnEndedEvent // [fraym]
	| QueuedMessageStartedEvent
	| ToolStartedEvent
	| ToolUpdatedEvent
	| ToolFinishedEvent
	| RunCompletedEvent
	| RunFailedEvent
	| HostUiRequestEvent
	| ExtensionCompatibilityIssueEvent
	| SessionClosedEvent
	// [fraym] Engine capability extensions (see foot of file).
	| TasksUpdatedEvent
	| ContextUsageEvent
	| QueuedMessagesChangedEvent
	| BackgroundWorkChangedEvent
	| RunningStatusChangedEvent
	| SessionLoadedChangedEvent
	| WorkingStatusEvent
	| PlanModeChangedEvent
	| GoalChangedEvent
	| ThinkingLevelChangedEvent
	| CompactionStartedEvent
	| CompactionFinishedEvent
	| NoticeEvent
	| CustomMessageEvent
	| CommandResultEvent
	| RetryEvent
	| TtsrTriggeredEvent
	| SessionSwitchedEvent
	| SubagentBatchStartedEvent
	| SubagentRunUpdatedEvent
	| SubagentBatchFinishedEvent
	| ModeStateChangedEvent;

export type SessionEventListener = (event: SessionDriverEvent) => void | Promise<void>;
export type Unsubscribe = () => void;

export interface SessionDriver {
	listSessions(workspace: WorkspaceRef): Promise<readonly SessionSnapshot[]>;
	createSession(workspace: WorkspaceRef, options?: CreateSessionOptions): Promise<SessionSnapshot>;
	openSession(sessionRef: SessionRef, initialSnapshot?: SessionSnapshot | null): Promise<SessionSnapshot>;
	archiveSession(sessionRef: SessionRef): Promise<void>;
	unarchiveSession(sessionRef: SessionRef): Promise<void>;
	pinSession(sessionRef: SessionRef): Promise<void>;
	unpinSession(sessionRef: SessionRef): Promise<void>;
	deleteSession(sessionRef: SessionRef): Promise<void>;
	sendUserMessage(sessionRef: SessionRef, input: SessionMessageInput): Promise<void>;
	interruptWithQueuedMessage(
		sessionRef: SessionRef,
		next: SessionMessageInput,
		remaining: readonly SessionQueuedMessage[],
	): Promise<void>;
	replaceQueuedMessages(sessionRef: SessionRef, messages: readonly SessionQueuedMessage[]): Promise<void>;
	cancelCurrentRun(sessionRef: SessionRef): Promise<void>;
	setSessionModel(sessionRef: SessionRef, selection: SessionModelSelection): Promise<void>;
	setSessionThinkingLevel(sessionRef: SessionRef, thinkingLevel: string): Promise<void>;
	setSessionApprovalMode(sessionRef: SessionRef, approvalMode: string): Promise<void>;
	setSessionEphemeral(sessionRef: SessionRef, ephemeral: boolean): Promise<void>;
	/** TUI-parity role-model cycling (Ctrl+P): hop the session model across the
	 *  engine's `cycleOrder` roles. Null when fewer than two role models resolve.
	 *  Optional capability. */
	cycleSessionRoleModel?(
		sessionRef: SessionRef,
		direction: "forward" | "backward",
	): Promise<SessionRoleCycleResult | null>;
	/** Session-scoped model-team switch: apply `modelProfiles.<team>` to this
	 *  session's role map (null reverts to config defaults). Never persisted.
	 *  Optional capability. */
	setSessionTeam?(sessionRef: SessionRef, team: string | null): Promise<SessionTeamSwitchResult>;
	/** Resolves a host-advertised live endpoint, when one exists. */
	liveEndpoint?(): Promise<{ url: string | null }>;
	renameSession(sessionRef: SessionRef, title: string): Promise<void>;
	compactSession(sessionRef: SessionRef, customInstructions?: string): Promise<void>;
	reloadSession(sessionRef: SessionRef): Promise<void>;
	/** Probe the active ACP transport after the host returns from the background.
	 *  A silent half-open wire re-dials and rehydrates this session without
	 *  replaying a user prompt. Optional for non-ACP drivers. */
	recoverTransport?(sessionRef: SessionRef): Promise<void>;
	getSessionTree(sessionRef: SessionRef): Promise<SessionTreeSnapshot>;
	/** On-demand per-category context breakdown (parity with Engine `/context`). Optional capability. */
	getContextBreakdown?(sessionRef: SessionRef): Promise<ContextBreakdown | null>;
	/** Live tools visible to the agent (parity with Engine `/tools`). Optional capability. */
	getTools?(sessionRef: SessionRef): Promise<readonly ToolDescriptor[] | null>;
	/** Conversation-wide background job inventory (parity with Engine `/jobs`), for
	 *  the "working in background" badge popover. Optional capability. */
	getJobs?(sessionRef: SessionRef, options?: { recentLimit?: number }): Promise<JobsSnapshot | null>;
	/** Stop one background job by id. Returns false when it was already terminal
	 *  or unknown. Optional capability. */
	cancelJob?(sessionRef: SessionRef, jobId: string): Promise<boolean>;
	/** Hot-mount an enabled plugin's tools into the LIVE session so the current
	 *  conversation can use them immediately (rides Engine's mid-session tool
	 *  activation). Optional capability — older engines (no `_fraym/session/mountPlugin`
	 *  RPC) resolve `{ mounted: false }` and the caller degrades to "new
	 *  conversations only". Never rejects. */
	mountPlugin?(sessionRef: SessionRef, plugin: string): Promise<MountPluginResult>;
	/** Discovered General Agents for a workspace — the creation-time picker's catalog.
	 *  Optional capability: hosts without agent discovery (or the desktop in-process
	 *  driver) omit it and the app falls back to its known product profiles. */
	listAgents?(workspace: WorkspaceRef): Promise<readonly AgentChoice[]>;
	navigateSessionTree(
		sessionRef: SessionRef,
		targetId: string,
		options?: NavigateSessionTreeOptions,
	): Promise<NavigateSessionTreeResult>;
	/** Fork a session into a NEW independent session (all entries + artifacts deep-copied,
	 *  entry ids preserved). With `fromEntryId`, the fork is then repositioned at that entry —
	 *  forking from a user message lands just before it (its text returned as `editorText` for
	 *  composer prefill); from an agent message keeps up to and including it. Optional capability.
	 *  The original session is untouched. */
	forkSession?(sessionRef: SessionRef, fromEntryId?: string): Promise<ForkSessionResult>;
	getSessionCommands(sessionRef: SessionRef): Promise<readonly import("./resource-types.js").EngineCommandRecord[]>;
	// [fraym] Composer autocomplete (slash commands, @file mentions, skills). A
	// data query — re-modeled from Engine's terminal-coupled AutocompleteProvider so
	// it works in a GUI / over a wire.
	queryCompletions(sessionRef: SessionRef, query: CompletionQuery): Promise<readonly CompletionItem[]>;
	/** Resolves the pending host-UI request. Returns false when no pending request
	 *  matched (already resolved elsewhere, or the picker outlived its request) -
	 *  the caller should surface that as a notice rather than silently hanging. */
	respondToHostUiRequest(sessionRef: SessionRef, response: HostUiResponse): Promise<boolean>;
	subscribe(sessionRef: SessionRef, listener: SessionEventListener): Unsubscribe;
	closeSession(sessionRef: SessionRef): Promise<void>;
}

// ============================================================================
// Fraym / Engine capability extensions (beyond pi-gui)
//
// Capabilities Engine exposes natively (via the TUI / AgentSession / the ACP
// ClientBridge) that pi-gui's session-driver dropped. Each shape mirrors a real
// Engine type so the transport drivers map without impedance mismatch.
// ============================================================================

// --- Tool permission gate (Engine `session/client-bridge.ts`) ------------------

export type PermissionOptionKind = "allow_once" | "allow_always" | "reject_once" | "reject_always";

/** One choice in a permission prompt (Engine `ClientBridgePermissionOption`). */
export interface PermissionOption {
	readonly optionId: string;
	readonly name: string;
	readonly kind: PermissionOptionKind;
}

/** A file the gated tool would touch (Engine permission-intent paths/locations). */
export interface PermissionLocation {
	readonly path: string;
	readonly line?: number;
}

// --- Task list / TODOs (Engine `tools/todo-write.ts`) --------------------------

export type TaskStatus = "pending" | "in_progress" | "completed" | "abandoned";

/** A single task (Engine `TodoItem`). */
export interface TaskItem {
	readonly content: string;
	readonly status: TaskStatus;
	readonly notes?: readonly string[];
}

/** A named group of tasks (Engine `TodoPhase`). */
export interface TaskPhase {
	readonly name: string;
	readonly tasks: readonly TaskItem[];
}

export interface TasksUpdatedEvent extends SessionEventBase {
	readonly type: "tasksUpdated";
	readonly phases: readonly TaskPhase[];
}

// [fraym] Live message queue (steering + follow-up) the host pushes as the queue
// changes, so chips stay in sync without replaying the journal. Mirrors
// `ContextUsageEvent`: dedicated event + `snapshot.queuedMessages` field.
export interface QueuedMessagesChangedEvent extends SessionEventBase {
	readonly type: "queuedMessagesChanged";
	readonly messages: readonly SessionQueuedMessage[];
}

// [fraym] The session's detached-background-subagent set went empty<->non-empty.
// Mirrors `QueuedMessagesChangedEvent`: a dedicated live event PLUS the
// `snapshot.hasBackgroundWork` field (patched in the driver's #emit), so the
// session rail's "working in background" dot updates live and a reconnecting
// consumer rehydrates it from the snapshot.
export interface BackgroundWorkChangedEvent extends SessionEventBase {
	readonly type: "backgroundWorkChanged";
	readonly hasBackgroundWork: boolean;
}

// Mirrors `BackgroundWorkChangedEvent`: a dedicated live event PLUS the
// `snapshot.status` field (patched in the driver's #emit), so the session rail
// reflects a session's RUNNING state even when the engine started the turn
// itself (queue/steer/follow-up drain, plan continuation) or the session is not
// the actively-subscribed one — instead of leaving it at its stale last-activity
// time until it is opened.
export interface RunningStatusChangedEvent extends SessionEventBase {
	readonly type: "runningStatusChanged";
	readonly status: "running" | "idle";
}

// Mirrors `RunningStatusChangedEvent` / `BackgroundWorkChangedEvent`: a dedicated
// live event PLUS the `snapshot.loaded` field (patched in the driver's #emit). The
// host emits it when a session gains a live engine child (resume/open/new) or loses
// it (dispose), so the rail can show a loaded-but-idle session ("attached" — active
// even while waiting) distinctly from a cold, never-loaded disk row.
export interface SessionLoadedChangedEvent extends SessionEventBase {
	readonly type: "loadedChanged";
	readonly loaded: boolean;
}

// --- Context / token usage (Engine `ContextUsage`) -----------------------------

export interface ContextUsage {
	/** Estimated context tokens, or null if unknown (e.g. just after compaction). */
	readonly tokens: number | null;
	readonly contextWindow: number;
	/** Usage as a fraction of the window, or null if tokens is unknown. */
	readonly percent: number | null;
}

export interface ContextUsageEvent extends SessionEventBase {
	readonly type: "contextUsage";
	readonly usage: ContextUsage;
}

/** One category bucket in the context window (system prompt, tools, messages, …). */
export interface ContextBreakdownCategory {
	readonly id: string;
	readonly label: string;
	readonly tokens: number;
}

/** On-demand per-category context breakdown — mirrors Engine `computeContextBreakdown`. */
export interface ContextBreakdown {
	readonly contextWindow: number;
	readonly usedTokens: number;
	readonly autoCompactBufferTokens: number;
	readonly freeTokens: number;
	readonly categories: readonly ContextBreakdownCategory[];
}

// --- Agent tools (Engine `AgentSession.getActiveToolNames`/`getAllToolNames`) ---

/** One tool exposed to the agent — mirrors Engine's tool registry entry. */
export interface ToolDescriptor {
	readonly name: string;
	/** Whether the tool is currently active (in `getActiveToolNames`). */
	readonly active: boolean;
	/** Origin bucket, derived from the name (`mcp__` prefix ⇒ MCP, else builtin). */
	readonly source: "builtin" | "mcp";
	/** Human-readable label for UI (Engine `AgentTool.label`), if known. */
	readonly label?: string;
	/** One-line summary (Engine `AgentTool.summary`/`description`), if known. */
	readonly summary?: string;
}

// --- Live plugin mount (Engine mid-session tool activation) --------------------

/** Result of hot-mounting an enabled plugin's tools into the LIVE session, so
 *  the current conversation can use them immediately (parity with Engine's
 *  mid-session tool activation rail). `mounted:false` means nothing was loadable
 *  into this session — the caller degrades to "takes effect in new conversations".
 *  `tools` lists the tool names newly mounted (for a "mounted N tools" notice). */
export interface MountPluginResult {
	readonly mounted: boolean;
	readonly tools?: readonly string[];
}

// --- Async jobs (Engine `AsyncJobManager` — background bash/task work) ---------

export type JobStatus = "running" | "completed" | "failed" | "cancelled";

/** One background job (Engine `AsyncJob`) — conversation-wide, not owner-scoped:
 *  matches the badge signal that drives `hasBackgroundWork`. */
export interface JobDescriptor {
	readonly id: string;
	readonly type: "bash" | "task";
	readonly status: JobStatus;
	readonly label: string;
	readonly startTime: number;
	/** Registry id of the agent that registered the job (e.g. "Main", a subagent name). */
	readonly ownerId?: string;
}

export interface JobsDeliveryState {
	readonly queued: number;
	readonly delivering: boolean;
	readonly nextRetryAt?: number;
	readonly pendingJobIds: readonly string[];
}

export interface JobsSnapshot {
	readonly running: readonly JobDescriptor[];
	readonly recent: readonly JobDescriptor[];
	readonly delivery: JobsDeliveryState;
}

// --- Working status / verb (Engine `ExtensionUIContext.setWorkingMessage`) ------

/** The streaming status line — the "verb" (Thinking…/Searching…) + visibility. */
export interface WorkingStatus {
	readonly message: string | null;
	readonly visible: boolean;
}

export interface WorkingStatusEvent extends SessionEventBase {
	readonly type: "workingStatus";
	readonly status: WorkingStatus;
}

// --- Plan mode (Engine `plan-mode/state.ts`) -----------------------------------

export interface PlanModeState {
	readonly enabled: boolean;
	readonly planFilePath: string;
	readonly workflow?: "parallel" | "iterative";
	/** Live plan-file markdown, included in the engine snapshot when plan mode is active. */
	readonly content?: string;
}

export interface PlanModeChangedEvent extends SessionEventBase {
	readonly type: "planModeChanged";
	readonly state: PlanModeState;
}

// --- Goal mode (Engine `goals/state.ts`) ---------------------------------------

export type GoalStatus = "active" | "paused" | "budget-limited" | "complete" | "dropped";

export interface Goal {
	readonly id: string;
	readonly objective: string;
	readonly status: GoalStatus;
	readonly tokenBudget?: number;
	readonly tokensUsed: number;
	readonly timeUsedSeconds: number;
}

export interface GoalChangedEvent extends SessionEventBase {
	readonly type: "goalChanged";
	readonly goal: Goal | null;
}

// --- Generic mode state (Engine `mode_state_changed`) ---------------------------
// ONE typed event every active session mode (plan, goal, loop, advisor,
// ephemeral, collab, ...) rides through to surface a pill — see
// `mode-state.ts` on the Engine side. A brand-new mode needs ZERO Fraym code:
// the engine just publishes a `ModeState` entry and `ModePills` (already
// generic) renders it. Bespoke surfaces (plan-file viewer, goal budget
// editor) are unaffected — they keep their own rich `onSelect`; this event
// only owns presence/label/tone/status/close.

/** Tone hint for a mode pill; mirrors `ModePillTone` in `@fraym/ui`. */
export const MODE_STATE_TONES = ["accent", "add", "blue", "warn", "del", "mute"] as const;
export type ModeStateTone = (typeof MODE_STATE_TONES)[number];

/** Generic snapshot of one active session mode, surface-agnostic. */
export interface ModeState {
	/** Stable mode id, e.g. "loop", "advisor", "ephemeral". */
	readonly id: string;
	/** Pill label shown to the user. */
	readonly label: string;
	/** Optional tonal color hint; the renderer defaults to "accent". */
	readonly tone?: ModeStateTone;
	/** Optional short status/detail text. */
	readonly status?: string;
	/** Whether the client should render a close (×) affordance. */
	readonly closeable?: boolean;
	/** Slash-command text to run when the user closes the pill (e.g. "/loop"). */
	readonly closeCommand?: string;
}

export interface ModeStateChangedEvent extends SessionEventBase {
	readonly type: "modeStateChanged";
	readonly modes: readonly ModeState[];
}

// --- Thinking level (Engine `thinking_level_changed`) --------------------------

export interface ThinkingLevelChangedEvent extends SessionEventBase {
	readonly type: "thinkingLevelChanged";
	readonly thinkingLevel: string | null;
}

// --- Compaction lifecycle (Engine `auto_compaction_*` + `CompactionResult`) ----

export interface CompactionStartedEvent extends SessionEventBase {
	readonly type: "compactionStarted";
	readonly reason: "threshold" | "overflow" | "idle" | "manual";
}

export interface CompactionFinishedEvent extends SessionEventBase {
	readonly type: "compactionFinished";
	readonly aborted: boolean;
	readonly tokensBefore?: number;
	readonly shortSummary?: string;
	/** Tokens freed by the compaction, in thousands (for the UI divider). */
	readonly freed?: number;
	/** The underlying failure reason when `aborted` (provider/model error) — absent for a
	 *  benign/cancelled abort with nothing more specific to report. */
	readonly errorMessage?: string;
}

// --- Engine notices, retries, sub-agents (Engine session events) ---------------

export interface NoticeEvent extends SessionEventBase {
	readonly type: "notice";
	readonly level: "info" | "warning" | "error";
	readonly message: string;
	readonly source?: string;
}

/**
 * A displayed Engine custom message appended live mid-session (extension
 * `sendMessage` with `display: true`). The thread keys a `msg:<customType>`
 * surface renderer on `customType`; `text` is the renderer's (and fallback's)
 * content; `payload` carries the sender's structured `details` when the
 * transport forwards them. Snapshot reloads rebuild the same message from the
 * persisted `custom_message` entry.
 */
export interface CustomMessageEvent extends SessionEventBase {
	readonly type: "customMessage";
	readonly customType: string;
	readonly text: string;
	readonly payload?: unknown;
}

/**
 * Result of a builtin slash command run at the engine boundary (e.g. `/usage`).
 * The engine emits the command name + its text output; the driver adapter
 * stamps a neutral `renderKind` (LAW 2) that the UI maps to a transcript block
 * renderer (rich panel, or a terminal-styled fallback). `data` carries an
 * optional structured payload for commands that emit one.
 */
export interface CommandResultEvent extends SessionEventBase {
	readonly type: "commandResult";
	readonly command: string;
	readonly text: string;
	readonly renderKind?: string;
	/** True when this result came from a JOURNAL entry (Fraym sessions journal every
	 *  command result). The durable journal transcript already renders it, so the live
	 *  transcript reducer SKIPS appending it to avoid a double copy that only reconciles
	 *  away on the next run; non-journaled results (legacy chunk fallback) still append.
	 *  Dock auto-open is unaffected — it subscribes to the event directly. */
	readonly journaled?: boolean;
	readonly data?: unknown;
}

/** Provider retry / model-fallback progress (Engine `auto_retry_*`, `retry_fallback_*`). */
export interface RetryEvent extends SessionEventBase {
	readonly type: "retry";
	readonly phase: "started" | "succeeded" | "failed" | "fallback";
	readonly attempt?: number;
	readonly maxAttempts?: number;
	readonly message?: string;
	readonly fromModel?: string;
	readonly toModel?: string;
}

/** A TTSR rule whose condition matched and was injected into context. */
export interface TtsrRule {
	readonly name: string;
	readonly description?: string;
}

/** One or more TTSR rules were injected (Engine `ttsr_triggered`). */
export interface TtsrTriggeredEvent extends SessionEventBase {
	readonly type: "ttsr";
	readonly rules: readonly TtsrRule[];
}

/**
 * [fraym] The agent replaced the underlying session behind this session ref —
 * `/handoff`, `/new`, auto-handoff, plan-approval "fresh context", an
 * extension `ctx.switchSession`, or a client-side spawn (`/sidequest`).
 * Emitted on the SOURCE session's subscription. `follow: true` means the
 * conversation itself moved (the source session is finished) and consumers
 * should switch to `toSessionId`; `follow: false` means a side session was
 * spawned and an open affordance is enough.
 */
export interface SessionSwitchedEvent extends SessionEventBase {
	readonly type: "sessionSwitched";
	/** Session id of the continuation/side session (same workspace). */
	readonly toSessionId: string;
	/** Best-effort provenance: "handoff" | "new" | "switch" | "sidequest" | … */
	readonly reason?: string;
	/** Whether the conversation moved (auto-switch) vs. spawned a side session. */
	readonly follow: boolean;
	/** Title of the target session, when known. */
	readonly title?: string;
}

// --- Subagent batches (Engine `task` tool: `TaskToolDetails`/`AgentProgress`/`SingleResult`) ---
//
// [fraym] Engine's `task` tool spawns N subagents in parallel, tracking each as a live
// `AgentProgress` that finalizes to a `SingleResult`, aggregated in `TaskToolDetails`
// and streamed over the `task:subagent:*` EventBus channels. pi-gui never modeled
// this, so a `task` call collapsed into one opaque tool. Fraym renders the batch as
// a first-class card (per-agent budget, cost, live intent), so the contract carries
// the structured batch keyed by the parent `task` tool call's `callId`.

export type SubagentStatus = "pending" | "running" | "completed" | "failed" | "aborted";

/** Auto-retry state for a provider-throttled subagent (Engine `AgentProgress.retryState`). */
export interface SubagentRetry {
	readonly attempt: number;
	readonly maxAttempts: number;
	readonly message?: string;
}

/** One code-review finding (Engine `report_finding` / `ReportFindingDetails`). */
export interface SubagentReviewFinding {
	/** Severity, P0 (most severe) to P3. */
	readonly priority: "P0" | "P1" | "P2" | "P3";
	readonly title: string;
	readonly filePath?: string;
	readonly lineStart?: number;
	readonly lineEnd?: number;
	/** Full finding detail, shown when the run row is expanded. */
	readonly body?: string;
	/** Reviewer confidence 0..1. */
	readonly confidence?: number;
}

/**
 * Reviewer-agent outcome: an overall verdict plus the reported findings (Engine
 * `yield`/`SubmitReviewDetails` + `report_finding`). Present only on runs whose
 * agent performed a code review.
 */
export interface SubagentReview {
	/** Overall verdict; absent when the reviewer reported findings but never yielded a verdict. */
	readonly verdict?: "correct" | "incorrect";
	/** Verdict confidence 0..1, when a verdict was given. */
	readonly confidence?: number;
	readonly explanation?: string;
	readonly findings: readonly SubagentReviewFinding[];
}

/**
 * One parallel subagent. Unifies Engine's live `AgentProgress` and terminal
 * `SingleResult` into a single shape the UI renders the same way at every status.
 */
export interface SubagentRun {
	readonly index: number;
	readonly id: string;
	/** Agent persona/type, e.g. `"explore"`, `"reviewer"` (Engine `AgentProgress.agent`). */
	readonly agent: string;
	readonly status: SubagentStatus;
	/** Short UI label, distinct from the task text (Engine `AgentProgress.description`). */
	readonly description?: string;
	/** The assignment text driving this agent. */
	readonly task: string;
	/** Live one-liner of what the agent is doing now, e.g. `"find: Locating X"` (Engine `lastIntent`). */
	readonly lastIntent?: string;
	/** Tool the agent is mid-call on (Engine `AgentProgress.currentTool`). */
	readonly currentTool?: string;
	readonly toolCount: number;
	/** Cumulative billed tokens across turns (Engine `AgentProgress.tokens`). */
	readonly tokens: number;
	/** Current per-turn context size — numerator of the `<ctx>/<window>` gauge. */
	readonly contextTokens?: number;
	/** Model context window — denominator of the gauge. */
	readonly contextWindow?: number;
	/** Cumulative cost in USD. */
	readonly cost: number;
	readonly durationMs: number;
	/** Resolved `<provider>/<id>` model string, when known. */
	readonly resolvedModel?: string;
	/** Present while the run is blocked on a provider retry (renders a "rate-limited" badge). */
	readonly retry?: SubagentRetry;
	/** Terminal exit code (Engine `SingleResult.exitCode`); set once `status` is terminal. */
	readonly exitCode?: number;
	/** Terminal error message, when the run failed. */
	readonly error?: string;
	/** Full self-contained assignment text for this run (Engine `SingleResult.assignment ?? task`). */
	readonly assignment?: string;
	/** Terminal output text (the agent's final message); rendered as a capped preview (Engine `renderOutputSection`). */
	readonly output?: string;
	/** The run's output was capped at the byte/line limit (Engine `SingleResult.truncated`). */
	readonly truncated?: boolean;
	/** Why the run was aborted (Engine `SingleResult.abortReason`); set when `status` is `"aborted"`. */
	readonly abortReason?: string;
	/** Reviewer-agent verdict + findings, when this run performed a code review (Engine yield/report_finding). */
	readonly review?: SubagentReview;
	/**
	 * Subagents this run spawned through its own nested `task` dispatch — the agent
	 * lineage beneath it. Rendered as an indented sub-tree; recursion is unbounded.
	 * A child commonly runs on a different model than its parent (e.g. a cheap
	 * explorer under an expensive planner), which the UI surfaces as a lineage marker.
	 */
	readonly children?: readonly SubagentRun[];
}

export type SubagentBatchStatus = "dispatching" | "running" | "completed" | "failed" | "aborted";

/**
 * A `task`-tool dispatch: the shared context + N parallel `SubagentRun`s. Keyed by
 * `callId` — the parent `task` tool call's id — so the consumer renders it in place
 * of that tool call. Mirrors Engine `TaskParams` + `TaskToolDetails`.
 */
export interface SubagentBatch {
	/** The parent `task` tool call's `callId` (threads to `ToolStartedEvent.callId`). */
	readonly callId: string;
	/** Agent persona every run shares, e.g. `"explore"` (Engine `TaskParams.agent`). */
	readonly agent: string;
	/** Shared background prepended to each assignment — the Goal/Context/Constraints block (Engine `TaskParams.context`). */
	readonly context?: string;
	readonly status: SubagentBatchStatus;
	/** Runs in isolated worktrees, returning patches (Engine `TaskParams.isolated`). */
	readonly isolated?: boolean;
	readonly runs: readonly SubagentRun[];
	readonly totalDurationMs?: number;
	/** Aggregate billed tokens across all runs (Engine `TaskToolDetails.usage`). */
	readonly tokens?: number;
	/** Aggregate cost in USD across all runs. */
	readonly cost?: number;
}

export interface SubagentBatchStartedEvent extends SessionEventBase {
	readonly type: "subagentBatchStarted";
	readonly batch: SubagentBatch;
}

/** One run's progress changed (Engine `task:subagent:progress`). */
export interface SubagentRunUpdatedEvent extends SessionEventBase {
	readonly type: "subagentRunUpdated";
	readonly callId: string;
	readonly run: SubagentRun;
}

export interface SubagentBatchFinishedEvent extends SessionEventBase {
	readonly type: "subagentBatchFinished";
	readonly callId: string;
	readonly status: SubagentBatchStatus;
	readonly totalDurationMs?: number;
	readonly tokens?: number;
	readonly cost?: number;
}

// --- Composer autocomplete (re-modeled from Engine's pi-tui AutocompleteProvider) -

export type CompletionKind = "command" | "command-arg" | "file" | "mention" | "skill" | "prompt";

export interface CompletionSubcommand {
	readonly name: string;
	readonly description?: string;
	/** Usage hint, e.g. `<name> [--scope project|user]`. */
	readonly usage?: string;
}

export interface CompletionItem {
	readonly kind: CompletionKind;
	readonly label: string;
	/** Text inserted when the item is accepted. */
	readonly value: string;
	readonly detail?: string;
	/** Usage hint shown alongside the item (e.g. an argument's `<name> [--scope …]`),
	 *  distinct from `detail`. Populated for `command-arg` rows. */
	readonly hint?: string;
	/** Declarative subcommands offered as argument completions once this command is committed
	 *  (e.g. `/fast` → on | off | status). Mirrors Engine's TUI subcommand dropdown. */
	readonly subcommands?: readonly CompletionSubcommand[];
	/** Engine-advertised icon (skill frontmatter `icon`) — the slash-entry policy's
	 *  wire layer; a bare glyph name or a data-URI asset. */
	readonly icon?: string;
}

export interface CompletionQuery {
	readonly text: string;
	/** Caret offset within `text`. */
	readonly cursor: number;
}

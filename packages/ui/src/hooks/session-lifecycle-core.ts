import { upsertNotice } from "./session-features";
import { createInitialState } from "./session-initial-state";
import { finalizeRunningTools } from "./session-transcript";
import type { SessionState, SessionStateAction } from "./session-types";

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;

const RECOVERY_NOTICE_ID = "session-recovery";
const RECOVERY_NOTICE_TTL_MS = 4000;
type LifecycleDispatcher = (state: SessionState, event: SessionStateAction) => SessionState;

function adaptLifecycle<T extends SessionStateAction["type"]>(
	reducer: (state: SessionState, event: SessionEventOf<T>) => SessionState,
): LifecycleDispatcher {
	return (state, event) => reducer(state, event as SessionEventOf<T>);
}

function resetSession(): SessionState {
	return createInitialState();
}

function disconnectedSession(): SessionState {
	return { ...createInitialState(), status: "disconnected" };
}

type LifecycleSnapshot = SessionEventOf<"sessionOpened" | "sessionUpdated" | "sessionOpening">["snapshot"];

function snapshotValue<T>(
	snap: LifecycleSnapshot | null | undefined,
	read: (snapshot: NonNullable<LifecycleSnapshot>) => T | undefined,
	fallback: T,
): T {
	return snap ? (read(snap) ?? fallback) : fallback;
}

function snapshotDefinedValue<T>(
	snap: NonNullable<LifecycleSnapshot>,
	read: (snapshot: NonNullable<LifecycleSnapshot>) => T | undefined,
	fallback: T,
): T {
	const value = read(snap);
	return value === undefined ? fallback : value;
}

function openingSnapshotState(snap: LifecycleSnapshot | null): Partial<SessionState> {
	return {
		snapshot: snap,
		status: snapshotValue(snap, snapshot => snapshot.status, "disconnected"),
		isStreaming: snapshotValue(snap, snapshot => snapshot.status === "running", false),
		reconnecting: snapshotValue(snap, snapshot => snapshot.reconnecting === true, false),
		contextUsage: snapshotValue(snap, snapshot => snapshot.contextUsage, null),
		tasks: snapshotValue(snap, snapshot => snapshot.tasks, []),
		subagentBatches: snapshotValue(snap, snapshot => snapshot.subagentBatches, []),
		workingStatus: snapshotValue(snap, snapshot => snapshot.workingStatus, null),
		hasBackgroundWork: snapshotValue(snap, snapshot => snapshot.hasBackgroundWork, false),
		planMode: snapshotValue(snap, snapshot => snapshot.planMode, null),
		goal: snapshotValue(snap, snapshot => snapshot.goal, null),
		modes: snapshotValue(snap, snapshot => snapshot.modes, []),
		thinkingLevel: snapshotValue(snap, snapshot => snapshot.config?.thinkingLevel, null),
		isCompacting: snapshotValue(snap, snapshot => snapshot.isCompacting, false),
	};
}

/** journalSeq sentinel for an optimistically-restored transcript: below every real
 *  journal sequence (which starts at 0), so the FIRST authoritative
 *  `sessionJournalUpdated` after a cached re-open always passes the
 *  `event.seq <= state.journalSeq` gate (session-journal.ts) and rebases the cached
 *  transcript to journal truth — even an equal-seq or empty (seq 0) journal. Without
 *  it, a cache-only row that never advanced the journal (a failed/optimistic send)
 *  would stick across re-opens because the equal-seq replay is dropped. */
const REBASE_ON_NEXT_JOURNAL_SEQ = -1;

function openingSession(_state: SessionState, event: SessionEventOf<"sessionOpening">): SessionState {
	const snap = event.snapshot ?? null;
	const base: SessionState = {
		...createInitialState(),
		...openingSnapshotState(snap),
		isOpening: true,
	};
	// Optimistic re-open: when the provider holds a cached settled state for this
	// session (one the user already viewed this app-session), paint its transcript
	// INSTANTLY instead of flashing the opening skeleton while the engine re-loads
	// the sidecar. Only the durable journal-derived fields are restored; ephemeral
	// state (notices, host-UI requests, vibr/live rows) is re-derived by background
	// hydration + #reemitPendingHostUi. journalSeq is reset to the rebase sentinel
	// (NOT the cached value) so the first `sessionJournalUpdated` always overwrites
	// the optimistic transcript with journal truth (a seq-gated full replace that
	// reuses stable rows) — never duplicated, and a cache-only row can't stick.
	if (!event.cached) return base;
	return {
		...base,
		transcript: event.cached.transcript,
		journalSeq: REBASE_ON_NEXT_JOURNAL_SEQ,
		customMessages: event.cached.customMessages,
		tree: event.cached.tree,
	};
}

function failedSession(state: SessionState, event: SessionEventOf<"sessionOpenFailed">): SessionState {
	return {
		...state,
		status: "failed",
		isOpening: false,
		notices: [...state.notices.slice(-19), { level: "error", message: event.message }],
	};
}

function loadedSessionTree(state: SessionState, event: SessionEventOf<"sessionTreeLoaded">): SessionState {
	return { ...state, tree: event.tree };
}

function snapshotContextPatch(state: SessionState, snap: NonNullable<LifecycleSnapshot>): Partial<SessionState> {
	return {
		contextUsage: snap.contextUsage ?? state.contextUsage,
		tasks: snap.tasks ?? state.tasks,
	};
}

function snapshotWorkPatch(state: SessionState, snap: NonNullable<LifecycleSnapshot>): Partial<SessionState> {
	return {
		subagentBatches: snap.subagentBatches ?? state.subagentBatches,
		workingStatus: snap.workingStatus ?? state.workingStatus,
		hasBackgroundWork: snap.hasBackgroundWork ?? state.hasBackgroundWork,
	};
}

function snapshotModePatch(state: SessionState, snap: NonNullable<LifecycleSnapshot>): Partial<SessionState> {
	return {
		planMode: snap.planMode ?? state.planMode,
		goal: snapshotDefinedValue(snap, snapshot => snapshot.goal, state.goal),
		modes: snap.modes ?? state.modes,
		thinkingLevel: snapshotDefinedValue(snap, snapshot => snapshot.config?.thinkingLevel, state.thinkingLevel),
	};
}

function snapshotSessionState(state: SessionState, snap: NonNullable<LifecycleSnapshot>): Partial<SessionState> {
	return {
		snapshot: snap,
		status: snap.status,
		isStreaming: snap.status === "running",
		reconnecting: snap.reconnecting === true,
		...snapshotContextPatch(state, snap),
		...snapshotWorkPatch(state, snap),
		...snapshotModePatch(state, snap),
		isCompacting: snap.isCompacting ?? state.isCompacting,
	};
}

/** A held run either resumes or resolves from replay. Both outcomes need an explicit,
 * short-lived acknowledgement so a repaired connection is never mistaken for a hang. */
function recoveryNoticeFor(
	state: SessionState,
	snap: NonNullable<LifecycleSnapshot>,
): SessionState["notices"][number] | undefined {
	if (!state.reconnecting || snap.reconnecting === true) return undefined;
	if (snap.status === "running") {
		return { id: RECOVERY_NOTICE_ID, level: "info", message: "Session recovered", ttlMs: RECOVERY_NOTICE_TTL_MS };
	}
	if (state.isStreaming) {
		return {
			id: RECOVERY_NOTICE_ID,
			level: "info",
			message: "Turn completed while disconnected",
			ttlMs: RECOVERY_NOTICE_TTL_MS,
		};
	}
	return undefined;
}

function snapshotSession(
	state: SessionState,
	snap: SessionEventOf<"sessionOpened" | "sessionUpdated">["snapshot"],
): SessionState {
	const recoveryNotice = recoveryNoticeFor(state, snap);
	return {
		...state,
		...snapshotSessionState(state, snap),
		isOpening: false,
		notices: recoveryNotice ? upsertNotice(state.notices, recoveryNotice) : state.notices,
	};
}

function sameSnapshotRef(a: NonNullable<LifecycleSnapshot>, b: NonNullable<LifecycleSnapshot>): boolean {
	return a.ref.workspaceId === b.ref.workspaceId && a.ref.sessionId === b.ref.sessionId;
}

/** A model/thinking switch mutates ONLY `config` — ref/status/updatedAt/title stay the same —
 *  so the dedup MUST compare config too. Without this, a `sessionUpdated` carrying a new model
 *  or reasoning level is dropped as a "same snapshot" no-op and the composer chip + model menu
 *  never reflect the applied change (the picker looks dead even though the engine accepted it). */
function sameSnapshotConfig(a: NonNullable<LifecycleSnapshot>, b: NonNullable<LifecycleSnapshot>): boolean {
	return (
		a.config?.modelId === b.config?.modelId &&
		a.config?.provider === b.config?.provider &&
		a.config?.thinkingLevel === b.config?.thinkingLevel
	);
}

function sameLifecycleSnapshot(
	state: SessionState,
	snap: SessionEventOf<"sessionOpened" | "sessionUpdated">["snapshot"],
): boolean {
	return (
		!state.isOpening &&
		state.snapshot !== null &&
		sameSnapshotRef(state.snapshot, snap) &&
		state.snapshot.status === snap.status &&
		state.snapshot.updatedAt === snap.updatedAt &&
		state.snapshot.title === snap.title &&
		sameSnapshotConfig(state.snapshot, snap) &&
		state.snapshot.reconnecting === snap.reconnecting
	);
}

/** A session opened idle with a transcript block still marked "running" means the
 *  turn that owned it died with the previous process (crash, app restart, killed
 *  sidecar) before a result ever landed — nothing will ever settle it live. Settle
 *  it here the same way a live `runCompleted` would, so e.g. an abandoned `ask`
 *  renders its terminal (error) state instead of "Waiting for your answer…" forever.
 *  Gated on `status !== "running"`: a session that reconnects mid-stream keeps its
 *  genuinely in-flight tool calls pulsing untouched. */
function openedSession(state: SessionState, event: SessionEventOf<"sessionOpened">): SessionState {
	if (sameLifecycleSnapshot(state, event.snapshot)) return state;
	const next = snapshotSession(state, event.snapshot);
	return event.snapshot.status === "running" ? next : { ...next, transcript: finalizeRunningTools(next.transcript) };
}

function updatedSession(state: SessionState, event: SessionEventOf<"sessionUpdated">): SessionState {
	if (sameLifecycleSnapshot(state, event.snapshot)) return state;
	return snapshotSession(state, event.snapshot);
}

const lifecycleHandlers = {
	sessionOpening: adaptLifecycle(openingSession),
	sessionReset: resetSession,
	sessionOpenFailed: adaptLifecycle(failedSession),
	sessionTreeLoaded: adaptLifecycle(loadedSessionTree),
	sessionOpened: adaptLifecycle(openedSession),
	sessionUpdated: adaptLifecycle(updatedSession),
	sessionClosed: disconnectedSession,
} satisfies Partial<Record<SessionStateAction["type"], LifecycleDispatcher>>;

export function reduceSessionLifecycle(state: SessionState, event: SessionStateAction): SessionState | undefined {
	const handler = lifecycleHandlers[event.type as keyof typeof lifecycleHandlers];
	return handler?.(state, event);
}

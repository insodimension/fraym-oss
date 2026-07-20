import type { SessionDriver, SessionRef, SessionSnapshot, Unsubscribe } from "@fraym/driver";
import { type Dispatch, type MutableRefObject, useEffect, useReducer, useRef } from "react";
import { errorMessageText } from "./session-error";
import { createInitialState, reduceSessionEvent } from "./session-state";
import type { SessionState, SessionStateAction } from "./session-types";

type SessionDispatch = Dispatch<SessionStateAction>;

const SESSION_TREE_LOAD_DELAY_MS = 750;

const SESSION_STATE_CACHE_LIMIT = 12;

function sessionStateKey(workspaceId: string, sessionId: string): string {
	return `${workspaceId}\u0000${sessionId}`;
}

interface UseSessionReducerArgs {
	readonly driver: SessionDriver | null;
	readonly sessionRef: SessionRef | null;
	readonly initialSnapshot: SessionSnapshot | null;
}

export function useSessionReducer({ driver, sessionRef, initialSnapshot }: UseSessionReducerArgs) {
	const [state, dispatch] = useSessionStateReducer();
	const initialSnapshotRef = useInitialSnapshotRef(initialSnapshot);
	const cacheRef = useSessionStateCache(state);
	useSessionSubscription(driver, sessionRef, initialSnapshotRef, cacheRef, dispatch);

	return { state, dispatch };
}

function useSessionStateReducer() {
	const [state, dispatch] = useReducer(
		(prev: SessionState, event: SessionStateAction) => reduceSessionEvent(prev, event),
		undefined,
		createInitialState,
	);
	return [state, dispatch] as const;
}

function useInitialSnapshotRef(initialSnapshot: SessionSnapshot | null) {
	const initialSnapshotRef = useRef<SessionSnapshot | null>(initialSnapshot);

	useEffect(() => {
		initialSnapshotRef.current = initialSnapshot;
	}, [initialSnapshot]);

	return initialSnapshotRef;
}

/** Per-provider LRU cache of the last SETTLED state for each visited session, so
 *  re-opening a session the user already saw restores its transcript INSTANTLY
 *  (optimistic render) instead of flashing the opening skeleton while the engine
 *  re-loads its sidecar. Only settled (not opening/streaming) states with a
 *  snapshot are cached. Keyed by the state's OWN `snapshot.ref` — NEVER the
 *  current `sessionRef` prop: effects run top-down, so on an A→B switch this
 *  effect fires with the new prop (B) while `state` is still A's settled value,
 *  and keying by the prop would file A's transcript under B's key (then B
 *  optimistically restores A's transcript — the mis-key bug). The snapshot ref
 *  travels with the state, so it always files under the right session. */
function useSessionStateCache(state: SessionState): MutableRefObject<Map<string, SessionState>> {
	const cacheRef = useRef<Map<string, SessionState>>(new Map());
	useEffect(() => {
		const snap = state.snapshot;
		if (!snap || state.isOpening || state.isStreaming) return;
		const cache = cacheRef.current;
		const key = sessionStateKey(snap.ref.workspaceId, snap.ref.sessionId);
		cache.delete(key);
		cache.set(key, state);
		while (cache.size > SESSION_STATE_CACHE_LIMIT) {
			const oldest = cache.keys().next().value;
			if (oldest === undefined) break;
			cache.delete(oldest);
		}
	}, [state]);
	return cacheRef;
}

function useSessionSubscription(
	driver: SessionDriver | null,
	sessionRef: SessionRef | null,
	initialSnapshotRef: MutableRefObject<SessionSnapshot | null>,
	cacheRef: MutableRefObject<Map<string, SessionState>>,
	dispatch: SessionDispatch,
) {
	// Depend on the PRIMITIVE ids, never the SessionRef OBJECT identity: a host
	// that reuses (or mutates in place) one ref object across a session switch
	// would otherwise never re-run this effect, leaving the transcript subscribed
	// to the OLD session while the breadcrumb (fed from catalog data) updates —
	// the "two sessions mirror the same body" P0. Reconstructing a fresh ref
	// inside also stops an in-place mutation from changing the subscription
	// underneath an in-flight open.
	const workspaceId = sessionRef?.workspaceId ?? null;
	const sessionId = sessionRef?.sessionId ?? null;
	useEffect(() => {
		if (!driver || workspaceId === null || sessionId === null) {
			dispatch({ type: "sessionReset" });
			return;
		}
		return openSessionSubscription(
			driver,
			{ workspaceId, sessionId },
			initialSnapshotRef.current,
			cacheRef.current,
			dispatch,
		);
	}, [dispatch, driver, initialSnapshotRef, cacheRef, workspaceId, sessionId]);
}

/** True when the catalog row proves the session moved on since this state was
 *  cached — newer `updatedAt`, or currently running (cached states are always
 *  settled, so a running session's live turn is never in them). Unparseable or
 *  missing stamps fail open (restore, matching the pre-gate behavior). */
export function cachedStateIsStale(cached: SessionState, catalogRow: SessionSnapshot | null): boolean {
	if (!catalogRow) return false;
	if (catalogRow.status === "running") return true;
	const cachedAt = cached.snapshot ? Date.parse(cached.snapshot.updatedAt) : Number.NaN;
	const catalogAt = Date.parse(catalogRow.updatedAt);
	return Number.isFinite(cachedAt) && Number.isFinite(catalogAt) && catalogAt > cachedAt;
}

function openSessionSubscription(
	driver: SessionDriver,
	activeRef: SessionRef,
	initialSnapshot: SessionSnapshot | null,
	cache: Map<string, SessionState>,
	dispatch: SessionDispatch,
): () => void {
	const cached = cache.get(sessionStateKey(activeRef.workspaceId, activeRef.sessionId)) ?? null;
	// Optimistic restore ONLY when the cached transcript is still current. The
	// catalog row (`initialSnapshot`) carries the engine's last-activity stamp;
	// if the session advanced since we cached (it ran in the background, another
	// surface prompted it, a loop ticked it), painting the cached transcript
	// flashes OLD messages for a beat before journal truth replaces them — the
	// "I see older msgs for a split second" bug. Stale → skeleton instead.
	// Also never restore into a RUNNING session: the cached rows predate the
	// live turn by construction (only settled states are cached).
	dispatch({
		type: "sessionOpening",
		snapshot: initialSnapshot,
		cached: cached && !cachedStateIsStale(cached, initialSnapshot) ? cached : null,
	});
	let alive = true;
	// Coalesce the driver's event stream to ONE React commit per animation frame. A
	// heavy live run streams many events per second (one transport message per token/
	// delta, each its own macrotask — React 18 can't auto-batch across them), so a raw
	// dispatch-per-event commits a render PER TOKEN and saturates the WebView main
	// thread: the transcript repaints so hard the left rail stops answering clicks
	// (the rail-navigable-during-stream blocker). Buffering into a per-frame flush
	// bounds commits to ≤1/frame. The reducer still applies EVERY event in arrival
	// order, so state + ordering are identical — only the commit COUNT drops.
	let queue: SessionStateAction[] = [];
	let frame = 0;
	const flush = () => {
		if (frame !== 0) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
		if (!alive || queue.length === 0) return;
		const batch = queue;
		queue = [];
		// One rAF task → these dispatches auto-batch into a single React commit.
		for (const event of batch) dispatch(event);
	};
	// Lifecycle dispatches (sessionOpened, tree, failures) drain the stream queue
	// FIRST so a direct event can never land out of order ahead of buffered stream
	// events — the coalescing changes render cadence, never event sequence.
	const flushingDispatch: SessionDispatch = action => {
		flush();
		dispatch(action);
	};
	const unsubscribe: Unsubscribe = driver.subscribe(activeRef, event => {
		if (!alive) return;
		queue.push(event);
		if (frame === 0) frame = requestAnimationFrame(flush);
	});

	void openSession(driver, activeRef, initialSnapshot, flushingDispatch, () => alive);

	return () => {
		alive = false;
		if (frame !== 0) cancelAnimationFrame(frame);
		queue = [];
		unsubscribe();
	};
}

async function openSession(
	driver: SessionDriver,
	activeRef: SessionRef,
	initialSnapshot: SessionSnapshot | null,
	dispatch: SessionDispatch,
	isAlive: () => boolean,
) {
	try {
		const snapshot = await driver.openSession(activeRef, initialSnapshot);
		if (!isAlive()) return;
		completeSessionOpen(driver, activeRef, snapshot, dispatch, isAlive);
	} catch (error) {
		reportSessionOpenFailure(error, dispatch, isAlive);
	}
}

function completeSessionOpen(
	driver: SessionDriver,
	activeRef: SessionRef,
	snapshot: SessionSnapshot,
	dispatch: SessionDispatch,
	isAlive: () => boolean,
) {
	dispatch({ type: "sessionOpened", sessionRef: activeRef, timestamp: new Date().toISOString(), snapshot });
	window.setTimeout(() => loadSessionTree(driver, activeRef, dispatch, isAlive), SESSION_TREE_LOAD_DELAY_MS);
}

function reportSessionOpenFailure(error: unknown, dispatch: SessionDispatch, isAlive: () => boolean) {
	if (!isAlive()) return;
	dispatch({ type: "sessionOpenFailed", message: errorMessageText(error) });
}

function loadSessionTree(
	driver: SessionDriver,
	activeRef: SessionRef,
	dispatch: SessionDispatch,
	isAlive: () => boolean,
) {
	driver
		.getSessionTree(activeRef)
		.then(tree => {
			if (isAlive()) dispatch({ type: "sessionTreeLoaded", tree });
		})
		.catch(() => {
			/* session tree is supplemental; keep the main session usable */
		});
}

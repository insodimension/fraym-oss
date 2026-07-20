import type { SessionDriver, SessionDriverEvent, SessionRef, SessionSnapshot, Unsubscribe } from "@fraym/driver";
import { useCallback, useEffect, useRef } from "react";

/**
 * Grace window before a departed scratch (ephemeral) session is archived.
 * Opening the session again within the window cancels the archive — that
 * re-open IS the undo, so no toast is needed.
 */
const SCRATCH_PRUNE_GRACE_MS = 4000;

function sessionRefKey(ref: SessionRef): string {
	return `${ref.workspaceId}:${ref.sessionId}`;
}

/**
 * A scratch session's run is TRULY finished only when the foreground run is
 * done AND no detached background subagents are still working — a run that
 * completes while a background `task` fan-out is live must not vanish the
 * session out from under its own swarm. Mirrors `reduceVibr`'s idle transition
 * in `use-live-session-vibrs`, tightened by `hasBackgroundWork`.
 */
function isTrulyDone(event: SessionDriverEvent): boolean {
	if (event.type === "runCompleted") {
		return event.snapshot.hasBackgroundWork !== true;
	}
	// `runFailed` carries no snapshot; a failed run counts as done. Archiving is
	// non-destructive (rail visibility only), so even a lingering background
	// swarm keeps running engine-side after the row is scratched out.
	if (event.type === "runFailed") return true;
	if (event.type === "sessionUpdated" || event.type === "sessionOpened") {
		return event.snapshot.status !== "running" && event.snapshot.hasBackgroundWork !== true;
	}
	return false;
}

/** Duration of the strike-through sweep across the rail row. */
const SCRATCH_STRIKE_MS = 240;
/** Duration of the fade-and-slide that follows the strike. */
const SCRATCH_VANISH_MS = 220;

/**
 * Play the scratch-out on the departing session's rail row: a pencil-style
 * strike line sweeps across the title, then the row fades and slides out —
 * a scratch session gets literally scratched off the list. Resolves
 * immediately (no animation) when the row is absent or the Web Animations API
 * is unavailable (tests, compact rail) — archiving still proceeds.
 */
async function scratchRailRowOut(ref: SessionRef): Promise<void> {
	if (typeof document === "undefined") return;
	let row: HTMLElement | undefined;
	for (const el of document.querySelectorAll<HTMLElement>("button[data-session-id]")) {
		if (el.dataset.sessionId === ref.sessionId && el.dataset.workspaceId === ref.workspaceId) {
			row = el;
			break;
		}
	}
	if (!row || typeof row.animate !== "function") return;

	const strike = document.createElement("span");
	strike.setAttribute("data-slot", "scratch-strike");
	strike.setAttribute("aria-hidden", "true");
	strike.style.cssText =
		"position:absolute;left:10px;right:10px;top:50%;height:1.5px;background:currentColor;opacity:0.65;" +
		"transform:scaleX(0);transform-origin:left center;pointer-events:none;border-radius:1px;";
	const inlinePosition = row.style.position;
	if (typeof getComputedStyle === "function" && getComputedStyle(row).position === "static") {
		row.style.position = "relative";
	}
	row.appendChild(strike);
	try {
		// `finished` rejects if an animation is cancelled — either way we proceed.
		await strike
			.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
				duration: SCRATCH_STRIKE_MS,
				easing: "ease-out",
				fill: "forwards",
			})
			.finished.catch(() => undefined);
		await row
			.animate(
				[
					{ opacity: 1, transform: "none" },
					{ opacity: 0, transform: "translateX(-12px)" },
				],
				{ duration: SCRATCH_VANISH_MS, easing: "ease-in", fill: "forwards" },
			)
			.finished.catch(() => undefined);
	} finally {
		strike.remove();
		row.style.position = inlinePosition;
	}
}

export interface ScratchPruneControls {
	/** Call with the snapshot of the session the user is leaving. If it is a scratch
	 *  session, it self-archives: now if truly finished, or the moment its run
	 *  (and any background subagents) complete. */
	readonly onLeave: (departing: SessionSnapshot | null | undefined) => void;
	/** Call with the session the user is opening — cancels any pending archive (undo). */
	readonly onOpen: (ref: SessionRef) => void;
}

/**
 * Self-archive trigger for scratch sessions, decided at LEAVE time (when the
 * departing session's snapshot is authoritative):
 *  - left truly finished (idle, no background work) → scratch-out after the grace.
 *  - left working → subscribe and scratch-out when the agent truly finishes in
 *    the background (the "say something, leave, it vanishes when the agent is
 *    done" flow). A session you are still LOOKING at never vanishes — the
 *    trigger only arms when you leave it.
 * Re-opening the session cancels the pending archive. The action is the host's
 * archive (`onToggleArchiveSession`) — the row plays the scratch-out animation,
 * archives (drops out of the default rail filter), and the engine's boot sweep
 * remains the crash-safe hard-delete backstop for ephemeral sessions.
 */
export function useScratchPrune(
	driver: SessionDriver | null | undefined,
	archiveSession: ((ref: SessionRef) => void) | undefined,
	graceMs: number = SCRATCH_PRUNE_GRACE_MS,
): ScratchPruneControls {
	// Runtime collections keyed by dynamic session keys, inserted/deleted as
	// sessions are left/opened/finished — `Map`, not a static lookup table.
	const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	const subs = useRef(new Map<string, Unsubscribe>());

	const stop = useCallback((key: string) => {
		const timer = pending.current.get(key);
		if (timer !== undefined) {
			clearTimeout(timer);
			pending.current.delete(key);
		}
		const unsubscribe = subs.current.get(key);
		if (unsubscribe) {
			unsubscribe();
			subs.current.delete(key);
		}
	}, []);

	const schedule = useCallback(
		(ref: SessionRef) => {
			if (!archiveSession) return;
			const key = sessionRefKey(ref);
			if (pending.current.has(key)) return;
			pending.current.set(
				key,
				setTimeout(() => {
					pending.current.delete(key);
					void scratchRailRowOut(ref).then(() => {
						archiveSession(ref);
					});
				}, graceMs),
			);
		},
		[archiveSession, graceMs],
	);

	const onLeave = useCallback(
		(departing: SessionSnapshot | null | undefined) => {
			if (!archiveSession || departing?.config?.ephemeral !== true) return;
			const ref = departing.ref;
			const key = sessionRefKey(ref);
			if (departing.status !== "running" && departing.hasBackgroundWork !== true) {
				schedule(ref);
				return;
			}
			if (!driver || subs.current.has(key)) return;
			subs.current.set(
				key,
				driver.subscribe(ref, event => {
					if (!isTrulyDone(event)) return;
					const unsubscribe = subs.current.get(key);
					if (unsubscribe) {
						unsubscribe();
						subs.current.delete(key);
					}
					schedule(ref);
				}),
			);
		},
		[archiveSession, driver, schedule],
	);

	const onOpen = useCallback(
		(ref: SessionRef) => {
			stop(sessionRefKey(ref));
		},
		[stop],
	);

	useEffect(() => {
		const timers = pending.current;
		const subscriptions = subs.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
			for (const unsubscribe of subscriptions.values()) unsubscribe();
			subscriptions.clear();
		};
	}, []);

	return { onLeave, onOpen };
}

/**
 * Watch the OPEN session and arm the scratch self-archive on ANY navigation
 * away — rail selection, new-session, palette jumps, pane switches — not just
 * rail clicks. Keyed on the session ref; the latest snapshot of the departing
 * session is captured render-by-render so `onLeave` always sees its final
 * authoritative state.
 */
export function useScratchLeaveWatcher(
	snapshot: SessionSnapshot | null | undefined,
	controls: ScratchPruneControls,
): void {
	const prevKey = useRef<string | null>(null);
	const prevSnapshot = useRef<SessionSnapshot | null>(null);
	const key = snapshot ? sessionRefKey(snapshot.ref) : null;
	useEffect(() => {
		if (key === prevKey.current) {
			prevSnapshot.current = snapshot ?? prevSnapshot.current;
			return;
		}
		// A first-ever bind is an OPEN, not a leave of anything.
		if (prevKey.current !== null) controls.onLeave(prevSnapshot.current);
		if (snapshot) controls.onOpen(snapshot.ref);
		prevKey.current = key;
		prevSnapshot.current = snapshot ?? null;
	});
}

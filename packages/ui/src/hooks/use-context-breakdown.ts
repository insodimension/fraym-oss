import type { ContextBreakdown, SessionDriver, SessionRef } from "@fraym-ai/driver";
import { useEffect, useState } from "react";

export interface ContextBreakdownState {
	readonly breakdown: ContextBreakdown | null;
	readonly loading: boolean;
}

const BREAKDOWN_BACKOFF_MS = 30_000;
// Module-level so it survives component remounts AND reconnects (the storm vector):
// the always-visible context ring used to re-poll `_fraym/session/contextBreakdown`
// for a gone/unloaded session on every remount, and each request hit a sidecar that
// threw "Unsupported ACP session" — a respawn storm. A null/failed fetch backs the
// session off; a real breakdown clears it. Keyed by session ref.
const breakdownBackoffUntil = new Map<string, number>();

function breakdownBackoffKey(ref: SessionRef): string {
	return `${ref.workspaceId}:${ref.sessionId}`;
}

/** True while a session's breakdown fetch is backed off after a null/failed result. */
export function isBreakdownBackedOff(ref: SessionRef, now: number = Date.now()): boolean {
	const until = breakdownBackoffUntil.get(breakdownBackoffKey(ref));
	return until !== undefined && now < until;
}

/** Record a fetch outcome: a real breakdown clears the backoff; null/failure backs it off. */
export function recordBreakdownOutcome(ref: SessionRef, ok: boolean, now: number = Date.now()): void {
	const key = breakdownBackoffKey(ref);
	if (ok) breakdownBackoffUntil.delete(key);
	else breakdownBackoffUntil.set(key, now + BREAKDOWN_BACKOFF_MS);
}

/** Test-only: clear the negative cache between cases. */
export function resetBreakdownBackoff(): void {
	breakdownBackoffUntil.clear();
}

/**
 * Fetch the per-category context breakdown on demand. Mirrors Engine's `/context`:
 * the expensive split is derived when asked for, not pushed on every event.
 *
 * `open` gates fetching (e.g. only while the popover shows). `refreshKey` is an
 * opaque value that re-runs the fetch whenever it changes — pass a per-turn
 * token (streaming flag + last usage) so an always-visible consumer (the
 * context ring) stays live as the conversation grows.
 */
export function useContextBreakdown(
	driver: SessionDriver | null | undefined,
	sessionRef: SessionRef | null | undefined,
	open: boolean,
	refreshKey?: unknown,
): ContextBreakdownState {
	const [breakdown, setBreakdown] = useState<ContextBreakdown | null>(null);
	const [loading, setLoading] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is the explicit caller token for re-fetching.
	useEffect(() => {
		if (!open || !driver?.getContextBreakdown || !sessionRef) return;
		// Negative-cache: a session whose breakdown recently came back null/failed is
		// backed off, so the always-visible ring can't re-poll a gone session into a
		// sidecar respawn storm (survives remounts/reconnects — the cache is module-level).
		if (isBreakdownBackedOff(sessionRef)) return;
		const request = createContextBreakdownRequest();
		setLoading(true);
		void request.fetch(driver, sessionRef, setBreakdown, setLoading);
		return () => {
			request.cancel();
		};
	}, [open, driver, sessionRef, refreshKey]);

	return { breakdown, loading };
}

function createContextBreakdownRequest() {
	let cancelled = false;

	return {
		cancel: () => {
			cancelled = true;
		},
		fetch: async (
			driver: SessionDriver,
			sessionRef: SessionRef,
			setBreakdown: (breakdown: ContextBreakdown | null) => void,
			setLoading: (loading: boolean) => void,
		) => {
			try {
				const result = await driver.getContextBreakdown?.(sessionRef);
				recordBreakdownOutcome(sessionRef, Boolean(result));
				if (!cancelled) setBreakdown(result ?? null);
			} catch {
				recordBreakdownOutcome(sessionRef, false);
				if (!cancelled) setBreakdown(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		},
	};
}

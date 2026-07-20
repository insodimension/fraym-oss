/**
 * Pure helpers for the usage-limit strip's dismissal state. The map itself is
 * USER CONFIG (`FraymUiConfig.usageWarnDismissed`, persisted to disk by the config
 * driver — web AND desktop, shared across the app's sessions), keyed by
 * `<windowId>:<accountLabel>`. NO localStorage: the dismissal rides the same store
 * as every other Fraym preference, so it survives reload/remount/session-switch on
 * the desktop webview where localStorage does not.
 */

export interface UsageDismissEntry {
	readonly tier: number;
	readonly resetsAt: number;
}
export type UsageDismissMap = Readonly<Record<string, UsageDismissEntry>>;

/** Stable per (window, account) dismissal key — NOT per session, so a dismissal applies app-wide. */
export function usageDismissKey(windowId: string, accountLabel: string): string {
	return `${windowId}:${accountLabel}`;
}

/**
 * Quota windows are hours-to-days apart, but reported reset times can jitter by
 * a few hundred milliseconds between polls. Match within a tolerance so a
 * dismissal remains stable without hiding a genuinely reset window.
 */
const WINDOW_MATCH_MS = 5 * 60_000;

/**
 * True (strip hidden) iff the stored dismissal covers the current tier AND the live
 * window reset still matches (within {@link WINDOW_MATCH_MS}). A higher tier (usage
 * went red), a genuinely-later reset (the window reset since dismissal), or a missing
 * entry all re-show it.
 */
export function isUsageDismissed(
	map: UsageDismissMap,
	key: string,
	currentTier: number,
	liveResetsAt: number,
): boolean {
	const entry = map[key];
	return (
		entry !== undefined && entry.tier >= currentTier && Math.abs(entry.resetsAt - liveResetsAt) <= WINDOW_MATCH_MS
	);
}

/** A new map with `key` dismissed at `tier` / `resetsAt` (immutable — for `update("usageWarnDismissed", …)`). */
export function withUsageDismissed(map: UsageDismissMap, key: string, tier: number, resetsAt: number): UsageDismissMap {
	return { ...map, [key]: { tier, resetsAt } };
}

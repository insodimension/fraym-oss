/** Age (in ms) past which an account's usage report is called out as stale on
 * its card. The engine caches per-account reports for ~5 minutes and the panel
 * polls every few minutes, so healthy data is never older than ~10 minutes —
 * anything beyond this means the per-account fetch is failing and a cached
 * report is being served. */
export const USAGE_ACCOUNT_STALE_AFTER_MS = 15 * 60_000;

export function relativeTime(value: number, now = Date.now()): string {
	const minutes = Math.max(0, Math.round((now - value) / 60000));
	if (minutes < 2) return "now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

/**
 * Staleness label for a per-account report, or `null` while the data is
 * recent enough to present as live. Exists so a card whose account-level
 * fetch is silently failing can never masquerade as current truth.
 */
export function usageDataAgeLabel(fetchedAt: number | undefined, now = Date.now()): string | null {
	if (typeof fetchedAt !== "number" || !Number.isFinite(fetchedAt)) return null;
	if (now - fetchedAt < USAGE_ACCOUNT_STALE_AFTER_MS) return null;
	return `Data from ${relativeTime(fetchedAt, now)}`;
}

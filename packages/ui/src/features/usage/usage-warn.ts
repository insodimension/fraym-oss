/**
 * Pure math for the usage-limit warning strip's color gradient + dismissal tier.
 * The thresholds themselves are USER CONFIG (`@fraym/config` usageWarn*), passed
 * in — this module carries only the fixed gradient palette, never policy numbers.
 */

/** Hue at the warn threshold (amber); slides to 0 (pure red) at the red threshold. */
const AMBER_HUE = 45;
/** Fixed saturation/lightness across the whole gradient. */
const SATURATION = 90;
const LIGHTNESS = 55;

/**
 * Amber (hue 45) at `warnAt`% sliding to pure red (hue 0) at `redAt`%; clamped to
 * the endpoints outside the band. `warnAt`/`redAt` are the user-configured
 * thresholds — pure red is reached exactly at the red threshold, so the color
 * always matches the configured bands.
 */
export function usageWarnColor(percent: number, warnAt: number, redAt: number): string {
	const span = Math.max(1, redAt - warnAt);
	const t = Math.min(1, Math.max(0, (percent - warnAt) / span));
	return `hsl(${Math.round(AMBER_HUE * (1 - t))} ${SATURATION}% ${LIGHTNESS}%)`;
}

/**
 * Dismissal tier — the strip only re-shows when usage climbs into a HIGHER tier
 * (or the window resets). Two tiers: 0 = amber (warn..red), 1 = red (>= redAt).
 * So closing it once in amber keeps it gone until usage actually goes red.
 */
export function usageWarnTier(percent: number, redAt: number): number {
	return percent >= redAt ? 1 : 0;
}

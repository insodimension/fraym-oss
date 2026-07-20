const USD = new Intl.NumberFormat("en", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 2,
});

export function compactNumber(value: number): string {
	return new Intl.NumberFormat("en", {
		notation: value >= 10000 ? "compact" : "standard",
		maximumFractionDigits: value >= 10000 ? 1 : 0,
	}).format(value);
}

export function percent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

export function currency(value: number): string {
	if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
	return USD.format(value);
}

export function formatHour(hour: number | null | undefined): string {
	if (hour === null || hour === undefined || !Number.isFinite(hour)) return "none";
	const label = new Intl.DateTimeFormat("en", { hour: "numeric", hour12: true, timeZone: "UTC" }).format(
		new Date(Date.UTC(2020, 0, 1, hour)),
	);
	return label.replace(" ", " ");
}

export function relativeTime(value: string | undefined): string {
	if (!value) return "none";
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) return "none";
	const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
	if (minutes < 2) return "now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

/** Latency in ms → compact human string ("320ms", "1.3s"); em dash when absent/zero. */
export function formatLatencyMs(ms: number | null | undefined): string {
	if (ms === null || ms === undefined || !Number.isFinite(ms) || ms <= 0) return "—";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/** Generation throughput → "47 tok/s"; em dash when absent/zero. */
export function formatTokensPerSecond(tps: number | null | undefined): string {
	if (tps === null || tps === undefined || !Number.isFinite(tps) || tps <= 0) return "—";
	return `${tps >= 100 ? Math.round(tps) : tps.toFixed(1)} tok/s`;
}

/**
 * TTFT target bands (doc-36): <0.5s great, <1s fine, <2s elevated, else slow.
 * Pure classification — the component maps a band to a semantic color token.
 */
export type LatencyBand = "fast" | "good" | "elevated" | "slow" | "none";

export function latencyBand(ms: number | null | undefined): LatencyBand {
	if (ms === null || ms === undefined || !Number.isFinite(ms) || ms <= 0) return "none";
	if (ms < 500) return "fast";
	if (ms < 1000) return "good";
	if (ms < 2000) return "elevated";
	return "slow";
}

/** Short human label for a latency band, e.g. "Fast · under target". */
export function latencyBandLabel(band: LatencyBand): string {
	switch (band) {
		case "fast":
			return "Fast";
		case "good":
			return "On target";
		case "elevated":
			return "Elevated";
		case "slow":
			return "Slow";
		default:
			return "No data";
	}
}

/** World rank → "#3 of 30" / "#3" / "—". */
export function formatRank(rank: number | null | undefined, pool?: number | null): string {
	if (rank === null || rank === undefined || !Number.isFinite(rank) || rank <= 0) return "—";
	return pool && pool > 0 ? `#${rank} of ${pool}` : `#${rank}`;
}

/** 0-100 benchmark index → "71.1" / "—". */
export function formatIndex(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return "—";
	return value.toFixed(1);
}

/** USD per million tokens → "$25/M" / "$2.5/M" / "—". */
export function formatPricePerMTok(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return "—";
	if (value >= 10) return `$${Math.round(value)}/M`;
	return `$${value >= 1 ? value.toFixed(1) : value.toFixed(2)}/M`;
}

/**
 * Behavior-signal rate: hits per message, volume-normalized so a high-volume model
 * doesn't always "win". "23%" when under one per message, "1.6×" when more than one,
 * "0%" when none.
 */
export function formatRate(count: number, messages: number): string {
	if (!messages || messages <= 0 || count <= 0 || !Number.isFinite(count)) return "0%";
	const rate = count / messages;
	return rate >= 1 ? `${rate.toFixed(1)}×` : `${Math.round(rate * 100)}%`;
}

/**
 * Severity band for a behavior-signal rate (hits ÷ messages) — higher = more frustration.
 * `"none"` (calm / negligible) → `"warn"` (≥5% of messages) → `"high"` (≥20%). The
 * component maps these to color tokens; this stays Tailwind-free.
 */
export function rateTone(count: number, messages: number): "none" | "warn" | "high" {
	if (!messages || messages <= 0 || count <= 0 || !Number.isFinite(count)) return "none";
	const rate = count / messages;
	if (rate >= 0.2) return "high";
	if (rate >= 0.05) return "warn";
	return "none";
}

/** Window-over-window delta as a signed percent: "+18%" / "−12%" / "0%" / "—" when absent. Uses a true minus sign, not a hyphen. */
export function formatDeltaPct(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return "—";
	const rounded = Math.round(value * 100);
	if (rounded === 0) return "0%";
	return rounded > 0 ? `+${rounded}%` : `−${Math.abs(rounded)}%`;
}

/**
 * Stable `${provider}/${model}` slug. Single source for the crowd-telemetry join key
 * (a contribution's `modelId` must equal the leaderboard lookup key) and the engine-bench
 * selector, so the build side and the lookup side can never silently drift apart.
 */
export function modelSlug(model: { readonly provider: string; readonly model: string }): string {
	return `${model.provider}/${model.model}`;
}

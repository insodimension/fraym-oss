import type { AnalyticsBenchmarkMeta, AnalyticsModelStats } from "@fraym-ai/driver";
import { useEffect, useMemo, useState } from "react";
import { Select } from "../../elements";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import {
	compactNumber,
	currency,
	formatIndex,
	formatLatencyMs,
	formatPricePerMTok,
	formatTokensPerSecond,
	type LatencyBand,
	latencyBand,
	latencyBandLabel,
	percent,
	relativeTime,
} from "./analytics-format";

// ── motion ────────────────────────────────────────────────────────────────
// Bars/gauges grow in from zero once mounted (MOTION dial 4 — restrained, never
// looping). Reduced-motion users skip the easing via `motion-reduce:transition-none`
// and land on the final width immediately.
function useGrowIn(): boolean {
	const [grown, setGrown] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setGrown(true));
		return () => cancelAnimationFrame(id);
	}, []);
	return grown;
}

// ── color discipline ────────────────────────────────────────────────────────
// One accent (violet) carries identity; semantic tokens carry meaning. Latency
// bands map to traffic-light semantics, "on target" stays on-brand violet.
const BAND_TEXT: Record<LatencyBand, string> = {
	fast: "text-fr-add",
	good: "text-fr-text",
	elevated: "text-fr-warn",
	slow: "text-fr-del",
	none: "text-fr-text-3",
};
const BAND_FILL: Record<LatencyBand, string> = {
	fast: "bg-fr-add",
	good: "bg-fr-accent",
	elevated: "bg-fr-warn",
	slow: "bg-fr-del",
	none: "bg-fr-surface-2",
};

const GAUGE_MAX_MS = 2000;
const GAUGE_TARGET_MS = 1000; // doc-36: ~1s TTFT is "fine"; the reference hairline.

const clampPct = (value: number): number => Math.max(0, Math.min(100, value));
const gaugePct = (ms: number): number => clampPct((ms / GAUGE_MAX_MS) * 100);
const keyOf = (model: AnalyticsModelStats): string => `${model.provider}:${model.model}`;

// ── primitives ──────────────────────────────────────────────────────────────

function SideHeader({ icon, label }: { readonly icon: IconName; readonly label: string }) {
	return (
		<div className="flex items-center gap-1.5 font-secondary text-fr-2xs uppercase tracking-[0.08em] text-fr-text-3">
			<Icon name={icon} size={12} />
			{label}
		</div>
	);
}

type MiniTone = "ok" | "warn" | "danger";
const MINI_TONE: Record<MiniTone, string> = {
	ok: "text-fr-text",
	warn: "text-fr-warn",
	danger: "text-fr-del",
};

function MiniStat({
	label,
	value,
	tone = "ok",
}: {
	readonly label: string;
	readonly value: string;
	readonly tone?: MiniTone;
}) {
	return (
		<div className="rounded-[8px] bg-fr-surface-2 px-2.5 py-2">
			<div className={cn("font-secondary text-fr-sm font-semibold tabular-nums", MINI_TONE[tone])}>{value}</div>
			<div className="mt-0.5 font-secondary text-fr-2xs uppercase tracking-wide text-fr-text-3">{label}</div>
		</div>
	);
}

/** Horizontal latency gauge: band-colored fill to the measured TTFT, a hairline at
 *  the 1s target, and a p95 tick when the aggregator retains percentiles. */
function LatencyGauge({ ttftMs, p95Ms }: { readonly ttftMs?: number | null; readonly p95Ms?: number | null }) {
	const grown = useGrowIn();
	const band = latencyBand(ttftMs);
	const fillPct = ttftMs && ttftMs > 0 ? gaugePct(ttftMs) : 0;
	const hasP95 = p95Ms != null && Number.isFinite(p95Ms) && p95Ms > 0;
	return (
		<div className="space-y-1.5">
			<div className="relative h-2 overflow-hidden rounded-full bg-fr-surface">
				<div
					className={cn(
						"h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
						BAND_FILL[band],
					)}
					style={{ width: `${grown ? fillPct : 0}%` }}
				/>
				<div
					className="absolute inset-y-0 w-px bg-fr-text-3"
					style={{ left: `${gaugePct(GAUGE_TARGET_MS)}%` }}
					aria-hidden
				/>
				{hasP95 && (
					<div
						className="absolute inset-y-[-2px] w-px bg-fr-text-2"
						style={{ left: `${gaugePct(p95Ms as number)}%` }}
						aria-hidden
					/>
				)}
			</div>
			<div className="flex items-center justify-between font-secondary text-fr-2xs text-fr-text-3">
				<span>0</span>
				<span>1s target</span>
				<span>2s+</span>
			</div>
		</div>
	);
}

/** Labelled 0-100 capability bar (Artificial Analysis indices). */
function MetricBar({ label, value }: { readonly label: string; readonly value: number }) {
	const grown = useGrowIn();
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs text-fr-text-3">
				<span className="uppercase tracking-wide">{label}</span>
				<span className="tabular-nums text-fr-text-2">{formatIndex(value)}</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-fr-surface">
				<div
					className="h-full rounded-full bg-fr-blue transition-[width] duration-700 ease-out motion-reduce:transition-none"
					style={{ width: `${grown ? clampPct(value) : 0}%` }}
				/>
			</div>
		</div>
	);
}

// ── model card ────────────────────────────────────────────────────────────

function ModelPerfCard({ model }: { readonly model: AnalyticsModelStats }) {
	const band = latencyBand(model.averageTtftMs);
	const world = model.world ?? null;
	const errorRate = model.requests > 0 ? model.errors / model.requests : 0;
	const errorTone: MiniTone = errorRate > 0.05 ? "danger" : errorRate > 0 ? "warn" : "ok";
	const hasPercentiles = (model.ttftP50Ms ?? 0) > 0 || (model.ttftP95Ms ?? 0) > 0;
	const indices: ReadonlyArray<{ label: string; value: number | null | undefined }> = [
		{ label: "Intelligence", value: world?.intelligenceIndex },
		{ label: "Coding", value: world?.codingIndex },
		{ label: "Agentic", value: world?.agenticIndex },
	];
	const shownIndices = indices.filter(i => i.value != null && Number.isFinite(i.value));
	const hasPrice = world?.priceInputPerMTok != null || world?.priceOutputPerMTok != null;
	const verdict = ((): string => {
		const parts: string[] = [];
		const cIdx = world?.codingIndex;
		if (cIdx != null && Number.isFinite(cIdx)) {
			if (cIdx >= 70) parts.push("top-tier coding capability");
			else if (cIdx >= 50) parts.push("solid coding capability");
		}
		if (band === "fast") parts.push("well under its latency target");
		else if (band === "good") parts.push("within its latency target");
		else if (band === "elevated") parts.push("latency above target");
		else if (band === "slow") parts.push("slow first-token latency");
		return parts.join(" · ");
	})();

	return (
		<article className="group rounded-xl border border-fr-border-soft bg-fr-surface p-4 transition-colors hover:border-fr-border">
			<div className="mb-4 min-w-0">
				<div className="fr-overflow font-secondary text-fr-sm font-semibold text-fr-text">{model.model}</div>
				<div className="mt-0.5 font-secondary text-fr-2xs uppercase tracking-wide text-fr-text-3">
					{model.provider}
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
				{/* Your measured performance */}
				<div className="space-y-3">
					<SideHeader icon="bolt" label="Your performance" />
					<div className="flex items-baseline gap-2">
						<span
							className={cn(
								"font-secondary text-[26px] font-semibold leading-none tabular-nums",
								BAND_TEXT[band],
							)}
						>
							{formatLatencyMs(model.averageTtftMs)}
						</span>
						<span className="font-secondary text-fr-2xs uppercase tracking-wide text-fr-text-3">
							TTFT · {latencyBandLabel(band)}
						</span>
					</div>
					<LatencyGauge ttftMs={model.averageTtftMs} p95Ms={model.ttftP95Ms} />
					{hasPercentiles && (
						<div className="font-secondary text-fr-2xs text-fr-text-3">
							p50 {formatLatencyMs(model.ttftP50Ms)} · p95 {formatLatencyMs(model.ttftP95Ms)}
						</div>
					)}
					<div className="grid grid-cols-2 gap-2 pt-1">
						<MiniStat label="Throughput" value={formatTokensPerSecond(model.averageTokensPerSecond)} />
						<MiniStat label="Spend" value={currency(model.totalCost)} />
						<MiniStat label="Requests" value={compactNumber(model.requests)} />
						<MiniStat label="Error rate" value={percent(errorRate)} tone={errorTone} />
					</div>
				</div>

				{/* World standing — capability (Artificial Analysis) + price */}
				<div className="space-y-3 lg:border-l lg:border-fr-border-soft lg:pl-5">
					<SideHeader icon="globe" label="Capability & price" />
					{world && (shownIndices.length > 0 || hasPrice) ? (
						<>
							{shownIndices.length > 0 ? (
								shownIndices.map(item => (
									<MetricBar key={item.label} label={item.label} value={item.value as number} />
								))
							) : (
								<div className="font-secondary text-fr-2xs text-fr-text-3">
									Capability benchmark unavailable.
								</div>
							)}
							{hasPrice && (
								<div className="flex items-center justify-between gap-2 pt-1 font-secondary text-fr-2xs text-fr-text-3">
									<span className="uppercase tracking-wide">Price / Mtok</span>
									<span className="tabular-nums text-fr-text-2">
										{formatPricePerMTok(world.priceInputPerMTok)} in ·{" "}
										{formatPricePerMTok(world.priceOutputPerMTok)} out
									</span>
								</div>
							)}
						</>
					) : (
						<div className="rounded-[8px] border border-dashed border-fr-border-soft px-3 py-5 text-center font-secondary text-fr-2xs text-fr-text-3">
							No public benchmark match for this model.
						</div>
					)}
				</div>
			</div>
			{verdict && (
				<div className="mt-4 flex items-center gap-1.5 border-t border-fr-border-soft pt-3 font-secondary text-fr-2xs text-fr-text-2">
					<Icon name="spark" size={11} className="text-fr-accent" />
					<span>{verdict}</span>
				</div>
			)}
		</article>
	);
}

// ── fleet summary ────────────────────────────────────────────────────────

interface FleetSummary {
	readonly count: number;
	readonly avgTtftMs: number | null;
	readonly spend: number;
	readonly requests: number;
}

function computeFleetSummary(models: readonly AnalyticsModelStats[]): FleetSummary {
	let ttftWeight = 0;
	let ttftSum = 0;
	let spend = 0;
	let requests = 0;
	for (const model of models) {
		spend += model.totalCost;
		requests += model.requests;
		const ttft = model.averageTtftMs;
		if (ttft != null && Number.isFinite(ttft) && ttft > 0 && model.requests > 0) {
			ttftSum += ttft * model.requests;
			ttftWeight += model.requests;
		}
	}
	return {
		count: models.length,
		avgTtftMs: ttftWeight > 0 ? ttftSum / ttftWeight : null,
		spend,
		requests,
	};
}

function FleetSummaryStrip({ summary }: { readonly summary: FleetSummary }) {
	const band = latencyBand(summary.avgTtftMs);
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
			<MiniStat label="Models" value={compactNumber(summary.count)} />
			<div className="rounded-[8px] bg-fr-surface-2 px-2.5 py-2">
				<div className={cn("font-secondary text-fr-sm font-semibold tabular-nums", BAND_TEXT[band])}>
					{formatLatencyMs(summary.avgTtftMs)}
				</div>
				<div className="mt-0.5 font-secondary text-fr-2xs uppercase tracking-wide text-fr-text-3">Avg TTFT</div>
			</div>
			<MiniStat label="Requests" value={compactNumber(summary.requests)} />
			<MiniStat label="Spend" value={currency(summary.spend)} />
		</div>
	);
}

// ── section ────────────────────────────────────────────────────────────────

/**
 * "Model performance — your fleet vs the world." Per model you actually use:
 * measured TTFT (band-graded against production targets), throughput, spend,
 * error rate — beside its real capability (Artificial Analysis intelligence /
 * coding / agentic indices) and list price. Top 5 by usage with a dropdown to
 * deep-dive any single model. World fields degrade gracefully when absent.
 */
export function AnalyticsModelPerformance({
	models,
	benchmarks,
	className,
}: {
	readonly models: readonly AnalyticsModelStats[];
	readonly benchmarks?: AnalyticsBenchmarkMeta;
	readonly className?: string;
}) {
	const TOP_N = 5;
	const [selected, setSelected] = useState<string>("top");
	const sorted = useMemo(() => [...models].sort((a, b) => b.requests - a.requests), [models]);
	const summary = useMemo(() => computeFleetSummary(models), [models]);
	const options = useMemo(
		() => [
			{ value: "top", label: `Top ${TOP_N} by usage` },
			...sorted.map(model => ({ value: keyOf(model), label: `${model.model} · ${model.provider}` })),
		],
		[sorted],
	);

	// Fall back to the overview if a previously-selected model leaves the set (e.g. range change).
	const effective = selected === "top" || sorted.some(model => keyOf(model) === selected) ? selected : "top";
	const visible = effective === "top" ? sorted.slice(0, TOP_N) : sorted.filter(model => keyOf(model) === effective);
	const provenance = benchmarks
		? `${benchmarks.source}${benchmarks.syncedAt ? ` · synced ${relativeTime(benchmarks.syncedAt)}` : ""}`
		: "Connect to see world benchmarks";

	return (
		<section className={cn("rounded-xl border border-fr-border-soft p-4", className)}>
			<header className="mb-4 flex flex-wrap items-start justify-between gap-2">
				<div>
					<div className="font-secondary text-fr-2xs uppercase tracking-[0.08em] text-fr-text-3">
						Model performance
					</div>
					<h2 className="mt-1 text-fr-base font-semibold text-fr-text">Your fleet vs the world</h2>
				</div>
				<span className="inline-flex items-center gap-1.5 rounded-full bg-fr-surface-2 px-2.5 py-1 font-secondary text-fr-2xs text-fr-text-3">
					<Icon name="globe" size={11} />
					{provenance}
				</span>
			</header>

			{sorted.length === 0 ? (
				<div className="rounded-xl border border-dashed border-fr-border-soft px-4 py-10 text-center">
					<div className="text-fr-sm font-semibold text-fr-text">No model usage yet</div>
					<div className="mt-1 font-secondary text-fr-2xs text-fr-text-3">
						Run a session and your models will appear here, graded against the world.
					</div>
				</div>
			) : (
				<div className="space-y-4">
					<FleetSummaryStrip summary={summary} />
					<div className="flex items-center justify-between gap-3">
						<span className="min-w-0 fr-overflow font-secondary text-fr-2xs uppercase tracking-[0.08em] text-fr-text-3">
							{effective === "top"
								? `Top ${Math.min(TOP_N, sorted.length)} of ${sorted.length} by usage`
								: "Selected model"}
						</span>
						<Select
							size="sm"
							className="w-auto max-w-[230px] shrink-0"
							value={effective}
							options={options}
							onChange={event => setSelected(event.target.value)}
							aria-label="Select model telemetry"
						/>
					</div>
					<div className="space-y-3">
						{visible.map(model => (
							<ModelPerfCard key={keyOf(model)} model={model} />
						))}
					</div>
				</div>
			)}
		</section>
	);
}

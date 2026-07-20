import type { AnalyticsDegradation, AnalyticsModelDegradation } from "@fraym/driver";
import { cn } from "../../lib/cn";
import { compactNumber, formatDeltaPct } from "./analytics-format";

/**
 * Window-over-window model latency degradation — Phase 4 of
 * `docs/design/36-analytics-and-crowd-telemetry.md` ("opus vs last week").
 * A model only appears once it has usage in BOTH the current and previous
 * 7-day window — a comparison needs both sides, never a fabricated "vs
 * nothing". Trend is a discrete classification (>±10% on TTFT or
 * throughput), not a continuous severity gradient — slower/faster/flat map
 * directly to danger/success/neutral, the same restraint as a pass/fail gate.
 */

const TREND_LABEL: Record<AnalyticsModelDegradation["trend"], string> = {
	slower: "Slower",
	faster: "Faster",
	flat: "Flat",
};

const TREND_TEXT: Record<AnalyticsModelDegradation["trend"], string> = {
	slower: "text-fr-del",
	faster: "text-fr-add",
	flat: "text-fr-text-3",
};

function formatWindowRange(currentWindowStart: string, previousWindowStart: string): string {
	const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
	const current = new Date(currentWindowStart);
	const previous = new Date(previousWindowStart);
	if (Number.isNaN(current.getTime()) || Number.isNaN(previous.getTime())) return "this week vs last week";
	return `${fmt.format(current)}–now vs ${fmt.format(previous)}–${fmt.format(current)}`;
}

function ModelDegradationRow({ model }: { readonly model: AnalyticsModelDegradation }) {
	return (
		<div className="rounded-[8px] border border-fr-border-soft px-3 py-2.5">
			<div className="flex items-center justify-between gap-3">
				<span className="min-w-0 fr-overflow font-secondary text-fr-xs font-semibold text-fr-text">
					{model.model}
				</span>
				<span
					className={cn(
						"shrink-0 font-secondary text-fr-2xs font-semibold uppercase tracking-wide",
						TREND_TEXT[model.trend],
					)}
				>
					{TREND_LABEL[model.trend]}
				</span>
			</div>
			<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">TTFT</span>
					<span className={cn("tabular-nums", TREND_TEXT[model.trend])}>{formatDeltaPct(model.ttftDeltaPct)}</span>
				</div>
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">Throughput</span>
					<span className="tabular-nums text-fr-text-2">{formatDeltaPct(model.throughputDeltaPct)}</span>
				</div>
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">Requests</span>
					<span className="tabular-nums text-fr-text-2">
						{compactNumber(model.previousRequests)} → {compactNumber(model.currentRequests)}
					</span>
				</div>
			</div>
		</div>
	);
}

export function AnalyticsDegradationPanel({
	degradation,
	className,
}: {
	readonly degradation: AnalyticsDegradation | undefined;
	readonly className?: string;
}) {
	if (!degradation || degradation.models.length === 0) {
		return (
			<section className="rounded-xl border border-fr-border-soft p-4">
				<h2 className="mb-3 text-fr-base font-semibold text-fr-text">Week-over-week</h2>
				<div
					className={cn("rounded-xl border border-dashed border-fr-border-soft px-4 py-10 text-center", className)}
				>
					<p className="text-fr-sm text-fr-text-2">Not enough history yet</p>
					<p className="mt-1 text-fr-xs text-fr-text-3">
						A model needs usage in both this week and last week to compare — check back once you have two weeks of
						activity.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className="rounded-xl border border-fr-border-soft p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-fr-base font-semibold text-fr-text">Week-over-week</h2>
				<span className="font-secondary text-fr-2xs text-fr-text-3">
					{formatWindowRange(degradation.currentWindowStart, degradation.previousWindowStart)}
				</span>
			</div>
			<div className={cn("space-y-2", className)}>
				{degradation.models.map(model => (
					<ModelDegradationRow key={`${model.provider}:${model.model}`} model={model} />
				))}
			</div>
		</section>
	);
}

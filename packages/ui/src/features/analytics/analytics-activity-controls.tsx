import type { AnalyticsFreshness, AnalyticsRange } from "@fraym/driver";
import { cn } from "../../lib/cn";
import { ANALYTICS_RANGES } from "./analytics-activity-data";
import { relativeTime } from "./analytics-format";

function sourceLabel(source: string | undefined): string {
	if (!source) return "Analytics source unavailable";
	if (source === "fraym-stats") return "Fraym stats";
	return source;
}

function freshnessLabel(freshness: AnalyticsFreshness | null | undefined): string {
	const status = freshness?.status ?? "unavailable";
	if (status === "ready") return freshness?.syncedAt ? `Synced ${relativeTime(freshness.syncedAt)}` : "Ready";
	if (status === "syncing") return "Syncing";
	if (status === "stale") return "Stale";
	return "Unavailable";
}

export function AnalyticsRangeControl({
	range,
	onRangeChange,
	className,
}: {
	readonly range: AnalyticsRange;
	readonly onRangeChange?: (range: AnalyticsRange) => void;
	readonly className?: string;
}) {
	return (
		<div className={cn("inline-flex items-center gap-1 rounded-[8px] bg-fr-surface p-0.5", className)}>
			{ANALYTICS_RANGES.map(option => (
				<button
					key={option.value}
					type="button"
					disabled={!onRangeChange}
					onClick={() => onRangeChange?.(option.value)}
					className={cn(
						"rounded-[6px] px-2 py-1 text-fr-xs font-semibold text-fr-text-3 transition-colors",
						"enabled:hover:bg-fr-surface-2 enabled:hover:text-fr-text",
						range === option.value && "bg-fr-surface-2 text-fr-text",
						!onRangeChange && "cursor-default",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

export function AnalyticsFreshnessBadge({
	freshness,
	className,
	onRefresh,
}: {
	readonly freshness: AnalyticsFreshness | null | undefined;
	readonly className?: string;
	readonly onRefresh?: () => void;
}) {
	const status = freshness?.status ?? "unavailable";
	return (
		<button
			type="button"
			disabled={!onRefresh}
			onClick={onRefresh}
			className={freshnessBadgeClass(status, Boolean(onRefresh), className)}
			title={sourceLabel(freshness?.source)}
		>
			<span className={freshnessDotClass(status)} />
			{freshnessLabel(freshness)}
		</button>
	);
}

function freshnessBadgeClass(status: string, interactive: boolean, className?: string): string {
	return cn(
		"inline-flex items-center gap-1.5 rounded-[8px] border border-fr-border-soft px-2.5 py-1 text-fr-xs text-fr-text-2",
		interactive && "transition-colors hover:bg-fr-surface hover:text-fr-text",
		status === "ready" && "border-[color-mix(in_srgb,var(--fr-accent)_28%,var(--fr-border-soft))]",
		status === "unavailable" && "opacity-70",
		className,
	);
}

function freshnessDotClass(status: string): string {
	return cn(
		"size-1.5 rounded-full bg-fr-text-3",
		status === "ready" && "bg-fr-accent",
		status === "syncing" && "animate-[fr-breathe_1.6s_infinite] bg-fr-warn",
		status === "stale" && "bg-fr-warn",
	);
}

import type {
	AnalyticsBehaviorStats,
	AnalyticsBenchResult,
	AnalyticsCostBucket,
	AnalyticsModelStats,
	AnalyticsRange,
	AnalyticsRecentRequest,
	AnalyticsSnapshot,
} from "@fraym-ai/driver";
import { memo, type ReactNode, useMemo, useState } from "react";
import { Skeleton, SkeletonGroup } from "../../elements";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import {
	AnalyticsFreshnessBadge,
	AnalyticsRangeControl,
	AnalyticsWorkspaceActivity,
	longestActivityStreak,
} from "./analytics-activity";
import { AnalyticsCrowdPanel } from "./analytics-crowd-panel";
import { AnalyticsDegradationPanel } from "./analytics-degradation";
import {
	compactNumber,
	currency,
	formatHour,
	formatLatencyMs,
	formatRate,
	formatTokensPerSecond,
	percent,
	rateTone,
	relativeTime,
} from "./analytics-format";
import { AnalyticsHarnessPanel } from "./analytics-harness";
import { AnalyticsModelPerformance } from "./analytics-model-performance";
import { AnalyticsSpeedTest } from "./analytics-speed-test";

export {
	AnalyticsActivityHeatmap,
	AnalyticsFreshnessBadge,
	AnalyticsRangeControl,
	AnalyticsWorkspaceActivity,
	analyticsActivityCells,
} from "./analytics-activity";

export interface AnalyticsStat {
	readonly value: string;
	readonly label: string;
	readonly detail?: string;
}

export type AnalyticsSummaryTab = "overview" | "models";

export const PROFILE_ANALYTICS_DOMAIN_IDS = [
	"freshness",
	"overview",
	"activity",
	"models",
	"costs",
	"behavior",
	"recentRequests",
	"recentErrors",
] as const;

export type ProfileAnalyticsDomainId = (typeof PROFILE_ANALYTICS_DOMAIN_IDS)[number];

function topModel(models: readonly AnalyticsModelStats[]): string {
	return models[0]?.model ?? "none";
}

function statValue(value: number, suffix = ""): string {
	return `${compactNumber(value)}${suffix}`;
}

export function analyticsSnapshotHasUsage(snapshot: AnalyticsSnapshot | null | undefined): boolean {
	if (!snapshot) return false;
	return (
		snapshot.overview.messages > 0 ||
		snapshot.overview.requests > 0 ||
		snapshot.overview.totalTokens > 0 ||
		snapshot.activity.some(bucket => bucket.level > 0)
	);
}

export function analyticsProfileStats(
	snapshot: AnalyticsSnapshot,
	options: { readonly sessionCount?: number } = {},
): readonly AnalyticsStat[] {
	const sessions = options.sessionCount ?? snapshot.overview.sessions ?? 0;
	const favoriteModel = topModel(snapshot.models);
	return [
		{ value: compactNumber(sessions), label: "Sessions" },
		{ value: compactNumber(snapshot.overview.messages), label: "Messages" },
		{ value: compactNumber(snapshot.overview.totalTokens), label: "Total tokens" },
		{ value: compactNumber(snapshot.overview.activeDays), label: "Active days" },
		{ value: statValue(snapshot.overview.currentStreak, "d"), label: "Current streak" },
		{ value: statValue(longestActivityStreak(snapshot.activity), "d"), label: "Longest streak" },
		{ value: formatHour(snapshot.overview.peakHour), label: "Peak hour" },
		{ value: favoriteModel, label: "Favorite model" },
		{ value: formatLatencyMs(snapshot.overview.averageTtftMs), label: "Avg TTFT" },
		{ value: formatTokensPerSecond(snapshot.overview.averageTokensPerSecond), label: "Throughput" },
	];
}

export function profileAnalyticsCoverage(
	snapshot: AnalyticsSnapshot | null | undefined,
): Record<ProfileAnalyticsDomainId, boolean> {
	return {
		freshness: Boolean(snapshot?.freshness),
		overview: Boolean(snapshot?.overview),
		activity: Boolean(snapshot?.activity),
		models: Boolean(snapshot?.models),
		costs: Boolean(snapshot?.costs),
		behavior: Boolean(snapshot?.behavior),
		recentRequests: Boolean(snapshot?.recentRequests),
		recentErrors: Boolean(snapshot?.recentErrors),
	};
}

function EmptyAnalyticsState({
	title,
	description,
	className,
}: {
	readonly title: string;
	readonly description: string;
	readonly className?: string;
}) {
	return (
		<div className={cn("rounded-xl border border-fr-border-soft px-4 py-5 text-center", className)}>
			<div className="text-fr-sm font-medium text-fr-text">{title}</div>
			<div className="mt-1 text-fr-xs leading-5 text-fr-text-3">{description}</div>
		</div>
	);
}

function analyticsOverviewItems({
	snapshot,
	stats,
}: {
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly stats?: readonly AnalyticsStat[];
}): readonly AnalyticsStat[] {
	return stats ?? (snapshot ? analyticsProfileStats(snapshot) : []);
}

function AnalyticsOverviewEmpty({ className }: { readonly className?: string }) {
	return (
		<EmptyAnalyticsState
			title="No analytics yet"
			description="Send a few messages and refresh analytics to populate this workspace."
			className={className}
		/>
	);
}

function AnalyticsOverviewTile({ item }: { readonly item: AnalyticsStat }) {
	return (
		<div className="min-w-0 rounded-[6px] bg-fr-surface px-2.5 py-2">
			<div className="fr-overflow text-fr-xs font-semibold text-fr-text-3">{item.label}</div>
			<div className="mt-0.5 fr-overflow text-fr-lg font-semibold text-fr-text">{item.value}</div>
			{item.detail && <div className="mt-1 fr-overflow text-fr-2xs text-fr-text-3">{item.detail}</div>}
		</div>
	);
}

function AnalyticsOverviewGrid({
	items,
	className,
}: {
	readonly items: readonly AnalyticsStat[];
	readonly className?: string;
}) {
	return (
		<div className={cn("overflow-hidden rounded-xl border border-fr-border-soft", className)}>
			<div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-4">
				{items.map(item => (
					<AnalyticsOverviewTile key={item.label} item={item} />
				))}
			</div>
		</div>
	);
}

export function AnalyticsOverviewStrip({
	snapshot,
	stats,
	loading,
	error,
	className,
}: {
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly stats?: readonly AnalyticsStat[];
	readonly loading?: boolean;
	readonly error?: string | null;
	readonly className?: string;
}) {
	if (error) return <EmptyAnalyticsState title="Analytics unavailable" description={error} className={className} />;
	if (loading) return <AnalyticsOverviewSkeleton className={className} />;
	const items = analyticsOverviewItems({ snapshot, stats });
	return items.length > 0 ? (
		<AnalyticsOverviewGrid items={items} className={className} />
	) : (
		<AnalyticsOverviewEmpty className={className} />
	);
}

function AnalyticsOverviewSkeleton({ className }: { readonly className?: string }) {
	return (
		<SkeletonGroup
			label="Syncing analytics…"
			className={cn("overflow-hidden rounded-xl border border-fr-border-soft", className)}
		>
			<div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-4">
				{[0, 1, 2, 3].map(i => (
					<div key={i} className="min-w-0 rounded-[6px] bg-fr-surface px-2.5 py-2">
						<Skeleton h={10} rounded="sm" w="62%" />
						<Skeleton h={15} rounded="sm" w="46%" className="mt-1.5" />
					</div>
				))}
			</div>
		</SkeletonGroup>
	);
}

type AnalyticsWorkspaceSummaryCardProps = {
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly stats?: readonly AnalyticsStat[];
	readonly cells?: readonly number[];
	readonly range?: AnalyticsRange;
	readonly onRangeChange?: (range: AnalyticsRange) => void;
	readonly available?: boolean;
	readonly loading?: boolean;
	readonly error?: string | null;
	readonly activityTitle?: string;
	readonly activityCaption?: string;
	readonly className?: string;
};

function AnalyticsSummaryTabButton({
	active,
	children,
	onClick,
}: {
	readonly active: boolean;
	readonly children: ReactNode;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"rounded-[6px] px-2 py-1 text-fr-xs font-semibold text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text",
				active && "bg-fr-surface-2 text-fr-text",
			)}
		>
			{children}
		</button>
	);
}

function AnalyticsSummaryTabs({
	activeTab,
	onTabChange,
}: {
	readonly activeTab: AnalyticsSummaryTab;
	readonly onTabChange: (tab: AnalyticsSummaryTab) => void;
}) {
	return (
		<div className="inline-flex items-center gap-1 rounded-[8px] bg-fr-surface p-0.5">
			<AnalyticsSummaryTabButton active={activeTab === "overview"} onClick={() => onTabChange("overview")}>
				Overview
			</AnalyticsSummaryTabButton>
			<AnalyticsSummaryTabButton active={activeTab === "models"} onClick={() => onTabChange("models")}>
				Models
			</AnalyticsSummaryTabButton>
		</div>
	);
}

function AnalyticsSummaryCardHeader({
	activeTab,
	currentRange,
	onTabChange,
	onRangeChange,
}: {
	readonly activeTab: AnalyticsSummaryTab;
	readonly currentRange: AnalyticsRange;
	readonly onTabChange: (tab: AnalyticsSummaryTab) => void;
	readonly onRangeChange?: (range: AnalyticsRange) => void;
}) {
	return (
		<div className="mb-3 flex items-center justify-between gap-3">
			<AnalyticsSummaryTabs activeTab={activeTab} onTabChange={onTabChange} />
			<AnalyticsRangeControl range={currentRange} onRangeChange={onRangeChange} />
		</div>
	);
}

function AnalyticsSummaryOverviewTab({
	snapshot,
	stats,
	cells,
	currentRange,
	loading,
	error,
	available,
	activityTitle,
	activityCaption,
}: {
	readonly snapshot: AnalyticsSnapshot | null;
	readonly stats: readonly AnalyticsStat[];
	readonly cells?: readonly number[];
	readonly currentRange: AnalyticsRange;
	readonly loading: boolean;
	readonly error?: string | null;
	readonly available: boolean;
	readonly activityTitle: string;
	readonly activityCaption?: string;
}) {
	return (
		<>
			<AnalyticsOverviewStrip snapshot={snapshot} stats={stats} loading={loading} error={error} />
			<AnalyticsWorkspaceActivity
				title={activityTitle}
				caption={activityCaption}
				snapshot={snapshot}
				cells={cells}
				range={currentRange}
				loading={loading}
				error={error}
				available={available}
				showRangeControl={false}
				showFreshness={false}
				className="mt-4"
			/>
		</>
	);
}

function AnalyticsSummaryCardBody({
	activeTab,
	snapshot,
	stats,
	cells,
	currentRange,
	loading,
	error,
	available,
	activityTitle,
	activityCaption,
}: {
	readonly activeTab: AnalyticsSummaryTab;
	readonly snapshot: AnalyticsSnapshot | null;
	readonly stats: readonly AnalyticsStat[];
	readonly cells?: readonly number[];
	readonly currentRange: AnalyticsRange;
	readonly loading: boolean;
	readonly error?: string | null;
	readonly available: boolean;
	readonly activityTitle: string;
	readonly activityCaption?: string;
}) {
	if (activeTab === "overview") {
		return (
			<AnalyticsSummaryOverviewTab
				snapshot={snapshot}
				stats={stats}
				cells={cells}
				currentRange={currentRange}
				loading={loading}
				error={error}
				available={available}
				activityTitle={activityTitle}
				activityCaption={activityCaption}
			/>
		);
	}
	if (snapshot) return <AnalyticsModelBreakdown models={snapshot.models} />;
	return <AnalyticsOverviewStrip stats={stats} snapshot={snapshot} loading={loading} error={error} />;
}

type AnalyticsSummaryCardState = {
	readonly currentRange: AnalyticsRange;
	readonly snapshotForRange: AnalyticsSnapshot | null;
	readonly loading: boolean;
	readonly stats: readonly AnalyticsStat[];
};

function useAnalyticsSummaryCardState({
	snapshot,
	stats,
	range,
	loading,
}: {
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly stats?: readonly AnalyticsStat[];
	readonly range?: AnalyticsRange;
	readonly loading: boolean;
}): AnalyticsSummaryCardState {
	const currentRange = range ?? snapshot?.range ?? "30d";
	const snapshotForRange = snapshot?.range === currentRange ? snapshot : null;
	const visibleStats = useMemo(
		() => stats ?? (snapshotForRange ? analyticsProfileStats(snapshotForRange) : []),
		[snapshotForRange, stats],
	);
	return {
		currentRange,
		snapshotForRange,
		loading: loading || Boolean(snapshot && snapshot.range !== currentRange),
		stats: visibleStats,
	};
}

// Memoized: this dashboard renders beside live composer drafts on the start
// surface. Its inputs (snapshot/range/setRange) only change on real analytics
// events, so memo keeps an unrelated parent re-render (e.g. a keystroke) from
// repainting the whole card. Callers MUST pass referentially stable props
// (see the shared EMPTY_CELLS constant) for this to bite.
export const AnalyticsWorkspaceSummaryCard = memo(function AnalyticsWorkspaceSummaryCard({
	snapshot,
	stats,
	cells,
	range,
	onRangeChange,
	available = false,
	loading = false,
	error = null,
	activityTitle = "Token activity",
	activityCaption,
	className,
}: AnalyticsWorkspaceSummaryCardProps) {
	const [activeTab, setActiveTab] = useState<AnalyticsSummaryTab>("overview");
	const summary = useAnalyticsSummaryCardState({ snapshot, stats, range, loading });

	return (
		<div
			data-slot="analytics-summary-card"
			className={cn("rounded-xl border border-fr-border-soft bg-fr-panel/40 p-3", className)}
		>
			<AnalyticsSummaryCardHeader
				activeTab={activeTab}
				currentRange={summary.currentRange}
				onTabChange={setActiveTab}
				onRangeChange={onRangeChange}
			/>
			<AnalyticsSummaryCardBody
				activeTab={activeTab}
				snapshot={summary.snapshotForRange}
				stats={summary.stats}
				cells={cells}
				currentRange={summary.currentRange}
				loading={summary.loading}
				error={error}
				available={available}
				activityTitle={activityTitle}
				activityCaption={activityCaption}
			/>
		</div>
	);
});

function Section({
	title,
	children,
	action,
}: {
	readonly title: string;
	readonly children: ReactNode;
	readonly action?: ReactNode;
}) {
	return (
		<section className="rounded-xl border border-fr-border-soft p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-fr-base font-semibold text-fr-text">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

function RowBar({
	label,
	value,
	detail,
	max,
}: {
	readonly label: string;
	readonly value: number;
	readonly detail: string;
	readonly max: number;
}) {
	const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-3 text-fr-sm">
				<span className="min-w-0 fr-overflow text-fr-text">{label}</span>
				<span className="shrink-0 font-secondary text-fr-xs text-fr-text-3">{detail}</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-fr-surface">
				<div className="h-full rounded-full bg-fr-accent" style={{ width: `${width}%` }} />
			</div>
		</div>
	);
}

export function AnalyticsModelBreakdown({
	models,
	className,
}: {
	readonly models: readonly AnalyticsModelStats[];
	readonly className?: string;
}) {
	const max = Math.max(0, ...models.map(model => model.totalTokens));
	return (
		<Section title="Models" action={<span className="text-fr-xs text-fr-text-3">Top: {topModel(models)}</span>}>
			<div className={cn("space-y-3", className)}>
				{models.slice(0, 8).map(model => (
					<RowBar
						key={`${model.provider}:${model.model}`}
						label={model.model}
						value={model.totalTokens}
						max={max}
						detail={`${compactNumber(model.requests)} reqs · ${formatLatencyMs(model.averageTtftMs)} · ${formatTokensPerSecond(model.averageTokensPerSecond)}`}
					/>
				))}
				{models.length === 0 && (
					<EmptyAnalyticsState
						title="No model usage"
						description="No model requests are present for this range."
					/>
				)}
			</div>
		</Section>
	);
}

export function AnalyticsCostBreakdown({
	costs,
	className,
}: {
	readonly costs: readonly AnalyticsCostBucket[];
	readonly className?: string;
}) {
	const totals = new Map<string, { cost: number; requests: number }>();
	for (const bucket of costs) {
		const key = `${bucket.provider}:${bucket.model}`;
		const current = totals.get(key) ?? { cost: 0, requests: 0 };
		totals.set(key, { cost: current.cost + bucket.cost, requests: current.requests + bucket.requests });
	}
	const rows = [...totals.entries()]
		.map(([key, value]) => ({ key, label: key.split(":").slice(1).join(":") || key, ...value }))
		.sort((a, b) => b.cost - a.cost);
	const max = Math.max(0, ...rows.map(row => row.cost));
	return (
		<Section title="Cost">
			<div className={cn("space-y-3", className)}>
				{rows.slice(0, 8).map(row => (
					<RowBar
						key={row.key}
						label={row.label}
						value={row.cost}
						max={max}
						detail={`${currency(row.cost)} · ${compactNumber(row.requests)} reqs`}
					/>
				))}
				{rows.length === 0 && (
					<EmptyAnalyticsState title="No cost data" description="No cost records are present for this range." />
				)}
			</div>
		</Section>
	);
}

function behaviorItems(stats: AnalyticsBehaviorStats): readonly AnalyticsStat[] {
	return [
		{ value: compactNumber(stats.messages), label: "Messages" },
		{ value: compactNumber(stats.yelling), label: "Yelling" },
		{ value: compactNumber(stats.profanity), label: "Profanity" },
		{ value: compactNumber(stats.anguish), label: "Anguish" },
		{ value: compactNumber(stats.negation), label: "Negation" },
		{ value: compactNumber(stats.repetition), label: "Repetition" },
		{ value: compactNumber(stats.blame), label: "Blame" },
		{ value: compactNumber(stats.characters), label: "Characters" },
	];
}

const BEHAVIOR_TONE: Record<"none" | "warn" | "high", string> = {
	none: "text-fr-text-2",
	warn: "text-fr-warn font-semibold",
	high: "text-fr-del font-semibold",
};

function BehaviorStat({
	label,
	count,
	messages,
}: {
	readonly label: string;
	readonly count: number;
	readonly messages: number;
}) {
	return (
		<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
			<span className="uppercase tracking-wide text-fr-text-3">{label}</span>
			<span className={cn("tabular-nums", BEHAVIOR_TONE[rateTone(count, messages)])}>
				{formatRate(count, messages)}
			</span>
		</div>
	);
}

export function AnalyticsBehaviorPanel({
	behavior,
	className,
}: {
	readonly behavior: AnalyticsSnapshot["behavior"] | undefined;
	readonly className?: string;
}) {
	return (
		<Section title="Behavior">
			<div className={cn("space-y-4", className)}>
				{behavior ? (
					<>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{behaviorItems(behavior.overall).map(item => (
								<div key={item.label} className="rounded-[8px] bg-fr-surface px-3 py-2">
									<div className="text-fr-base font-semibold text-fr-text">{item.value}</div>
									<div className="mt-0.5 text-fr-2xs text-fr-text-3">{item.label}</div>
								</div>
							))}
						</div>
						<div className="space-y-2">
							{behavior.byModel.slice(0, 5).map(model => {
								const frustration = model.negation + model.repetition + model.blame;
								return (
									<div
										key={`${model.provider}:${model.model}`}
										className="rounded-[8px] border border-fr-border-soft px-3 py-2.5"
									>
										<div className="flex items-center justify-between gap-3">
											<span className="min-w-0 fr-overflow font-secondary text-fr-xs font-semibold text-fr-text">
												{model.model}
											</span>
											<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">
												{compactNumber(model.messages)} msgs
											</span>
										</div>
										<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
											<BehaviorStat label="Yelling" count={model.yelling} messages={model.messages} />
											<BehaviorStat label="Profanity" count={model.profanity} messages={model.messages} />
											<BehaviorStat label="Anguish" count={model.anguish} messages={model.messages} />
											<BehaviorStat label="Frustration" count={frustration} messages={model.messages} />
										</div>
									</div>
								);
							})}
						</div>
					</>
				) : (
					<EmptyAnalyticsState
						title="Behavior analytics unavailable"
						description="The analytics source did not expose behavior data for this workspace."
					/>
				)}
			</div>
		</Section>
	);
}

export function AnalyticsRecentRequests({
	title,
	requests,
	emptyTitle = "No recent requests",
}: {
	readonly title: string;
	readonly requests: readonly AnalyticsRecentRequest[];
	readonly emptyTitle?: string;
}) {
	return (
		<Section title={title}>
			<div className="space-y-2">
				{requests.slice(0, 6).map(request => (
					<div
						key={`${request.id ?? request.timestamp}:${request.model}:${request.stopReason}`}
						className="flex items-center justify-between gap-3 rounded-[8px] border border-fr-border-soft px-3 py-2 text-fr-xs"
					>
						<span className="flex min-w-0 items-center gap-2">
							<Icon name={request.errorMessage ? "x" : "check"} size={13} />
							<span className="min-w-0 fr-overflow text-fr-text">{request.model}</span>
						</span>
						<span className="shrink-0 text-fr-text-3">
							{compactNumber(request.totalTokens)} tokens · {currency(request.cost)}
						</span>
					</div>
				))}
				{requests.length === 0 && (
					<EmptyAnalyticsState title={emptyTitle} description="No rows are present for this range." />
				)}
			</div>
		</Section>
	);
}

export function AnalyticsProfileSections({
	snapshot,
	onRefresh,
	onRunBenchmark,
	className,
	crowdTelemetryEndpoint,
}: {
	readonly snapshot: AnalyticsSnapshot;
	readonly onRefresh?: () => void;
	/** Enables the "Test my models now" speed test beside Model Performance. Omit to hide it (e.g. a static fixture). */
	readonly onRunBenchmark?: (models: readonly string[], runs?: number) => Promise<readonly AnalyticsBenchResult[]>;
	readonly className?: string;
	/** Host-supplied receiver URL for opt-in crowd telemetry. Omit to send no telemetry. */
	readonly crowdTelemetryEndpoint?: string;
}) {
	return (
		<div className={cn("mt-8 grid gap-4", className)}>
			<div className="flex justify-end">
				<AnalyticsFreshnessBadge freshness={snapshot.freshness} onRefresh={onRefresh} />
			</div>
			<AnalyticsModelPerformance models={snapshot.models} benchmarks={snapshot.benchmarks} />
			{onRunBenchmark && <AnalyticsSpeedTest models={snapshot.models} onRunBenchmark={onRunBenchmark} />}
			<AnalyticsCrowdPanel models={snapshot.models} receiverEndpoint={crowdTelemetryEndpoint} />
			<AnalyticsDegradationPanel degradation={snapshot.degradation} />
			<AnalyticsCostBreakdown costs={snapshot.costs} />
			<AnalyticsHarnessPanel harness={snapshot.harness} />
			<AnalyticsBehaviorPanel behavior={snapshot.behavior} />
			<div className="grid gap-4 lg:grid-cols-2">
				<AnalyticsRecentRequests title="Recent requests" requests={snapshot.recentRequests} />
				<AnalyticsRecentRequests
					title="Recent errors"
					requests={snapshot.recentErrors}
					emptyTitle="No recent errors"
				/>
			</div>
			<div className="rounded-xl border border-fr-border-soft px-4 py-3 text-fr-xs text-fr-text-3">
				Cache rate {percent(snapshot.overview.cacheRate)} · error rate {percent(snapshot.overview.errorRate)} ·
				latest {relativeTime(snapshot.overview.latestActivityAt)}
			</div>
		</div>
	);
}

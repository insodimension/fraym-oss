import type { AnalyticsFreshness, AnalyticsRange, AnalyticsSnapshot } from "@fraym-ai/driver";
import { AnalyticsFreshnessBadge, AnalyticsRangeControl } from "./analytics-activity-controls";
import { activitySpanDays, analyticsRangeLabel, dayCountLabel, heatmapDaysForRange } from "./analytics-activity-data";
import { AnalyticsActivityHeatmap } from "./analytics-activity-heatmap";

function workspaceActivityCaption({
	error,
	loading,
	snapshot,
	available,
	fallbackCells,
	range,
}: {
	readonly error?: string | null;
	readonly loading?: boolean;
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly available?: boolean;
	readonly fallbackCells?: readonly number[];
	readonly range: AnalyticsRange;
}): string {
	if (error) return error;
	if (loading && !snapshot) return "Syncing workspace activity from Fraym stats.";
	if (snapshot) return workspaceActivitySnapshotCaption(snapshot, range);
	if (available) return "No workspace activity is available yet.";
	if (fallbackCells?.some(value => value > 0)) return "Activity is derived from sessions in this workspace.";
	return "Workspace activity is unavailable.";
}

function workspaceActivitySnapshotCaption(snapshot: AnalyticsSnapshot, range: AnalyticsRange): string {
	const spanDays = activitySpanDays(snapshot.activity);
	if (spanDays <= 0) return "No workspace activity is available for this range yet.";
	const selectedDays = heatmapDaysForRange(range);
	return spanDays <= selectedDays
		? `Workspace activity from Fraym stats. All available activity is inside ${dayCountLabel(spanDays)}.`
		: "Workspace activity from Fraym stats.";
}

function workspaceActivityFreshness({
	snapshot,
	loading,
	refreshing,
	available,
}: {
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly loading?: boolean;
	readonly refreshing?: boolean;
	readonly available?: boolean;
}): AnalyticsFreshness | null {
	if (snapshot?.freshness) return snapshot.freshness;
	if (loading || refreshing) return { status: "syncing", source: "fraym-stats" };
	if (available) return { status: "unavailable", source: "fraym-stats" };
	return null;
}

type AnalyticsWorkspaceActivityProps = {
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly cells?: readonly number[];
	readonly range?: AnalyticsRange;
	readonly title?: string;
	readonly caption?: string;
	readonly loading?: boolean;
	readonly refreshing?: boolean;
	readonly error?: string | null;
	readonly available?: boolean;
	readonly showHeader?: boolean;
	readonly showRangeControl?: boolean;
	readonly showFreshness?: boolean;
	readonly onRangeChange?: (range: AnalyticsRange) => void;
	readonly onRefresh?: () => void;
	readonly className?: string;
};

type WorkspaceActivityView = {
	readonly currentRange: AnalyticsRange;
	readonly fallbackCells?: readonly number[];
	readonly freshness: AnalyticsFreshness | null;
	readonly caption: string;
	readonly showRangeControl: boolean;
};

function workspaceActivityView({
	snapshot,
	cells,
	range,
	caption,
	loading = false,
	refreshing = false,
	error = null,
	available = false,
	showRangeControl,
	onRangeChange,
}: AnalyticsWorkspaceActivityProps): WorkspaceActivityView {
	const currentRange = range ?? snapshot?.range ?? "30d";
	const fallbackCells = fallbackActivityCells(snapshot, cells);
	return {
		currentRange,
		fallbackCells,
		freshness: workspaceActivityFreshness({ snapshot, loading, refreshing, available }),
		caption: activityViewCaption({
			caption,
			error,
			loading,
			refreshing,
			snapshot,
			available,
			fallbackCells,
			currentRange,
		}),
		showRangeControl: shouldShowActivityRangeControl(showRangeControl, onRangeChange),
	};
}

function fallbackActivityCells(
	snapshot: AnalyticsSnapshot | null | undefined,
	cells: readonly number[] | undefined,
): readonly number[] | undefined {
	return snapshot ? undefined : cells;
}

function activityViewCaption({
	caption,
	error,
	loading,
	refreshing,
	snapshot,
	available,
	fallbackCells,
	currentRange,
}: {
	readonly caption?: string;
	readonly error?: string | null;
	readonly loading: boolean;
	readonly refreshing: boolean;
	readonly snapshot?: AnalyticsSnapshot | null;
	readonly available: boolean;
	readonly fallbackCells?: readonly number[];
	readonly currentRange: AnalyticsRange;
}): string {
	return (
		caption ??
		workspaceActivityCaption({
			error,
			loading: loading || refreshing,
			snapshot,
			available,
			fallbackCells,
			range: currentRange,
		})
	);
}

function shouldShowActivityRangeControl(
	showRangeControl: boolean | undefined,
	onRangeChange: ((range: AnalyticsRange) => void) | undefined,
): boolean {
	return showRangeControl ?? Boolean(onRangeChange);
}

function WorkspaceActivityActions({
	currentRange,
	showRangeControl,
	showFreshness,
	freshness,
	onRangeChange,
	onRefresh,
}: {
	readonly currentRange: AnalyticsRange;
	readonly showRangeControl: boolean;
	readonly showFreshness: boolean;
	readonly freshness: AnalyticsFreshness | null;
	readonly onRangeChange?: (range: AnalyticsRange) => void;
	readonly onRefresh?: () => void;
}) {
	if (!showRangeControl && !showFreshness) return null;
	return (
		<div className="flex shrink-0 items-center gap-2">
			{showRangeControl && <AnalyticsRangeControl range={currentRange} onRangeChange={onRangeChange} />}
			{showFreshness && <AnalyticsFreshnessBadge freshness={freshness} onRefresh={onRefresh} />}
		</div>
	);
}

function WorkspaceActivityHeader({
	title,
	currentRange,
	showRangeControl,
	showFreshness,
	freshness,
	onRangeChange,
	onRefresh,
}: {
	readonly title: string;
	readonly currentRange: AnalyticsRange;
	readonly showRangeControl: boolean;
	readonly showFreshness: boolean;
	readonly freshness: AnalyticsFreshness | null;
	readonly onRangeChange?: (range: AnalyticsRange) => void;
	readonly onRefresh?: () => void;
}) {
	return (
		<div className="mb-3 flex items-center justify-between gap-3">
			<div className="min-w-0">
				<h2 className="text-fr-base font-semibold text-fr-text">{title}</h2>
				<div className="mt-0.5 font-secondary text-fr-xs text-fr-text-3">
					{analyticsRangeLabel(currentRange)} / workspace
				</div>
			</div>
			<WorkspaceActivityActions
				currentRange={currentRange}
				showRangeControl={showRangeControl}
				showFreshness={showFreshness}
				freshness={freshness}
				onRangeChange={onRangeChange}
				onRefresh={onRefresh}
			/>
		</div>
	);
}

export function AnalyticsWorkspaceActivity({
	snapshot,
	cells,
	range,
	title = "Workspace activity",
	caption,
	loading = false,
	refreshing = false,
	error = null,
	available = false,
	showHeader = true,
	showRangeControl,
	showFreshness = true,
	onRangeChange,
	onRefresh,
	className,
}: AnalyticsWorkspaceActivityProps) {
	const view = workspaceActivityView({
		snapshot,
		cells,
		range,
		caption,
		loading,
		refreshing,
		error,
		available,
		showRangeControl,
		onRangeChange,
	});

	return (
		<section data-slot="analytics-workspace-activity" className={className}>
			{showHeader && (
				<WorkspaceActivityHeader
					title={title}
					currentRange={view.currentRange}
					showRangeControl={view.showRangeControl}
					showFreshness={showFreshness}
					freshness={view.freshness}
					onRangeChange={onRangeChange}
					onRefresh={onRefresh}
				/>
			)}
			<AnalyticsActivityHeatmap
				buckets={snapshot?.activity}
				cells={view.fallbackCells}
				range={view.currentRange}
				showHeader={false}
				caption={view.caption}
			/>
		</section>
	);
}

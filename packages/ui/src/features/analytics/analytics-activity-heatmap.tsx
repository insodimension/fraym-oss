import type { AnalyticsActivityBucket, AnalyticsRange } from "@fraym-ai/driver";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../elements";
import { cn } from "../../lib/cn";
import {
	type ActivityGridCell,
	activityCellDateLabel,
	activityCellMetrics,
	activityCellTitle,
	activityGridCells,
	HEATMAP_CELL_PX,
	HEATMAP_DAYS,
	HEATMAP_DISPLAY_DAYS,
	HEATMAP_GAP_PX,
	HEATMAP_GRID_WIDTH_PX,
	heatmapDaysForRange,
	heatmapMonthLabels,
	heatmapWindowLabel,
} from "./analytics-activity-data";

function HeatCell({ cell }: { readonly cell: ActivityGridCell }) {
	const title = activityCellTitle(cell);
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					data-lv={cell.level}
					aria-label={title}
					tabIndex={0}
					style={{ width: HEATMAP_CELL_PX, height: HEATMAP_CELL_PX }}
					className={heatCellClass(cell)}
				/>
			</TooltipTrigger>
			<HeatCellTooltip cell={cell} />
		</Tooltip>
	);
}

function heatCellClass(cell: ActivityGridCell): string {
	return cn(
		"block rounded-[2px] bg-fr-surface outline-none",
		"focus-visible:ring-2 focus-visible:ring-fr-accent-line focus-visible:ring-offset-1 focus-visible:ring-offset-fr-bg",
		!cell.inRange && "opacity-35",
		cell.level === 1 && "bg-[color-mix(in_srgb,var(--fr-accent)_28%,var(--fr-surface))]",
		cell.level === 2 && "bg-[color-mix(in_srgb,var(--fr-accent)_50%,var(--fr-surface))]",
		cell.level === 3 && "bg-[color-mix(in_srgb,var(--fr-accent)_72%,var(--fr-surface))]",
		cell.level >= 4 && "bg-fr-accent",
	);
}

function HeatCellTooltip({ cell }: { readonly cell: ActivityGridCell }) {
	return (
		<TooltipContent side="top" sideOffset={8} className="max-w-[230px] px-2.5 py-2 text-left shadow-fr-lg">
			<span className="block whitespace-nowrap font-secondary text-fr-xs font-semibold text-fr-text">
				{activityCellDateLabel(cell)}
			</span>
			<span className="mt-1 block space-y-0.5">
				{activityCellMetrics(cell).map(detail => (
					<span key={detail} className="block whitespace-nowrap text-fr-2xs text-fr-text-2">
						{detail}
					</span>
				))}
			</span>
		</TooltipContent>
	);
}

export function AnalyticsActivityHeatmap({
	buckets,
	cells,
	range = "30d",
	title = "Activity",
	caption,
	showHeader = true,
	className,
}: {
	readonly buckets?: readonly AnalyticsActivityBucket[];
	readonly cells?: readonly number[];
	readonly range?: AnalyticsRange;
	readonly title?: string;
	readonly caption?: string;
	readonly showHeader?: boolean;
	readonly className?: string;
}) {
	const activeDays = heatmapDaysForRange(range);
	const values = activityGridCells({ buckets, cells, displayDays: HEATMAP_DISPLAY_DAYS, activeDays });
	const monthLabels = heatmapMonthLabels(values);
	return (
		<div className={className}>
			{showHeader && (
				<div className="mb-3 flex items-center justify-between gap-3">
					<div className="text-fr-base font-semibold text-fr-text">{title}</div>
					<div className="font-secondary text-fr-xs text-fr-text-3">{heatmapWindowLabel(range, activeDays)}</div>
				</div>
			)}
			<div className="overflow-x-auto overflow-y-visible pb-1">
				<TooltipProvider delayDuration={80}>
					<div
						className="grid grid-flow-col"
						style={{
							width: HEATMAP_GRID_WIDTH_PX,
							gridAutoColumns: `${HEATMAP_CELL_PX}px`,
							gridTemplateRows: `repeat(${HEATMAP_DAYS}, ${HEATMAP_CELL_PX}px)`,
							gap: HEATMAP_GAP_PX,
						}}
					>
						{values.map(cell => (
							<HeatCell key={cell.dateKey} cell={cell} />
						))}
					</div>
				</TooltipProvider>
				<div
					className="mt-[7px] flex justify-between font-secondary text-fr-2xs text-fr-text-3"
					style={{ width: HEATMAP_GRID_WIDTH_PX }}
				>
					{monthLabels.map((month, index) => (
						<span key={`${month}-${index}`}>{month}</span>
					))}
				</div>
			</div>
			{caption && <div className="mt-2 text-fr-xs text-fr-text-3">{caption}</div>}
		</div>
	);
}

import type { AnalyticsActivityBucket, AnalyticsRange } from "@fraym-ai/driver";
import { compactNumber } from "./analytics-format";

export const HEATMAP_WEEKS = 52;
export const HEATMAP_DAYS = 7;
export const HEATMAP_CELL_PX = 11;
export const HEATMAP_GAP_PX = 2;
export const HEATMAP_GRID_WIDTH_PX = HEATMAP_WEEKS * HEATMAP_CELL_PX + (HEATMAP_WEEKS - 1) * HEATMAP_GAP_PX;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_LABEL = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const MONTH_LABEL = new Intl.DateTimeFormat("en", { month: "short" });

export const ANALYTICS_RANGES: readonly { readonly value: AnalyticsRange; readonly label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "30d", label: "30d" },
	{ value: "7d", label: "7d" },
	{ value: "3d", label: "3d" },
	{ value: "1d", label: "1d" },
];

export const HEATMAP_DISPLAY_DAYS = HEATMAP_WEEKS * HEATMAP_DAYS;
const HEATMAP_RANGE_DAYS: Record<AnalyticsRange, number> = {
	all: HEATMAP_DISPLAY_DAYS,
	"30d": 30,
	"7d": 7,
	"3d": 3,
	"1d": 1,
};

export interface ActivityGridCell {
	readonly date: Date;
	readonly dateKey: string;
	readonly inRange: boolean;
	readonly level: number;
	readonly bucket?: AnalyticsActivityBucket;
}

export function analyticsRangeLabel(range: AnalyticsRange): string {
	return ANALYTICS_RANGES.find(option => option.value === range)?.label ?? range;
}

export function heatmapDaysForRange(range: AnalyticsRange): number {
	return HEATMAP_RANGE_DAYS[range] ?? HEATMAP_RANGE_DAYS["30d"];
}

export function heatmapWindowLabel(range: AnalyticsRange, days: number): string {
	if (range === "all") return "52 weeks";
	return `${Math.min(days, range === "30d" ? 30 : days)} days`;
}

export function dayCountLabel(days: number): string {
	return days === 1 ? "1 day" : `${days} days`;
}

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function parseDateKey(value: string): number {
	const parsed = Date.parse(`${value}T00:00:00.000Z`);
	return Number.isFinite(parsed) ? parsed : 0;
}

function hasActivity(bucket: AnalyticsActivityBucket): boolean {
	return bucket.tokens > 0 || bucket.requests > 0 || bucket.messages > 0 || (bucket.sessions ?? 0) > 0;
}

export function activitySpanDays(buckets: readonly AnalyticsActivityBucket[]): number {
	const active = buckets
		.filter(hasActivity)
		.map(bucket => parseDateKey(bucket.date))
		.filter(value => value > 0);
	if (active.length === 0) return 0;
	return Math.max(1, Math.round((Math.max(...active) - Math.min(...active)) / DAY_MS) + 1);
}

export function longestActivityStreak(buckets: readonly AnalyticsActivityBucket[]): number {
	const days = [...new Set(buckets.filter(hasActivity).map(bucket => bucket.date))]
		.map(parseDateKey)
		.filter(value => value > 0)
		.sort((a, b) => a - b);
	let longest = 0;
	let current = 0;
	let previous = 0;
	for (const day of days) {
		current = previous > 0 && day - previous <= DAY_MS * 1.5 ? current + 1 : 1;
		longest = Math.max(longest, current);
		previous = day;
	}
	return longest;
}

export function analyticsActivityCells(
	buckets: readonly AnalyticsActivityBucket[],
	rangeOrWeeks: AnalyticsRange | number = HEATMAP_WEEKS,
): readonly number[] {
	const days = typeof rangeOrWeeks === "number" ? rangeOrWeeks * HEATMAP_DAYS : heatmapDaysForRange(rangeOrWeeks);
	const today = new Date();
	const start = new Date(today);
	start.setUTCDate(today.getUTCDate() - (days - 1));
	const byDate = new Map<string, number>();
	for (const bucket of buckets) byDate.set(bucket.date, Math.max(byDate.get(bucket.date) ?? 0, bucket.level));
	return Array.from({ length: days }, (_, index) => {
		const date = new Date(start);
		date.setUTCDate(start.getUTCDate() + index);
		return byDate.get(dateKey(date)) ?? 0;
	});
}

export function activityGridCells({
	buckets,
	cells,
	displayDays,
	activeDays,
}: {
	readonly buckets?: readonly AnalyticsActivityBucket[];
	readonly cells?: readonly number[];
	readonly displayDays: number;
	readonly activeDays: number;
}): readonly ActivityGridCell[] {
	const today = new Date();
	const start = new Date(today);
	start.setUTCDate(today.getUTCDate() - (displayDays - 1));
	const bucketsByDate = new Map<string, AnalyticsActivityBucket>();
	for (const bucket of buckets ?? []) bucketsByDate.set(bucket.date, bucket);
	const windowCells = cells ? [...cells].slice(-displayDays) : undefined;
	const firstActiveIndex = Math.max(0, displayDays - activeDays);
	return Array.from({ length: displayDays }, (_, index) => {
		const date = new Date(start);
		date.setUTCDate(start.getUTCDate() + index);
		const key = dateKey(date);
		const bucket = bucketsByDate.get(key);
		return {
			date,
			dateKey: key,
			inRange: index >= firstActiveIndex,
			level: windowCells?.[index] ?? bucket?.level ?? 0,
			bucket,
		};
	});
}

export function activityCellTitle(cell: ActivityGridCell): string {
	const date = DATE_LABEL.format(cell.date);
	if (!cell.bucket) return `${date}: no activity`;
	return `${date}: ${compactNumber(cell.bucket.tokens)} tokens, ${compactNumber(cell.bucket.requests)} requests, ${compactNumber(cell.bucket.messages)} messages`;
}

export function activityCellMetrics(cell: ActivityGridCell): readonly string[] {
	if (!cell.bucket) return [cell.inRange ? "No activity" : "Outside selected range"];
	const details = [
		`${compactNumber(cell.bucket.tokens)} tokens`,
		`${compactNumber(cell.bucket.requests)} requests`,
		`${compactNumber(cell.bucket.messages)} messages`,
	];
	if ((cell.bucket.sessions ?? 0) > 0) details.push(`${compactNumber(cell.bucket.sessions ?? 0)} sessions`);
	if (cell.bucket.errors > 0) details.push(`${compactNumber(cell.bucket.errors)} errors`);
	return details;
}

export function activityCellDateLabel(cell: ActivityGridCell): string {
	return DATE_LABEL.format(cell.date);
}

export function heatmapMonthLabels(cells: readonly ActivityGridCell[]): readonly string[] {
	const labels: string[] = [];
	let previous = "";
	for (const cell of cells) {
		const label = MONTH_LABEL.format(cell.date);
		if (label !== previous) {
			labels.push(label);
			previous = label;
		}
	}
	return labels.slice(-11);
}

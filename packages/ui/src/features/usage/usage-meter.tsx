import type { UsageLimitView } from "@fraym/driver";
import { RollingNumber, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../elements";
import { cn } from "../../lib/cn";
import { formatResetCountdown, formatUsageAmount, formatUsageDetail } from "./usage-format";
import { usageStatusBarClass } from "./usage-status";

export interface UsageMeterProps {
	readonly limit: UsageLimitView;
	readonly compact?: boolean;
	readonly className?: string;
}

interface UsageMeterView {
	readonly percent: number | null;
	readonly width: number;
	readonly resetCountdown: string | null;
	readonly detailItems: readonly string[];
	readonly tooltipRows: readonly string[];
}

function resolveUsageMeterView(limit: UsageLimitView, compact?: boolean): UsageMeterView {
	const percent = limit.usedPercent;
	const clampedPercent = percent === null ? 0 : Math.min(100, Math.max(0, percent));
	const width = percent === null ? 0 : clampedPercent > 0 ? Math.max(2, clampedPercent) : 0;
	const resetCountdown = formatResetCountdown(limit.window?.resetsAt);
	const detail = formatUsageDetail(limit);
	return {
		percent,
		width,
		resetCountdown,
		detailItems: compact ? [] : compactStrings(detail, limit.window?.label, resetCountdown),
		tooltipRows: usageTooltipRows(limit, resetCountdown),
	};
}

export function UsageMeter({ limit, compact, className }: UsageMeterProps) {
	const view = resolveUsageMeterView(limit, compact);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className={cn("min-w-0 space-y-1.5", className)}>
						<div className="flex min-w-0 items-center justify-between gap-3">
							<div className="min-w-0 fr-overflow text-fr-sm text-fr-text">{limit.label}</div>
							<div className="flex shrink-0 items-center gap-1.5 font-secondary text-fr-2xs text-fr-text-3">
								<span className="inline-flex items-center tabular-nums">
									{view.percent === null ? (
										"—"
									) : (
										<>
											<RollingNumber
												value={Math.round(view.percent)}
												animate={false}
												className="text-fr-2xs"
											/>
											%
										</>
									)}
								</span>
								{view.resetCountdown && <span>{view.resetCountdown}</span>}
							</div>
						</div>
						<div className={cn("h-1.5 overflow-hidden rounded-full bg-fr-surface-3", compact && "h-1")}>
							<div
								className={cn("h-full rounded-full", usageStatusBarClass(limit.status))}
								style={{ width: `${view.width}%` }}
							/>
						</div>
						{view.detailItems.length > 0 && (
							<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fr-2xs text-fr-text-3">
								{view.detailItems.map(item => (
									<span key={item}>{item}</span>
								))}
							</div>
						)}
					</div>
				</TooltipTrigger>
				<TooltipContent className="max-w-[260px] font-secondary text-fr-2xs leading-5 text-fr-text-2">
					{view.tooltipRows.map(row => (
						<div key={row}>{row}</div>
					))}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function usageTooltipRows(limit: UsageLimitView, resetCountdown: string | null): readonly string[] {
	const rows = [limit.label];
	if (limit.accountLabel) rows.push(`Account: ${limit.accountLabel}`);
	rows.push(`Status: ${limit.status}`);
	const used = formatUsageAmount(limit.used, limit.unit);
	if (used) rows.push(`Used: ${used}`);
	const total = formatUsageAmount(limit.limit, limit.unit);
	if (total) rows.push(`Limit: ${total}`);
	const remaining = formatUsageAmount(limit.remaining, limit.unit);
	if (remaining) rows.push(`Remaining: ${remaining}`);
	if (limit.window?.label) rows.push(`Window: ${limit.window.label}`);
	if (resetCountdown) rows.push(resetCountdown);
	return rows;
}

function compactStrings(...values: readonly (string | null | undefined)[]): readonly string[] {
	return values.filter((value): value is string => Boolean(value));
}

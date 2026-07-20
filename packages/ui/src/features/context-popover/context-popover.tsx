import type { ContextBreakdown, UsageStatus } from "@fraym/driver";
import { type Placement, popoverStyle, Scrim } from "../../elements/popover";
import { Icon } from "../../icons";
import { BodyPortal } from "../../lib/body-portal";
import { cn } from "../../lib/cn";
import { usageStatusBarClass } from "../usage/usage-status";

const WIDTH = 300;

export type ContextRowTone = "accent" | "warn" | "blue" | "add" | "mute";

export interface ContextRow {
	readonly name: string;
	readonly k: number;
	readonly pct: number;
	readonly free?: boolean;
	readonly tone?: ContextRowTone;
}

export interface PlanLimit {
	readonly name: string;
	readonly pct: number;
	readonly resets: string;
	readonly status?: UsageStatus;
}

export interface ContextPopoverProps {
	readonly used: number;
	readonly max: number;
	readonly breakdown: readonly ContextRow[];
	readonly planLimits?: readonly PlanLimit[];
	readonly onClose: () => void;
	/** Trigger rect to anchor against (preferred). Falls back to `style`. */
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly style?: React.CSSProperties;
	readonly className?: string;
}

/**
 * Presentational context-window breakdown (header + per-category rows + optional
 * plan limits). Shared by the floating {@link ContextPopover} and the inline
 * `/context` transcript block, so the markup lives in one place.
 */
export function ContextBreakdownView({
	used,
	max,
	breakdown,
	planLimits,
	className,
}: {
	readonly used: number;
	readonly max: number;
	readonly breakdown: readonly ContextRow[];
	readonly planLimits?: readonly PlanLimit[];
	readonly className?: string;
}) {
	const pct = max > 0 ? Math.round((used / max) * 100) : 0;

	return (
		<div className={className}>
			<div className="flex items-center gap-2 px-1.5 pt-1.5 pb-2 text-xs font-semibold text-fr-text">
				<span>Context window</span>
				<span className="ml-auto font-secondary text-fr-2xs font-normal text-fr-text-3">
					{used.toFixed(1)}k / {max}.0k ({pct}%)
				</span>
			</div>
			<div className="px-0.5">
				{breakdown.map(r => (
					<div key={r.name} className="flex items-center gap-[9px] px-1.5 py-1 text-xs">
						<span
							className={cn(
								"size-[9px] shrink-0 rounded-[3px]",
								r.free ? "bg-fr-surface-3" : contextRowToneClass(r.tone),
							)}
						/>
						<span className="text-fr-text-2">{r.name}</span>
						<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">{r.k}k</span>
						<span className="w-[42px] text-right font-secondary text-fr-2xs text-fr-text-2">{r.pct}%</span>
					</div>
				))}
			</div>
			{planLimits && planLimits.length > 0 && (
				<>
					<div className="mx-2 my-[5px] h-px bg-fr-border-soft" />
					<div className="flex items-center gap-2 px-1.5 pt-1.5 pb-2 text-xs font-semibold text-fr-text">
						<span>Plan usage</span>
						<Icon name="arrowR" size={13} strokeWidth={2} className="ml-auto text-fr-text-3" />
					</div>
					<div className="flex flex-col gap-[11px] px-1.5 pt-1 pb-1.5">
						{planLimits.map(l => (
							<div key={l.name}>
								<div className="mb-[5px] flex items-center text-fr-xs text-fr-text-2">
									<span>{l.name}</span>
									<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">
										{l.pct}% &middot; {l.resets}
									</span>
								</div>
								<div className="h-1 overflow-hidden rounded-[3px] bg-fr-surface-3">
									<span
										className={cn("block h-full rounded-[3px]", usageStatusBarClass(l.status ?? "ok"))}
										style={{ width: `${l.pct}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export function ContextPopover({
	used,
	max,
	breakdown,
	planLimits,
	onClose,
	anchorRect,
	place = "above-right",
	style,
	className,
}: ContextPopoverProps) {
	return (
		<BodyPortal>
			<Scrim onClick={onClose} />
			<div
				data-slot="context-popover"
				className={cn(
					"fixed z-50 w-[300px] rounded-[12px] border border-fr-border bg-fr-surface p-2 shadow-[0_18px_60px_rgba(0,0,0,0.5)] animate-[fr-pop-in_0.12s_ease]",
					className,
				)}
				style={anchorRect ? popoverStyle(anchorRect, place, WIDTH) : style}
			>
				<ContextBreakdownView used={used} max={max} breakdown={breakdown} planLimits={planLimits} />
			</div>
		</BodyPortal>
	);
}

const CONTEXT_ROW_TONE_CLASS: Record<ContextRowTone, string> = {
	accent: "bg-fr-accent",
	warn: "bg-fr-warn",
	blue: "bg-fr-blue",
	add: "bg-fr-add",
	mute: "bg-fr-text-3",
};

function contextRowToneClass(tone: ContextRowTone | undefined): string {
	return CONTEXT_ROW_TONE_CLASS[tone ?? "accent"];
}

const CONTEXT_CATEGORY_TONE: Record<string, ContextRowTone> = {
	systemPrompt: "accent",
	systemTools: "warn",
	systemContext: "mute",
	skills: "add",
	messages: "blue",
};

/** Map an on-demand `ContextBreakdown` into popover rows (parity with Engine `/context`). */
export function contextBreakdownToRows(breakdown: ContextBreakdown): readonly ContextRow[] {
	const window = breakdown.contextWindow > 0 ? breakdown.contextWindow : 0;
	const toK = (tokens: number): number => Math.round(tokens / 1000);
	const toPct = (tokens: number): number => (window > 0 ? Math.round((tokens / window) * 100) : 0);
	const rows: ContextRow[] = breakdown.categories
		.filter(category => category.tokens > 0)
		.map(category => ({
			name: category.label,
			k: toK(category.tokens),
			pct: toPct(category.tokens),
			tone: CONTEXT_CATEGORY_TONE[category.id] ?? "accent",
		}));
	if (breakdown.autoCompactBufferTokens > 0) {
		rows.push({
			name: "Autocompact buffer",
			k: toK(breakdown.autoCompactBufferTokens),
			pct: toPct(breakdown.autoCompactBufferTokens),
			tone: "mute",
		});
	}
	rows.push({ name: "Free space", k: toK(breakdown.freeTokens), pct: toPct(breakdown.freeTokens), free: true });
	return rows;
}

/**
 * Header `used / max` (in thousands of tokens) for a {@link ContextBreakdown},
 * derived from the SAME object {@link contextBreakdownToRows} renders so the
 * header total always agrees with the rows. `usedTokens` is the engine's summed
 * total; when an adapter ships populated categories but leaves `usedTokens` at 0,
 * fall back to the category sum so the header never reads `0.0k` under correct
 * rows.
 */
export function contextBreakdownHeader(breakdown: ContextBreakdown): { readonly used: number; readonly max: number } {
	return { used: breakdownUsedTokens(breakdown) / 1000, max: Math.round(breakdown.contextWindow / 1000) };
}

/**
 * Percent of the context window used (0..100, integer), derived from the SAME
 * {@link ContextBreakdown} the header + rows render. The always-visible context
 * ring reads this so it agrees with the popover by construction, instead of
 * trailing the live `contextUsage` the engine only pushes at end-of-turn (and
 * never on session open). Returns 0 when the window is unknown.
 */
export function contextBreakdownPercent(breakdown: ContextBreakdown): number {
	if (breakdown.contextWindow <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round((breakdownUsedTokens(breakdown) / breakdown.contextWindow) * 100)));
}

function breakdownUsedTokens(breakdown: ContextBreakdown): number {
	return breakdown.usedTokens > 0
		? breakdown.usedTokens
		: breakdown.categories.reduce((sum, category) => sum + category.tokens, 0);
}

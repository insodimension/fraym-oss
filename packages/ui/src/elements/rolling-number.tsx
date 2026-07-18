import { memo, type ReactNode } from "react";
import { cn } from "../lib/cn";

// RollingNumber — an odometer/slot-reel counter. Each digit is a 0-9 vertical
// reel clipped to one line; when the value changes, the reel translates so the new
// digit rolls into place (incrementing 1→2 slides the 2 up from below, the 1 out
// the top). Used for live-incrementing counts like a streaming diff's +A / −M and
// the subagent swarm's token / cost / time stats.
//
// Dep-free, em-based (scales with font-size), `tabular-nums` so columns don't jitter.
// Supports an optional fixed `decimals` count (fractional digits also roll) plus
// static `prefix` / `suffix` nodes (e.g. "$" and "K") that ride alongside the reels.

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface RollingNumberProps {
	readonly value: number;
	readonly className?: string;
	/** Roll duration in ms. */
	readonly durationMs?: number;
	/** Animate digit rolls. When false, renders plain (perfectly aligned) text — use
	 *  this for static/resolved counts; the reel is only meaningful while incrementing. */
	readonly animate?: boolean;
	/** Fixed number of fractional digits (each rolls too). Default 0 (integer). */
	readonly decimals?: number;
	/** Static node rendered before the reels (e.g. "$"). */
	readonly prefix?: ReactNode;
	/** Static node rendered after the reels (e.g. "K", "M"). */
	readonly suffix?: ReactNode;
}

export function RollingNumber({
	value,
	className,
	durationMs = 280,
	animate = true,
	decimals = 0,
	prefix,
	suffix,
}: RollingNumberProps) {
	const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
	const fixed = safe.toFixed(decimals);
	if (!animate) {
		return (
			<span className={cn("inline-flex items-baseline tabular-nums leading-none", className)}>
				{prefix}
				{fixed}
				{suffix}
			</span>
		);
	}
	// Columns carry their place (ones, tens, … / first-decimal, second-decimal) as a
	// STABLE identity so each column stays mounted (and keeps rolling) as the number
	// gains digits — 9 → 10 adds a new left column without remounting the ones column.
	const dot = fixed.indexOf(".");
	const intPart = dot < 0 ? fixed : fixed.slice(0, dot);
	const fracPart = dot < 0 ? "" : fixed.slice(dot + 1);
	const intCols = intPart.split("").map((ch, i, arr) => ({ key: `i${arr.length - 1 - i}`, digit: Number(ch) }));
	const fracCols = fracPart.split("").map((ch, i) => ({ key: `f${i}`, digit: Number(ch) }));
	return (
		<span className={cn("inline-flex items-baseline tabular-nums leading-none", className)} aria-label={fixed}>
			{prefix}
			{intCols.map(col => (
				<RollingDigit key={col.key} digit={col.digit} durationMs={durationMs} />
			))}
			{fracCols.length > 0 && <span aria-hidden>.</span>}
			{fracCols.map(col => (
				<RollingDigit key={col.key} digit={col.digit} durationMs={durationMs} />
			))}
			{suffix}
		</span>
	);
}

const RollingDigit = memo(function RollingDigit({
	digit,
	durationMs,
}: {
	readonly digit: number;
	readonly durationMs: number;
}) {
	return (
		<span aria-hidden className="inline-block overflow-hidden" style={{ height: "1em" }}>
			<span
				className="flex flex-col"
				style={{
					transform: `translateY(-${digit}em)`,
					transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
				}}
			>
				{DIGITS.map(n => (
					<span key={n} className="flex-none" style={{ height: "1em", lineHeight: "1em" }}>
						{n}
					</span>
				))}
			</span>
		</span>
	);
});

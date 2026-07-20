// density-ui — small shared primitives used by the density-aware surface
// features so the three modes share one visual vocabulary. Knows only tokens.
//
//   StatusDot  — compact-mode status signal (a single colored dot, optionally
//                pulsing) used where comfortable/spacious would show a badge.
//   Meter      — spacious-mode progress bar (a tinted fill over a track),
//                the recurring "N of M complete" / budget signal.
//   ModeEyebrow — compact/spacious section label: an uppercase mono caption with
//                a hairline rule, replacing the bordered section header.

import { cn } from "../lib/cn";
import { type ComposerControlTone, dotToneClass } from "./surface-kit";

export function StatusDot({
	tone,
	breathe,
	size = 7,
	className,
}: {
	readonly tone?: ComposerControlTone | "mute";
	readonly breathe?: boolean;
	readonly size?: number;
	readonly className?: string;
}) {
	return (
		<span
			data-slot="status-dot"
			className={cn("relative inline-flex shrink-0 rounded-full", dotToneClass(tone), className)}
			style={{ width: size, height: size }}
		>
			{breathe && (
				<span
					className={cn("absolute inset-0 animate-ping rounded-full opacity-60", dotToneClass(tone))}
					aria-hidden
				/>
			)}
		</span>
	);
}

export function Meter({
	value,
	total,
	tone = "accent",
	className,
	thickness = 6,
}: {
	readonly value: number;
	readonly total: number;
	readonly tone?: ComposerControlTone | "mute";
	readonly className?: string;
	readonly thickness?: number;
}) {
	const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
	return (
		<div
			data-slot="meter"
			role="progressbar"
			aria-valuenow={value}
			aria-valuemax={total}
			className={cn("w-full overflow-hidden rounded-full bg-fr-surface-3", className)}
			style={{ height: thickness }}
		>
			<div
				className={cn("h-full rounded-full transition-[width] duration-300", dotToneClass(tone))}
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

export function ModeEyebrow({
	children,
	trailing,
	className,
}: {
	readonly children: React.ReactNode;
	readonly trailing?: React.ReactNode;
	readonly className?: string;
}) {
	return (
		<div data-slot="mode-eyebrow" className={cn("flex items-center gap-2", className)}>
			<span className="fr-eyebrow shrink-0">{children}</span>
			<span className="h-px min-w-3 flex-1 bg-fr-border-soft" aria-hidden />
			{trailing && <span className="fr-eyebrow shrink-0 normal-case tracking-normal">{trailing}</span>}
		</div>
	);
}

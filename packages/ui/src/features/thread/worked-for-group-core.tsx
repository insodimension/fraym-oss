// WorkedForGroup — Codex-style "Worked for Xs" disclosure row.
//
// A minimal clickable summary that folds an agent turn's work trace (reasoning +
// tool calls) behind a single line. The final answer renders below, always
// visible. Mirrors Codex's "Worked for 2m 15s ›" pattern — no card chrome, just
// a subtle row that expands inline.

import { useEffect, useRef, useState } from "react";
import { CollapseRegion } from "../../elements/collapse-region";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";

/** Human "Worked for" clock: `750ms`, `45s`, `2m 15s`, `1h 20m`. Returns `""` when `ms` is 0 so the label reads just "Worked". */
export function formatWorkedDuration(ms: number): string {
	if (ms <= 0) return "";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const totalSec = Math.round(ms / 1000);
	if (totalSec < 60) return `${totalSec}s`;
	const minutes = Math.floor(totalSec / 60);
	const seconds = totalSec % 60;
	if (minutes < 60) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Resolve the elapsed label:
 * - live → tick up from `startedAt` every second,
 * - settled with a `durationMs` → that frozen authoritative value,
 * - otherwise (settled history with no duration) → `null` (render no clock).
 */
function useWorkedElapsed(startedAt: string | undefined, durationMs: number | undefined, live: boolean): number | null {
	const startMs = startedAt ? Date.parse(startedAt) : Number.NaN;
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!live || Number.isNaN(startMs)) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [live, startMs]);

	if (live && !Number.isNaN(startMs)) return Math.max(0, now - startMs);
	if (durationMs != null) return durationMs;
	return null;
}

export interface WorkedForGroupProps {
	readonly children: React.ReactNode;
	readonly count?: number;
	readonly startedAt?: string;
	readonly durationMs?: number;
	/** Play the entry swoop: mount OPEN (so the work trace that was just on-screen in
	 *  the live stream stays visible) then fold up on the next painted frame. Set when
	 *  the turn JUST settled from live streaming; false for history / reopened turns,
	 *  which mount pre-folded with no animation. */
	readonly animateEntry?: boolean;
	readonly defaultOpen?: boolean;
	readonly className?: string;
}

export function WorkedForGroup({
	children,
	count,
	startedAt,
	durationMs,
	animateEntry = false,
	defaultOpen = false,
	className,
}: WorkedForGroupProps) {
	// Entry swoop: when the group appears because a turn just settled, it has REPLACED
	// the expanded trace that was on screen — mounting closed would vanish that content
	// in one frame (the reported end-of-turn jump). Mount OPEN and fold on the next
	// painted frame instead, so the trace visibly folds up into the "Worked" row.
	// History / reopened turns pass animateEntry=false → mount pre-folded, no animation.
	const [open, setOpen] = useState(defaultOpen || animateEntry);
	const foldedRef = useRef(false);
	useEffect(() => {
		// Fold once, the first time the group enters with the swoop armed. The "have I
		// folded yet" flag flips INSIDE the rAF, never in effect-setup: under StrictMode
		// the effect runs setup→cleanup→setup, so a flag cleared in the first setup would
		// make the second setup bail and leave the group stuck OPEN.
		if (foldedRef.current || !animateEntry || defaultOpen) return;
		// Double rAF: let the open state paint once so the fold transitions from the real
		// measured height instead of starting already collapsed.
		let raf2 = 0;
		const raf1 = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => {
				foldedRef.current = true;
				setOpen(false);
			});
		});
		return () => {
			cancelAnimationFrame(raf1);
			cancelAnimationFrame(raf2);
		};
	}, [animateEntry, defaultOpen]);
	const elapsed = useWorkedElapsed(startedAt, durationMs, false);
	const clock = elapsed != null ? ` for ${formatWorkedDuration(elapsed)}` : "";

	return (
		<div data-slot="worked-for" data-count={count ?? undefined} className={cn("flex min-w-0 flex-col", className)}>
			{/* Header sits on the SAME gutter grid as its children (tool-card / reasoning rows:
			    pl-[7px] + size-[14px] glyph + gap-2), so the expanded rows read as siblings of
			    the header — "Worked" is a collapse control, not a nesting parent. */}
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}
				className="inline-flex max-w-full items-center gap-2 self-start rounded-[7px] py-1 pr-[9px] pl-[7px] text-fr-sm text-fr-text-3 transition-colors duration-[120ms] hover:bg-fr-surface hover:text-fr-text-2"
			>
				<span className="flex size-[14px] shrink-0 items-center justify-center">
					<Icon
						name="caretR"
						size={11}
						strokeWidth={2.2}
						className={cn("transition-transform", open && "rotate-90")}
					/>
				</span>
				<span className="fr-overflow">Worked{clock}</span>
			</button>
			{/* Animated disclosure: the trace gap lives INSIDE the measured region (pt on the
			    content) so spacing folds away with the content. Expanded rows render at the
			    exact regular-thread rhythm — same gap, zeroed margins, no indent. */}
			<CollapseRegion open={open} durationMs={260}>
				<div className="flex flex-col gap-[var(--fr-thread-trace)] pt-[var(--fr-thread-trace)] [&>*]:my-0">
					{children}
				</div>
			</CollapseRegion>
		</div>
	);
}

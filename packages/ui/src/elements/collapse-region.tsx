import { useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { EASE_STANDARD } from "../lib/motion";

export interface CollapseRegionProps {
	/** Expanded when true; collapsed to height 0 when false. */
	readonly open: boolean;
	readonly children: React.ReactNode;
	/** Height-transition duration in ms (default 200). */
	readonly durationMs?: number;
	/** Classes on the outer grid wrapper. */
	readonly className?: string;
	/** Classes on the inner clipped/measured content wrapper. */
	readonly contentClassName?: string;
}

/**
 * Animated height disclosure. Transitions a single `grid-template-rows` track
 * between `0fr` and `1fr` so the content's natural height animates in BOTH
 * directions — the pure-CSS height-reveal trick: no JS measurement, no layout
 * thrash, the thread grows/shrinks over the transition instead of jumping a full
 * body-height in one frame.
 *
 * Content mounts SYNCHRONOUSLY on open (the React-blessed "adjust state on prop
 * change" pattern): the grid container persists across the toggle, so a 0fr→1fr
 * flip with content already present in the same commit fires the transition. An
 * effect would mount the content a frame late and the reveal would snap. Content
 * unmounts a beat after close, so collapsed / scrolled-away regions carry no
 * hidden DOM. Honors reduced motion (theme.css zeroes `transition-duration`).
 */
export function CollapseRegion({ open, children, durationMs = 200, className, contentClassName }: CollapseRegionProps) {
	const [rendered, setRendered] = useState(open);
	if (open && !rendered) setRendered(true);
	useEffect(() => {
		// Only schedule the post-close unmount when there is mounted content to drop —
		// a card that mounts (and stays) closed never arms a no-op timer.
		if (open || !rendered) return;
		const id = window.setTimeout(() => setRendered(false), durationMs + 60);
		return () => window.clearTimeout(id);
	}, [open, rendered, durationMs]);
	return (
		<div
			aria-hidden={!open}
			className={cn(
				"grid transition-[grid-template-rows] motion-reduce:transition-none",
				open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				className,
			)}
			style={{ transitionDuration: `${durationMs}ms`, transitionTimingFunction: EASE_STANDARD }}
		>
			<div className={cn("min-h-0 overflow-hidden", contentClassName)}>{rendered && children}</div>
		</div>
	);
}

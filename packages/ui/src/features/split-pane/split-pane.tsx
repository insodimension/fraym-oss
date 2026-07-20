"use client";

// SplitPane — the shared two-column shell: a fixed-width, resizable left pane and
// a fluid right pane, separated by a 1px drag handle. Powers both the file explorer
// (tree | preview) and Source Control (changes | diff). fr-tokens only.

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ResizeHandle } from "./resize-handle";
import { usePaneResize } from "./use-pane-resize";

export interface SplitPaneProps {
	readonly left: ReactNode;
	readonly right: ReactNode;
	readonly initialLeftWidth?: number;
	readonly minLeftWidth?: number;
	readonly maxLeftWidth?: number;
	/** Hide the left pane (e.g. focus mode); the divider goes with it. */
	readonly collapsedLeft?: boolean;
	/** Narrow posture: the left pane OVERLAYS the right as a dismissible drawer
	 *  (fixed width, above the preview, behind a tap-to-close scrim) instead of
	 *  squeezing OR replacing it — the right pane stays full-width underneath, so
	 *  its header/toggle never vanish when the panel opens. */
	readonly overlayLeft?: boolean;
	/** Tapped-scrim handler: the host closes the drawer (narrow overlay only). */
	readonly onOverlayDismiss?: () => void;
	/** Drop the panel's own border/rounded/bg (host supplies chrome). */
	readonly bare?: boolean;
	readonly className?: string;
}

export function SplitPane({
	left,
	right,
	initialLeftWidth = 260,
	minLeftWidth = 180,
	maxLeftWidth = 480,
	collapsedLeft = false,
	overlayLeft = false,
	onOverlayDismiss,
	bare = false,
	className,
}: SplitPaneProps) {
	const {
		size: width,
		startResize,
		nudge,
	} = usePaneResize({
		axis: "x",
		initial: initialLeftWidth,
		min: minLeftWidth,
		max: maxLeftWidth,
	});

	const onKeyDown = (event: ReactKeyboardEvent) => {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			nudge(-24);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			nudge(24);
		}
	};

	return (
		<div
			data-slot="split-pane"
			className={cn(
				"relative flex h-full min-h-0 overflow-hidden",
				!bare && "rounded-lg border border-fr-border-soft bg-fr-bg",
				className,
			)}
		>
			<div
				data-slot="split-pane-left"
				style={overlayLeft ? { width } : { width: collapsedLeft ? 0 : width }}
				className={cn(
					"flex min-h-0 flex-col overflow-hidden",
					overlayLeft
						? "absolute inset-y-0 left-0 z-20 border-r border-fr-border-soft bg-fr-surface shadow-[0_18px_46px_rgba(0,0,0,0.38)]"
						: "shrink-0",
				)}
				aria-hidden={collapsedLeft && !overlayLeft}
			>
				{/* Inner wrapper. Normally fills the pane (w-full) so content tracks the
				    pane's real width exactly — no clip / no vanishing right column. Only
				    during collapse is it pinned to the last width, so the content slides
				    under the 0-width clip instead of reflowing. */}
				<div
					style={collapsedLeft && !overlayLeft ? { width } : undefined}
					className="flex h-full min-h-0 w-full flex-col overflow-hidden"
				>
					{left}
				</div>
			</div>
			{!overlayLeft && (
				<ResizeHandle
					axis="x"
					ariaLabel="Resize panel"
					ariaValueNow={Math.round(width)}
					disabled={collapsedLeft}
					onPointerDown={startResize}
					onKeyDown={onKeyDown}
				/>
			)}
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">{right}</div>
			{/* Narrow-posture scrim: over the full-width preview, UNDER the drawer
			    (z-20). A tap closes the drawer; the preview + its header/toggle stayed
			    mounted underneath the whole time — collapsing never hides the page. */}
			{overlayLeft && (
				<button
					type="button"
					aria-label="Close panel"
					data-slot="split-pane-scrim"
					onClick={onOverlayDismiss}
					className="absolute inset-0 z-10 cursor-default bg-black/35"
				/>
			)}
		</div>
	);
}

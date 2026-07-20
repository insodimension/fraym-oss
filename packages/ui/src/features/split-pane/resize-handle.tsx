"use client";

// ResizeHandle — the shared grab affordance for every resizable pane (split
// panes, docks, the file-tree rails). The problem it solves: a 1px
// divider is nearly impossible to aim at. So the interactive zone is a generous
// ~16px band with NO layout footprint (negative margin folds it back so the
// panes still meet on a hairline seam), and an always-visible 1px line that
// thickens to the accent on hover/focus — the moment the cursor nears the seam
// it lights up, so you never pixel-hunt. fr-tokens only.

import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useState } from "react";
import { cn } from "../../lib/cn";

export interface ResizeHandleProps {
	/** "x" = vertical seam between left/right panes (col-resize); "y" = horizontal seam between top/bottom (row-resize). */
	readonly axis: "x" | "y";
	readonly onPointerDown: (event: ReactPointerEvent) => void;
	readonly onKeyDown?: (event: ReactKeyboardEvent) => void;
	readonly ariaLabel: string;
	readonly ariaValueNow?: number;
	/** Collapse the handle (e.g. focus mode) — no hit zone, no line. */
	readonly disabled?: boolean;
	readonly className?: string;
}

export function ResizeHandle({
	axis,
	onPointerDown,
	onKeyDown,
	ariaLabel,
	ariaValueNow,
	disabled = false,
	className,
}: ResizeHandleProps) {
	const horizontal = axis === "x";
	// Track our own drag so the line stays lit for the whole gesture — :hover
	// alone drops the accent the instant a fast drag outruns the 16px band.
	const [dragging, setDragging] = useState(false);
	const handlePointerDown = (event: ReactPointerEvent) => {
		setDragging(true);
		const onUp = () => {
			setDragging(false);
			window.removeEventListener("pointerup", onUp);
		};
		window.addEventListener("pointerup", onUp);
		onPointerDown(event);
	};
	return (
		<div
			role="separator"
			aria-orientation={horizontal ? "vertical" : "horizontal"}
			aria-label={ariaLabel}
			aria-valuenow={ariaValueNow}
			tabIndex={disabled ? -1 : 0}
			onPointerDown={disabled ? undefined : handlePointerDown}
			onKeyDown={disabled ? undefined : onKeyDown}
			className={cn(
				"group/resize relative z-20 shrink-0 touch-none focus-visible:outline-none",
				// ~16px grab band, folded back to a hairline of layout via negative margin.
				horizontal ? "-mx-2 w-4 cursor-col-resize" : "-my-2 h-4 cursor-row-resize",
				disabled && "pointer-events-none w-0 opacity-0",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"absolute transition-[background-color,width,height] duration-[var(--fr-motion-fast)]",
					horizontal ? "inset-y-0 left-1/2 -translate-x-1/2" : "inset-x-0 top-1/2 -translate-y-1/2",
					dragging
						? cn("bg-fr-accent", horizontal ? "w-0.5" : "h-0.5")
						: cn(
								"bg-fr-border-soft group-hover/resize:bg-fr-accent group-focus-visible/resize:bg-fr-accent",
								horizontal
									? "w-px group-hover/resize:w-0.5 group-focus-visible/resize:w-0.5"
									: "h-px group-hover/resize:h-0.5 group-focus-visible/resize:h-0.5",
							),
				)}
			/>
		</div>
	);
}

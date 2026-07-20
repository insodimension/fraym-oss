"use client";

// StackedPane — the vertical sibling of SplitPane: a fluid top pane and a
// fixed-height, resizable bottom pane, separated by a 1px row-resize handle.
// Panes are passed as ReactNode props (exactly like SplitPane) so a resize
// re-renders only this shell — the (potentially heavy) pane content keeps its
// element identity and is never re-rendered mid-drag. fr-tokens only.

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ResizeHandle } from "./resize-handle";
import { usePaneResize } from "./use-pane-resize";

export interface StackedPaneProps {
	readonly top: ReactNode;
	/** The resizable bottom pane. Omit (null/undefined) to show only the top. */
	readonly bottom?: ReactNode;
	readonly initialBottomHeight?: number;
	readonly minBottomHeight?: number;
	readonly maxBottomHeight?: number;
	/** Keyboard resize step for Arrow Up/Down on the handle. */
	readonly step?: number;
	readonly resizeLabel?: string;
	readonly className?: string;
}

export function StackedPane({
	top,
	bottom,
	initialBottomHeight = 180,
	minBottomHeight = 96,
	maxBottomHeight = 480,
	step = 24,
	resizeLabel = "Resize panel",
	className,
}: StackedPaneProps) {
	const { size, startResize, nudge } = usePaneResize({
		axis: "y",
		initial: initialBottomHeight,
		min: minBottomHeight,
		max: maxBottomHeight,
		invert: true, // dragging the handle up grows the bottom pane
	});

	const onKeyDown = (event: ReactKeyboardEvent) => {
		if (event.key === "ArrowUp") {
			event.preventDefault();
			nudge(step);
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			nudge(-step);
		}
	};

	return (
		<div data-slot="stacked-pane" className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">{top}</div>
			{bottom != null && (
				<>
					<ResizeHandle
						axis="y"
						ariaLabel={resizeLabel}
						ariaValueNow={Math.round(size)}
						onPointerDown={startResize}
						onKeyDown={onKeyDown}
					/>
					<div
						data-slot="stacked-pane-bottom"
						style={{ height: size }}
						className="flex shrink-0 flex-col overflow-hidden"
					>
						{bottom}
					</div>
				</>
			)}
		</div>
	);
}

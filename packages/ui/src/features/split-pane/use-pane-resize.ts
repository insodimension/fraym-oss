"use client";

// Shared pointer-drag resize for the pane primitives (SplitPane, StackedPane).
// One axis-aware hook so the horizontal and vertical splits share the exact same
// drag behavior — window-level pointer capture, clamping, and a body cursor /
// selection lock during the drag — instead of each re-implementing it.

import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";

export interface PaneResizeOptions {
	/** "x" for a horizontal split (width), "y" for a vertical split (height). */
	readonly axis: "x" | "y";
	readonly initial: number;
	readonly min: number;
	readonly max: number;
	/**
	 * True when the resized pane is the SECOND one (right / bottom): dragging the
	 * handle toward the smaller coordinate grows it, so the delta is inverted.
	 */
	readonly invert?: boolean;
}

export interface PaneResize {
	readonly size: number;
	readonly startResize: (event: ReactPointerEvent) => void;
	/** Keyboard step (e.g. Arrow keys on the handle); a positive delta grows the pane. */
	readonly nudge: (delta: number) => void;
}

export function usePaneResize({ axis, initial, min, max, invert = false }: PaneResizeOptions): PaneResize {
	const [size, setSizeState] = useState(initial);
	const sizeRef = useRef(size);
	sizeRef.current = size;

	const clamp = (value: number) => Math.min(max, Math.max(min, value));

	const startResize = (event: ReactPointerEvent) => {
		event.preventDefault();
		const startPos = axis === "x" ? event.clientX : event.clientY;
		const startSize = sizeRef.current;
		const sign = invert ? -1 : 1;
		document.body.style.userSelect = "none";
		document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
		const onMove = (moveEvent: PointerEvent) => {
			const pos = axis === "x" ? moveEvent.clientX : moveEvent.clientY;
			setSizeState(clamp(startSize + (pos - startPos) * sign));
		};
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	return {
		size,
		startResize,
		nudge: (delta: number) => setSizeState(current => clamp(current + delta)),
	};
}

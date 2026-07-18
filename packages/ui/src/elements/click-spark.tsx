/**
 * ClickSpark — a click bursts a ring of short spark strokes from the pointer.
 * Fraym-native port of react-bits' "ClickSpark" (MIT,
 * https://reactbits.dev/animations/click-spark) MECHANISM, decoupled from its
 * fixed markup: a WRAPPER that lays a `pointer-events-none` canvas OVER any
 * children and paints the burst on top, so wrapped content keeps its own click
 * behaviour (the click bubbles up to the wrapper).
 *
 * How it works (the studied original, math unchanged):
 * - On click, `sparkCount` sparks are seeded at the hit point, one per evenly
 *   spaced angle, each a short line that flies outward as it eases and shrinks.
 * - A single rAF loop redraws every live spark and drops the expired ones. It
 *   is SELF-IDLING: a click starts it and it stops the instant no spark is
 *   left, so an idle wrapper costs nothing.
 * - The spark color defaults to `var(--fr-accent)` and is resolved to a
 *   concrete rgb() at click time (a 2D canvas cannot stroke a CSS var), so it
 *   tracks the live theme/accent and reads on both light and dark.
 *
 * Reduced motion: this is input-driven feedback (permissible to keep), but we
 * honour the preference anyway and simply skip the burst.
 */

import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { prefersReducedMotion } from "../lib/motion";

export type ClickSparkEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface ClickSparkProps {
	/** Content the spark burst overlays; the click bubbles up here from within. */
	readonly children: ReactNode;
	readonly className?: string;
	/** Stroke color per spark; `var(--fr-*)` tokens resolve at click time. Default "var(--fr-accent)". */
	readonly sparkColor?: string;
	/** Initial length of each spark line in px. Default 10. */
	readonly sparkSize?: number;
	/** How far sparks travel from the hit point in px. Default 15. */
	readonly sparkRadius?: number;
	/** Sparks per burst, spread evenly around a circle. Default 8. */
	readonly sparkCount?: number;
	/** Burst lifetime in ms. Default 400. */
	readonly duration?: number;
	/** Flight easing curve. Default "ease-out". */
	readonly easing?: ClickSparkEasing;
	/** Extra multiplier on travel distance. Default 1. */
	readonly extraScale?: number;
}

/** Progress-shaping curves for the spark flight (t in 0..1). */
const EASINGS: Record<ClickSparkEasing, (t: number) => number> = {
	linear: t => t,
	"ease-in": t => t * t,
	"ease-in-out": t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	"ease-out": t => t * (2 - t),
};

interface Spark {
	readonly x: number;
	readonly y: number;
	readonly angle: number;
	readonly startTime: number;
	readonly color: string;
}

/** Resolve a CSS color string (possibly a `var(--fr-*)` token) to a concrete
 *  rgb() against the live cascade, using an already-mounted element as probe so
 *  the 2D canvas has a strokable value. */
function resolveColor(raw: string, probe: HTMLElement): string {
	if (!raw.includes("var(")) return raw;
	const previous = probe.style.color;
	probe.style.color = raw;
	const resolved = getComputedStyle(probe).color;
	probe.style.color = previous;
	return resolved || raw;
}

export function ClickSpark({
	children,
	className,
	sparkColor = "var(--fr-accent)",
	sparkSize = 10,
	sparkRadius = 15,
	sparkCount = 8,
	duration = 400,
	easing = "ease-out",
	extraScale = 1,
}: ClickSparkProps) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const sparks = useRef<Spark[]>([]);
	const rafRef = useRef(0);

	// Keep the backing store sized to the wrapper so hit coordinates map 1:1.
	useEffect(() => {
		const canvas = canvasRef.current;
		const root = rootRef.current;
		if (!canvas || !root) return;
		let timer = 0;
		const size = () => {
			const { width, height } = root.getBoundingClientRect();
			if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
				canvas.width = Math.round(width);
				canvas.height = Math.round(height);
			}
		};
		const observer = new ResizeObserver(() => {
			window.clearTimeout(timer);
			timer = window.setTimeout(size, 100);
		});
		observer.observe(root);
		size();
		return () => {
			observer.disconnect();
			window.clearTimeout(timer);
		};
	}, []);

	useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

	const draw = (now: number) => {
		rafRef.current = 0;
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const ease = EASINGS[easing];
		sparks.current = sparks.current.filter(spark => {
			const elapsed = now - spark.startTime;
			if (elapsed >= duration) return false;
			const eased = ease(elapsed / duration);
			const distance = eased * sparkRadius * extraScale;
			const lineLength = sparkSize * (1 - eased);
			const x1 = spark.x + distance * Math.cos(spark.angle);
			const y1 = spark.y + distance * Math.sin(spark.angle);
			const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
			const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);
			ctx.strokeStyle = spark.color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			return true;
		});
		if (sparks.current.length > 0) {
			rafRef.current = requestAnimationFrame(draw);
		}
	};

	const onClick = (event: ReactMouseEvent<HTMLDivElement>) => {
		// Input-driven, but honour reduced motion by skipping the burst.
		if (prefersReducedMotion()) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const color = resolveColor(sparkColor, canvas);
		const now = performance.now();
		for (let i = 0; i < sparkCount; i++) {
			sparks.current.push({ x, y, angle: (2 * Math.PI * i) / sparkCount, startTime: now, color });
		}
		if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
	};

	return (
		<div ref={rootRef} data-slot="click-spark" className={cn("relative", className)} onClick={onClick}>
			{children}
			<canvas
				ref={canvasRef}
				aria-hidden
				className="pointer-events-none absolute inset-0 block size-full select-none"
			/>
		</div>
	);
}

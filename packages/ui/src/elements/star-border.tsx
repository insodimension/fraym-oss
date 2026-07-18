/**
 * StarBorder — a "star" glow that sweeps along the top and bottom edges of the
 * wrapped content. Fraym-native port of react-bits' "StarBorder" (MIT,
 * https://reactbits.dev/animations/star-border) MECHANISM, decoupled from its
 * fixed button markup: a WRAPPER around any content.
 *
 * How it works (the studied original, no CSS keyframes / no stylesheet):
 * - Two wide radial-gradient bars sit just off the top and bottom edges; the
 *   root clips them (`overflow: hidden`) so only a thin glowing sliver shows in
 *   the `thickness` gap (`padding: thickness 0`) around an opaque inner surface
 *   that occludes their centers.
 * - Each bar translates horizontally in the OPPOSITE direction and fades,
 *   driven by the Web Animations API (`element.animate`, linear + alternate), so
 *   the bright dot appears to orbit along the border. No @keyframes, no CSS file;
 *   the media query is watched live, so toggling reduced motion starts/stops the
 *   sweep without a remount.
 *
 * Reduced motion: the sweep is continuous/decorative, so under
 * `prefers-reduced-motion: reduce` the animation never starts; the bars rest at
 * their CSS position (opacity 0.7, no transform), leaving a static glow band on
 * the border.
 *
 * Theme-native adaptation (the origin hard-codes a black inner box + white glow):
 * the glow `color` defaults to `var(--fr-accent)` and the inner surface to
 * `var(--fr-surface)` with a `--fr-border-soft` edge, so the framed content and
 * its glowing border read on BOTH light and dark.
 *
 * Note: like the origin, the glow travels the TOP and BOTTOM edges only (a
 * two-bar sweep), not a full four-side orbit.
 */

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { useReducedMotion } from "./media-queries";

export interface StarBorderProps {
	/** The content framed by the glowing border. */
	readonly children: ReactNode;
	readonly className?: string;
	/** Glow color of the orbiting star. Default `var(--fr-accent)`. */
	readonly color?: string;
	/** Seconds for one edge-to-edge sweep (eases back and forth). Default 6. */
	readonly speed?: number;
	/** Glow band thickness in px (the padding gap the sliver shows through). Default 1. */
	readonly thickness?: number;
	/** Corner radius in px for the frame. Default 20. */
	readonly borderRadius?: number;
}

export function StarBorder({
	children,
	className,
	color = "var(--fr-accent)",
	speed = 6,
	thickness = 1,
	borderRadius = 20,
}: StarBorderProps) {
	const topRef = useRef<HTMLSpanElement | null>(null);
	const bottomRef = useRef<HTMLSpanElement | null>(null);
	const reduced = useReducedMotion();

	useEffect(() => {
		if (reduced) return;
		const options: KeyframeAnimationOptions = {
			duration: Math.max(speed, 0.1) * 1000,
			iterations: Number.POSITIVE_INFINITY,
			direction: "alternate",
			easing: "linear",
		};
		const animations: Animation[] = [];
		const bottom = bottomRef.current;
		const top = topRef.current;
		if (bottom) {
			animations.push(
				bottom.animate(
					[
						{ transform: "translate(0%, 0%)", opacity: 1 },
						{ transform: "translate(-100%, 0%)", opacity: 0 },
					],
					options,
				),
			);
		}
		if (top) {
			animations.push(
				top.animate(
					[
						{ transform: "translate(0%, 0%)", opacity: 1 },
						{ transform: "translate(100%, 0%)", opacity: 0 },
					],
					options,
				),
			);
		}
		return () => {
			for (const animation of animations) animation.cancel();
		};
	}, [reduced, speed]);

	const glow = `radial-gradient(circle, ${color}, transparent 10%)`;
	const barBase: CSSProperties = {
		position: "absolute",
		width: "300%",
		height: "50%",
		opacity: 0.7,
		borderRadius: "50%",
		background: glow,
		zIndex: 0,
	};

	return (
		<div
			data-slot="star-border"
			className={cn("relative inline-block overflow-hidden", className)}
			style={{ borderRadius, padding: `${thickness}px 0` }}
		>
			<span
				ref={bottomRef}
				aria-hidden
				className="pointer-events-none"
				style={{ ...barBase, bottom: -12, right: "-250%" }}
			/>
			<span
				ref={topRef}
				aria-hidden
				className="pointer-events-none"
				style={{ ...barBase, top: -12, left: "-250%" }}
			/>
			<div className="relative z-[1] border border-fr-border-soft bg-fr-surface" style={{ borderRadius }}>
				{children}
			</div>
		</div>
	);
}

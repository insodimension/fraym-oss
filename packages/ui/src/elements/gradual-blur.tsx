/**
 * GradualBlur — a layered `backdrop-filter` band that ramps blur from nothing
 * to full across one edge, so content scrolls softly out of focus under a
 * header/footer/side fade. Fraym-native port of react-bits' "GradualBlur" (MIT,
 * https://reactbits.dev/animations/gradual-blur) MECHANISM.
 *
 * `divCount` stacked layers each carry a linear-gradient mask window plus an
 * increasing `backdrop-filter: blur()`; overlapping the windows builds one
 * smooth progressive blur (linear or `exponential`, shaped by `curve`). Mount
 * inside a positioned, clipped container that has content behind it.
 *
 * Pure static CSS: theme-agnostic (it blurs whatever sits behind it, so it
 * reads on light and dark) and NO motion at all, so reduced motion needs no
 * handling. The origin's animated / scroll-reveal / hover-intensity /
 * responsive / preset variants are intentionally dropped (see the port report).
 */

import { type CSSProperties, type ReactNode, useMemo } from "react";
import { cn } from "../lib/cn";

export type GradualBlurPosition = "top" | "bottom" | "left" | "right";
export type GradualBlurCurve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
export type GradualBlurTarget = "parent" | "page";

export interface GradualBlurProps {
	readonly className?: string;
	/** Which edge the blur band hugs. Default "bottom". */
	readonly position?: GradualBlurPosition;
	/** Blur intensity multiplier. Default 2. */
	readonly strength?: number;
	/** Band size (any CSS length): height for top/bottom, width for left/right. Default "6rem". */
	readonly height?: string;
	/** Number of stacked blur layers; more = smoother ramp. Default 5. */
	readonly divCount?: number;
	/** Ramp blur exponentially instead of linearly. Default false. */
	readonly exponential?: boolean;
	/** Progress-shaping curve across the layers. Default "linear". */
	readonly curve?: GradualBlurCurve;
	/** Layer opacity (0..1). Default 1. */
	readonly opacity?: number;
	/** Stacking context. `page` pins the band to the viewport. Default "parent". */
	readonly target?: GradualBlurTarget;
	/** Base z-index for the band. Default 1000. */
	readonly zIndex?: number;
	/** Extra inline styles merged onto the container. */
	readonly style?: CSSProperties;
}

/** Progress-shaping curves across the layer stack (p in 0..1). */
const CURVES: Record<GradualBlurCurve, (p: number) => number> = {
	linear: p => p,
	bezier: p => p * p * (3 - 2 * p),
	"ease-in": p => p * p,
	"ease-out": p => 1 - (1 - p) ** 2,
	"ease-in-out": p => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
};

const GRADIENT_DIRECTION: Record<GradualBlurPosition, string> = {
	top: "to top",
	bottom: "to bottom",
	left: "to left",
	right: "to right",
};

/** Position-aware edge offsets + span for the band container. */
function edgeStyle(position: GradualBlurPosition, height: string): CSSProperties {
	if (position === "top" || position === "bottom") {
		return {
			height,
			width: "100%",
			left: 0,
			right: 0,
			top: position === "top" ? 0 : undefined,
			bottom: position === "bottom" ? 0 : undefined,
		};
	}
	return {
		width: height,
		height: "100%",
		top: 0,
		bottom: 0,
		left: position === "left" ? 0 : undefined,
		right: position === "right" ? 0 : undefined,
	};
}

export function GradualBlur({
	className,
	position = "bottom",
	strength = 2,
	height = "6rem",
	divCount = 5,
	exponential = false,
	curve = "linear",
	opacity = 1,
	target = "parent",
	zIndex = 1000,
	style,
}: GradualBlurProps) {
	const layers = useMemo<ReactNode[]>(() => {
		const count = Math.max(1, Math.round(divCount));
		const increment = 100 / count;
		const shape = CURVES[curve];
		const direction = GRADIENT_DIRECTION[position];
		const divs: ReactNode[] = [];
		for (let i = 1; i <= count; i++) {
			const progress = shape(i / count);
			const blur = exponential
				? 2 ** (progress * 4) * 0.0625 * strength
				: 0.0625 * (progress * count + 1) * strength;
			const p1 = Math.round((increment * i - increment) * 10) / 10;
			const p2 = Math.round(increment * i * 10) / 10;
			const p3 = Math.round((increment * i + increment) * 10) / 10;
			const p4 = Math.round((increment * i + increment * 2) * 10) / 10;
			let stops = `transparent ${p1}%, black ${p2}%`;
			if (p3 <= 100) stops += `, black ${p3}%`;
			if (p4 <= 100) stops += `, transparent ${p4}%`;
			const mask = `linear-gradient(${direction}, ${stops})`;
			divs.push(
				<div
					key={i}
					aria-hidden
					style={{
						position: "absolute",
						inset: 0,
						maskImage: mask,
						WebkitMaskImage: mask,
						backdropFilter: `blur(${blur.toFixed(3)}rem)`,
						WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
						opacity,
					}}
				/>,
			);
		}
		return divs;
	}, [position, strength, divCount, exponential, curve, opacity]);

	const containerStyle: CSSProperties = {
		position: target === "page" ? "fixed" : "absolute",
		pointerEvents: "none",
		zIndex: target === "page" ? zIndex + 100 : zIndex,
		...edgeStyle(position, height),
		...style,
	};

	return (
		<div data-slot="gradual-blur" className={cn(className)} style={containerStyle}>
			<div style={{ position: "relative", width: "100%", height: "100%" }}>{layers}</div>
		</div>
	);
}

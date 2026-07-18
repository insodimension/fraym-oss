/**
 * ElectricBorder — a crackling, turbulence-displaced border that jitters around
 * the wrapped content. Fraym-native port of react-bits' "ElectricBorder" (MIT,
 * https://reactbits.dev/animations/electric-border) MECHANISM: a WRAPPER around
 * any content.
 *
 * How it works (the studied original re-expressed on the SVG filter path):
 * - An inline SVG `<filter>` builds a flowing noise field: paired `feTurbulence`
 *   layers are shifted in opposite directions by `feOffset`, composited and
 *   `color-dodge`-blended, then fed to `feDisplacementMap`, which warps the
 *   border layers into a live electric edge.
 * - The flow is animated with inline SMIL `<animate>` elements on the `feOffset`
 *   `dx`/`dy` (declarative, self-contained SVG markup that touches NO stylesheet
 *   and adds NO `.css` file). WAAPI (`element.animate`) is deliberately NOT used
 *   here: `baseFrequency`/`seed`/`dx`/`dy` are SVG filter-primitive attributes,
 *   not CSS properties, so `element.animate` produces a live Animation object
 *   with zero visual effect on them — SMIL is the only in-markup way to animate
 *   the field. The house already gates SMIL this way (see the animated flow edges).
 * - Layered stroke + two blurred glows + a soft background bloom read as an
 *   electric halo. The turbulence is static (computed once); only the cheap
 *   `feOffset` shift animates.
 *
 * Reduced motion: continuous/decorative, so under `prefers-reduced-motion:
 * reduce` the `<animate>` elements are omitted — the `feOffset` shifts rest at 0,
 * leaving a still (but still jagged) electric border. The media query is watched
 * live, so toggling the OS setting starts/stops the crackle without a remount.
 *
 * Theme-native adaptation (the origin defaults to a fixed violet `#5227FF`):
 * `color` defaults to `var(--fr-accent)` and every glow derives from it via
 * `color-mix`, so the border reads on BOTH light and dark.
 */

import { type CSSProperties, Fragment, type ReactNode, useId } from "react";
import { cn } from "../lib/cn";
import { useReducedMotion } from "./media-queries";

export interface ElectricBorderProps {
	/** The content framed by the electric border. */
	readonly children: ReactNode;
	readonly className?: string;
	/** Border + glow color. Default `var(--fr-accent)`. */
	readonly color?: string;
	/** Crackle speed multiplier (higher = faster; one loop is 6s / speed). Default 1. */
	readonly speed?: number;
	/** Displacement intensity multiplier (higher = wilder jitter). Default 1. */
	readonly chaos?: number;
	/** Border thickness in px. Default 2. */
	readonly thickness?: number;
	/** Corner radius in px. Default 16. */
	readonly borderRadius?: number;
}

/** One turbulence + offset pair feeding the displacement field. `attr`/`values`
 *  drive the animated shift; `seed` picks the noise variant. */
interface NoiseLayer {
	readonly result: string;
	readonly seed: number;
	readonly attr: "dx" | "dy";
	readonly values: string;
}

const NOISE_LAYERS: readonly NoiseLayer[] = [
	{ result: "o1", seed: 1, attr: "dy", values: "700; 0" },
	{ result: "o2", seed: 1, attr: "dy", values: "0; -700" },
	{ result: "o3", seed: 2, attr: "dx", values: "490; 0" },
	{ result: "o4", seed: 2, attr: "dx", values: "0; -490" },
];

export function ElectricBorder({
	children,
	className,
	color = "var(--fr-accent)",
	speed = 1,
	chaos = 1,
	thickness = 2,
	borderRadius = 16,
}: ElectricBorderProps) {
	const reduced = useReducedMotion();

	const rawId = useId();
	const filterId = `eb-${rawId.replace(/:/g, "")}`;
	const dur = `${6 / Math.max(speed, 0.1)}s`;
	const displacement = 30 * chaos;

	const filterUrl = `url(#${filterId})`;
	const layerBase: CSSProperties = {
		position: "absolute",
		inset: 0,
		borderRadius: "inherit",
		boxSizing: "border-box",
	};

	return (
		<div data-slot="electric-border" className={cn("relative isolate", className)} style={{ borderRadius }}>
			<svg aria-hidden focusable="false" style={{ position: "absolute", width: 0, height: 0 }}>
				<defs>
					<filter id={filterId} colorInterpolationFilters="sRGB" x="-50%" y="-50%" width="200%" height="200%">
						{NOISE_LAYERS.map(layer => (
							<Fragment key={layer.result}>
								<feTurbulence
									type="turbulence"
									baseFrequency="0.02"
									numOctaves={10}
									seed={layer.seed}
									result={`n-${layer.result}`}
								/>
								<feOffset in={`n-${layer.result}`} dx="0" dy="0" result={layer.result}>
									{!reduced && (
										<animate
											attributeName={layer.attr}
											values={layer.values}
											dur={dur}
											repeatCount="indefinite"
											calcMode="linear"
										/>
									)}
								</feOffset>
							</Fragment>
						))}
						<feComposite in="o1" in2="o2" result="part1" />
						<feComposite in="o3" in2="o4" result="part2" />
						<feBlend in="part1" in2="part2" mode="color-dodge" result="combined" />
						<feDisplacementMap
							in="SourceGraphic"
							in2="combined"
							scale={displacement}
							xChannelSelector="R"
							yChannelSelector="B"
						/>
					</filter>
				</defs>
			</svg>

			<span
				aria-hidden
				className="pointer-events-none"
				style={{ ...layerBase, border: `${thickness}px solid ${color}`, filter: filterUrl }}
			/>
			<span
				aria-hidden
				className="pointer-events-none"
				style={{
					...layerBase,
					border: `${thickness}px solid color-mix(in oklab, ${color} 60%, transparent)`,
					filter: `${filterUrl} blur(1px)`,
				}}
			/>
			<span
				aria-hidden
				className="pointer-events-none"
				style={{
					...layerBase,
					border: `${thickness}px solid ${color}`,
					filter: `${filterUrl} blur(4px)`,
					opacity: 0.6,
				}}
			/>
			<span
				aria-hidden
				className="pointer-events-none"
				style={{
					...layerBase,
					zIndex: -1,
					transform: "scale(1.05)",
					filter: "blur(32px)",
					opacity: 0.3,
					background: `linear-gradient(-30deg, ${color}, transparent, ${color})`,
				}}
			/>

			<div className="relative z-[1]" style={{ borderRadius: "inherit" }}>
				{children}
			</div>
		</div>
	);
}

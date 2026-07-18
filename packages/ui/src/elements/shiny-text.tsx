/**
 * ShinyText — a specular sheen that sweeps across text. Fraym-native port of
 * react-bits' "ShinyText" (MIT, https://reactbits.dev/text-animations/shiny-text)
 * MECHANISM, decoupled from its fixed `text` string and motion/react runtime:
 * this is a WRAPPER — hand it any inline text as children and a moving highlight
 * band travels through it.
 *
 * How it works (the studied original, framer-motion removed):
 * - The text is painted with a horizontal `linear-gradient` whose middle stop is
 *   a brighter "shine" color; `background-clip: text` + transparent fill make the
 *   letters show the gradient. The band is 200% wide, so sliding
 *   `background-position` from off one edge to off the other drags the highlight
 *   across the glyphs.
 * - Animated with the Web Animations API (`element.animate` on
 *   `background-position`), NOT a keyframes stylesheet — nothing touches shared
 *   CSS, and the animation is trivially cancelled/restarted.
 *
 * Theme-native adaptation (the origin hard-codes a dark-theme base `#b5b5b5` and a
 * white sheen, which vanishes on light surfaces):
 * - `color` (the resting text) defaults to `currentColor`, so the text always
 *   reads as ordinary theme text in BOTH light and dark; it inherits
 *   `var(--fr-text)` from the cascade wherever it is placed.
 * - `shineColor` defaults to a white-leaning `color-mix` OF `currentColor`, not a
 *   literal white. On dark the base is near-white so the mix lands near-white (a
 *   subtle glint over the small remaining headroom); on LIGHT the base is dark so
 *   the same mix resolves to a mid tone that still contrasts against the light
 *   surface, giving a clearly visible sweep instead of an invisible one.
 *
 * Guards:
 * - Continuous decorative motion: under `prefers-reduced-motion: reduce` the sweep
 *   never starts and the text rests as plain styled text (base color, shine parked
 *   off-screen). The media query is watched live, so toggling the OS setting
 *   starts/stops the sheen without a remount.
 * - `disabled` parks the sheen the same way without touching the reduced-motion
 *   path.
 */

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { useReducedMotion } from "./media-queries";

export interface ShinyTextProps {
	/** The inline text (or nodes) the sheen travels through. */
	readonly children: ReactNode;
	readonly className?: string;
	/** Park the sheen off-screen and never animate (renders plain styled text). Default false. */
	readonly disabled?: boolean;
	/** Seconds for one full sweep edge-to-edge. Default 5. */
	readonly speed?: number;
	/** Resting text color (the gradient's base stops). Default `"currentColor"` so it tracks the theme text token. */
	readonly color?: string;
	/** The moving highlight color. Default a white-leaning `color-mix` of `currentColor` that keeps contrast on light AND dark. */
	readonly shineColor?: string;
	/** Gradient angle in degrees; tilts the band. Default 120. */
	readonly spread?: number;
	/** Sweep direction across the text. Default `"left"` (band exits toward the left). */
	readonly direction?: "left" | "right";
}

/** Sheen parked off the right edge — the resting frame for reduced-motion / disabled. */
const REST_POSITION = "150% 50%";

export function ShinyText({
	children,
	className,
	disabled = false,
	speed = 5,
	color = "currentColor",
	shineColor = "color-mix(in srgb, currentColor, #ffffff 70%)",
	spread = 120,
	direction = "left",
}: ShinyTextProps) {
	const ref = useRef<HTMLSpanElement | null>(null);
	const reduced = useReducedMotion();

	useEffect(() => {
		const element = ref.current;
		if (!element || disabled || reduced) return;
		const from = direction === "left" ? "150% 50%" : "-50% 50%";
		const to = direction === "left" ? "-50% 50%" : "150% 50%";
		const animation = element.animate([{ backgroundPosition: from }, { backgroundPosition: to }], {
			duration: Math.max(speed, 0.1) * 1000,
			iterations: Number.POSITIVE_INFINITY,
			easing: "linear",
		});
		return () => animation.cancel();
	}, [disabled, reduced, speed, direction]);

	// Hide the glyph fill with `-webkit-text-fill-color` ONLY (never `color: transparent`):
	// the gradient's `currentColor` default resolves against this element's own `color`, so
	// zeroing it would make the sheen invisible. Leaving `color` inherited keeps `currentColor`
	// pointing at the ambient theme text (var(--fr-text)).
	const style: CSSProperties = {
		backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
		backgroundSize: "200% auto",
		backgroundPosition: REST_POSITION,
		WebkitBackgroundClip: "text",
		backgroundClip: "text",
		WebkitTextFillColor: "transparent",
	};

	return (
		<span ref={ref} data-slot="shiny-text" className={cn("inline-block", className)} style={style}>
			{children}
		</span>
	);
}

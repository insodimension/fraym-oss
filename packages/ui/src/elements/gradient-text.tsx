/**
 * GradientText — text (and an optional rim) filled with a slowly flowing
 * multi-stop gradient. Fraym-native port of react-bits' "GradientText" (MIT,
 * https://reactbits.dev/text-animations/gradient-text) MECHANISM, decoupled from
 * its motion/react runtime: hand it any inline content as children.
 *
 * How it works (the studied original, framer-motion removed):
 * - The gradient stops are laid out `to right` with the FIRST color duplicated at
 *   the end, over a 300%-wide background; sliding `background-position` back and
 *   forth (WAAPI `alternate`) makes the colors flow through the letters without a
 *   seam or jump. `background-clip: text` + transparent fill paints the glyphs.
 * - Animated with the Web Animations API (`element.animate`), NOT a keyframes
 *   stylesheet — nothing touches shared CSS.
 * - `showBorder` adds a pill rim: a full-area layer carries the SAME animated
 *   gradient and an inner rectangle (2px smaller, filled with the page
 *   background) masks all but a 1px gradient edge.
 *
 * Theme-native adaptation:
 * - `colors` default to the Fraym brand tokens (`--fr-accent`, `--fr-iris`,
 *   `--fr-blue`); any CSS colors are accepted.
 * - The rim's inner mask uses `var(--fr-bg)` (the origin hard-codes `#120F17`, a
 *   dark-only fill) so the border interior matches the caller's surface in BOTH
 *   light and dark.
 *
 * Guards:
 * - Continuous decorative motion: under `prefers-reduced-motion: reduce` the flow
 *   never starts and the text rests as a static gradient. The media query is
 *   watched live, so toggling the OS setting starts/stops the flow without a
 *   remount. `disabled` parks it the same way.
 */

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { useReducedMotion } from "./media-queries";

export interface GradientTextProps {
	/** The inline content filled with the flowing gradient. */
	readonly children: ReactNode;
	readonly className?: string;
	/** Gradient stops, left → right (the first is auto-duplicated for a seamless loop). CSS colors, tokens welcome. Default the Fraym brand ramp. */
	readonly colors?: readonly string[];
	/** Seconds for one flow sweep (it eases back and forth). Default 8. */
	readonly speed?: number;
	/** Draw an animated gradient pill rim around the text. Default false. */
	readonly showBorder?: boolean;
	/** Freeze the gradient and never animate (renders static gradient text). Default false. */
	readonly disabled?: boolean;
}

const DEFAULT_COLORS = ["var(--fr-accent)", "var(--fr-iris)", "var(--fr-blue)"] as const;

/** Gradient parked at the left — the resting frame for reduced-motion / disabled. */
const REST_POSITION = "0% 50%";

export function GradientText({
	children,
	className,
	colors = DEFAULT_COLORS,
	speed = 8,
	showBorder = false,
	disabled = false,
}: GradientTextProps) {
	const textRef = useRef<HTMLSpanElement | null>(null);
	const borderRef = useRef<HTMLSpanElement | null>(null);
	const reduced = useReducedMotion();

	// biome-ignore lint/correctness/useExhaustiveDependencies: showBorder is an intentional trigger, not a read value — it gates whether the borderRef span is rendered, so the effect must re-run when it toggles to attach the WAAPI animation to the newly-mounted border element (removing it leaves a toggled-on border static).
	useEffect(() => {
		if (disabled || reduced) return;
		const options: KeyframeAnimationOptions = {
			duration: Math.max(speed, 0.1) * 1000,
			iterations: Number.POSITIVE_INFINITY,
			direction: "alternate",
			easing: "ease-in-out",
		};
		const frames = [{ backgroundPosition: "0% 50%" }, { backgroundPosition: "100% 50%" }];
		const animations: Animation[] = [];
		for (const element of [textRef.current, borderRef.current]) {
			if (element) animations.push(element.animate(frames, options));
		}
		return () => {
			for (const animation of animations) animation.cancel();
		};
	}, [disabled, reduced, speed, showBorder]);

	const gradientColors = [...colors, colors[0]].join(", ");
	const gradientStyle: CSSProperties = {
		backgroundImage: `linear-gradient(to right, ${gradientColors})`,
		backgroundSize: "300% 100%",
		backgroundPosition: REST_POSITION,
	};
	// Hide the glyph fill with `-webkit-text-fill-color` ONLY (never `color: transparent`):
	// a caller may pass `currentColor` in `colors`, and zeroing `color` would resolve it to
	// nothing. Leaving `color` inherited keeps any `currentColor` stop pointing at theme text.
	const textStyle: CSSProperties = {
		...gradientStyle,
		WebkitBackgroundClip: "text",
		backgroundClip: "text",
		WebkitTextFillColor: "transparent",
	};

	return (
		<span
			data-slot="gradient-text"
			className={cn(
				"relative inline-flex max-w-fit items-center justify-center font-medium",
				showBorder && "rounded-[1rem] px-3 py-1.5",
				className,
			)}
		>
			{showBorder && (
				<span
					ref={borderRef}
					aria-hidden
					className="pointer-events-none absolute inset-0 rounded-[inherit]"
					style={gradientStyle}
				>
					<span
						className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[inherit] bg-fr-bg"
						style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
					/>
				</span>
			)}
			<span ref={textRef} className="relative z-[1]" style={textStyle}>
				{children}
			</span>
		</span>
	);
}

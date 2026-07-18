/**
 * GlareHover — a diagonal specular "glare" that sweeps across the wrapped
 * content on hover. Fraym-native port of react-bits' "GlareHover" (MIT,
 * https://reactbits.dev/animations/glare-hover) MECHANISM, decoupled from its
 * fixed box markup: this is a WRAPPER, so hand it any content and the sheen
 * sweeps over it (the origin baked in width/height/background/border; here the
 * children own their box).
 *
 * How it works (the studied original, no CSS file / no ::before pseudo-element):
 * - One absolutely-positioned, pointer-events-none overlay paints a single
 *   diagonal light band via `linear-gradient`, sized larger than the box
 *   (`glareSize`%). At rest the band sits off the top-left corner
 *   (`background-position` -100% -100%); on hover it moves to the bottom-right
 *   (100% 100%) with a short inline CSS transition, so the glare travels across
 *   on a diagonal. No stylesheet, no @keyframes — the transition rides an inline
 *   `style` property.
 * - `playOnce` drops the transition while at rest, so leaving the element snaps
 *   the band back to its start instead of sweeping in reverse.
 *
 * Reduced motion: input-driven feedback only (nothing animates on its own), so
 * the short transition is fine under `prefers-reduced-motion` and needs no
 * gating — same call the house makes for ChromaGrid's hover fades.
 *
 * Theme-native adaptation (the origin defaults to opaque white, invisible on a
 * light surface): `glareColor` defaults to a `--fr-text`-derived, white-leaning
 * `color-mix`, so the sweep CONTRASTS the wrapped surface and reads on BOTH
 * light and dark (a bright glint on dark, a legible darker sheen on light). Pass
 * a literal `glareColor` (e.g. "#ffffff") to restore the classic white glint on
 * always-dark surfaces.
 */

import { type CSSProperties, type ReactNode, useState } from "react";
import { cn } from "../lib/cn";

export interface GlareHoverProps {
	/** The content the glare sweeps over. */
	readonly children: ReactNode;
	readonly className?: string;
	/** Glare band color (the sheen hue). Default a `--fr-text`-derived white-mix that reads on light AND dark. */
	readonly glareColor?: string;
	/** Glare opacity, 0..1, folded into `glareColor` as its alpha. Default 0.5. */
	readonly glareOpacity?: number;
	/** Sweep angle in degrees; tilts the band. Default -45. */
	readonly glareAngle?: number;
	/** Band size as a percent of the box (larger = wider travel). Default 250. */
	readonly glareSize?: number;
	/** Milliseconds for one sweep across the box. Default 650. */
	readonly transitionDuration?: number;
	/** Sweep in on hover but snap back on leave (no reverse sweep). Default false. */
	readonly playOnce?: boolean;
	/** Corner radius in px; clips the sweep, so match the wrapped content's radius. Default 16. */
	readonly borderRadius?: number;
}

export function GlareHover({
	children,
	className,
	glareColor = "color-mix(in srgb, var(--fr-text) 60%, #ffffff)",
	glareOpacity = 0.5,
	glareAngle = -45,
	glareSize = 250,
	transitionDuration = 650,
	playOnce = false,
	borderRadius = 16,
}: GlareHoverProps) {
	const [hovered, setHovered] = useState(false);

	// Fold the requested opacity into the band color so a plain hue prop still
	// yields a translucent sheen (mirrors the origin's hex -> rgba(...opacity)).
	const band = `color-mix(in srgb, ${glareColor} ${Math.round(glareOpacity * 100)}%, transparent)`;
	const glare = `linear-gradient(${glareAngle}deg, transparent 60%, ${band} 70%, transparent 80%, transparent 100%)`;
	const transition = playOnce && !hovered ? "none" : `background-position ${transitionDuration}ms ease`;

	const overlayStyle: CSSProperties = {
		backgroundImage: glare,
		backgroundRepeat: "no-repeat",
		backgroundSize: `${glareSize}% ${glareSize}%`,
		backgroundPosition: hovered ? "100% 100%" : "-100% -100%",
		transition,
	};

	return (
		<div
			data-slot="glare-hover"
			className={cn("relative overflow-hidden", className)}
			style={{ borderRadius }}
			onPointerEnter={() => setHovered(true)}
			onPointerLeave={() => setHovered(false)}
		>
			{children}
			<span aria-hidden className="pointer-events-none absolute inset-0 z-[1]" style={overlayStyle} />
		</div>
	);
}

/**
 * ChromaGrid — the chroma-follows-the-cursor effect for a grid of colorful
 * cards. Fraym-native port of react-bits' "ChromaGrid" (MIT,
 * https://reactbits.dev/components/chroma-grid) MECHANISM, decoupled from its
 * fixed card markup: this is a WRAPPER — hand it any grid as children and it
 * layers the effect on top, so existing cards keep their own anatomy.
 *
 * How it works (the studied original, gsap removed):
 * - Two full-area overlays with `backdrop-filter: grayscale() brightness()`.
 * - The REST layer covers everything through an inverse radial mask; while
 *   the pointer is inside it fades away and the WINDOW layer takes over,
 *   desaturating everything EXCEPT a chroma circle around the cursor — the
 *   art keeps its color exactly where you look.
 * - The circle center is a smoothed cursor (self-idling rAF exponential
 *   follow writing `--chroma-x/y` — no gsap, no React state per frame).
 *
 * Guards:
 * - Hover-capable pointers only (`matchMedia("(hover: hover)")`): on touch
 *   the overlays never mount, so the grid can never get stuck desaturated.
 * - Pointer-driven feedback only — nothing animates on its own, so reduced
 *   motion needs no special casing beyond the short CSS fades.
 * - Theme-native: pure filter + mask over the caller's tokens; `grayscale`
 *   and `brightness` are tunable so light themes rest gently.
 */

import {
	type CSSProperties,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "../lib/cn";
import { useHoverCapable } from "./media-queries";

export interface ChromaGridProps {
	readonly children: ReactNode;
	readonly className?: string;
	/** Chroma window radius in px. Default 320. */
	readonly radius?: number;
	/** Cursor follow smoothing per frame (0..1, higher = snappier). Default 0.14. */
	readonly damping?: number;
	/** Rest/outside desaturation (0 none .. 1 full grayscale). Default 0.9. */
	readonly grayscale?: number;
	/** Rest/outside dimming (1 none .. lower = darker). Default 0.82. */
	readonly brightness?: number;
}

/** The window layer's mask: transparent (= full chroma) at the cursor,
 *  opaque (= filtered) outward. */
const WINDOW_MASK =
	"radial-gradient(circle var(--chroma-r) at var(--chroma-x) var(--chroma-y), transparent 0%, transparent 15%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.68) 88%, white 100%)";

/** The rest layer's inverse mask: strongest at the cursor, so fading this
 *  layer OUT on entry "opens" the chroma window smoothly. */
const REST_MASK =
	"radial-gradient(circle var(--chroma-r) at var(--chroma-x) var(--chroma-y), white 0%, white 15%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.32) 88%, transparent 100%)";

export function ChromaGrid({
	children,
	className,
	radius = 320,
	damping = 0.14,
	grayscale = 0.9,
	brightness = 0.82,
}: ChromaGridProps) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const pointer = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, px: false });
	const rafRef = useRef(0);
	const hoverCapable = useHoverCapable();
	const [inside, setInside] = useState(false);

	useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

	const step = () => {
		rafRef.current = 0;
		const root = rootRef.current;
		if (!root) return;
		const p = pointer.current;
		p.x += (p.tx - p.x) * damping;
		p.y += (p.ty - p.y) * damping;
		root.style.setProperty("--chroma-x", `${p.x}px`);
		root.style.setProperty("--chroma-y", `${p.y}px`);
		// Self-idling: keep following only while meaningfully away from target.
		if (Math.abs(p.tx - p.x) > 0.5 || Math.abs(p.ty - p.y) > 0.5) {
			rafRef.current = requestAnimationFrame(step);
		}
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const root = rootRef.current;
		if (!root) return;
		const rect = root.getBoundingClientRect();
		const p = pointer.current;
		p.tx = event.clientX - rect.left;
		p.ty = event.clientY - rect.top;
		if (!p.px) {
			// First contact: snap the window to the cursor instead of sweeping in.
			p.x = p.tx;
			p.y = p.ty;
			p.px = true;
		}
		if (!inside) setInside(true);
		if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
	};
	const onPointerLeave = () => setInside(false);

	const filter = `grayscale(${grayscale}) brightness(${brightness})`;
	return (
		<div
			ref={rootRef}
			data-slot="chroma-grid"
			className={cn("relative", className)}
			style={{ "--chroma-r": `${radius}px`, "--chroma-x": "50%", "--chroma-y": "50%" } as CSSProperties}
			onPointerMove={hoverCapable ? onPointerMove : undefined}
			onPointerLeave={hoverCapable ? onPointerLeave : undefined}
		>
			{children}
			{hoverCapable && (
				<>
					{/* WINDOW layer: filtered everywhere except the chroma circle. */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 z-[2]"
						style={{
							backdropFilter: filter,
							WebkitBackdropFilter: filter,
							maskImage: WINDOW_MASK,
							WebkitMaskImage: WINDOW_MASK,
						}}
					/>
					{/* REST layer: the inverse mask, fading out while the pointer is
					 *  inside so the window opens (and closes) softly. */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 z-[3] transition-opacity duration-500"
						style={{
							backdropFilter: filter,
							WebkitBackdropFilter: filter,
							maskImage: REST_MASK,
							WebkitMaskImage: REST_MASK,
							opacity: inside ? 0 : 1,
						}}
					/>
				</>
			)}
		</div>
	);
}

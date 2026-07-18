/**
 * Magnet — children drift toward the pointer while it hovers inside a padded
 * activation zone, then ease back to rest. Fraym-native port of react-bits'
 * "Magnet" (MIT, https://reactbits.dev/animations/magnet) MECHANISM.
 *
 * Rewritten off the origin's per-move React state + CSS transition strings onto
 * the house rAF model (see ChromaGrid): a window `mousemove` sets a target
 * offset, a SELF-IDLING rAF exponentially eases the inner element toward it and
 * stops once settled, writing `transform` directly. Zero React state per frame,
 * so the origin's `activeTransition` / `inactiveTransition` props are replaced
 * by a single `damping` factor (see the port report).
 *
 * Guards:
 * - Hover-capable pointers only (`matchMedia("(hover: hover)")`) and never when
 *   `disabled`: on touch the children simply never move.
 * - Reduced motion renders the resting state and attaches no listener.
 */

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { useHoverCapable, useReducedMotion } from "./media-queries";

export interface MagnetProps {
	/** The element that gets pulled toward the pointer. */
	readonly children: ReactNode;
	/** Class for the positioned wrapper. */
	readonly className?: string;
	/** Class for the inner, transformed element. */
	readonly innerClassName?: string;
	/** Activation zone padding around the element in px. Default 100. */
	readonly padding?: number;
	/** Turn the effect off; children stay at rest. Default false. */
	readonly disabled?: boolean;
	/** Pull divisor: higher = subtler drift. Default 2. */
	readonly magnetStrength?: number;
	/** Follow smoothing per frame (0..1, higher = snappier). Default 0.2. */
	readonly damping?: number;
}

export function Magnet({
	children,
	className,
	innerClassName,
	padding = 100,
	disabled = false,
	magnetStrength = 2,
	damping = 0.2,
}: MagnetProps) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const innerRef = useRef<HTMLDivElement | null>(null);
	const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
	const rafRef = useRef(0);
	const hoverCapable = useHoverCapable();
	const reduced = useReducedMotion();

	useEffect(() => {
		const active = !disabled && hoverCapable && !reduced;
		if (!active) {
			pos.current = { x: 0, y: 0, tx: 0, ty: 0 };
			cancelAnimationFrame(rafRef.current);
			rafRef.current = 0;
			if (innerRef.current) innerRef.current.style.transform = "translate3d(0px, 0px, 0)";
			return;
		}

		const step = () => {
			rafRef.current = 0;
			const node = innerRef.current;
			if (!node) return;
			const p = pos.current;
			p.x += (p.tx - p.x) * damping;
			p.y += (p.ty - p.y) * damping;
			// Snap once close enough so the loop can idle without perpetual drift.
			if (Math.abs(p.tx - p.x) <= 0.1 && Math.abs(p.ty - p.y) <= 0.1) {
				p.x = p.tx;
				p.y = p.ty;
			}
			node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
			if (p.x !== p.tx || p.y !== p.ty) {
				rafRef.current = requestAnimationFrame(step);
			}
		};

		const onMove = (event: MouseEvent) => {
			const root = rootRef.current;
			if (!root) return;
			const { left, top, width, height } = root.getBoundingClientRect();
			const centerX = left + width / 2;
			const centerY = top + height / 2;
			const p = pos.current;
			if (
				Math.abs(centerX - event.clientX) < width / 2 + padding &&
				Math.abs(centerY - event.clientY) < height / 2 + padding
			) {
				p.tx = (event.clientX - centerX) / magnetStrength;
				p.ty = (event.clientY - centerY) / magnetStrength;
			} else {
				p.tx = 0;
				p.ty = 0;
			}
			if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
		};

		window.addEventListener("mousemove", onMove);
		return () => {
			window.removeEventListener("mousemove", onMove);
			cancelAnimationFrame(rafRef.current);
			rafRef.current = 0;
		};
	}, [disabled, hoverCapable, reduced, padding, magnetStrength, damping]);

	return (
		<div ref={rootRef} data-slot="magnet" className={cn("relative inline-block", className)}>
			<div
				ref={innerRef}
				className={innerClassName}
				style={{ transform: "translate3d(0px, 0px, 0)", willChange: "transform" }}
			>
				{children}
			</div>
		</div>
	);
}

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { LiquidGlassFieldContext, type LiquidGlassFieldValue } from "./context";
import { LiquidGlassField, type LiquidGlassIntensity, type LiquidGlassTone } from "./field";
import type { LiquidGlassFieldSource } from "./renderer";

/**
 * Solid fallback tone for the canvas BEFORE the field has painted its first frame
 * (mount, or any remount). Without this the canvas is transparent and the root's
 * own near-black/pale base coat (`liquid-glass.css`) shows through bare for a frame
 * or two while the field's `ResizeObserver`/animation loop spins up — visible as a
 * "blank flash" right where tool cards (or any translucent surface) are about to
 * paint, especially under `auto-expand=all` when many cards mount synchronously and
 * starve the field a frame. Matching the root's base coat exactly means the canvas
 * is indistinguishable from "already there" from the very first paint — the field's
 * drifting light pools then fade IN on top of it instead of the whole layer popping.
 */
function baseCoatColor(tone: LiquidGlassTone, intensity: LiquidGlassIntensity): string {
	if (tone === "light") return "#e7e7ea";
	return intensity === "deep" ? "#050507" : "#0a0a10";
}

export interface LiquidGlassBackdropProps {
	/** Light or dark aurora. Default `"dark"`. */
	readonly tone?: LiquidGlassTone;
	/** Field brightness — "deep" (darker) or "bright" (luminous). Default `"bright"`. */
	readonly intensity?: LiquidGlassIntensity;
	/** Optional accent wash (linear 0..1 RGB) lightly mixed into the pools. */
	readonly accent?: readonly [number, number, number];
	/** Drift the field. Defaults to `prefers-reduced-motion` (frozen when reduced). */
	readonly animating?: boolean;
	/**
	 * Both modes render an `absolute inset-0` layer, so mount inside a positioned, full-bleed ancestor.
	 * `false` (default) → a `-z` app-background layer (mount inside the `relative isolate` app shell, behind content).
	 * `true` → wrapped in its own `isolate` stage with content layered above (scoped demos, e.g. a showcase frame).
	 */
	readonly contained?: boolean;
	readonly className?: string;
	/** Content layered above the field (contained mode only). Surfaces here find this field via context. */
	readonly children?: ReactNode;
}

/**
 * LiquidGlassBackdrop — the procedural ambient field every `<LiquidGlassSurface>`
 * refracts. Renders a full-bleed 2D canvas (the monochrome aurora; see
 * `LiquidGlassField`) and publishes it as the field source through context.
 * Mount one per scope: once inside the app shell (`relative isolate`) for the whole
 * app, or inside a relative stage (contained) for a scoped demo.
 */
export function LiquidGlassBackdrop({
	tone = "dark",
	intensity = "bright",
	accent,
	animating,
	contained = false,
	className,
	children,
}: LiquidGlassBackdropProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fieldRef = useRef<LiquidGlassField | null>(null);
	const [source, setSource] = useState<LiquidGlassFieldSource | null>(null);

	// Default to honoring reduced motion when the caller doesn't pin `animating`.
	const drift =
		animating ?? (typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const accentKey = accent ? accent.join(",") : "";

	// Mount once; tone/accent/drift are pushed via the effects below.
	// biome-ignore lint/correctness/useExhaustiveDependencies: field is created once and reconfigured by the effects below.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let field: LiquidGlassField;
		try {
			field = new LiquidGlassField(canvas, { tone, intensity, ...(accent !== undefined ? { accent } : {}) });
		} catch {
			return;
		}
		fieldRef.current = field;
		const observer = new ResizeObserver(entries => {
			const entry = entries[0];
			if (entry) field.resize(entry.contentRect.width, entry.contentRect.height);
		});
		observer.observe(canvas);
		field.resize(canvas.clientWidth, canvas.clientHeight);
		setSource({ canvas, backgroundEl: canvas });
		return () => {
			observer.disconnect();
			field.destroy();
			fieldRef.current = null;
		};
	}, []);

	// accentKey collapses the accent array identity to a primitive dep.
	// biome-ignore lint/correctness/useExhaustiveDependencies: accentKey stands in for the accent array.
	useEffect(() => {
		fieldRef.current?.setOptions({ tone, intensity, ...(accent !== undefined ? { accent } : {}) });
	}, [tone, intensity, accentKey]);

	useEffect(() => {
		const field = fieldRef.current;
		if (!field) return;
		if (drift) field.start();
		else field.stop();
	}, [drift]);

	const value = useMemo<LiquidGlassFieldValue | null>(
		() => (source ? { source, animating: drift } : null),
		[source, drift],
	);

	const canvas = (
		<canvas
			ref={canvasRef}
			aria-hidden
			data-slot="liquid-glass-backdrop"
			style={{ backgroundColor: baseCoatColor(tone, intensity) }}
			className={cn(
				"h-full w-full",
				contained ? "absolute inset-0" : "pointer-events-none absolute inset-0 -z-10",
				className,
			)}
		/>
	);

	if (!contained) {
		return (
			<LiquidGlassFieldContext.Provider value={value}>
				{canvas}
				{children}
			</LiquidGlassFieldContext.Provider>
		);
	}

	return (
		<LiquidGlassFieldContext.Provider value={value}>
			<div data-slot="liquid-glass-stage" className="absolute inset-0 isolate overflow-hidden">
				{canvas}
				{children != null && <div className="relative h-full w-full">{children}</div>}
			</div>
		</LiquidGlassFieldContext.Provider>
	);
}

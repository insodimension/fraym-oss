import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef } from "react";
import { cn } from "../../lib/cn";
import { useLiquidGlassField } from "./context";
import { LiquidGlassRenderer } from "./renderer";
import { type LiquidGlassSettings, type LiquidGlassVariant, resolveLiquidGlassSettings } from "./settings";

// The lens canvas overhangs the content box so the shader's edge rim + soft
// shadow have room to render outside the box bounds.
const SURFACE_PAD = 14;

export interface LiquidGlassSurfaceProps {
	/** Material preset. Default `"frosted"`. */
	readonly variant?: LiquidGlassVariant;
	/** Per-instance physics overrides merged onto the variant. */
	readonly settings?: Partial<LiquidGlassSettings>;
	/** Corner radius (px) of both the content box and the lens. Default 16. */
	readonly radius?: number;
	readonly className?: string;
	readonly style?: CSSProperties;
	readonly children?: ReactNode;
}

/**
 * LiquidGlassSurface — a WebGL refractive lens behind its children. It finds the
 * ambient field from the nearest `<LiquidGlassBackdrop>` (via context) and bends
 * it through a rounded-rect lens (refraction, chromatic aberration, fresnel +
 * specular). With no backdrop ancestor (or no WebGL) it degrades to a plain
 * `relative` box — style it translucent via `className` so the global field still
 * reads through. Each lens is one WebGL context; mount them on a bounded set of
 * surfaces, not in long lists.
 */
export function LiquidGlassSurface({
	variant = "frosted",
	settings,
	radius = 16,
	className,
	style,
	children,
}: LiquidGlassSurfaceProps) {
	const field = useLiquidGlassField();
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<LiquidGlassRenderer | null>(null);

	const settingsKey = settings ? JSON.stringify(settings) : "";
	// biome-ignore lint/correctness/useExhaustiveDependencies: settingsKey stands in for the settings object.
	const merged = useMemo(
		() => resolveLiquidGlassSettings(variant, { radius, ...settings }),
		[variant, radius, settingsKey],
	);

	const source = field?.source ?? null;
	const animating = field?.animating ?? false;

	useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas || !source) return;
		let renderer: LiquidGlassRenderer;
		try {
			renderer = new LiquidGlassRenderer(canvas, source, merged);
		} catch {
			return;
		}
		rendererRef.current = renderer;
		const apply = (w: number, h: number): void => {
			if (!w || !h) return;
			renderer.resize(w + SURFACE_PAD * 2, h + SURFACE_PAD * 2);
			renderer.setSettings({
				...merged,
				lensWidth: Math.max(1, w),
				lensHeight: Math.max(1, h),
				radius: Math.min(merged.radius, h / 2),
			});
			renderer.setGeometry(w / 2 + SURFACE_PAD, h / 2 + SURFACE_PAD, 0, false, 1, 1, 0);
		};
		const observer = new ResizeObserver(entries => {
			const entry = entries[0];
			if (entry) apply(entry.contentRect.width, entry.contentRect.height);
		});
		observer.observe(root);
		apply(root.clientWidth, root.clientHeight);
		return () => {
			observer.disconnect();
			renderer.dispose();
			rendererRef.current = null;
		};
	}, [source, merged]);

	useEffect(() => {
		rendererRef.current?.setAnimating(animating);
	}, [animating]);

	return (
		<div
			ref={rootRef}
			data-slot="liquid-glass-surface"
			className={cn("relative isolate", className)}
			style={{ borderRadius: radius, ...style }}
		>
			{source && (
				<canvas
					ref={canvasRef}
					aria-hidden
					className="pointer-events-none absolute -z-10"
					style={{ top: -SURFACE_PAD, left: -SURFACE_PAD }}
				/>
			)}
			{children}
		</div>
	);
}

import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import type { LiquidGlassSettings, LiquidGlassVariant } from "./settings";
import { LiquidGlassSurface } from "./surface";

export interface LiquidGlassButtonProps extends ComponentProps<"button"> {
	/** Material preset for the lens. Default `"dome"` (a polished pill). */
	readonly variant?: LiquidGlassVariant;
	readonly settings?: Partial<LiquidGlassSettings>;
	/** Corner radius (px). Default 12. */
	readonly radius?: number;
}

/**
 * LiquidGlassButton — a button whose face is a `<LiquidGlassSurface>` lens, so
 * it physically refracts the ambient field behind it. Press depresses with a
 * scale; the lens keeps refracting live. Requires a `<LiquidGlassBackdrop>`
 * ancestor for the glass; without one it falls back to a translucent pill.
 */
export function LiquidGlassButton({
	variant = "dome",
	settings,
	radius = 12,
	className,
	children,
	style,
	...props
}: LiquidGlassButtonProps) {
	return (
		<button
			data-slot="liquid-glass-button"
			className={cn(
				"relative isolate inline-flex items-center justify-center gap-2 overflow-hidden px-4 py-2",
				"border border-fr-border bg-fr-surface/30 text-fr-sm font-semibold text-fr-text",
				"transition-transform duration-100 active:scale-[0.97] focus-visible:outline-none",
				"focus-visible:ring-2 focus-visible:ring-fr-accent-line disabled:pointer-events-none disabled:opacity-40",
				className,
			)}
			style={{ borderRadius: radius, ...style }}
			{...props}
		>
			<LiquidGlassSurface
				variant={variant}
				{...(settings !== undefined ? { settings } : {})}
				radius={radius}
				className="absolute inset-0 -z-10"
			/>
			<span className="relative">{children}</span>
		</button>
	);
}

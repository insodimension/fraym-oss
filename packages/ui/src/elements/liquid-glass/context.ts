import { createContext, useContext } from "react";
import type { LiquidGlassFieldSource } from "./renderer";

/**
 * The ambient field a `<LiquidGlassBackdrop>` exposes to the `<LiquidGlassSurface>`
 * lenses beneath it. `null` until the backdrop's canvas has mounted (surfaces
 * render their plain glass box until then, then upgrade to a WebGL lens).
 */
export interface LiquidGlassFieldValue {
	readonly source: LiquidGlassFieldSource;
	/** Whether the field is drifting — surfaces redraw per-frame only while true (reduced motion freezes it). */
	readonly animating: boolean;
}

export const LiquidGlassFieldContext = createContext<LiquidGlassFieldValue | null>(null);

export function useLiquidGlassField(): LiquidGlassFieldValue | null {
	return useContext(LiquidGlassFieldContext);
}

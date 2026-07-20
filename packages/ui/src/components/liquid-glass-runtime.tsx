import { useEffect, useState } from "react";
import { LiquidGlassBackdrop, type LiquidGlassIntensity } from "../elements";
import { useSettings } from "../settings/use-settings";
import { useTheme } from "../theme/use-theme";

/** Theme-preset ids that turn on the WebGL liquid-glass material, mapped to their field intensity. */
export const LIQUID_GLASS_PRESETS: Record<string, LiquidGlassIntensity> = {
	"liquid-glass": "deep",
	"liquid-glass-lumen": "bright",
};

/** True when the active theme preset is one of the WebGL liquid-glass presets. */
export function useLiquidGlassActive(): boolean {
	return useSettings().config.themePreset in LIQUID_GLASS_PRESETS;
}

function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(
		() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onChange = (): void => setReduced(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);
	return reduced;
}

/**
 * LiquidGlassRuntime — mounts the app-wide WebGL ambient field when a liquid-glass
 * preset is active (Liquid Glass = deep, Liquid Glass Lumen = bright), nothing
 * otherwise. Fraym mounts it inside the `relative isolate` shell (`fraym-frame`),
 * so the field is an `absolute inset-0 -z` layer painted over the shell's
 * translucent bg and behind all content (robust to opaque app backgrounds). Tone
 * follows the resolved light/dark mode; drift follows the motion setting +
 * `prefers-reduced-motion`. Translucent preset surfaces let the field read through
 * the whole app, and `<LiquidGlassSurface>` lenses anywhere below refract it.
 */
export function LiquidGlassRuntime() {
	const { config } = useSettings();
	const { resolvedMode } = useTheme();
	const systemReduced = usePrefersReducedMotion();
	const intensity = LIQUID_GLASS_PRESETS[config.themePreset];
	if (!intensity) return null;
	const reduced = config.motion === "reduced" || (config.motion === "system" && systemReduced);
	return <LiquidGlassBackdrop tone={resolvedMode} intensity={intensity} animating={!reduced} />;
}

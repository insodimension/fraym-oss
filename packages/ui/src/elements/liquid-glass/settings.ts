// Liquid Glass — material settings + variant presets.
//
// Ported from `ogtirth/liquidglass-oss` (MIT). Every field maps 1:1 to a shader
// uniform (see renderer.draw). A "variant" is a tuned point in this space; an
// app passes a variant name and/or a partial override.

export interface LiquidGlassSettings {
	/** Backdrop blur radius applied while refracting (0 = crisp, 1 = heavy frost). */
	readonly blur: number;
	/** Index-of-refraction strength — how far the lens bends the background. */
	readonly refraction: number;
	/** Spectral edge fringing (prism). */
	readonly chromaticAberration: number;
	/** Per-pixel micro-noise jitter on the refracted sample. */
	readonly distortion: number;
	/** Edge catch-light intensity. */
	readonly edgeHighlight: number;
	/** Specular highlight intensity. */
	readonly specular: number;
	/** Fresnel rim intensity. */
	readonly fresnel: number;
	/** Corner radius of the lens, px (clamped to half-height in the renderer). */
	readonly radius: number;
	/** Spherical-cap depth (z-radius) of the lens, px — the "thickness" of the glass. */
	readonly depth: number;
	/** Additive brightness bias on the refracted sample. */
	readonly brightness: number;
	/** Saturation bias on the refracted sample (negative = toward grayscale). */
	readonly saturation: number;
	/** Drop-shadow alpha rendered outside the lens. */
	readonly shadow: number;
	/** Darkening multiplier (smoked glass). */
	readonly darkTint: number;
	/** Strength of the tintColor multiply. */
	readonly tintStrength: number;
	/** Linear RGB multiply applied to the glass body. */
	readonly tintColor: readonly [number, number, number];
	/** Lighten (>0) / darken (<0) the whole surface, -1..1. */
	readonly tint: number;
	/** Material opacity once fully morphed in. */
	readonly opacity: number;
	/** 0 = flat lens, 1 = domed bevel (height biased toward the top). */
	readonly bevel: number;
	/** Resting lens width/height before the element's measured size overrides it. */
	readonly lensWidth: number;
	readonly lensHeight: number;
	/** Drag/press spring tuning (used by interactive surfaces). */
	readonly liquidMotion: number;
	readonly liquidSpring: number;
	readonly liquidDamping: number;
}

export type LiquidGlassVariant = "clear" | "frosted" | "dark" | "prism" | "dome";

const TINT_NEUTRAL: readonly [number, number, number] = [0.92, 0.95, 1.05];

export const liquidGlassPresets: Record<LiquidGlassVariant, LiquidGlassSettings> = {
	clear: {
		blur: 1,
		refraction: 1.2,
		chromaticAberration: 0.012,
		distortion: 0,
		edgeHighlight: 0,
		specular: 0.04,
		fresnel: 0.56,
		radius: 18,
		depth: 14,
		brightness: 0.02,
		saturation: 0,
		shadow: 0,
		darkTint: 0,
		tintStrength: 0.38,
		tintColor: TINT_NEUTRAL,
		tint: 0,
		opacity: 0.88,
		bevel: 1,
		lensWidth: 56,
		lensHeight: 32,
		liquidMotion: 0.24,
		liquidSpring: 0.055,
		liquidDamping: 0.84,
	},
	frosted: {
		blur: 0.52,
		refraction: 0.58,
		chromaticAberration: 0.035,
		distortion: 0.025,
		edgeHighlight: 0.11,
		specular: 0.08,
		fresnel: 0.95,
		radius: 22,
		depth: 36,
		brightness: 0.04,
		saturation: -0.08,
		shadow: 0,
		darkTint: 0.09,
		tintStrength: 0.12,
		tintColor: TINT_NEUTRAL,
		tint: 0,
		opacity: 1,
		bevel: 0,
		lensWidth: 54,
		lensHeight: 34,
		liquidMotion: 0.13,
		liquidSpring: 0.052,
		liquidDamping: 0.85,
	},
	dark: {
		blur: 0.18,
		refraction: 0.72,
		chromaticAberration: 0.045,
		distortion: 0.015,
		edgeHighlight: 0.08,
		specular: 0.14,
		fresnel: 1.08,
		radius: 22,
		depth: 42,
		brightness: -0.03,
		saturation: 0.03,
		shadow: 0,
		darkTint: 0.28,
		tintStrength: 0.06,
		tintColor: TINT_NEUTRAL,
		tint: 0,
		opacity: 1,
		bevel: 0,
		lensWidth: 54,
		lensHeight: 34,
		liquidMotion: 0.14,
		liquidSpring: 0.055,
		liquidDamping: 0.84,
	},
	prism: {
		blur: 0.06,
		refraction: 0.82,
		chromaticAberration: 0.18,
		distortion: 0.035,
		edgeHighlight: 0.13,
		specular: 0.08,
		fresnel: 1.18,
		radius: 22,
		depth: 48,
		brightness: 0.02,
		saturation: 0.1,
		shadow: 0,
		darkTint: 0.12,
		tintStrength: 0.14,
		tintColor: TINT_NEUTRAL,
		tint: 0,
		opacity: 1,
		bevel: 0,
		lensWidth: 58,
		lensHeight: 36,
		liquidMotion: 0.16,
		liquidSpring: 0.06,
		liquidDamping: 0.83,
	},
	dome: {
		blur: 0.08,
		refraction: 0.74,
		chromaticAberration: 0.06,
		distortion: 0.01,
		edgeHighlight: 0.12,
		specular: 0.16,
		fresnel: 1.05,
		radius: 22,
		depth: 56,
		brightness: 0.02,
		saturation: 0.02,
		shadow: 0,
		darkTint: 0.11,
		tintStrength: 0.1,
		tintColor: TINT_NEUTRAL,
		tint: 0,
		opacity: 1,
		bevel: 1,
		lensWidth: 56,
		lensHeight: 38,
		liquidMotion: 0.13,
		liquidSpring: 0.05,
		liquidDamping: 0.86,
	},
};

export const defaultLiquidGlassVariant: LiquidGlassVariant = "frosted";

/** Merge a variant preset with optional overrides into a concrete settings object. */
export function resolveLiquidGlassSettings(
	variant: LiquidGlassVariant = defaultLiquidGlassVariant,
	overrides?: Partial<LiquidGlassSettings>,
): LiquidGlassSettings {
	return { ...liquidGlassPresets[variant], ...overrides };
}

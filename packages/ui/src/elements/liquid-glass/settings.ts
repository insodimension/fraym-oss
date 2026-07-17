export interface LiquidGlassSettings {
  readonly blur: number; readonly refraction: number; readonly chromaticAberration: number;
  readonly distortion: number; readonly edgeHighlight: number; readonly specular: number;
  readonly fresnel: number; readonly radius: number; readonly depth: number;
  readonly brightness: number; readonly saturation: number; readonly shadow: number;
  readonly darkTint: number; readonly tintStrength: number; readonly tintColor: readonly [number, number, number];
  readonly tint: number; readonly opacity: number; readonly bevel: number;
  readonly lensWidth: number; readonly lensHeight: number; readonly liquidMotion: number;
  readonly liquidSpring: number; readonly liquidDamping: number;
}

export type LiquidGlassVariant = "clear" | "frosted" | "dark" | "prism" | "dome";
const neutral = [0.92, 0.95, 1.05] as const;
const common = { shadow: 0, tintColor: neutral, tint: 0 } as const;

export const liquidGlassPresets: Record<LiquidGlassVariant, LiquidGlassSettings> = {
  clear: { ...common, blur: 1, refraction: 1.2, chromaticAberration: .012, distortion: 0, edgeHighlight: 0, specular: .04, fresnel: .56, radius: 18, depth: 14, brightness: .02, saturation: 0, darkTint: 0, tintStrength: .38, opacity: .88, bevel: 1, lensWidth: 56, lensHeight: 32, liquidMotion: .24, liquidSpring: .055, liquidDamping: .84 },
  frosted: { ...common, blur: .52, refraction: .58, chromaticAberration: .035, distortion: .025, edgeHighlight: .11, specular: .08, fresnel: .95, radius: 22, depth: 36, brightness: .04, saturation: -.08, darkTint: .09, tintStrength: .12, opacity: 1, bevel: 0, lensWidth: 54, lensHeight: 34, liquidMotion: .13, liquidSpring: .052, liquidDamping: .85 },
  dark: { ...common, blur: .18, refraction: .72, chromaticAberration: .045, distortion: .015, edgeHighlight: .08, specular: .14, fresnel: 1.08, radius: 22, depth: 42, brightness: -.03, saturation: .03, darkTint: .28, tintStrength: .06, opacity: 1, bevel: 0, lensWidth: 54, lensHeight: 34, liquidMotion: .14, liquidSpring: .055, liquidDamping: .84 },
  prism: { ...common, blur: .06, refraction: .82, chromaticAberration: .18, distortion: .035, edgeHighlight: .13, specular: .08, fresnel: 1.18, radius: 22, depth: 48, brightness: .02, saturation: .1, darkTint: .12, tintStrength: .14, opacity: 1, bevel: 0, lensWidth: 58, lensHeight: 36, liquidMotion: .16, liquidSpring: .06, liquidDamping: .83 },
  dome: { ...common, blur: .08, refraction: .74, chromaticAberration: .06, distortion: .01, edgeHighlight: .12, specular: .16, fresnel: 1.05, radius: 22, depth: 56, brightness: .02, saturation: .02, darkTint: .11, tintStrength: .1, opacity: 1, bevel: 1, lensWidth: 56, lensHeight: 38, liquidMotion: .13, liquidSpring: .05, liquidDamping: .86 },
};

export const defaultLiquidGlassVariant: LiquidGlassVariant = "frosted";
export function resolveLiquidGlassSettings(variant: LiquidGlassVariant = defaultLiquidGlassVariant, overrides?: Partial<LiquidGlassSettings>): LiquidGlassSettings {
  return { ...liquidGlassPresets[variant], ...overrides };
}

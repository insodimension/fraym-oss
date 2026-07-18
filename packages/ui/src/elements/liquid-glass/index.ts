// Liquid Glass — WebGL refractive material primitives.
//
// A `<LiquidGlassBackdrop>` paints a procedural ambient field (and publishes it
// via context); `<LiquidGlassSurface>` / `<LiquidGlassButton>` mount WebGL
// lenses that refract that field. Ported from `ogtirth/liquidglass-oss` (MIT).
// The settings-aware app runtime lives in `components/liquid-glass-runtime`.
//
// ── Third-party notice (license compliance) ──────────────────────────────────
// The WebGL physics/lighting model (shaders.ts, renderer.ts, settings.ts) is
// ported from ogtirth/liquidglass-oss (https://gitlab.com/ogtirth/liquidglass-oss),
// which adapts ybouane/liquidglass. Both MIT:
//   Copyright (c) 2026 Liquid Glass OSS contributors
//   Copyright (c) the ybouane/liquidglass contributors
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, subject to including the above copyright
// notice and this permission notice in all copies or substantial portions. THE
// SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. (Full MIT text:
// the upstream repositories' LICENSE files.)

export { LiquidGlassBackdrop, type LiquidGlassBackdropProps } from "./backdrop";
export { LiquidGlassButton, type LiquidGlassButtonProps } from "./button";
export { LiquidGlassFieldContext, type LiquidGlassFieldValue, useLiquidGlassField } from "./context";
export type { LiquidGlassFieldOptions, LiquidGlassIntensity, LiquidGlassTone } from "./field";
export { type LiquidGlassFieldSource, LiquidGlassRenderer } from "./renderer";
export {
	defaultLiquidGlassVariant,
	type LiquidGlassSettings,
	type LiquidGlassVariant,
	liquidGlassPresets,
	resolveLiquidGlassSettings,
} from "./settings";
export { LiquidGlassSurface, type LiquidGlassSurfaceProps } from "./surface";

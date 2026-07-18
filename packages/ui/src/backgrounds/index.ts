/**
 * Backgrounds — Fraym-native shader/atmosphere layers, ported from studied
 * references (react-bits, MIT) onto ONE shared host. Every layer:
 * - rides {@link ShaderBackground} (raw WebGL, zero dependencies): pauses
 *   off-screen and on hidden tabs, renders a still frame under reduced
 *   motion, DPR-capped with an optional renderScale downsample, ~30fps;
 * - is theme-native: colors default to `--fr-*` tokens, accept any CSS color
 *   (resolved in-tree, retinted on theme/accent swaps), and paint ADDITIVE
 *   LIGHT over a transparent canvas so the caller keeps `bg-fr-bg` and the
 *   effect reads on light and dark alike;
 * - mounts absolutely inside a caller-supplied `relative overflow-hidden`
 *   ancestor.
 */

export * from "./aurora-background";
export * from "./dither-background";
export * from "./floating-lines-background";
export * from "./galaxy-background";
export * from "./iridescence-background";
export * from "./light-pillar-background";
export * from "./light-rays-background";
export * from "./lightning-background";
export * from "./liquid-chrome-background";
export * from "./orb-background";
export * from "./particles-background";
export * from "./plasma-background";
export * from "./prism-background";
export * from "./ripple-grid-background";
export * from "./shader-background";
export * from "./side-rays-background";
export * from "./silk-background";
export * from "./soft-aurora-background";
export * from "./threads-background";

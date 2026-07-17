import catalog from "./catalog.json";
import type { ThemePreset, ThemeVariant } from "./types";

export type { ThemePreset, ThemeVariant } from "./types";
export { THEME_VAR_MAP, THEME_VAR_NAMES } from "./types";
export const DEFAULT_THEME_ID = "fraym";
export const THEME_PRESETS: readonly ThemePreset[] =
  catalog as readonly ThemePreset[];
export function findThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}
export function themeVariantFor(
  preset: ThemePreset,
  mode: "dark" | "light",
): ThemeVariant {
  return preset[mode];
}

export {
  ACCENT_PALETTES,
  MOTION_PREFS,
  THEME_MODES,
  type AccentPalette,
  type MotionPref,
  type ThemeMode,
} from "@fraym/config";

import type { AccentPalette, MotionPref, ThemeMode } from "@fraym/config";

export interface AccentDef {
  readonly name: string;
  readonly value: string;
  readonly value2: string;
  readonly ink: string;
}
export interface ThemeConfig {
  readonly mode: ThemeMode;
  readonly accent: AccentPalette;
  readonly motion: MotionPref;
}

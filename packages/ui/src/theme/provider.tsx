import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { accents } from "./palettes";
import {
  DEFAULT_THEME_ID,
  findThemePreset,
  THEME_VAR_MAP,
  themeVariantFor,
} from "./theme-presets";
import type {
  AccentPalette,
  MotionPref,
  ThemeConfig,
  ThemeMode,
} from "./tokens";

export interface ThemeContextValue extends ThemeConfig {
  readonly resolvedMode: "dark" | "light";
  readonly preset: string;
  readonly setMode: (mode: ThemeMode) => void;
  readonly setAccent: (accent: AccentPalette) => void;
  readonly setMotion: (motion: MotionPref) => void;
  readonly setPreset: (preset: string) => void;
}
export interface ThemeProviderProps {
  readonly defaultMode?: ThemeMode;
  readonly defaultAccent?: AccentPalette;
  readonly defaultMotion?: MotionPref;
  readonly defaultPreset?: string;
  readonly children: ReactNode;
}
export const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemMode(): "dark" | "light" {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeProvider({
  defaultMode = "system",
  defaultAccent = "theme",
  defaultMotion = "system",
  defaultPreset = DEFAULT_THEME_ID,
  children,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [accent, setAccent] = useState<AccentPalette>(defaultAccent);
  const [motion, setMotion] = useState<MotionPref>(defaultMotion);
  const [preset, setPreset] = useState(defaultPreset);
  const [system, setSystem] = useState(systemMode);
  const resolvedMode = mode === "system" ? system : mode;
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => setSystem(query.matches ? "light" : "dark");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const selected = findThemePreset(preset);
    root.dataset.fraymTheme = resolvedMode;
    root.dataset.theme = resolvedMode;
    root.dataset.themePreset = preset;
    root.dataset.fraymAccent = accent;
    root.dataset.accent = accent;
    root.dataset.motion = motion;
    if (selected) {
      const variant = themeVariantFor(selected, resolvedMode);
      for (const key of Object.keys(
        THEME_VAR_MAP,
      ) as (keyof typeof THEME_VAR_MAP)[]) {
        if (selected.inheritAccent && key.startsWith("accent")) continue;
        root.style.setProperty(THEME_VAR_MAP[key], variant[key]);
      }
      root.style.setProperty("--fr-font-primary", selected.font.primary);
      root.style.setProperty("--fr-font-mono", selected.font.mono);
    }
    if (accent !== "theme") {
      const swatch = accents[accent]!;
      root.style.setProperty("--fr-accent", swatch.value);
      root.style.setProperty("--fr-accent-2", swatch.value2);
      root.style.setProperty("--fr-accent-ink", swatch.ink);
      root.style.setProperty(
        "--fr-accent-dim",
        `color-mix(in srgb, ${swatch.value} 14%, transparent)`,
      );
      root.style.setProperty(
        "--fr-accent-line",
        `color-mix(in srgb, ${swatch.value} 34%, transparent)`,
      );
    }
    return () => {
      for (const name of Object.values(THEME_VAR_MAP))
        root.style.removeProperty(name);
      root.style.removeProperty("--fr-font-primary");
      root.style.removeProperty("--fr-font-mono");
      delete root.dataset.fraymTheme;
      delete root.dataset.theme;
      delete root.dataset.themePreset;
      delete root.dataset.fraymAccent;
      delete root.dataset.accent;
      delete root.dataset.motion;
    };
  }, [accent, motion, preset, resolvedMode]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      accent,
      motion,
      preset,
      resolvedMode,
      setMode,
      setAccent,
      setMotion,
      setPreset,
    }),
    [mode, accent, motion, preset, resolvedMode],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

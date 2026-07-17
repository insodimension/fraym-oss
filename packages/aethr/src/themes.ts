export type ThemeName =
  | "amber"
  | "cosmic"
  | "azure"
  | "emerald"
  | "crimson"
  | "twilight"
  | "sunset"
  | "oceanic"
  | "celestial"
  | "abyss";
export interface AethrTheme {
  readonly name: string;
  readonly baseColor: readonly [number, number, number];
  readonly accentColor: readonly [number, number, number];
  readonly edgeColor: readonly [number, number, number];
  readonly glowColor: readonly [number, number, number];
  readonly tintColor: readonly [number, number, number];
  readonly tintStrength: number;
}
const theme = (
  name: string,
  baseColor: readonly [number, number, number],
  accentColor: readonly [number, number, number],
  edgeColor: readonly [number, number, number],
  glowColor: readonly [number, number, number],
  tintColor: readonly [number, number, number],
  tintStrength: number,
): AethrTheme => ({
  name,
  baseColor,
  accentColor,
  edgeColor,
  glowColor,
  tintColor,
  tintStrength,
});
export const THEMES: Record<ThemeName, AethrTheme> = {
  amber: theme(
    "Amber Glow",
    [1, 0.8, 0.3],
    [0.9, 0.6, 0.1],
    [0.6, 0.3, 0],
    [1, 0.7, 0.2],
    [43, 0, 25],
    0,
  ),
  cosmic: theme(
    "Cosmic Purple",
    [0.7, 0.5, 1],
    [0.8, 0.3, 0.8],
    [0.3, 0.1, 0.6],
    [0.6, 0.2, 1],
    [43, 0, 25],
    0.36,
  ),
  azure: theme(
    "Azure Nebula",
    [0.4, 0.7, 1],
    [0.2, 0.5, 0.9],
    [0, 0.2, 0.5],
    [0.5, 0.8, 1],
    [0, 30, 60],
    0.4,
  ),
  emerald: theme(
    "Emerald Dust",
    [0.3, 0.8, 0.5],
    [0.1, 0.6, 0.4],
    [0, 0.4, 0.2],
    [0.4, 1, 0.6],
    [0, 50, 30],
    0.35,
  ),
  crimson: theme(
    "Crimson Nova",
    [1, 0.4, 0.4],
    [0.9, 0.2, 0.2],
    [0.5, 0.1, 0.1],
    [1, 0.3, 0.3],
    [60, 0, 10],
    0.45,
  ),
  twilight: theme(
    "Twilight Gradient",
    [0.6, 0.4, 0.8],
    [0.3, 0.5, 0.9],
    [0.1, 0, 0.3],
    [0.8, 0.6, 1],
    [20, 10, 40],
    0.38,
  ),
  sunset: theme(
    "Sunset Gradient",
    [1, 0.6, 0.4],
    [0.9, 0.4, 0.3],
    [0.5, 0.2, 0],
    [1, 0.8, 0.5],
    [43, 0, 25],
    0,
  ),
  oceanic: theme(
    "Oceanic Gradient",
    [0.3, 0.7, 0.8],
    [0.1, 0.5, 0.7],
    [0, 0.3, 0.5],
    [0.5, 0.9, 1],
    [0, 40, 50],
    0.37,
  ),
  celestial: theme(
    "Celestial Light",
    [0.95, 0.95, 1],
    [0.9, 0.9, 1],
    [0.8, 0.8, 0.9],
    [1, 1, 1],
    [240, 240, 255],
    0.2,
  ),
  abyss: theme(
    "Abyssal Depths",
    [0.25, 0.28, 0.35],
    [0.15, 0.18, 0.25],
    [0.08, 0.1, 0.15],
    [0.4, 0.45, 0.6],
    [20, 22, 30],
    0.3,
  ),
};

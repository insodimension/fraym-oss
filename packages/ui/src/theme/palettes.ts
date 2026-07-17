import type { AccentDef, AccentPalette } from "./tokens";

export const accents: Readonly<
  Record<Exclude<AccentPalette, "theme">, AccentDef>
> = {
  violet: {
    name: "Violet",
    value: "#b78cff",
    value2: "#a679ff",
    ink: "#1a1023",
  },
  coral: { name: "Coral", value: "#d97757", value2: "#cc6a4a", ink: "#1f1009" },
  blue: { name: "Blue", value: "#5b8cff", value2: "#4a7df0", ink: "#0a0f1f" },
  green: { name: "Green", value: "#5bb98c", value2: "#4aab7d", ink: "#08160f" },
  amber: { name: "Amber", value: "#e0b15b", value2: "#d4a449", ink: "#1f1707" },
  mono: { name: "Mono", value: "#c9c9d1", value2: "#b4b4bd", ink: "#101013" },
};

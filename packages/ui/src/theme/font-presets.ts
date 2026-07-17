export interface FontPreset {
  readonly id: string;
  readonly label: string;
  readonly note: string;
  readonly primary: string;
  readonly mono: string;
}

export const FONT_PRESETS = [
  {
    id: "plex",
    label: "IBM Plex Sans",
    note: "Fraym default",
    primary: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "inter",
    label: "Inter",
    note: "Neutral sans",
    primary: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  {
    id: "codex",
    label: "Codex (OpenAI)",
    note: "OpenAI Sans free substitute",
    primary: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  {
    id: "geist",
    label: "Geist",
    note: "Vercel / OFL",
    primary: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"Geist Mono", ui-monospace, monospace',
  },
  {
    id: "newsreader",
    label: "Newsreader",
    note: "Serif display pairing",
    primary: '"Newsreader", Georgia, "Times New Roman", serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  {
    id: "system",
    label: "System UI",
    note: "Native OS stack",
    primary:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
] as const satisfies readonly FontPreset[];

export type FontPresetId = (typeof FONT_PRESETS)[number]["id"];
export const DEFAULT_FONT_PRESET: FontPreset = FONT_PRESETS[0];
export function findFontPreset(id: string): FontPreset | undefined {
  return FONT_PRESETS.find((preset) => preset.id === id);
}
export function fontFamilyLabel(stack: string): string {
  return (stack.split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "");
}
export function selectedFontPresetId(config: {
  readonly fontPreset?: string;
  readonly uiFont?: string;
  readonly codeFont?: string;
}): string {
  if (config.fontPreset && findFontPreset(config.fontPreset))
    return config.fontPreset;
  if (!config.uiFont && !config.codeFont) return DEFAULT_FONT_PRESET.id;
  return (
    FONT_PRESETS.find(
      (preset) =>
        preset.primary === config.uiFont && preset.mono === config.codeFont,
    )?.id ?? "custom"
  );
}

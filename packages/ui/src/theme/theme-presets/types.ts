export interface ThemeVariant {
  readonly bg: string;
  readonly rail: string;
  readonly surface: string;
  readonly surface2: string;
  readonly surface3: string;
  readonly border: string;
  readonly borderSoft: string;
  readonly text: string;
  readonly text2: string;
  readonly text3: string;
  readonly accent: string;
  readonly accent2: string;
  readonly accentDim: string;
  readonly accentLine: string;
  readonly accentInk: string;
  readonly add: string;
  readonly addBg: string;
  readonly del: string;
  readonly delBg: string;
  readonly warn: string;
  readonly blue: string;
  readonly iris: string;
  readonly scrollbarThumb: string;
  readonly scrollbarThumbHover: string;
  readonly diffBg: string;
  readonly diffAddCode: string;
  readonly diffDelCode: string;
  readonly diffGutter: string;
  readonly codeKw: string;
  readonly codeStr: string;
  readonly codePath: string;
  readonly inlineCode: string;
  readonly providerLogoFilter: string;
}
export interface ThemePreset {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly font: { readonly primary: string; readonly mono: string };
  readonly inheritAccent?: boolean;
  readonly dark: ThemeVariant;
  readonly light: ThemeVariant;
}
export const THEME_VAR_MAP: Readonly<Record<keyof ThemeVariant, string>> = {
  bg: "--fr-bg",
  rail: "--fr-rail",
  surface: "--fr-surface",
  surface2: "--fr-surface-2",
  surface3: "--fr-surface-3",
  border: "--fr-border",
  borderSoft: "--fr-border-soft",
  text: "--fr-text",
  text2: "--fr-text-2-base",
  text3: "--fr-text-3-base",
  accent: "--fr-accent",
  accent2: "--fr-accent-2",
  accentDim: "--fr-accent-dim",
  accentLine: "--fr-accent-line",
  accentInk: "--fr-accent-ink",
  add: "--fr-add",
  addBg: "--fr-add-bg",
  del: "--fr-del",
  delBg: "--fr-del-bg",
  warn: "--fr-warn",
  blue: "--fr-blue",
  iris: "--fr-iris",
  scrollbarThumb: "--fr-scrollbar-thumb",
  scrollbarThumbHover: "--fr-scrollbar-thumb-hover",
  diffBg: "--fr-diff-bg",
  diffAddCode: "--fr-diff-add-code",
  diffDelCode: "--fr-diff-del-code",
  diffGutter: "--fr-diff-gutter",
  codeKw: "--fr-code-kw",
  codeStr: "--fr-code-str",
  codePath: "--fr-code-path",
  inlineCode: "--fr-inline-code",
  providerLogoFilter: "--fr-provider-monochrome-logo-filter",
};
export const THEME_VAR_NAMES = Object.values(THEME_VAR_MAP);

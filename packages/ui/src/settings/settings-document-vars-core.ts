import type { AccentPalette, FraymUiConfig, MdBoldColor, ThemeMode } from "@fraym-ai/config";
import { findFontPreset } from "../theme/font-presets";
import {
	DEFAULT_THEME_ID,
	findThemePreset,
	THEME_VAR_MAP,
	THEME_VAR_NAMES,
	type ThemePreset,
	type ThemeVariant,
	themeVariantFor,
} from "../theme/theme-presets";

export function applySettingsVarsToRoot(root: HTMLElement, config: FraymUiConfig): void {
	const resolvedMode = resolveEffectiveThemeMode(config.themeMode);
	const themePreset = resolveThemePreset(config);
	applyBaseSettingsVars(root, config, resolvedMode);
	applyFontSettingsVars(root, config, themePreset);
	applyMarkdownSettingsVars(root, config);
	applyThemePresetVars(root, themePreset, resolvedMode, config.accent);
}

function resolveEffectiveThemeMode(mode: ThemeMode): "dark" | "light" {
	if (mode !== "system") return mode;
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyBaseSettingsVars(root: HTMLElement, config: FraymUiConfig, resolvedMode: "dark" | "light"): void {
	root.setAttribute("data-theme", resolvedMode);
	root.setAttribute("data-accent", config.accent);
	root.setAttribute("data-accent-style", config.accentStyle);
	root.setAttribute("data-fr-motion", config.motion);
	root.setAttribute("data-fr-density", config.density);
	root.setAttribute("data-text-overflow", config.textOverflow);
	root.style.setProperty("--fr-ui-size", `${config.uiFontSize}px`);
	root.style.setProperty("--fr-code-size", `${config.codeFontSize}px`);
	root.style.setProperty("--fr-contrast", String(config.contrast));
}

function applyFontSettingsVars(root: HTMLElement, config: FraymUiConfig, themePreset: ThemePreset | undefined): void {
	const fontPreset = config.fontPreset ? findFontPreset(config.fontPreset) : undefined;
	applyFontVar(
		root,
		"--fr-font-primary",
		config.uiFont,
		fontPreset?.primary ?? themePreset?.font.primary,
		"system-ui, sans-serif",
	);
	applyFontVar(
		root,
		"--fr-font-mono",
		config.codeFont,
		fontPreset?.mono ?? themePreset?.font.mono,
		"ui-monospace, monospace",
	);
}

function applyMarkdownSettingsVars(root: HTMLElement, config: FraymUiConfig): void {
	root.style.setProperty("--fr-md-bold-weight", String(config.mdBoldWeight));
	const mdBoldColor = resolveMdBoldColor(config.mdBoldColor);
	if (mdBoldColor) root.style.setProperty("--fr-md-bold-color", mdBoldColor);
	else root.style.removeProperty("--fr-md-bold-color");
}

function resolveThemePreset(config: FraymUiConfig): ThemePreset | undefined {
	return config.themePreset && config.themePreset !== DEFAULT_THEME_ID
		? findThemePreset(config.themePreset)
		: undefined;
}

const ACCENT_VAR_KEYS: ReadonlySet<keyof ThemeVariant> = new Set([
	"accent",
	"accent2",
	"accentDim",
	"accentLine",
	"accentInk",
]);

function applyThemePresetVars(
	root: HTMLElement,
	preset: ThemePreset | undefined,
	mode: "dark" | "light",
	accent: AccentPalette,
): void {
	if (!preset) {
		for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);
		root.removeAttribute("data-theme-preset");
		return;
	}
	// The accent vars stay live (driven by the [data-accent] rules in theme.css)
	// whenever the user picked an explicit hue (accent !== "theme"), or the preset
	// opts to inherit. Only "theme" follow-mode on an accent-owning preset pins the
	// preset's signature accent inline.
	const keepAccentLive = accent !== "theme" || Boolean(preset.inheritAccent);
	const variant = themeVariantFor(preset, mode);
	for (const key of Object.keys(THEME_VAR_MAP) as (keyof ThemeVariant)[]) {
		if (keepAccentLive && ACCENT_VAR_KEYS.has(key)) {
			root.style.removeProperty(THEME_VAR_MAP[key]);
			continue;
		}
		root.style.setProperty(THEME_VAR_MAP[key], variant[key]);
	}
	root.setAttribute("data-theme-preset", preset.id);
}

function applyFontVar(
	root: HTMLElement,
	name: string,
	custom: string,
	presetStack: string | undefined,
	fallback: string,
): void {
	const stack = resolveFontStack(custom, presetStack, fallback);
	if (stack) root.style.setProperty(name, stack);
	else root.style.removeProperty(name);
}

function resolveFontStack(custom: string, presetStack: string | undefined, fallback: string): string | null {
	const value = custom.trim();
	if (value) return isFontStack(value) ? value : `"${value}", ${fallback}`;
	return presetStack ?? null;
}

function isFontStack(value: string): boolean {
	return value.includes(",") || value.includes('"');
}

function resolveMdBoldColor(id: MdBoldColor): string | null {
	if (id === "soft") return "var(--fr-text-2)";
	if (id === "accent") return "var(--fr-accent)";
	return null;
}

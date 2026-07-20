import type { FraymUiConfig } from "@fraym/config";
import { applySettingsVarsToRoot } from "./settings-document-vars";

export function applySettingsToDocument(config: FraymUiConfig): void {
	if (typeof document === "undefined") return;
	applySettingsVarsToRoot(document.documentElement, config);
}

export function subscribeToSystemThemeChanges(config: FraymUiConfig): (() => void) | undefined {
	if (typeof window === "undefined") return undefined;
	const mq = window.matchMedia("(prefers-color-scheme: light)");
	const handler = () => applySettingsToDocument(config);
	mq.addEventListener("change", handler);
	return () => mq.removeEventListener("change", handler);
}

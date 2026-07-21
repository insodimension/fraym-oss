import { DEFAULT_FRAYM_UI_CONFIG } from "@fraym-ai/config";
import { use } from "react";
import { SettingsContext, type SettingsContextValue } from "./settings-provider";

const NOOP = () => {};

// Resilient fallback so presentational components stay embeddable/testable without
// a provider: they read defaults, and mutations are no-ops rather than throwing.
const FALLBACK: SettingsContextValue = {
	config: DEFAULT_FRAYM_UI_CONFIG,
	update: NOOP,
	patch: NOOP,
	reset: NOOP,
};

export function useSettings(): SettingsContextValue {
	return use(SettingsContext) ?? FALLBACK;
}

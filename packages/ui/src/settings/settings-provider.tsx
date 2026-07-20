import { type FraymUiConfig, resolveFraymUiConfig } from "@fraym/config";
import type { FraymConfigDriver, WorkspaceRef } from "@fraym/driver";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadDriverSettings, resetDriverUserSettings, writeDriverSetting } from "./settings-driver-state";
import { applySettingsToDocument, subscribeToSystemThemeChanges } from "./settings-environment";

/**
 * The single Fraym-UI settings store. Owns the resolved `FraymUiConfig`, persists
 * it through the host config driver, and applies the document-root attributes/CSS variables the
 * theme/density CSS keys off. `ThemeProvider` and `useToolDisplaySettings` are now
 * thin selectors over this store — there is exactly one source of truth.
 */
export interface SettingsContextValue {
	readonly config: FraymUiConfig;
	/** Update one key. */
	readonly update: <K extends keyof FraymUiConfig>(key: K, value: FraymUiConfig[K]) => void;
	/** Merge several keys at once. */
	readonly patch: (partial: Partial<FraymUiConfig>) => void;
	/** Reset to the seeded defaults. */
	readonly reset: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export interface SettingsProviderProps {
	/** Shell-seeded starting values (e.g. `<Fraym defaultToolOpen>`); merged over defaults. */
	readonly defaults?: Partial<FraymUiConfig>;
	/**
	 * Host-provided persistence: writes to `~/.fraym/config.json` (user) +
	 * `<workspace>/.fraym/config.json` (project) via the engine/host, merged
	 * project-over-user. This is the only persistence path; without a driver
	 * (embeddable kit / showcase) settings live in memory for the session only.
	 */
	readonly driver?: FraymConfigDriver | null;
	readonly workspace?: WorkspaceRef | null;
	readonly children: React.ReactNode;
}

export function SettingsProvider({ defaults, driver = null, workspace = null, children }: SettingsProviderProps) {
	const baseDefaults = useMemo(() => resolveFraymUiConfig(defaults), [defaults]);
	// The driver file is the source of truth (loaded async below); without a driver
	// settings stay at the seeded defaults in memory for the session.
	const [config, setConfig] = useState<FraymUiConfig>(baseDefaults);
	// Set once the user changes anything, so a slow initial driver.load() can't clobber an
	// edit the user already made (and already wrote through) while it was in flight.
	const userEditedRef = useRef(false);

	// Driver-backed: load the merged user+project config and adopt it as the truth.
	useEffect(() => {
		if (!driver || !workspace) return;
		let cancelled = false;
		void loadDriverSettings(driver, workspace)
			.then(loadedConfig => {
				if (!cancelled && !userEditedRef.current) setConfig(loadedConfig);
			})
			.catch(() => {
				/* host persistence is best-effort; fall back to defaults already in state */
			});
		return () => {
			cancelled = true;
		};
	}, [driver, workspace]);

	useEffect(() => {
		applySettingsToDocument(config);
	}, [config]);

	// Re-resolve when following the OS theme and the OS preference flips.
	useEffect(() => {
		if (config.themeMode !== "system") return;
		return subscribeToSystemThemeChanges(config);
	}, [config]);

	const update = useCallback(
		<K extends keyof FraymUiConfig>(key: K, value: FraymUiConfig[K]) => {
			// Skip no-op writes (e.g. re-clicking the already-selected Segmented option) so we don't
			// churn a new config object, re-apply the document CSS vars, and persist an unchanged value.
			if (config[key] === value) return;
			setConfig(prev => ({ ...prev, [key]: value }));
			userEditedRef.current = true;
			// Default writes go to the user scope (~/.fraym/config.json).
			writeDriverSetting(driver, workspace, key as string, value);
		},
		[config, driver, workspace],
	);
	const patch = useCallback(
		(partial: Partial<FraymUiConfig>) => {
			setConfig(prev => ({ ...prev, ...partial }));
			userEditedRef.current = true;
			for (const [key, value] of Object.entries(partial)) writeDriverSetting(driver, workspace, key, value);
		},
		[driver, workspace],
	);
	const reset = useCallback(() => {
		userEditedRef.current = true;
		setConfig(baseDefaults);
		if (!driver || !workspace) return;
		// Clear every user-scope override, then adopt the re-merged snapshot so the UI lands on
		// defaults + any project-scope (<ws>/.fraym/config.json) overrides — not bare defaults.
		void resetDriverUserSettings(driver, workspace, baseDefaults).then(nextConfig => {
			if (nextConfig) setConfig(nextConfig);
		});
	}, [driver, workspace, baseDefaults]);

	const value = useMemo<SettingsContextValue>(
		() => ({ config, update, patch, reset }),
		[config, update, patch, reset],
	);

	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

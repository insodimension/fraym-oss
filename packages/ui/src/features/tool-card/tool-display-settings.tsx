import { createContext, type ReactNode, useContext, useMemo } from "react";
import { DEFAULT_TOOL_DISPLAY_SETTINGS, type ToolDisplaySettings } from "./tool-display-settings-model";
export * from "./tool-display-settings-model";

const Context = createContext<Required<ToolDisplaySettings>>(DEFAULT_TOOL_DISPLAY_SETTINGS);
export interface ToolDisplaySettingsProviderProps { readonly settings?: ToolDisplaySettings; readonly children: ReactNode }
export function ToolDisplaySettingsProvider({ settings, children }: ToolDisplaySettingsProviderProps) { const value = useMemo(() => ({ ...DEFAULT_TOOL_DISPLAY_SETTINGS, ...settings }), [settings]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useToolDisplaySettings() { return useContext(Context); }

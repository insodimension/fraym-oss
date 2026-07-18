import { createContext, use, useMemo } from "react";
import { DEFAULT_TOOL_DISPLAY_SETTINGS, type ToolDisplaySettings } from "./tool-display-settings-model";

export {
	DEFAULT_TOOL_DISPLAY_SETTINGS,
	isToolDefaultOpen,
	resolveToolDefaultOpen,
	type ThreadCollapseMode,
	type ToolDefaultOpen,
	type ToolDisplaySettings,
} from "./tool-display-settings-model";

const ToolDisplaySettingsContext = createContext<ToolDisplaySettings | null>(null);

export interface ToolDisplaySettingsProviderProps {
	readonly settings?: ToolDisplaySettings;
	readonly children: React.ReactNode;
}

export function ToolDisplaySettingsProvider({ settings, children }: ToolDisplaySettingsProviderProps) {
	const parent = use(ToolDisplaySettingsContext);
	const value = useMemo<ToolDisplaySettings>(
		() => ({
			...DEFAULT_TOOL_DISPLAY_SETTINGS,
			...(parent ?? {}),
			...(settings ?? {}),
		}),
		[parent, settings],
	);

	return <ToolDisplaySettingsContext.Provider value={value}>{children}</ToolDisplaySettingsContext.Provider>;
}

export function useToolDisplaySettings(): Required<ToolDisplaySettings> {
	return (use(ToolDisplaySettingsContext) ?? DEFAULT_TOOL_DISPLAY_SETTINGS) as Required<ToolDisplaySettings>;
}

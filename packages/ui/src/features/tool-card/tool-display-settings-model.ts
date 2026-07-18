export type ToolDefaultOpen = "none" | "failed" | "running" | "all";
export type ThreadCollapseMode = "simple" | "worked";
export interface ToolDisplaySettings { readonly defaultOpen?: ToolDefaultOpen; readonly collapseMode?: ThreadCollapseMode; readonly groupReads?: boolean; readonly groupTools?: boolean; readonly density?: import("../surface-kit").FraymDensity; readonly groupConsecutiveTools?: boolean; readonly groupThreshold?: number }
export const DEFAULT_TOOL_DISPLAY_SETTINGS = Object.freeze({ defaultOpen: "running", collapseMode: "worked", groupReads: true, groupTools: true, density: "comfortable", groupConsecutiveTools: false, groupThreshold: 2 } satisfies Required<ToolDisplaySettings>);
export function isToolDefaultOpen(value: string | null | undefined): value is ToolDefaultOpen { return value === "none" || value === "failed" || value === "running" || value === "all"; }
export function resolveToolDefaultOpen(status: string, setting: ToolDefaultOpen = "running"): boolean { return setting === "all" || (setting === "failed" && status === "failed") || (setting === "running" && (status === "pending" || status === "running" || status === "failed")); }

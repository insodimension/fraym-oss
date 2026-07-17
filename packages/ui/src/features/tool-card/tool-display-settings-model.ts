export type ToolDefaultOpen = "none" | "failed" | "running" | "all";
export type ThreadCollapseMode = "simple" | "worked";
export interface ToolDisplaySettings { readonly defaultOpen?: ToolDefaultOpen; readonly collapseMode?: ThreadCollapseMode; readonly groupReads?: boolean; readonly groupTools?: boolean }
export const DEFAULT_TOOL_DISPLAY_SETTINGS: Required<ToolDisplaySettings> = Object.freeze({ defaultOpen: "running", collapseMode: "worked", groupReads: true, groupTools: true });
export function isToolDefaultOpen(value: string | null | undefined): value is ToolDefaultOpen { return value === "none" || value === "failed" || value === "running" || value === "all"; }
export function resolveToolDefaultOpen(status: string, setting: ToolDefaultOpen = "running"): boolean { return setting === "all" || (setting === "failed" && status === "failed") || (setting === "running" && (status === "pending" || status === "running" || status === "failed")); }

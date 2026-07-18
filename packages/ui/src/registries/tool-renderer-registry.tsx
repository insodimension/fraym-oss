import { createContext, isValidElement, type ReactNode, useContext, useMemo } from "react";
import { DEFAULT_TOOL_RENDERERS } from "./default-tool-renderers";
import type { ToolRenderer, ToolRendererMap, ToolView } from "./tool-renderer-types";

export type { ToolBodyVariant, ToolKind, ToolRenderer, ToolRendererMap, ToolRenderInput, ToolStatus, ToolView } from "./tool-renderer-types";
export const TOOL_FALLBACK_KEY = "*";
export function isToolView(result: ReactNode | ToolView): result is ToolView { return typeof result === "object" && result !== null && !isValidElement(result) && "body" in result; }

const empty: ToolRendererMap = Object.freeze({});
const ToolRendererContext = createContext<ToolRendererMap | null>(null);
export interface ToolRendererProviderProps { readonly renderers: ToolRendererMap; readonly replace?: boolean; readonly children: ReactNode }
export function ToolRendererProvider({ renderers, replace = false, children }: ToolRendererProviderProps) {
  const parent = useContext(ToolRendererContext);
  const value = useMemo<ToolRendererMap>(() => replace || !parent ? renderers : { ...parent, ...renderers }, [parent, renderers, replace]);
  return <ToolRendererContext.Provider value={value}>{children}</ToolRendererContext.Provider>;
}
export function useToolRendererMap(): ToolRendererMap { return useContext(ToolRendererContext) ?? empty; }
export function useToolRenderer(toolName: string) { return resolveToolRenderer(useToolRendererMap(), toolName); }
export function normalizeToolName(toolName: string) { let name = toolName.trim(); if (name.includes("/")) name = name.slice(name.lastIndexOf("/") + 1); if (name.includes("__")) name = name.slice(name.lastIndexOf("__") + 2); return name.toLowerCase(); }
export function resolveToolRenderer(map: ToolRendererMap, toolName: string): ToolRenderer | undefined { const normalized = normalizeToolName(toolName); return map[toolName] ?? map[normalized] ?? map[TOOL_FALLBACK_KEY] ?? DEFAULT_TOOL_RENDERERS[toolName] ?? DEFAULT_TOOL_RENDERERS[normalized] ?? DEFAULT_TOOL_RENDERERS[TOOL_FALLBACK_KEY]; }

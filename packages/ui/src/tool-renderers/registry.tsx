import { useMemo } from "react";
import { normalizeToolName, resolveToolRenderer, ToolRendererProvider, type ToolRendererMap, useToolRendererMap } from "../registries/tool-renderer-registry";
import type { ToolRendererRegistry } from "./types";

export { normalizeToolName, ToolRendererProvider };
export type { ToolRendererProviderProps } from "../registries/tool-renderer-registry";
export function createToolRendererRegistry(renderers: ToolRendererMap, parent?: ToolRendererRegistry): ToolRendererRegistry {
  const merged = { ...(parent?.renderers ?? {}), ...renderers };
  return { renderers: merged, resolve: name => resolveToolRenderer(merged, name) };
}
export function useToolRendererRegistry(): ToolRendererRegistry {
  const renderers = useToolRendererMap();
  return useMemo(() => ({ renderers, resolve: name => resolveToolRenderer(renderers, name) }), [renderers]);
}

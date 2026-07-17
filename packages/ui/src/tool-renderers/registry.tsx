import { createContext, useContext, useMemo, type ReactNode } from "react";

import { builtInToolRenderers } from "./renderers";
import type { ToolRendererMap, ToolRendererRegistry } from "./types";

export function normalizeToolName(name: string): string {
  let normalized = name.trim().toLowerCase();
  let previous: string;
  do {
    previous = normalized;
    while (normalized.startsWith("realm/")) {
      normalized = normalized.slice("realm/".length);
    }
    if (normalized.startsWith("mcp__")) {
      const segments = normalized.split("__");
      if (segments.length >= 3) normalized = segments.slice(2).join("__");
    }
  } while (normalized !== previous);

  return normalized;
}

export function createToolRendererRegistry(
  renderers: ToolRendererMap,
  parent?: ToolRendererRegistry,
): ToolRendererRegistry {
  const merged: ToolRendererMap = { ...(parent?.renderers ?? {}), ...renderers };
  return {
    renderers: merged,
    resolve(name) {
      return merged[name] ?? merged[normalizeToolName(name)] ?? merged["*"];
    },
  };
}

const defaultRegistry = createToolRendererRegistry(builtInToolRenderers);
const ToolRendererContext = createContext<ToolRendererRegistry>(defaultRegistry);

export interface ToolRendererProviderProps {
  children: ReactNode;
  renderers: ToolRendererMap;
}

export function ToolRendererProvider({ children, renderers }: ToolRendererProviderProps) {
  const parent = useContext(ToolRendererContext);
  const registry = useMemo(
    () => createToolRendererRegistry(renderers, parent),
    [parent, renderers],
  );
  return <ToolRendererContext.Provider value={registry}>{children}</ToolRendererContext.Provider>;
}

export function useToolRendererRegistry(): ToolRendererRegistry {
  return useContext(ToolRendererContext);
}

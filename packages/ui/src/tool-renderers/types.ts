import type { ReactNode } from "react";

import type { ToolCallState } from "../thread-state";

export type ToolRenderer = (call: ToolCallState) => ReactNode;
export type ToolRendererMap = Readonly<Record<string, ToolRenderer>>;

export interface ToolRendererRegistry {
  readonly renderers: ToolRendererMap;
  resolve(name: string): ToolRenderer | undefined;
}

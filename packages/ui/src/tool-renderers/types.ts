export type { ToolRenderer, ToolRendererMap } from "../registries/tool-renderer-registry";
import type { ToolRenderer, ToolRendererMap } from "../registries/tool-renderer-registry";
export interface ToolRendererRegistry { readonly renderers: ToolRendererMap; resolve(name: string): ToolRenderer | undefined }

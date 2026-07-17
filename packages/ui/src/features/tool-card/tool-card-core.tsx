export { ToolCard, type ToolCardProps } from "../../tool-renderers/ToolCard";
export type { ToolBodyVariant, ToolKind, ToolStatus } from "../../registries/tool-renderer-registry";

export interface KindConfig { readonly label: string; readonly glyph: string }
export function toolKindConfig(kind: import("../../registries/tool-renderer-registry").ToolKind): KindConfig {
  const glyph = kind === "read" ? "⌘" : kind === "search" ? "⌕" : kind === "edit" ? "±" : kind === "run" ? ">_" : kind === "web" ? "◎" : kind === "todo" ? "✓" : "◇";
  return { label: kind[0]?.toUpperCase() + kind.slice(1), glyph };
}

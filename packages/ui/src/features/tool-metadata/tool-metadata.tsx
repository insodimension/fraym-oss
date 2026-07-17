import type { ToolMetadataItem } from "../surface-kit";
import { classNames } from "../../elements/utils";

export interface ToolMetadataRowProps { readonly items: readonly ToolMetadataItem[]; readonly className?: string }

export function ToolMetadataRow({ items, className }: ToolMetadataRowProps) {
  const visible = items.filter((item) => !item.hidden);
  if (!visible.length) return null;
  return <dl className={classNames("fraym-tool-metadata", className)} data-slot="tool-metadata">{visible.map((item) => <div className={`fraym-tool-metadata__item fraym-tone--${item.tone ?? "default"}`} key={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

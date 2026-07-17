import type { ReactNode } from "react";
import type { ToolCallState } from "../thread-state";
import { GenericToolRenderer } from "./renderers";
import { isToolView, resolveToolRenderer, useToolRendererMap } from "../registries/tool-renderer-registry";
import { ToolCard } from "./ToolCard";

export interface ToolCallProps {
  call: ToolCallState;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ToolCall({ call, className, expanded, defaultExpanded, onExpandedChange }: ToolCallProps) {
  const renderer = resolveToolRenderer(useToolRendererMap(), call.name);
  const rendered = renderer?.(call);
  const view = rendered !== undefined && isToolView(rendered) ? rendered : undefined;
  const body: ReactNode = view ? view.body : rendered as ReactNode;
  const cardProps = {
    call,
    ...(view === undefined ? {} : { view }),
    ...(className === undefined ? {} : { className }),
    ...(expanded === undefined ? {} : { expanded }),
    ...(defaultExpanded === undefined ? {} : { defaultExpanded }),
    ...(onExpandedChange === undefined ? {} : { onExpandedChange }),
  };

  return (
    <ToolCard {...cardProps}>
      {body ?? <GenericToolRenderer {...call} />}
    </ToolCard>
  );
}

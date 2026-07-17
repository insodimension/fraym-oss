import type { ToolCallState } from "../thread-state";
import { GenericToolRenderer } from "./renderers";
import { useToolRendererRegistry } from "./registry";
import { ToolCard } from "./ToolCard";

export interface ToolCallProps {
  call: ToolCallState;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ToolCall({ call, className, expanded, defaultExpanded, onExpandedChange }: ToolCallProps) {
  const renderer = useToolRendererRegistry().resolve(call.name);
  const cardProps = {
    call,
    ...(className === undefined ? {} : { className }),
    ...(expanded === undefined ? {} : { expanded }),
    ...(defaultExpanded === undefined ? {} : { defaultExpanded }),
    ...(onExpandedChange === undefined ? {} : { onExpandedChange }),
  };

  return (
    <ToolCard {...cardProps}>
      {renderer ? renderer(call) : <GenericToolRenderer {...call} />}
    </ToolCard>
  );
}

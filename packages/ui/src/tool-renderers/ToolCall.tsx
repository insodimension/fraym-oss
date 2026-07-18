import type { ReactNode } from "react";
import type { ToolCallState } from "../thread-state";
import type { ActiveToolCall } from "../hooks/session-types";
import { isToolView, resolveToolRenderer, useToolRendererMap } from "../registries/tool-renderer-registry";
import { ToolCard } from "./ToolCard";

export interface ToolCallProps {
  call: ToolCallState;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

function activeCall(call: ToolCallState): ActiveToolCall {
  return {
    callId: call.id,
    toolName: call.name,
    input: call.input,
    output: call.output,
    status: call.status === "succeeded" ? "success" : call.status === "failed" || call.status === "cancelled" ? "error" : "running",
  };
}

export function ToolCall({ call, className, expanded, defaultExpanded, onExpandedChange }: ToolCallProps) {
  const renderer = resolveToolRenderer(useToolRendererMap(), call.name);
  const rendered = renderer?.(activeCall(call));
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
      {body}
    </ToolCard>
  );
}

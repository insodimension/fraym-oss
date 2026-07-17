import { useState } from "react";

import { ThinkingDots } from "./elements/ThinkingDots";
import type { ThreadReasoning } from "./thread-state";

export interface ReasoningRowProps {
  reasoning: ThreadReasoning;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ReasoningRow({
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  reasoning,
}: ReasoningRowProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const setExpanded = (next: boolean) => {
    if (expanded === undefined) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  };

  return (
    <section className={`fraym-reasoning${isExpanded ? " fraym-reasoning--expanded" : ""}`}>
      <button
        aria-expanded={isExpanded}
        className="fraym-reasoning__header"
        onClick={() => setExpanded(!isExpanded)}
        type="button"
      >
        <span className="fraym-reasoning__identity">
          <span className="fraym-reasoning__eyebrow">Reasoning</span>
          {reasoning.streaming ? (
            <span className="fraym-reasoning__streaming">
              <ThinkingDots />
              <span>thinking</span>
            </span>
          ) : (
            <span>trace</span>
          )}
        </span>
        <span aria-hidden="true" className="fraym-reasoning__chevron">›</span>
      </button>
      {isExpanded ? <p className="fraym-reasoning__trace">{reasoning.content}</p> : null}
    </section>
  );
}

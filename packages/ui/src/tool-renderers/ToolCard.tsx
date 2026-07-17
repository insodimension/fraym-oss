import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ToolCallStatus } from "@fraym/driver";

import { Badge, type BadgeTone } from "../elements/Badge";
import { classNames } from "../elements/utils";
import type { ToolCallState } from "../thread-state";

const statusTone: Record<ToolCallStatus, BadgeTone> = {
  pending: "neutral",
  running: "accent",
  succeeded: "success",
  failed: "danger",
  cancelled: "warning",
};

export interface ToolCardProps {
  call: ToolCallState;
  children: ReactNode;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ToolCard({
  call,
  children,
  className,
  defaultExpanded = call.status === "pending" || call.status === "running" || call.status === "failed",
  expanded,
  onExpandedChange,
}: ToolCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const userChangedDisclosure = useRef(false);
  const previousStatus = useRef(call.status);
  const isExpanded = expanded ?? internalExpanded;

  useEffect(() => {
    const finishedQuietly = call.status === "succeeded" || call.status === "cancelled";
    const wasActive = previousStatus.current === "pending" || previousStatus.current === "running";
    if (expanded === undefined && !userChangedDisclosure.current && wasActive && finishedQuietly) {
      setInternalExpanded(false);
    }
    previousStatus.current = call.status;
  }, [call.status, expanded]);

  const toggle = () => {
    const next = !isExpanded;
    userChangedDisclosure.current = true;
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <section className={classNames("fraym-tool-card", isExpanded && "fraym-tool-card--expanded", className)}>
      <button
        aria-expanded={isExpanded}
        className="fraym-tool-card__header"
        onClick={toggle}
        type="button"
      >
        <span className="fraym-tool-card__identity">
          <span className="fraym-tool-card__eyebrow">Tool</span>
          <span className="fraym-tool-card__name">{call.name}</span>
        </span>
        <span className="fraym-tool-card__status">
          <Badge tone={statusTone[call.status]}>{call.status}</Badge>
          <span aria-hidden="true" className="fraym-tool-card__chevron">›</span>
        </span>
      </button>
      {isExpanded ? <div className="fraym-tool-card__body">{children}</div> : null}
    </section>
  );
}

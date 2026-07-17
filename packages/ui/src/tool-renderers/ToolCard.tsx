import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ToolCallStatus } from "@fraym/driver";

import { Badge, type BadgeTone } from "../elements/Badge";
import { classNames } from "../elements/utils";
import type { ToolCallState } from "../thread-state";
import type { ToolView } from "../registries/tool-renderer-registry";

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
  view?: ToolView;
}

export function ToolCard({
  call,
  children,
  className,
  defaultExpanded = call.status === "pending" || call.status === "running" || call.status === "failed",
  expanded,
  onExpandedChange,
  view,
}: ToolCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(view?.defaultOpen ?? defaultExpanded);
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
          {view?.headIcon ? <span className="fraym-tool-card__icon">{view.headIcon}</span> : null}
          <span className="fraym-tool-card__labels">
            {view?.header ?? <><span className="fraym-tool-card__eyebrow">{view?.kind ?? "tool"}</span><span className="fraym-tool-card__name">{view?.label ?? call.name}</span></>}
          </span>
          {view?.badges ? <span className="fraym-tool-card__badges">{view.badges}</span> : null}
        </span>
        <span className="fraym-tool-card__status">
          {view?.stat ? <span className="fraym-tool-card__stat">{view.stat}</span> : null}
          <Badge tone={statusTone[view?.status ?? call.status]}>{view?.status ?? call.status}</Badge>
          <span aria-hidden="true" className="fraym-tool-card__chevron">›</span>
        </span>
      </button>
      {isExpanded ? <div className={classNames("fraym-tool-card__body", view?.bodyVariant && `fraym-tool-card__body--${view.bodyVariant}`)}>{children}</div> : null}
    </section>
  );
}

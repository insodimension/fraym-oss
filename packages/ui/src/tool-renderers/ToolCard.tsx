import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ToolCallStatus } from "@fraym/driver";
import type { IconSpec } from "@fraym/config";

import { Badge, type BadgeTone } from "../elements/Badge";
import { classNames } from "../elements/utils";
import type { ToolCallState } from "../thread-state";
import type { ToolView } from "../registries/tool-renderer-registry";
import { toolIconNode } from "../icons/icon";

const statusTone: Record<ToolCallStatus, BadgeTone> = {
  pending: "neutral",
  running: "accent",
  succeeded: "success",
  failed: "danger",
  cancelled: "warning",
};

export interface ToolCardProps {
  call?: ToolCallState;
  children?: ReactNode;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  view?: ToolView;
  kind?: string;
  status?: "pending" | "success" | "error" | "warn";
  stat?: string;
  label?: ReactNode;
  density?: string;
  icon?: IconSpec;
}

export function ToolCard({
  call,
  children,
  className,
  defaultExpanded,
  expanded,
  onExpandedChange,
  view,
  kind,
  status,
  stat,
  label,
  icon,
}: ToolCardProps) {
  const resolvedStatus: ToolCallStatus = status === "success" ? "succeeded" : status === "error" ? "failed" : status === "warn" ? "cancelled" : status ?? call?.status ?? "pending";
  const resolvedCall = call ?? { id: String(label ?? kind ?? "tool"), name: String(label ?? kind ?? "tool"), status: resolvedStatus, input: undefined, output: undefined };
  const resolvedView: ToolView | undefined = view ?? (kind || status || stat || label || icon ? { kind, status: resolvedStatus, stat, label, headIcon: icon ? toolIconNode(icon, 14) : undefined, body: children ?? null } : undefined);
  const resolvedDefaultExpanded = defaultExpanded ?? (resolvedCall.status === "pending" || resolvedCall.status === "running" || resolvedCall.status === "failed");
  const [internalExpanded, setInternalExpanded] = useState(resolvedView?.defaultOpen ?? resolvedDefaultExpanded);
  const userChangedDisclosure = useRef(false);
  const previousStatus = useRef(resolvedCall.status);
  const isExpanded = expanded ?? internalExpanded;

  useEffect(() => {
    const finishedQuietly = resolvedCall.status === "succeeded" || resolvedCall.status === "cancelled";
    const wasActive = previousStatus.current === "pending" || previousStatus.current === "running";
    if (expanded === undefined && !userChangedDisclosure.current && wasActive && finishedQuietly) {
      setInternalExpanded(false);
    }
    previousStatus.current = resolvedCall.status;
  }, [resolvedCall.status, expanded]);

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
          {resolvedView?.headIcon ? <span className="fraym-tool-card__icon">{resolvedView.headIcon}</span> : null}
          <span className="fraym-tool-card__labels">
            {resolvedView?.header ?? <><span className="fraym-tool-card__eyebrow">{resolvedView?.kind ?? "tool"}</span><span className="fraym-tool-card__name">{resolvedView?.label ?? resolvedCall.name}</span></>}
          </span>
          {resolvedView?.badges ? <span className="fraym-tool-card__badges">{resolvedView.badges}</span> : null}
        </span>
        <span className="fraym-tool-card__status">
          {resolvedView?.stat ? <span className="fraym-tool-card__stat">{resolvedView.stat}</span> : null}
          <Badge tone={statusTone[resolvedView?.status ?? resolvedCall.status]}>{resolvedView?.status ?? resolvedCall.status}</Badge>
          <span aria-hidden="true" className="fraym-tool-card__chevron">›</span>
        </span>
      </button>
      {isExpanded ? <div className={classNames("fraym-tool-card__body", resolvedView?.bodyVariant && `fraym-tool-card__body--${resolvedView.bodyVariant}`)}>{children}</div> : null}
    </section>
  );
}

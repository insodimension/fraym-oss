import type { ReactNode } from "react";

import { IconButton } from "./IconButton";
import { Tooltip } from "./Tooltip";
import { classNames } from "./utils";

export interface MessageAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  activeLabel?: string;
  active?: boolean;
  disabled?: boolean;
}

export interface MessageActionsProps {
  actions: readonly MessageAction[];
  className?: string;
  label?: string;
  timestamp?: string | undefined;
  align?: "start" | "end";
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function formatMessageTime(timestamp: string): string | null {
  const instant = new Date(timestamp);
  return Number.isNaN(instant.getTime()) ? null : timeFormatter.format(instant);
}

export function MessageActions({ actions, className, label = "Message actions", timestamp, align = "start" }: MessageActionsProps) {
  const time = timestamp ? formatMessageTime(timestamp) : null;
  if (actions.length === 0 && time === null) return null;
  const timeNode = time ? <span className="fraym-message-actions__time">{time}</span> : null;
  const buttons = actions.map((action) => {
    const actionLabel = action.active ? (action.activeLabel ?? action.label) : action.label;
    return (
      <Tooltip content={actionLabel} key={action.id}>
        <IconButton
          className={classNames("fraym-message-actions__button", action.active && "is-active")}
          disabled={action.disabled}
          label={actionLabel}
          size="icon"
          variant="ghost"
          onClick={action.onClick}
        >
          {action.icon ?? action.label.slice(0, 1)}
        </IconButton>
      </Tooltip>
    );
  });
  return (
    <div aria-label={label} className={classNames("fraym-message-actions", `fraym-message-actions--${align}`, className)} data-slot="message-actions" role="group">
      {align === "end" ? timeNode : buttons}
      {align === "end" ? buttons : timeNode}
    </div>
  );
}

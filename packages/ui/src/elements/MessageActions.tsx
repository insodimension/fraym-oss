import type { ReactNode } from "react";

import { IconButton } from "./IconButton";
import { classNames } from "./utils";

export interface MessageAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface MessageActionsProps {
  actions: readonly MessageAction[];
  className?: string;
  label?: string;
}

export function MessageActions({
  actions,
  className,
  label = "Message actions",
}: MessageActionsProps) {
  return (
    <div aria-label={label} className={classNames("fraym-message-actions", className)} role="group">
      {actions.map((action) => (
        <IconButton disabled={action.disabled} key={action.id} label={action.label} size="sm" variant="ghost" onClick={action.onClick}>
          {action.icon ?? action.label}
        </IconButton>
      ))}
    </div>
  );
}

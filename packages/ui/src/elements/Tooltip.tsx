import type { ReactNode } from "react";

import { classNames } from "./utils";

export interface TooltipProps {
  children: ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, className, content }: TooltipProps) {
  return (
    <span className={classNames("fraym-tooltip", className)} tabIndex={0}>
      {children}
      <span className="fraym-tooltip__content" role="tooltip">
        {content}
      </span>
    </span>
  );
}

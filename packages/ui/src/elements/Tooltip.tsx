import { cloneElement, useId, type ReactElement } from "react";

import { classNames } from "./utils";

export interface TooltipProps {
  children: ReactElement<{ "aria-describedby"?: string }>;
  content: string;
  className?: string;
}

export function Tooltip({ children, className, content }: TooltipProps) {
  const tooltipId = useId();
  const describedBy = [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" ");

  return (
    <span className={classNames("fraym-tooltip", className)}>
      {cloneElement(children, { "aria-describedby": describedBy })}
      <span className="fraym-tooltip__content" id={tooltipId} role="tooltip">
        {content}
      </span>
    </span>
  );
}

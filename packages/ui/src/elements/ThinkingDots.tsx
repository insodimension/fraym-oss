import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export interface ThinkingDotsProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export function ThinkingDots({ className, label = "Thinking", ...props }: ThinkingDotsProps) {
  return (
    <span {...props} aria-label={label} className={classNames("fraym-thinking-dots", className)} role="status">
      <span />
      <span />
      <span />
    </span>
  );
}

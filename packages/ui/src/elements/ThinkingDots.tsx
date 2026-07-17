import type { HTMLAttributes } from "react";

import { Shimmer } from "./Shimmer";
import { Spinner } from "./Spinner";
import { classNames } from "./utils";

export interface ThinkingDotsProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
  shimmer?: boolean;
}

export function ThinkingDots({ label = "Working", shimmer = false, className, ...props }: ThinkingDotsProps) {
  return (
    <span {...props} className={classNames("fraym-thinking-dots", className)} data-slot="thinking-dots" role="status">
      <Spinner aria-hidden="true" kind="bounce" label="" size="sm" />
      {shimmer ? <Shimmer>{label}…</Shimmer> : <span>{label}…</span>}
    </span>
  );
}

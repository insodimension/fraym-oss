import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={classNames("fraym-badge", `fraym-badge--${tone}`, className)}
    />
  );
}

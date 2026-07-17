import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "add" | "blue" | "warn" | "mute" | "del";
export type BadgeVariant = "solid" | "soft" | "outline" | "code";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
}

export function Badge({ className, tone = "accent", variant = "solid", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={classNames("fraym-badge", `fraym-badge--${tone}`, `fraym-badge--${variant}`, className)}
      data-slot="badge"
      data-tone={tone}
      data-variant={variant}
    />
  );
}

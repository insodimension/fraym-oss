import { cloneElement, isValidElement, type HTMLAttributes, type ReactElement } from "react";

import { classNames } from "./utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "add" | "blue" | "warn" | "mute" | "del";
export type BadgeVariant = "solid" | "soft" | "outline" | "code";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone | undefined;
  variant?: BadgeVariant;
  asChild?: boolean;
}

export function badgeVariants({ tone = "accent", variant = "solid", className }: Pick<BadgeProps, "tone" | "variant" | "className"> = {}): string {
  return classNames("fraym-badge", `fraym-badge--${tone}`, `fraym-badge--${variant}`, className);
}

export function Badge({ className, tone = "accent", variant = "solid", asChild = false, children, ...props }: BadgeProps) {
  const shared = { ...props, className: badgeVariants({ tone, variant, className }), "data-slot": "badge", "data-tone": tone, "data-variant": variant };
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, shared);
  }
  return (
    <span
      {...shared}
    >{children}</span>
  );
}

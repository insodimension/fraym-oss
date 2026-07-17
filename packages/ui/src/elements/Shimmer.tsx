import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export interface ShimmerProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

export function Shimmer({ active = true, className, ...props }: ShimmerProps) {
  return <span {...props} className={classNames("fraym-shimmer", active && "is-active", className)} data-slot="shimmer" />;
}

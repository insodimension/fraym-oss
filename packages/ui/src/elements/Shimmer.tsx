import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type ShimmerProps = HTMLAttributes<HTMLDivElement>;

export function Shimmer({ className, ...props }: ShimmerProps) {
  return <div {...props} aria-hidden="true" className={classNames("fraym-shimmer", className)} />;
}

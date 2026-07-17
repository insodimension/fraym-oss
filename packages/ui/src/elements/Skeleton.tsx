import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div {...props} aria-hidden="true" className={classNames("fraym-skeleton", className)} />;
}

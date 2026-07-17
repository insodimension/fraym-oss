import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement>;

export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return <div {...props} className={classNames("fraym-scroll-area", className)} />;
}

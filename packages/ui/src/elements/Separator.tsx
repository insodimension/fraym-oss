import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <hr
      {...props}
      aria-orientation={orientation}
      className={classNames("fraym-separator", `fraym-separator--${orientation}`, className)}
    />
  );
}

import type { SVGAttributes } from "react";

import { classNames } from "./utils";

export interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  label?: string;
}

export function Spinner({ className, label = "Loading", ...props }: SpinnerProps) {
  return (
    <svg
      {...props}
      aria-label={label}
      className={classNames("fraym-spinner", className)}
      role="status"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" fill="none" r="9" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

import type { LabelHTMLAttributes } from "react";

import { classNames } from "./utils";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return <label {...props} className={classNames("fraym-label", className)} data-slot="label" />;
}

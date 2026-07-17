import { forwardRef, type InputHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  decorative?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, decorative = false, tabIndex, ...props }, ref) {
  return <input {...props} aria-hidden={decorative || undefined} className={classNames("fraym-checkbox", className)} data-slot="checkbox" ref={ref} tabIndex={decorative ? -1 : tabIndex} type="checkbox" />;
});

import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "checked"> {
  decorative?: boolean;
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, decorative = false, checked = false, onCheckedChange, onChange, tabIndex, ...props }, forwardedRef) {
  const localRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (localRef.current) localRef.current.indeterminate = checked === "indeterminate"; }, [checked]);
  const setRef = (element: HTMLInputElement | null) => { localRef.current = element; if (typeof forwardedRef === "function") forwardedRef(element); else if (forwardedRef) forwardedRef.current = element; };
  return <input {...props} aria-hidden={decorative || undefined} checked={checked === true} className={classNames("fraym-checkbox", className)} data-slot="checkbox" data-state={checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked"} ref={setRef} tabIndex={decorative ? -1 : tabIndex} type="checkbox" onChange={(event) => { onChange?.(event); if (!event.defaultPrevented) onCheckedChange?.(event.currentTarget.checked); }} />;
});

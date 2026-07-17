import { forwardRef, type ButtonHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch({ checked = false, onCheckedChange, className, disabled, onClick, ...props }, ref) {
  return <button {...props} aria-checked={checked} className={classNames("fraym-switch", checked && "is-checked", className)} data-slot="switch" disabled={disabled} ref={ref} role="switch" type="button" onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked); }}><span className="fraym-switch__thumb" /></button>;
});

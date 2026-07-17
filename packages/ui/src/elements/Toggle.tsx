import type { ButtonHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Toggle({ checked = false, onCheckedChange, className, disabled, onClick, ...props }: ToggleProps) {
  return <button {...props} aria-checked={checked} className={classNames("fraym-toggle", checked && "is-checked", className)} data-slot="toggle" disabled={disabled} role="switch" type="button" onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked); }}><span aria-hidden="true" /></button>;
}

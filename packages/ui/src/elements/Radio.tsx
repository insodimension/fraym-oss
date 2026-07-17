import type { ButtonHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface RadioProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
}

export function Radio({ checked = false, onCheckedChange, className, disabled, onClick, ...props }: RadioProps) {
  return <button {...props} aria-checked={checked} className={classNames("fraym-radio", checked && "is-checked", className)} data-slot="radio" disabled={disabled} role="radio" type="button" onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && !disabled) onCheckedChange?.(true); }}><span aria-hidden="true" /></button>;
}

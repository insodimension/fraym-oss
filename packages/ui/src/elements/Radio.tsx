import type { ButtonHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface RadioProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
  decorative?: boolean;
}

export function Radio({ checked = false, onCheckedChange, className, decorative = false, disabled, onClick, tabIndex, ...props }: RadioProps) {
  return <button {...props} aria-checked={checked} className={classNames("fraym-radio", checked && "is-checked", decorative && "is-decorative", className)} data-slot="radio" data-state={checked ? "checked" : "unchecked"} disabled={disabled} role="radio" tabIndex={decorative ? -1 : tabIndex} type="button" onClick={decorative ? undefined : (event) => { onClick?.(event); if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked); }}><span aria-hidden="true" /></button>;
}

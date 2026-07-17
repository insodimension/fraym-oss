import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  variant?: "default" | "surface" | "ghost";
  size?: "sm" | "md" | "lg";
  options?: readonly SelectOption[];
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, variant = "default", size = "md", options, children, ...props }, ref) {
  return <select {...props} className={classNames("fraym-select", `fraym-select--${variant}`, `fraym-select--${size}`, className)} data-slot="select" ref={ref}>{options?.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}{children}</select>;
});

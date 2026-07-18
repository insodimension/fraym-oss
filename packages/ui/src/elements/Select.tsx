import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";

import { classNames } from "./utils";

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  variant?: "default" | "ghost" | "surface" | undefined;
  size?: "sm" | "default" | "md" | "lg" | undefined;
  options?: readonly SelectOption[];
  children?: ReactNode;
}

export function selectVariants({ variant = "default", size = "default", className }: Pick<SelectProps, "variant" | "size" | "className"> = {}): string {
  return classNames("fraym-select", `fraym-select--${variant}`, `fraym-select--${size}`, className);
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, variant = "default", size = "default", options, children, ...props }, ref) {
  return <select {...props} className={selectVariants({ variant, size, className })} data-size={size} data-slot="select" data-variant={variant} ref={ref}>{options?.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}{children}</select>;
});

import { forwardRef, type InputHTMLAttributes } from "react";

import { classNames } from "./utils";

export type InputVariant = "default" | "ghost" | "underline" | "surface";
export type InputSize = "sm" | "default" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant | undefined;
  size?: InputSize | undefined;
}

export function inputVariants({ variant = "default", size = "default", className }: Pick<InputProps, "variant" | "size" | "className"> = {}): string {
  return classNames("fraym-input", `fraym-input--${variant}`, `fraym-input--${size}`, className);
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, variant = "default", size = "default", ...props }, ref) {
  return <input {...props} className={inputVariants({ variant, size, className })} data-size={size} data-slot="input" data-variant={variant} ref={ref} />;
});

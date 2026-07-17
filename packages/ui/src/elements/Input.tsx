import { forwardRef, type InputHTMLAttributes } from "react";

import { classNames } from "./utils";

export type InputVariant = "default" | "surface" | "ghost";
export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant;
  size?: InputSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, variant = "default", size = "md", ...props }, ref) {
  return <input {...props} className={classNames("fraym-input", `fraym-input--${variant}`, `fraym-input--${size}`, className)} data-slot="input" ref={ref} />;
});

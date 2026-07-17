import { cloneElement, isValidElement, type ButtonHTMLAttributes, type HTMLAttributes, type ReactElement } from "react";

import { classNames } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "default" | "outline" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "default";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  asChild?: boolean;
}

export function buttonVariants({ variant = "default", size = "default", className }: Pick<ButtonProps, "variant" | "size" | "className"> = {}): string {
  return classNames("fraym-button", `fraym-button--${variant}`, `fraym-button--${size}`, className);
}

export function Button({
  className,
  children,
  asChild = false,
  disabled,
  loading = false,
  loadingText,
  size = "default",
  type = "button",
  variant = "default",
  ...props
}: ButtonProps) {
  const shared = {
    ...props,
    "aria-busy": loading || undefined,
    className: buttonVariants({ variant, size, className }),
    "data-size": size,
    "data-slot": "button",
    "data-variant": variant,
    disabled: disabled || loading,
  };
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, shared);
  }
  return (
    <button
      {...shared}
      type={type}
    >
      {loading ? <span aria-hidden="true" className="fraym-button__spinner" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

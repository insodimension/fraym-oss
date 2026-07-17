import type { ButtonHTMLAttributes } from "react";

import { classNames } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "default" | "outline" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "default";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  className,
  children,
  disabled,
  loading = false,
  loadingText,
  size = "md",
  type = "button",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classNames(
        "fraym-button",
        `fraym-button--${variant}`,
        `fraym-button--${size}`,
        className,
      )}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span aria-hidden="true" className="fraym-button__spinner" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

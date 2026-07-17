import type { ButtonHTMLAttributes } from "react";

import { classNames } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "fraym-button",
        `fraym-button--${variant}`,
        `fraym-button--${size}`,
        className,
      )}
      type={type}
    />
  );
}

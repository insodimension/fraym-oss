import type { ReactNode } from "react";

import { Button, type ButtonProps } from "./Button";
import { classNames } from "./utils";

export type IconButtonVariant = "chrome" | "accent" | "surface" | NonNullable<ButtonProps["variant"]>;

export interface IconButtonProps extends Omit<ButtonProps, "children" | "variant"> {
  children: ReactNode;
  label?: string;
  toggled?: boolean;
  variant?: IconButtonVariant;
}

export function IconButton({
  children,
  className,
  label,
  toggled = false,
  variant = "chrome",
  ...props
}: IconButtonProps) {
  const buttonVariant = variant === "chrome" ? "ghost" : variant === "accent" ? "primary" : variant === "surface" ? "secondary" : variant;
  return (
    <Button
      {...props}
      aria-label={label}
      aria-pressed={toggled || undefined}
      className={classNames("fraym-icon-button", className)}
      data-slot="icon-button"
      data-toggled={toggled || undefined}
      data-icon-variant={variant}
      variant={buttonVariant}
    >
      {children}
    </Button>
  );
}

import type { ReactNode } from "react";

import { Button, type ButtonProps } from "./Button";
import { classNames } from "./utils";

export interface IconButtonProps extends Omit<ButtonProps, "children"> {
  children: ReactNode;
  label?: string;
  toggled?: boolean;
}

export function IconButton({
  children,
  className,
  label,
  toggled = false,
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      aria-label={label}
      aria-pressed={toggled || undefined}
      className={classNames("fraym-icon-button", className)}
      data-slot="icon-button"
      data-toggled={toggled || undefined}
      variant={variant}
    >
      {children}
    </Button>
  );
}

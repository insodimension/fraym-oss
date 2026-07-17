import type { ReactNode } from "react";

import { Button, type ButtonProps } from "./Button";
import { classNames } from "./utils";

export interface IconButtonProps extends Omit<ButtonProps, "children"> {
  children: ReactNode;
  label: string;
}

export function IconButton({
  children,
  className,
  label,
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={classNames("fraym-icon-button", className)}
    >
      {children}
    </Button>
  );
}

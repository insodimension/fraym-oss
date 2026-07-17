import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";
export type SpinnerKind = "circular" | "dots" | "bars" | "ping" | "orbit" | "bounce";
export type SpinnerState = "running" | "idle" | "success" | "error";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: SpinnerKind;
  state?: SpinnerState;
  size?: SpinnerSize;
  label?: string;
}

export function Spinner({ kind = "circular", state = "running", size = "sm", className, label = "Loading", ...props }: SpinnerProps) {
  const staticGlyph = state === "success" ? "✓" : state === "error" ? "!" : null;
  return (
    <span
      {...props}
      aria-label={label}
      className={classNames("fraym-spinner", `fraym-spinner--${kind}`, `fraym-spinner--${state}`, `fraym-spinner--${size}`, className)}
      data-kind={kind}
      data-slot="spinner"
      data-state={state}
      role="status"
    >
      {staticGlyph ?? (kind === "circular" ? <span className="fraym-spinner__ring" /> : <><i /><i /><i /></>)}
    </span>
  );
}

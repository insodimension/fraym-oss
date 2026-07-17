import type { ComponentProps } from "react";
import { classNames } from "./utils";

export type DiagramTagTone = "accent" | "iris" | "blue" | "green" | "warn" | "muted";
export interface DiagramTagProps extends ComponentProps<"span"> { readonly tone?: DiagramTagTone }
export function DiagramTag({ tone = "accent", className, ...props }: DiagramTagProps) {
  return <span className={classNames("fraym-diagram-tag", `fraym-diagram-tag--${tone}`, className)} data-slot="diagram-tag" {...props} />;
}

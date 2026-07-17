import { forwardRef, type TextareaHTMLAttributes } from "react";

import { classNames } from "./utils";

export type TextareaVariant = "default" | "surface" | "ghost";
export type TextareaResize = "none" | "vertical" | "horizontal" | "both";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextareaVariant;
  resize?: TextareaResize;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, variant = "default", resize = "vertical", ...props }, ref) {
  return <textarea {...props} className={classNames("fraym-textarea", `fraym-textarea--${variant}`, `fraym-textarea--resize-${resize}`, className)} data-slot="textarea" ref={ref} />;
});

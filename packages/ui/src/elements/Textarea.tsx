import { forwardRef, type TextareaHTMLAttributes } from "react";

import { classNames } from "./utils";

export type TextareaVariant = "default" | "ghost" | "surface";
export type TextareaResize = "none" | "vertical" | "horizontal" | "both";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextareaVariant | undefined;
  resize?: TextareaResize | undefined;
}

export function textareaVariants({ variant = "default", resize = "none", className }: Pick<TextareaProps, "variant" | "resize" | "className"> = {}): string {
  return classNames("fraym-textarea", `fraym-textarea--${variant}`, `fraym-textarea--resize-${resize}`, className);
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, variant = "default", resize = "none", ...props }, ref) {
  return <textarea {...props} className={textareaVariants({ variant, resize, className })} data-resize={resize} data-slot="textarea" data-variant={variant} ref={ref} />;
});

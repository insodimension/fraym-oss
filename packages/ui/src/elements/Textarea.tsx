import { forwardRef, type TextareaHTMLAttributes } from "react";

import { classNames } from "./utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return <textarea {...props} className={classNames("fraym-textarea", className)} ref={ref} />;
  },
);

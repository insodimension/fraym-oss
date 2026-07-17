import type { TextareaHTMLAttributes } from "react";

import { classNames } from "./utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea {...props} className={classNames("fraym-textarea", className)} />;
}

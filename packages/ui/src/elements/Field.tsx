import { cloneElement, type ReactElement, useId } from "react";

import { Label } from "./Label";
import { classNames } from "./utils";

interface FieldControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
}

export interface FieldProps {
  label: string;
  helper?: string;
  error?: string;
  warning?: string;
  required?: boolean;
  children: ReactElement<FieldControlProps>;
  className?: string;
}

export function Field({ label, helper, error, warning, required = false, children, className }: FieldProps) {
  const generatedId = useId();
  const controlId = children.props.id ?? `${generatedId}-control`;
  const message = error ?? warning ?? helper;
  const messageId = message ? `${generatedId}-message` : undefined;
  const describedBy = [children.props["aria-describedby"], messageId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={classNames("fraym-field", error && "fraym-field--error", warning && "fraym-field--warning", className)} data-slot="field">
      <Label htmlFor={controlId}>{label}{required ? <span aria-hidden="true"> *</span> : null}</Label>
      {cloneElement(children, {
        id: controlId,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error || children.props["aria-invalid"] ? { "aria-invalid": true } : {}),
        ...(required || children.props.required ? { required: true } : {}),
      })}
      {message ? <span className="fraym-field__message" id={messageId}>{message}</span> : null}
    </div>
  );
}

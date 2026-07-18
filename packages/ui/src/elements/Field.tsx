import { cloneElement, type ReactElement, useId } from "react";
import { cn } from "../lib/cn";
import { Label } from "./Label";

export interface FieldProps {
	/** Label text rendered above the control. */
	readonly label?: string;
	/** Helper text (neutral tone). Shown when no error or warning. */
	readonly helper?: string;
	/** Error text (del tone). Overrides helper and sets `data-invalid` on the control. */
	readonly error?: string;
	/** Warning text (warn tone). Shown when no error. */
	readonly warning?: string;
	/** Show a required asterisk on the label. */
	readonly required?: boolean;
	/** The form control (Input, Textarea, Select, etc.). */
	readonly children: ReactElement<Record<string, unknown>>;
	readonly className?: string;
}

export function Field({ label, helper, error, warning, required, children, className }: FieldProps) {
	const generatedId = useId();
	const childProps = children.props;
	const childId = typeof childProps.id === "string" ? childProps.id : generatedId;
	const messageId = `${childId}-message`;

	const hasMessage = !!(error || warning || helper);
	const message = error || warning || helper;
	const tone = error ? "del" : warning ? "warn" : "text-3";
	const existingDescribedBy =
		typeof childProps["aria-describedby"] === "string" ? childProps["aria-describedby"] : undefined;
	const describedBy = [existingDescribedBy, hasMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;

	const inputProps: Record<string, unknown> = {
		"data-state": error ? "invalid" : warning ? "warning" : undefined,
		"aria-invalid": error ? true : undefined,
		...(describedBy ? { "aria-describedby": describedBy } : {}),
	};
	if (!childProps.id) {
		inputProps.id = generatedId;
	}

	const control = cloneElement(children, inputProps);

	return (
		<div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
			{label && (
				<Label htmlFor={childId}>
					{label}
					{required && <span className="ml-0.5 text-fr-del">*</span>}
				</Label>
			)}
			{control}
			{message && (
				<span
					id={messageId}
					aria-live={error ? "assertive" : "polite"}
					className={cn(
						"text-fr-xs",
						tone === "del" ? "text-fr-del" : tone === "warn" ? "text-fr-warn" : "text-fr-text-3",
					)}
				>
					{message}
				</span>
			)}
		</div>
	);
}

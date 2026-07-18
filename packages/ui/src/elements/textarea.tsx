import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const textareaBase =
	"flex w-full min-h-[var(--fr-textarea-min-h)] max-h-[var(--fr-textarea-max-h)] bg-fr-surface font-secondary text-fr-sm text-fr-text shadow-none transition-colors duration-[150ms] placeholder:text-fr-text-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const textareaState =
	"data-[state=invalid]:border-fr-del data-[state=warning]:border-fr-warn data-[state=valid]:border-fr-add";

export const textareaVariants = cva(`${textareaBase} ${textareaState}`, {
	variants: {
		variant: {
			default:
				"rounded-[var(--fr-textarea-r)] border border-fr-border px-[var(--fr-textarea-px)] py-[var(--fr-textarea-py)] hover:border-fr-text-3 focus-visible:border-fr-accent-line",
			ghost: "rounded-[var(--fr-textarea-r)] border border-transparent bg-transparent px-[var(--fr-textarea-px)] py-[var(--fr-textarea-py)] hover:border-fr-border focus-visible:border-fr-accent-line",
		},
		resize: {
			none: "resize-none",
			vertical: "resize-y",
			both: "resize",
		},
	},
	defaultVariants: { variant: "default", resize: "none" },
});

export interface TextareaProps extends React.ComponentProps<"textarea">, VariantProps<typeof textareaVariants> {}

export function Textarea({ className, variant, resize, ...props }: TextareaProps) {
	return (
		<textarea
			data-slot="textarea"
			data-variant={variant ?? "default"}
			data-resize={resize ?? "none"}
			className={cn(textareaVariants({ variant, resize }), className)}
			{...props}
		/>
	);
}

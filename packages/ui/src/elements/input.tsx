import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const inputBase =
	"flex w-full min-w-0 bg-fr-surface font-secondary text-fr-sm text-fr-text shadow-none transition-colors duration-[120ms] placeholder:text-fr-text-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const inputFile = "file:border-0 file:bg-transparent file:text-fr-sm file:font-medium file:text-fr-text";
const inputState =
	"data-[state=invalid]:border-fr-del data-[state=warning]:border-fr-warn data-[state=valid]:border-fr-add";

export const inputVariants = cva(`${inputBase} ${inputFile} ${inputState}`, {
	variants: {
		variant: {
			default:
				"rounded-[var(--fr-input-r)] border border-fr-border hover:border-fr-text-3 focus-visible:border-fr-accent-line",
			ghost: "rounded-[var(--fr-input-r)] border border-transparent bg-transparent hover:border-fr-border focus-visible:border-fr-accent-line",
			underline:
				"rounded-none border-0 border-b border-fr-border bg-transparent px-0 py-1 hover:border-fr-text-3 focus-visible:border-fr-accent-line",
		},
		size: {
			sm: "h-7 px-[9px] py-0 text-fr-xs",
			default: "px-[var(--fr-input-px)] py-2",
			lg: "h-10 px-[14px] py-2.5 text-fr-base",
		},
	},
	defaultVariants: { variant: "default", size: "default" },
});

export interface InputProps extends Omit<React.ComponentProps<"input">, "size">, VariantProps<typeof inputVariants> {}

export function Input({ className, variant, size, ...props }: InputProps) {
	return (
		<input
			data-slot="input"
			data-variant={variant ?? "default"}
			data-size={size ?? "default"}
			className={cn(inputVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

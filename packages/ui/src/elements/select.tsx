import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

// Styled native <select>. Keeps the OS-native popup + chevron (no appearance-none)
// so it behaves like a real form control; tokens are pixel-matched to the prior
// hand-rolled engine-config select (rounded-[8px] / fr-border / fr-surface).
const selectBase =
	"flex w-full min-w-0 bg-fr-surface text-fr-sm text-fr-text outline-none transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50";

export const selectVariants = cva(selectBase, {
	variants: {
		variant: {
			default: "rounded-[8px] border border-fr-border focus-visible:border-fr-accent-line",
			ghost: "rounded-[8px] border border-transparent hover:border-fr-border focus-visible:border-fr-accent-line",
		},
		size: {
			sm: "px-[9px] py-1 text-fr-xs",
			default: "px-[11px] py-2",
			lg: "px-[14px] py-2.5 text-fr-base",
		},
	},
	defaultVariants: { variant: "default", size: "default" },
});

export interface SelectOption {
	readonly value: string;
	readonly label: string;
	readonly disabled?: boolean;
}

export interface SelectProps extends Omit<React.ComponentProps<"select">, "size">, VariantProps<typeof selectVariants> {
	/** Convenience: render `<option>` children from data. Falls back to `children`. */
	readonly options?: readonly SelectOption[];
}

export function Select({ className, variant, size, options, children, ...props }: SelectProps) {
	return (
		<select
			data-slot="select"
			data-variant={variant ?? "default"}
			data-size={size ?? "default"}
			className={cn(selectVariants({ variant, size }), className)}
			{...props}
		>
			{options
				? options.map(option => (
						<option key={option.value} value={option.value} disabled={option.disabled}>
							{option.label}
						</option>
					))
				: children}
		</select>
	);
}

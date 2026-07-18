import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

// A flex-framed wrapper around a bare <input>, with optional leading + trailing
// slots. Replaces the 4+ hand-rolled `flex items-center gap-2 rounded-[9px]
// border bg-fr-surface px-[11px]` patterns that were scattered across
// marketplace-shell, selector-menu, connect-provider-wizard, command-palette.
//
// Sized so the bare input inherits the same height/padding as `Input`. The
// wrapper carries the visible border + background, so consumers never have to
// duplicate the chrome classes.
const wrapper = cva(
	"flex w-full min-w-0 items-center gap-2 rounded-[9px] border bg-fr-surface transition-colors duration-[120ms] focus-within:border-fr-accent-line has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
	{
		variants: {
			variant: {
				default: "border-fr-border hover:border-fr-text-3",
				ghost: "border-fr-border-soft bg-fr-surface-2",
			},
			size: {
				sm: "px-2 py-1 has-[[data-slot=input-group-input]]:text-fr-xs",
				default:
					"px-[var(--fr-input-px)] py-2 has-[[data-slot=input-group-input]]:text-fr-sm has-[[data-slot=input-group-input]]:text-fr-base",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

const inputClass =
	"flex-1 min-w-0 bg-transparent font-secondary text-fr-text outline-none placeholder:text-fr-text-3 disabled:cursor-not-allowed";

export interface InputGroupProps extends Omit<React.ComponentProps<"input">, "size">, VariantProps<typeof wrapper> {
	/** Element rendered before the input (e.g. an `<Icon name="search" />`). */
	readonly leading?: ReactNode;
	/** Element rendered after the input (e.g. an `IconButton` for clear / reveal). */
	readonly trailing?: ReactNode;
	/** Extra classes merged onto the input element. */
	readonly inputClassName?: string;
}

/** A search/entry row: leading slot, bare input, optional trailing slot. */
export function InputGroup({ leading, trailing, variant, size, className, inputClassName, ...props }: InputGroupProps) {
	return (
		<div
			data-slot="input-group"
			data-variant={variant ?? "default"}
			data-size={size ?? "default"}
			className={cn(wrapper({ variant, size }), className)}
		>
			{leading != null && (
				<span data-slot="input-group-leading" className="flex shrink-0 items-center text-fr-text-3">
					{leading}
				</span>
			)}
			<input data-slot="input-group-input" className={cn(inputClass, inputClassName)} {...props} />
			{trailing != null && (
				<span data-slot="input-group-trailing" className="flex shrink-0 items-center">
					{trailing}
				</span>
			)}
		</div>
	);
}

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "../lib/cn";
import { Spinner } from "./spinner";

// Pixel-matched to prototype app.css `.btn` / `.btn.accent` / `.btn.ghost`
// (diff-actions buttons). Base = `.btn`; default variant = `.btn.accent`,
// outline = `.btn`, ghost = `.btn.ghost`.
export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-[8px] text-fr-sm font-medium transition-all duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[13px] [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"border border-transparent [background:var(--fr-accent-grad)] text-fr-accent-ink font-semibold hover:[background:var(--fr-accent-grad-hover)]",
				outline:
					"border border-fr-border bg-fr-surface text-fr-text hover:bg-fr-surface-2 hover:border-[var(--fr-btn-hover-bd)]",
				ghost: "border border-transparent bg-transparent text-fr-text-2 hover:bg-fr-surface hover:text-fr-text",
				destructive: "border border-fr-del-line bg-fr-surface text-fr-del hover:bg-fr-del-bg hover:border-fr-del",
				link: "text-fr-accent underline-offset-4 hover:underline",
			},
			size: {
				default: "py-[7px] px-[13px]",
				sm: "py-[5px] px-[9px] text-fr-sm gap-[6px]",
				lg: "py-[9px] px-[18px] text-fr-base",
				icon: "size-8 rounded-[8px] p-0",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
	readonly asChild?: boolean;
	/** Show a leading spinner, disable interaction, and mark `aria-busy`. */
	readonly loading?: boolean;
	/** Replaces the label while `loading` (e.g. "Adding…"). */
	readonly loadingText?: string;
}

export function Button({
	className,
	variant,
	size,
	asChild = false,
	loading = false,
	loadingText,
	children,
	disabled,
	...props
}: ButtonProps) {
	const sharedProps = {
		"data-slot": "button",
		"data-variant": variant ?? "default",
		"data-size": size ?? "default",
		className: cn(buttonVariants({ variant, size, className })),
	} as const;
	if (asChild) {
		// Slot composition forwards rendering to the child, so the leading spinner /
		// loadingText injection is the child's concern — but `loading`'s disable +
		// aria-busy semantics still propagate.
		return (
			<Slot.Root
				{...sharedProps}
				{...({
					...props,
					disabled: disabled || loading,
					"aria-busy": loading || undefined,
				} as React.ComponentPropsWithoutRef<typeof Slot.Root>)}
			>
				{children}
			</Slot.Root>
		);
	}
	return (
		<button {...sharedProps} {...props} disabled={disabled || loading} aria-busy={loading || undefined}>
			{loading ? <Spinner size="xs" /> : null}
			{loading && loadingText ? loadingText : children}
		</button>
	);
}

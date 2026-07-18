import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "../lib/cn";

// Three visual languages for a 32×32 icon affordance:
//   chrome  — toolbar chrome (default). Muted text, transparent border,
//             hover reveals border + bg. `toggled` lights accent dim.
//   accent  — filled action (e.g. composer send). Solid accent bg,
//             accent-ink text, hover darkens.
//   surface — filled muted (e.g. composer stop). Solid surface-3 bg,
//             default text, no hover shift.
export const iconButtonVariants = cva(
	"icon-btn relative flex size-8 shrink-0 items-center justify-center transition-all duration-[120ms]",
	{
		variants: {
			variant: {
				chrome:
					"rounded-lg border border-transparent text-fr-text-2 hover:border-fr-border-soft hover:bg-fr-surface hover:text-fr-text",
				accent: "rounded-[9px] border-transparent bg-fr-accent text-fr-accent-ink hover:bg-fr-accent-2",
				surface: "rounded-[9px] border-transparent bg-fr-surface-3 text-fr-text",
			},
		},
		defaultVariants: { variant: "chrome" },
	},
);

export interface IconButtonProps extends React.ComponentProps<"button">, VariantProps<typeof iconButtonVariants> {
	readonly toggled?: boolean;
	readonly asChild?: boolean;
}

export function IconButton({
	variant = "chrome",
	toggled,
	className,
	children,
	asChild = false,
	...props
}: IconButtonProps) {
	const isChrome = variant === "chrome";
	const sharedProps = {
		"data-slot": "icon-button",
		"data-variant": variant,
		className: cn(
			iconButtonVariants({ variant }),
			isChrome && toggled && "border-fr-accent-line bg-fr-accent-dim text-fr-accent",
			className,
		),
		...props,
	} as const;
	if (asChild) {
		return <Slot.Root {...(sharedProps as React.ComponentProps<typeof Slot.Root>)}>{children}</Slot.Root>;
	}
	return (
		<button type="button" {...sharedProps}>
			{children}
		</button>
	);
}

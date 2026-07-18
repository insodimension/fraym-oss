import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "../lib/cn";

// Four visual variants:
//   solid    — filled label chip (uppercase, sans). Uses actual token color for
//              the bg, with contrasting ink text. The default.
//   soft     — tinted bg, colored text. A subtler solid.
//   outline  — bordered, transparent bg, colored text.
//   code     — bordered token chip (mono, no caps) for selectors, paths, counts.
export const badgeVariants = cva(
	"inline-flex flex-none items-center justify-center rounded-[5px] px-2 h-5 text-fr-2xs leading-none",
	{
		variants: {
			tone: { accent: "", add: "", blue: "", warn: "", mute: "", del: "" },
			variant: {
				solid: "font-primary font-medium uppercase tracking-fr-label",
				soft: "font-secondary",
				outline: "border bg-transparent font-primary font-medium uppercase tracking-fr-label",
				code: "border font-secondary",
			},
		},
		compoundVariants: [
			// solid: actual fill color + contrasting text
			{ variant: "solid", tone: "accent", className: "[background:var(--fr-accent-grad)] text-fr-accent-ink" },
			{ variant: "solid", tone: "add", className: "[background:var(--fr-add-grad)] text-fr-bg" },
			{ variant: "solid", tone: "blue", className: "[background:var(--fr-blue-grad)] text-white" },
			{ variant: "solid", tone: "warn", className: "[background:var(--fr-warn-grad)] text-fr-warn-ink" },
			{ variant: "solid", tone: "mute", className: "bg-fr-surface-3 text-fr-text-2" },
			{ variant: "solid", tone: "del", className: "[background:var(--fr-del-grad)] text-white" },
			// soft: tinted bg, colored text (subtle)
			{ variant: "soft", tone: "accent", className: "bg-fr-accent-dim text-fr-accent" },
			{ variant: "soft", tone: "add", className: "bg-fr-add-bg text-fr-add" },
			{ variant: "soft", tone: "blue", className: "bg-fr-blue/15 text-fr-blue" },
			{ variant: "soft", tone: "warn", className: "bg-fr-warn/15 text-fr-warn" },
			{ variant: "soft", tone: "mute", className: "bg-fr-surface-3 text-fr-text-2" },
			{ variant: "soft", tone: "del", className: "bg-fr-del-bg text-fr-del" },
			// outline: bordered, transparent bg
			{ variant: "outline", tone: "accent", className: "border-fr-accent-line text-fr-accent" },
			{ variant: "outline", tone: "add", className: "border-fr-add/40 text-fr-add" },
			{ variant: "outline", tone: "blue", className: "border-fr-blue/40 text-fr-blue" },
			{ variant: "outline", tone: "warn", className: "border-fr-warn/40 text-fr-warn" },
			{ variant: "outline", tone: "mute", className: "border-fr-border-soft text-fr-text-3" },
			{ variant: "outline", tone: "del", className: "border-fr-del/40 text-fr-del" },
			// code: hairline border, tinted text, mono
			{ variant: "code", tone: "accent", className: "border-fr-accent-line bg-fr-accent-dim text-fr-accent" },
			{ variant: "code", tone: "add", className: "border-fr-add/40 text-fr-add" },
			{ variant: "code", tone: "blue", className: "border-fr-blue/40 text-fr-blue" },
			{ variant: "code", tone: "warn", className: "border-fr-warn/40 text-fr-warn" },
			{ variant: "code", tone: "mute", className: "border-fr-border-soft text-fr-text-3" },
			{ variant: "code", tone: "del", className: "border-fr-del/40 text-fr-del" },
		],
		defaultVariants: { tone: "accent", variant: "solid" },
	},
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
	readonly asChild?: boolean;
}

export function Badge({ className, tone, variant, asChild = false, children, ...props }: BadgeProps) {
	const sharedProps = {
		"data-slot": "badge",
		"data-tone": tone ?? "accent",
		"data-variant": variant ?? "solid",
		className: cn(badgeVariants({ tone, variant, className })),
		...props,
	} as const;
	if (asChild) {
		return <Slot.Root {...(sharedProps as React.ComponentProps<typeof Slot.Root>)}>{children}</Slot.Root>;
	}
	return <span {...sharedProps}>{children}</span>;
}

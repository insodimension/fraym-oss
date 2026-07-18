import { cn } from "../lib/cn";

export interface RadioProps extends Omit<React.ComponentProps<"button">, "type" | "onChange"> {
	/** Render as a purely visual, non-interactive indicator (read-only displays). */
	readonly decorative?: boolean;
	/** Controlled checked state. Mirrors Checkbox's checked prop. */
	readonly checked?: boolean;
	/** Fired with the next checked value when toggled. Mirrors Checkbox's onCheckedChange. */
	readonly onCheckedChange?: (checked: boolean) => void;
}

/**
 * Standalone boolean indicator with radio styling (the circle analogue of Checkbox).
 * Not a radio *group* — for mutually-exclusive selection, render several and let the
 * parent own which one is checked. Interactive instances toggle on click; `decorative`
 * renders an inert, full-opacity indicator for read-only displays.
 */
export function Radio({
	className,
	decorative = false,
	checked = false,
	onCheckedChange,
	onClick,
	tabIndex,
	...props
}: RadioProps) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			data-slot="radio"
			data-state={checked ? "checked" : "unchecked"}
			tabIndex={decorative ? -1 : tabIndex}
			onClick={
				decorative
					? undefined
					: event => {
							onClick?.(event);
							onCheckedChange?.(!checked);
						}
			}
			className={cn(
				"peer flex size-4 shrink-0 items-center justify-center rounded-full border text-fr-accent-ink transition-colors",
				"border-fr-border-soft hover:border-fr-border",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line focus-visible:ring-offset-2 focus-visible:ring-offset-fr-bg",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"data-[state=checked]:border-fr-accent data-[state=checked]:bg-fr-accent",
				decorative && "pointer-events-none",
				className,
			)}
			{...props}
		>
			{/* Inline dot keeps the elements tier off the Icon registry. */}
			{checked && <span className="size-1.5 rounded-full bg-fr-accent-ink" />}
		</button>
	);
}

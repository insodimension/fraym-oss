import { Checkbox as RadixCheckbox } from "radix-ui";
import { cn } from "../lib/cn";

export interface CheckboxProps extends React.ComponentProps<typeof RadixCheckbox.Root> {
	/** Render as a purely visual, non-interactive indicator (read-only displays). */
	decorative?: boolean;
}

export function Checkbox({ className, decorative, tabIndex, ...props }: CheckboxProps) {
	return (
		<RadixCheckbox.Root
			data-slot="checkbox"
			tabIndex={decorative ? -1 : tabIndex}
			className={cn(
				"peer flex size-4 shrink-0 items-center justify-center rounded-[5px] border text-fr-accent-ink transition-colors",
				"border-fr-border-soft hover:border-fr-border",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line focus-visible:ring-offset-2 focus-visible:ring-offset-fr-bg",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"data-[state=checked]:border-fr-accent data-[state=checked]:bg-fr-accent",
				"data-[state=indeterminate]:border-fr-accent data-[state=indeterminate]:bg-fr-accent",
				decorative && "pointer-events-none",
				className,
			)}
			{...props}
		>
			<RadixCheckbox.Indicator className="flex items-center justify-center text-current">
				{/* Inline check keeps the elements tier off the Icon registry. */}
				<svg
					viewBox="0 0 12 12"
					className="size-3"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.4}
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M2.6 6.4 L4.9 8.7 L9.4 3.5" />
				</svg>
			</RadixCheckbox.Indicator>
		</RadixCheckbox.Root>
	);
}

import { cn } from "../lib/cn";

export interface ToggleProps extends Omit<React.ComponentProps<"button">, "children"> {
	/** Whether the toggle is on. */
	readonly checked?: boolean;
	/** Fired with the next checked value when the toggle is pressed. */
	readonly onCheckedChange?: (checked: boolean) => void;
}

export function Toggle({ checked = false, onCheckedChange, className, onClick, ...props }: ToggleProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			data-slot="toggle"
			data-state={checked ? "on" : "off"}
			className={cn(
				"relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-[12px] transition-colors duration-150",
				checked ? "bg-fr-accent" : "bg-fr-surface-3",
				className,
			)}
			onClick={event => {
				onClick?.(event);
				onCheckedChange?.(!checked);
			}}
			{...props}
		>
			<span
				className={cn(
					"absolute top-[3px] size-4 rounded-full transition-all duration-150",
					checked ? "left-[19px] bg-fr-accent-ink" : "left-[3px] bg-fr-switch-thumb-off",
				)}
			/>
		</button>
	);
}

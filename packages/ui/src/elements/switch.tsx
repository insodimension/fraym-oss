import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "../lib/cn";

export interface SwitchProps extends React.ComponentProps<typeof RadixSwitch.Root> {}

export function Switch({ className, ...props }: SwitchProps) {
	return (
		<RadixSwitch.Root
			data-slot="switch"
			className={cn(
				"peer relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer rounded-[12px] transition-colors duration-150",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line focus-visible:ring-offset-2 focus-visible:ring-offset-fr-bg",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"data-[state=checked]:bg-fr-accent data-[state=unchecked]:bg-fr-surface-3",
				className,
			)}
			{...props}
		>
			<RadixSwitch.Thumb
				className={cn(
					"pointer-events-none absolute top-[3px] block size-4 rounded-full ring-0 transition-all duration-150",
					"data-[state=checked]:left-[19px] data-[state=unchecked]:left-[3px]",
					"data-[state=checked]:bg-fr-accent-ink data-[state=unchecked]:bg-fr-switch-thumb-off",
				)}
			/>
		</RadixSwitch.Root>
	);
}

import { cn } from "../lib/cn";

export interface KbdProps extends React.ComponentProps<"kbd"> {}

export function Kbd({ className, ...props }: KbdProps) {
	// Subtle key-cap. Uses `currentColor` for border + text so it adapts to its
	// context — dim grey inline, white/black ink inside an accent Button, etc.
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"inline-flex items-center rounded-[4px] border border-current px-1 py-px font-secondary text-fr-2xs leading-none opacity-60",
				className,
			)}
			{...props}
		/>
	);
}

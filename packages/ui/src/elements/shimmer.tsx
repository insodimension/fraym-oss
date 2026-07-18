import { cn } from "../lib/cn";

export interface ShimmerProps extends React.ComponentProps<"span"> {
	readonly active?: boolean;
}

export function Shimmer({ active = true, className, children, ...props }: ShimmerProps) {
	return (
		<span
			data-slot="shimmer"
			className={cn(
				"text-fr-base font-medium tracking-fr-tight",
				active && [
					"bg-[linear-gradient(100deg,var(--fr-text-3)_30%,var(--fr-text)_50%,var(--fr-text-3)_70%)]",
					"bg-[length:220%_100%] bg-clip-text text-transparent",
					"animate-[fr-shimmer-sweep_1.5s_linear_infinite]",
				],
				!active && "text-fr-text-2",
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}

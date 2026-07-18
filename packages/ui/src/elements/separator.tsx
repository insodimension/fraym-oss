import { cn } from "../lib/cn";

export interface SeparatorProps extends React.ComponentProps<"div"> {
	readonly orientation?: "horizontal" | "vertical";
}

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
	return (
		<div
			role="separator"
			data-slot="separator"
			data-orientation={orientation}
			className={cn(
				"shrink-0 bg-fr-border-soft",
				orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
				className,
			)}
			{...props}
		/>
	);
}

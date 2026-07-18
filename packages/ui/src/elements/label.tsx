import { cn } from "../lib/cn";

export interface LabelProps extends React.ComponentProps<"label"> {}

export function Label({ className, ...props }: LabelProps) {
	return (
		<label
			data-slot="label"
			className={cn("cursor-default text-fr-sm font-medium text-fr-text", className)}
			{...props}
		/>
	);
}

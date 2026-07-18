import { ScrollArea as RadixScrollArea } from "radix-ui";
import { cn } from "../lib/cn";

export function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof RadixScrollArea.Root>) {
	return (
		<RadixScrollArea.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
			<RadixScrollArea.Viewport className="size-full rounded-[inherit]">{children}</RadixScrollArea.Viewport>
			<ScrollBar />
			<RadixScrollArea.Corner />
		</RadixScrollArea.Root>
	);
}

function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof RadixScrollArea.Scrollbar>) {
	return (
		<RadixScrollArea.Scrollbar
			data-slot="scroll-bar"
			orientation={orientation}
			className={cn(
				"flex touch-none p-px transition-colors duration-150",
				orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
				orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
				className,
			)}
			{...props}
		>
			<RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-fr-border" />
		</RadixScrollArea.Scrollbar>
	);
}

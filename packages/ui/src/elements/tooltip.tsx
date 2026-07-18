import { Tooltip as RadixTooltip } from "radix-ui";
import { cn } from "../lib/cn";

export function TooltipProvider(props: React.ComponentProps<typeof RadixTooltip.Provider>) {
	return <RadixTooltip.Provider {...props} />;
}

export function Tooltip(props: React.ComponentProps<typeof RadixTooltip.Root>) {
	return <RadixTooltip.Root {...props} />;
}

export function TooltipTrigger(props: React.ComponentProps<typeof RadixTooltip.Trigger>) {
	return <RadixTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
	className,
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof RadixTooltip.Content>) {
	return (
		<RadixTooltip.Portal>
			<RadixTooltip.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn(
					"z-50 overflow-hidden rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-xs text-fr-text shadow-md",
					"animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className,
				)}
				{...props}
			/>
		</RadixTooltip.Portal>
	);
}

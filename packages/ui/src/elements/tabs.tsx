import { cva } from "class-variance-authority";
import { Tabs as RadixTabs } from "radix-ui";
import { createContext, use } from "react";
import { cn } from "../lib/cn";

/**
 * The prototype ships two tab looks, now unified under one primitive:
 *  - `segmented` — the rail mode-tabs (`.tab`): a bordered pill of equal-width
 *    triggers, 12.5px / medium, active fill on `surface-3`.
 *  - `dock` — the panel dock-tabs (`.dock-tab`): an auto-width row, 12px /
 *    regular, active fill on `surface-2`, no surrounding pill.
 *
 * Set `variant` once on <Tabs>; <TabsList> and <TabsTrigger> inherit it via
 * context so consumers never thread it through every trigger.
 */
export type TabsVariant = "segmented" | "dock";

const TabsVariantContext = createContext<TabsVariant>("segmented");

export interface TabsProps extends React.ComponentProps<typeof RadixTabs.Root> {
	readonly variant?: TabsVariant;
}

export function Tabs({ className, variant = "segmented", ...props }: TabsProps) {
	return (
		<TabsVariantContext.Provider value={variant}>
			<RadixTabs.Root data-slot="tabs" data-variant={variant} className={cn(className)} {...props} />
		</TabsVariantContext.Provider>
	);
}

const listVariants = cva("flex items-center", {
	variants: {
		variant: {
			segmented: "gap-0.5 rounded-[9px] border border-fr-border-soft bg-fr-surface p-[3px]",
			dock: "gap-[2px]",
		},
	},
	defaultVariants: { variant: "segmented" },
});

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
	const variant = use(TabsVariantContext);
	return <RadixTabs.List data-slot="tabs-list" className={cn(listVariants({ variant }), className)} {...props} />;
}

const triggerVariants = cva(
	"flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fr-accent-line",
	{
		variants: {
			variant: {
				segmented:
					"flex-1 justify-center rounded-[6px] px-0 py-1.5 text-fr-sm font-medium text-fr-text-2 duration-150 [&_svg]:size-[13px] hover:text-fr-text data-[state=active]:bg-fr-surface-3 data-[state=active]:text-fr-text",
				dock: "rounded-[7px] px-[9px] py-1.5 text-fr-sm text-fr-text-2 duration-[120ms] [&_svg]:size-[14px] hover:bg-fr-surface hover:text-fr-text data-[state=active]:bg-fr-surface-2 data-[state=active]:text-fr-text",
			},
		},
		defaultVariants: { variant: "segmented" },
	},
);

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
	const variant = use(TabsVariantContext);
	return (
		<RadixTabs.Trigger data-slot="tabs-trigger" className={cn(triggerVariants({ variant }), className)} {...props} />
	);
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RadixTabs.Content>) {
	return <RadixTabs.Content data-slot="tabs-content" className={cn("mt-2", className)} {...props} />;
}

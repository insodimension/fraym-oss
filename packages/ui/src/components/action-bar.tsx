import { Icon, type IconName } from "../icons";
import { cn } from "../lib/cn";

export interface ActionItem {
	readonly label: string;
	readonly icon?: IconName;
	readonly variant?: "accent" | "outline" | "ghost";
	readonly onClick?: () => void;
}

export interface ActionBarProps {
	readonly items: readonly ActionItem[];
	readonly className?: string;
}

export function ActionBar({ items, className }: ActionBarProps) {
	return (
		<div data-slot="action-bar" className={cn("flex gap-2", className)}>
			{items.map((it, i) => {
				const isOutline = !it.variant || it.variant === "outline";
				return (
					<button
						key={i}
						type="button"
						className={cn(
							"inline-flex items-center gap-[7px] rounded-[8px] border px-[13px] py-[7px] text-fr-sm font-medium transition-colors duration-[120ms]",
							it.variant === "accent" &&
								"border-transparent bg-fr-accent font-semibold text-fr-accent-ink hover:bg-fr-accent-2",
							it.variant === "ghost" &&
								"border-transparent bg-transparent text-fr-text-2 hover:bg-fr-surface hover:text-fr-text",
							isOutline &&
								"border-fr-border bg-fr-surface text-fr-text hover:border-[var(--fr-btn-hover-bd)] hover:bg-fr-surface-2",
						)}
						onClick={it.onClick}
					>
						{it.icon && <Icon name={it.icon} size={13} strokeWidth={2} />}
						{it.label}
					</button>
				);
			})}
		</div>
	);
}

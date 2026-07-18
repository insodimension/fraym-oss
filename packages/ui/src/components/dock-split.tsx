import { Icon } from "../icons";
import { cn } from "../lib/cn";

export interface DockSplitProps {
	/** Label shown on the main button (e.g. the active dock tab). */
	readonly label: React.ReactNode;
	/** Fired when the main (panel) button is pressed. */
	readonly onToggle?: React.MouseEventHandler<HTMLButtonElement>;
	/** Fired when the caret button is pressed (opens the tab menu). */
	readonly onCaret?: React.MouseEventHandler<HTMLButtonElement>;
	readonly className?: string;
}

/** .dock-split — segmented panel toggle + caret menu used in the top bar's actions. */
export function DockSplit({ label, onToggle, onCaret, className }: DockSplitProps) {
	return (
		<div
			data-slot="dock-split"
			className={cn(
				"dock-split",
				"flex items-center overflow-hidden rounded-lg border border-fr-border bg-fr-surface",
				className,
			)}
		>
			{/* .ds-main */}
			<button
				type="button"
				data-slot="dock-split-main"
				onClick={onToggle}
				className="ds-main flex h-[30px] items-center gap-[7px] px-2.5 text-xs text-fr-text-2 hover:text-fr-text"
			>
				<Icon name="panel" size={14} strokeWidth={1.8} />
				{label}
			</button>
			{/* .ds-car */}
			<button
				type="button"
				data-slot="dock-split-caret"
				onClick={onCaret}
				className="ds-car flex h-[30px] w-[26px] items-center justify-center border-l border-fr-border text-fr-text-3 hover:bg-fr-surface-2 hover:text-fr-text"
			>
				<Icon name="caretD" size={13} strokeWidth={2} />
			</button>
		</div>
	);
}

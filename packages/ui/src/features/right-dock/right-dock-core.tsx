import { type Placement, PopoverHeading, PopoverPanel, PopoverRow } from "../../elements/popover";
import { Icon } from "../../icons/icon";
import type { IconName } from "../../icons/paths";
import { BodyPortal } from "../../lib/body-portal";
import { cn } from "../../lib/cn";

export interface DockTab {
	readonly id: string;
	readonly label: string;
	readonly icon: IconName;
	readonly badge?: number;
}

const DOCK_SHORTCUTS: Record<string, string> = {
	preview: "Shift+Cmd+P",
	diff: "Shift+Cmd+D",
	terminal: "Ctrl+`",
	files: "Shift+Cmd+F",
};

export interface RightDockProps {
	readonly onResizeStart?: (event: React.PointerEvent<HTMLButtonElement>) => void;
	readonly children: React.ReactNode;
	readonly className?: string;
}

/** The right dock frame: resize handle + the active panel. It renders NO tab
 *  strip — switching (and closing) lives in the workspace top bar's dock chip
 *  + DockSwitchMenu, so the whole dock height belongs to the panel. */
export function RightDock({ onResizeStart, children, className }: RightDockProps) {
	return (
		<aside
			data-slot="right-dock"
			className={cn(
				"relative flex h-full min-h-0 flex-col overflow-hidden border-l border-fr-border-soft bg-fr-rail",
				className,
			)}
		>
			{onResizeStart && (
				<button
					type="button"
					aria-label="Resize right panel"
					data-slot="right-dock-resize-handle"
					onPointerDown={onResizeStart}
					className="absolute inset-y-0 left-0 z-20 w-4 -translate-x-2 cursor-col-resize border-0 bg-transparent p-0 touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-fr-border-soft before:transition-[background-color,width] before:duration-[var(--fr-motion-fast)] hover:before:w-0.5 hover:before:bg-fr-accent focus-visible:outline-none focus-visible:before:w-0.5 focus-visible:before:bg-fr-accent"
				/>
			)}
			<div className="flex min-h-0 flex-1 flex-col">
				<div data-slot="right-dock-content" className="mt-0 flex min-h-0 flex-1 flex-col">
					{children}
				</div>
			</div>
		</aside>
	);
}

export interface DockPreviewProps {
	readonly url?: string;
	readonly src?: string;
	readonly title?: string;
	readonly subtitle?: string;
	readonly className?: string;
}

export function DockPreview({
	url = "localhost:3000/auth/login",
	src,
	title = "Live preview",
	subtitle = "Coming soon",
	className,
}: DockPreviewProps) {
	return (
		<div data-slot="dock-preview" className={cn("p-3.5", className)}>
			{src ? (
				<div className="mb-3 flex items-center gap-2 rounded-lg border border-fr-border bg-fr-surface px-2.5 py-1.5">
					<span className="size-2 rounded-full bg-fr-add" />
					<span className="min-w-0 flex-1 fr-overflow font-secondary text-fr-xs text-fr-text-2">{url}</span>
					<Icon name="history" size={13} strokeWidth={1.8} className="text-fr-text-3" />
				</div>
			) : null}
			{src ? (
				<iframe
					title={title}
					src={src}
					sandbox="allow-scripts allow-forms"
					className="h-[260px] w-full rounded-[10px] border border-fr-border bg-white"
				/>
			) : (
				<div className="flex h-[260px] flex-col items-center justify-center gap-2.5 rounded-[10px] border border-fr-border bg-fr-bg bg-[repeating-linear-gradient(45deg,var(--fr-surface)_0_10px,transparent_10px_20px)] font-secondary text-fr-xs text-fr-text-3">
					<Icon name="eye" size={28} strokeWidth={1.5} />
					<span className="text-fr-base text-fr-text-2">{title}</span>
					<span>{subtitle}</span>
				</div>
			)}
		</div>
	);
}

export interface DockSwitchMenuProps {
	readonly tabs: readonly DockTab[];
	readonly activeTab: string;
	readonly onPick: (id: string) => void;
	readonly onClose: () => void;
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly className?: string;
}

export function DockSwitchMenu({
	tabs,
	activeTab,
	onPick,
	onClose,
	anchorRect,
	place = "below-right",
	className,
}: DockSwitchMenuProps) {
	return (
		<>
			<BodyPortal>
				<button type="button" aria-label="Close dock switcher" className="fixed inset-0 z-40" onClick={onClose} />
			</BodyPortal>
			<PopoverPanel
				data-slot="dock-switch-menu"
				width={232}
				anchorRect={anchorRect}
				place={place}
				className={className}
			>
				<PopoverHeading>Dock panel</PopoverHeading>
				{tabs.map(tab => (
					<PopoverRow
						key={tab.id}
						icon={<Icon name={tab.icon} size={15} strokeWidth={1.8} />}
						label={tab.label}
						value={activeTab === tab.id ? "active" : DOCK_SHORTCUTS[tab.id]}
						valueAccent={activeTab === tab.id}
						onClick={() => onPick(tab.id)}
					/>
				))}
			</PopoverPanel>
		</>
	);
}

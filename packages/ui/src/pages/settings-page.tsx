import type { ReactNode } from "react";
import { Icon } from "../icons/icon";
import type { IconName } from "../icons/paths";
import { cn } from "../lib/cn";
import { SettingsGroup, SettingsRow, SettingsSub, SettingsTitle } from "./settings-page/settings-controls";

export {
	EngineConnectionsPane,
	type EngineConnectionsPaneProps,
	ProviderPreferencesPane,
	type ProviderPreferencesPaneProps,
} from "./settings-page/engine-connections-pane";
export { EngineModelPane, type EngineModelPaneProps } from "./settings-page/engine-model-pane";
export { ProfilePane, type ProfilePaneProps, type ProfileStat } from "./settings-page/profile-pane";
export {
	Segmented,
	type SegmentedProps,
	SettingsGroup,
	SettingsRow,
	type SettingsRowProps,
	SettingsSub,
	SettingsTitle,
} from "./settings-page/settings-controls";

export interface SettingsNavItem {
	readonly id: string;
	readonly label: string;
	readonly icon: IconName;
}

export interface SettingsPageProps {
	readonly navItems: readonly SettingsNavItem[];
	readonly activePane: string;
	readonly onPaneChange: (id: string) => void;
	readonly onBack: () => void;
	readonly children: ReactNode;
	readonly className?: string;
}

const SHORTCUTS = [
	["Open command palette", "⌘K"],
	["New session", "⌘N"],
	["Toggle right panel", "⇧⌘P"],
	["Show diff", "⇧⌘D"],
	["Focus terminal", "⌃`"],
	["Open settings", "⌘,"],
	["Send message", "⌘↵"],
	["Search sessions", "⌘F"],
] as const;

export function SettingsPage({ navItems, activePane, onPaneChange, onBack, children, className }: SettingsPageProps) {
	return (
		<div
			data-slot="settings-page"
			className={cn(
				"grid h-full min-h-0 w-full min-w-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] bg-fr-bg sm:grid-cols-[248px_1fr] sm:grid-rows-[minmax(0,1fr)]",
				className,
			)}
		>
			<nav className="flex min-w-0 gap-1 overflow-x-auto border-b border-fr-border-soft bg-fr-rail px-2.5 py-2.5 sm:flex-col sm:gap-0 sm:overflow-y-auto sm:border-r sm:border-b-0 sm:py-3.5">
				<button
					type="button"
					className="flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-fr-base font-medium text-fr-text hover:bg-fr-surface sm:mb-2.5"
					onClick={onBack}
				>
					<Icon name="back" size={16} strokeWidth={2} />
					Back to app
				</button>
				{navItems.map(n => (
					<button
						key={n.id}
						type="button"
						className={cn(
							"flex shrink-0 items-center gap-[11px] rounded-lg px-2.5 py-2 text-left text-fr-base text-fr-text-2 transition-[background-color,color] duration-[120ms]",
							"hover:bg-fr-surface hover:text-fr-text",
							activePane === n.id && "bg-fr-surface-2 text-fr-text",
						)}
						onClick={() => onPaneChange(n.id)}
					>
						<Icon name={n.icon} size={15} strokeWidth={1.8} className="shrink-0 opacity-85" />
						{n.label}
					</button>
				))}
			</nav>
			<div className="min-w-0 overflow-y-auto px-4 py-5 pb-20 sm:px-14 sm:py-10">
				<div className="mx-auto max-w-[980px]">{children}</div>
			</div>
		</div>
	);
}

export {
	AdvancedConfigExplorer,
	type AdvancedConfigExplorerProps,
} from "./settings-page/advanced-config-explorer";
export {
	EngineConfigPane,
	type EngineConfigPaneProps,
	StackedEngineConfigPane,
	type StackedEngineConfigPaneProps,
} from "./settings-page/engine-config-pane";
export {
	AppearancePane,
	type AppearancePaneProps,
	GeneralPane,
	type GeneralPaneProps,
} from "./settings-page/experience-panes";

export function ShortcutsPane() {
	return (
		<div>
			<SettingsTitle>Keyboard shortcuts</SettingsTitle>
			<SettingsSub>Defaults — rebinding coming soon.</SettingsSub>
			<SettingsGroup>
				{SHORTCUTS.map(([name, key]) => (
					<SettingsRow key={name as string} name={name as string}>
						<span className="rounded-[7px] border border-fr-border bg-fr-surface px-[9px] py-1 font-secondary text-xs text-fr-text-2">
							{key}
						</span>
					</SettingsRow>
				))}
			</SettingsGroup>
		</div>
	);
}

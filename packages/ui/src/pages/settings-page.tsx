import type { ReactNode } from "react";
import { Icon } from "../icons/icon";
import type { IconName } from "../icons/paths";
import { cn } from "../lib/cn";

// Full-page settings surface: a fixed left nav ("Back to app" + pane items)
// beside a scrolling content column. Hosts own the pane catalog and the
// active-pane state; this component only renders the chrome.

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
				{navItems.map(item => (
					<button
						key={item.id}
						type="button"
						className={cn(
							"flex shrink-0 items-center gap-[11px] rounded-lg px-2.5 py-2 text-left text-fr-base text-fr-text-2 transition-[background-color,color] duration-[120ms]",
							"hover:bg-fr-surface hover:text-fr-text",
							activePane === item.id && "bg-fr-surface-2 text-fr-text",
						)}
						onClick={() => onPaneChange(item.id)}
					>
						<Icon name={item.icon} size={15} strokeWidth={1.8} className="shrink-0 opacity-85" />
						{item.label}
					</button>
				))}
			</nav>
			<div className="min-w-0 overflow-y-auto px-4 py-5 pb-20 sm:px-14 sm:py-10">
				<div className="mx-auto max-w-[980px]">{children}</div>
			</div>
		</div>
	);
}

export function SettingsTitle({ children }: { readonly children: ReactNode }) {
	return <h1 className="mb-1 text-fr-2xl font-display font-semibold tracking-[-0.01em]">{children}</h1>;
}

export function SettingsSub({ children }: { readonly children: ReactNode }) {
	return <p className="mb-7 text-fr-base text-fr-text-2">{children}</p>;
}

export function SettingsGroup({ heading, children }: { readonly heading?: string; readonly children: ReactNode }) {
	return (
		<div className="mb-[30px]">
			{heading && <div className="mb-3 fr-eyebrow">{heading}</div>}
			{children}
		</div>
	);
}

export interface SettingsRowProps {
	readonly name: string;
	readonly desc?: string;
	readonly stack?: boolean;
	readonly children?: ReactNode;
}

export function SettingsRow({ name, desc, stack, children }: SettingsRowProps) {
	return (
		<div
			data-slot="settings-row"
			className={cn("flex gap-4 border-t border-fr-border-soft py-3.5", stack ? "flex-col items-start" : "items-center")}
		>
			<div className="min-w-0 flex-1">
				<div className="text-fr-base font-medium">{name}</div>
				{desc && <div className="mt-0.5 text-xs text-fr-text-3">{desc}</div>}
			</div>
			{children}
		</div>
	);
}

export interface SegmentedProps<T extends string> {
	readonly options: readonly T[];
	readonly value: T;
	readonly onChange: (value: T) => void;
	readonly className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
	return (
		<div
			data-slot="segmented"
			className={cn("flex shrink-0 gap-0.5 rounded-lg border border-fr-border bg-fr-surface p-[3px]", className)}
		>
			{options.map(option => (
				<button
					key={option}
					type="button"
					aria-pressed={value === option}
					className={cn(
						"rounded-md px-3 py-[5px] font-secondary text-xs text-fr-text-2",
						value === option && "bg-fr-surface-3 text-fr-text",
					)}
					onClick={() => onChange(option)}
				>
					{option}
				</button>
			))}
		</div>
	);
}

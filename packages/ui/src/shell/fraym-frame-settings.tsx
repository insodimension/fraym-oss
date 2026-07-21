import { type AvatarId, Presence } from "@fraym-ai/vibr";
import type { ComponentProps } from "react";
import { AvatarSelect } from "../components";
import { applyGate, useDeploymentGates } from "../deployment-gates";
import { type ToolDefaultOpen, ToolDisplaySettingsProvider } from "../features";
import { AppearancePane, GeneralPane, ProfilePane, type SettingsNavItem, SettingsPage, ShortcutsPane } from "../pages";
import { AVATAR_OPTIONS } from "./shell-data";
import type { FraymSettingsPanel } from "./types";

type AppearanceProps = ComponentProps<typeof AppearancePane>;
type ToolDisplaySettings = ComponentProps<typeof ToolDisplaySettingsProvider>["settings"];

function avatarPreview(id: AvatarId) {
	return id === "none" ? (
		<span className="text-fr-xl font-light text-fr-text-3">-</span>
	) : (
		<Presence avatar={id} state="thinking" mode="think" />
	);
}

export interface FraymFrameSettingsViewProps {
	readonly toolDisplaySettings: ToolDisplaySettings;
	readonly settingsNavItems: readonly SettingsNavItem[];
	readonly settingsPane: string;
	readonly activeSettingsPanel: FraymSettingsPanel | undefined;
	readonly userName: string;
	readonly userEmail: string;
	readonly userAvatarUrl?: string;
	readonly theme: AppearanceProps["theme"];
	readonly accent: AppearanceProps["accent"];
	readonly avatar: AvatarId;
	readonly vibrEnabled: boolean;
	readonly showAvatars: boolean;
	readonly toolDefaultOpen: ToolDefaultOpen;
	readonly onPaneChange: (pane: string) => void;
	readonly onBack: () => void;
	readonly onThemeChange: AppearanceProps["onThemeChange"];
	readonly onAccentChange: AppearanceProps["onAccentChange"];
	readonly onAvatarChange: (avatar: AvatarId) => void;
	readonly onVibrEnabledChange: (enabled: boolean) => void;
	readonly onShowAvatarsChange: (show: boolean) => void;
	readonly onToolDefaultOpenChange: (value: ToolDefaultOpen) => void;
}

function AppearanceSettingsPane({
	theme,
	accent,
	avatar,
	vibrEnabled,
	showAvatars,
	onThemeChange,
	onAccentChange,
	onAvatarChange,
	onVibrEnabledChange,
	onShowAvatarsChange,
}: Pick<
	FraymFrameSettingsViewProps,
	| "theme"
	| "accent"
	| "avatar"
	| "vibrEnabled"
	| "showAvatars"
	| "onThemeChange"
	| "onAccentChange"
	| "onAvatarChange"
	| "onVibrEnabledChange"
	| "onShowAvatarsChange"
>) {
	const { enabledAvatars } = useDeploymentGates();
	const avatarOptions = applyGate(AVATAR_OPTIONS, enabledAvatars);
	return (
		<AppearancePane
			theme={theme}
			accent={accent}
			onThemeChange={onThemeChange}
			onAccentChange={onAccentChange}
			avatar={avatar}
			onAvatarChange={id => onAvatarChange(id as AvatarId)}
			vibrEnabled={vibrEnabled}
			onVibrEnabledChange={onVibrEnabledChange}
			showAvatars={showAvatars}
			onShowAvatarsChange={onShowAvatarsChange}
			avatarPicker={
				<AvatarSelect
					value={avatar}
					onChange={id => onAvatarChange(id as AvatarId)}
					options={avatarOptions.map(option => ({
						id: option.id,
						label: option.label,
						preview: avatarPreview(option.id),
					}))}
				/>
			}
		/>
	);
}

function SettingsPaneContent(props: FraymFrameSettingsViewProps) {
	if (props.activeSettingsPanel) return <>{props.activeSettingsPanel.render()}</>;
	switch (props.settingsPane) {
		case "general":
			return (
				<GeneralPane
					toolDefaultOpen={props.toolDefaultOpen}
					onToolDefaultOpenChange={props.onToolDefaultOpenChange}
				/>
			);
		case "profile":
			return <ProfilePane name={props.userName} handle={props.userEmail} avatarUrl={props.userAvatarUrl} />;
		case "appearance":
			return <AppearanceSettingsPane {...props} />;
		case "keyboard":
			return <ShortcutsPane />;
		default:
			return (
				<div>
					<h1 className="mb-1 text-fr-2xl font-semibold tracking-tight">
						{props.settingsNavItems.find(item => item.id === props.settingsPane)?.label}
					</h1>
					<p className="text-fr-base text-fr-text-2">This setting is unavailable in the connected host.</p>
				</div>
			);
	}
}

export function FraymFrameSettingsView(props: FraymFrameSettingsViewProps) {
	return (
		<ToolDisplaySettingsProvider settings={props.toolDisplaySettings}>
			<SettingsPage
				navItems={props.settingsNavItems}
				activePane={props.settingsPane}
				onPaneChange={props.onPaneChange}
				onBack={props.onBack}
			>
				<SettingsPaneContent {...props} />
			</SettingsPage>
		</ToolDisplaySettingsProvider>
	);
}

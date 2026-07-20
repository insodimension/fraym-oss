import {
	type CollapseMode,
	type ComposerSendMode,
	type Density,
	type MdBoldColor,
	STREAM_WISP_PRESETS,
	type StartupView,
	type StreamWispPreset,
	type VerberProfileSetting,
} from "@fraym/config";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { StreamWispSelect } from "../../components/stream-wisp-select";
import { Toggle } from "../../elements/toggle";
import type { ToolDefaultOpen } from "../../features/tool-card";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { useSettings } from "../../settings/use-settings";
import { FONT_PRESETS, fontFamilyLabel } from "../../theme/font-presets";
import { accents } from "../../theme/palettes";
import { DEFAULT_THEME_ID, findThemePreset, THEME_PRESETS, themeVariantFor } from "../../theme/theme-presets";
import type { AccentPalette, ThemeMode } from "../../theme/tokens";
import { useTheme } from "../../theme/use-theme";
import {
	NumberInput,
	Segmented,
	SettingsGroup,
	SettingsRow,
	SettingsSub,
	SettingsTitle,
	Slider,
} from "./settings-controls";

export interface AppearancePaneProps {
	readonly theme: ThemeMode;
	readonly accent: AccentPalette;
	readonly onThemeChange: (mode: ThemeMode) => void;
	readonly onAccentChange: (accent: AccentPalette) => void;
	readonly avatar?: string;
	readonly onAvatarChange?: (id: string) => void;
	readonly avatarPicker?: ReactNode;
	readonly vibrEnabled?: boolean;
	readonly onVibrEnabledChange?: (enabled: boolean) => void;
	readonly showAvatars?: boolean;
	readonly onShowAvatarsChange?: (show: boolean) => void;
}

const THEME_MODE_OPTIONS = [
	["light", "sun", "Light"],
	["dark", "moon", "Dark"],
	["system", "computer", "System"],
] as const satisfies readonly (readonly [ThemeMode, IconName, string])[];

type MotionMode = "System" | "On" | "Off";
type DiffMode = "Color" | "+/−";
type ToolDefaultOpenLabel = "None" | "Running" | "Failed" | "All";
type DensityLabel = "Compact" | "Comfortable" | "Spacious";
type VerberProfileLabel = "TUI" | "Codex" | "Expressive" | "Quiet";
const DENSITY_BY_LABEL: Record<DensityLabel, Density> = {
	Compact: "compact",
	Comfortable: "comfortable",
	Spacious: "spacious",
};
const DENSITY_LABEL: Record<Density, DensityLabel> = {
	compact: "Compact",
	comfortable: "Comfortable",
	spacious: "Spacious",
};

const TOOL_DEFAULT_OPEN_OPTIONS = ["None", "Running", "Failed", "All"] as const;
const TOOL_DEFAULT_OPEN_BY_LABEL: Record<ToolDefaultOpenLabel, ToolDefaultOpen> = {
	None: "none",
	Running: "running",
	Failed: "failed",
	All: "all",
};
const TOOL_DEFAULT_OPEN_LABEL: Record<ToolDefaultOpen, ToolDefaultOpenLabel> = {
	none: "None",
	running: "Running",
	failed: "Failed",
	all: "All",
};
type CollapseModeLabel = "Worked for Xs" | "Simple count";
const COLLAPSE_MODE_OPTIONS = ["Worked for Xs", "Simple count"] as const;
const COLLAPSE_MODE_BY_LABEL: Record<CollapseModeLabel, CollapseMode> = {
	"Worked for Xs": "worked",
	"Simple count": "simple",
};
const COLLAPSE_MODE_LABEL: Record<CollapseMode, CollapseModeLabel> = {
	worked: "Worked for Xs",
	simple: "Simple count",
};
const VERBER_PROFILE_BY_LABEL: Record<VerberProfileLabel, VerberProfileSetting> = {
	TUI: "tui",
	Codex: "codex",
	Expressive: "expressive",
	Quiet: "quiet",
};
const VERBER_PROFILE_LABEL: Record<VerberProfileSetting, VerberProfileLabel> = {
	tui: "TUI",
	codex: "Codex",
	expressive: "Expressive",
	quiet: "Quiet",
};

function useAppearancePaneState() {
	const { config, update } = useSettings();
	const { motion: motionPref, setMotion: setMotionPref } = useTheme();
	return {
		config,
		update,
		setMotionPref,
		fontPreset: config.fontPreset,
		translucent: config.translucentSidebar,
		contrast: config.contrast,
		pointer: config.pointerCursors,
		motion: motionPref === "reduced" ? "On" : motionPref === "full" ? "Off" : "System",
		uiSize: String(config.uiFontSize),
		codeSize: String(config.codeFontSize),
		diff: (config.diffMarkers === "symbols" ? "+/−" : "Color") as DiffMode,
		verberProfileLabel: VERBER_PROFILE_LABEL[config.verberProfile],
	} satisfies {
		readonly config: ReturnType<typeof useSettings>["config"];
		readonly update: SettingsUpdate;
		readonly setMotionPref: MotionUpdate;
		readonly fontPreset: string;
		readonly translucent: boolean;
		readonly contrast: number;
		readonly pointer: boolean;
		readonly motion: MotionMode;
		readonly uiSize: string;
		readonly codeSize: string;
		readonly diff: DiffMode;
		readonly verberProfileLabel: VerberProfileLabel;
	};
}

export function AppearancePane({
	theme,
	accent,
	onThemeChange,
	onAccentChange,
	avatarPicker,
	vibrEnabled = true,
	onVibrEnabledChange,
	showAvatars = false,
	onShowAvatarsChange,
}: AppearancePaneProps) {
	const state = useAppearancePaneState();
	const config = state.config;
	const diff: DiffMode = config.diffMarkers === "symbols" ? "+/−" : "Color";

	return (
		<div>
			<SettingsTitle>Appearance</SettingsTitle>
			<SettingsSub>Use light, dark, or match your system. Changes apply live.</SettingsSub>

			<AppearanceThemeSelector theme={theme} onThemeChange={onThemeChange} />

			<SettingsGroup heading="Theme">
				<ThemeSelectRow />
			</SettingsGroup>

			<AppearancePreview accent={accent} contrast={state.contrast} />

			<AppearancePreferencesGroup
				accent={accent}
				avatarPicker={avatarPicker}
				vibrEnabled={vibrEnabled}
				onVibrEnabledChange={onVibrEnabledChange}
				showAvatars={showAvatars}
				fontPreset={state.fontPreset}
				translucent={state.translucent}
				contrast={state.contrast}
				verberProfileLabel={state.verberProfileLabel}
				onAccentChange={onAccentChange}
				onShowAvatarsChange={onShowAvatarsChange}
				onUpdate={state.update}
			/>

			<SettingsGroup heading="Motion & layout">
				<PointerCursorRow pointer={state.pointer} onUpdate={state.update} />
				<MotionPreferenceRow motion={state.motion} onMotionChange={state.setMotionPref} />
				<AppearanceFontSizeRows state={state} />
				<SettingsRow name="Diff markers" desc="Colored bars and backgrounds, or +/− symbols per line">
					<Segmented
						options={["Color", "+/−"] as const}
						value={diff}
						onChange={value => state.update("diffMarkers", value === "+/−" ? "symbols" : "color")}
					/>
				</SettingsRow>
			</SettingsGroup>
		</div>
	);
}

const THEME_PRESET_OPTIONS = [
	{ id: DEFAULT_THEME_ID, name: "Fraym", note: "Default · violet accent" },
	...THEME_PRESETS.map(preset => ({ id: preset.id, name: preset.name, note: preset.note })),
];

const FRAYM_SWATCH = {
	dark: { bg: "#0b0b0d", surface: "#151518", border: "#27272c", accent: "#b78cff" },
	light: { bg: "#fbfbfa", surface: "#ffffff", border: "#e0ded9", accent: "#7c4ddd" },
} as const;

function themeSwatch(id: string, mode: "dark" | "light") {
	if (id === DEFAULT_THEME_ID) return FRAYM_SWATCH[mode];
	const preset = findThemePreset(id);
	if (!preset) return FRAYM_SWATCH[mode];
	const variant = preset[mode];
	return { bg: variant.bg, surface: variant.surface, border: variant.border, accent: variant.accent };
}

function ThemeSwatch({ id, mode }: { readonly id: string; readonly mode: "dark" | "light" }) {
	const s = themeSwatch(id, mode);
	return (
		<span
			className="inline-flex shrink-0 items-center gap-px overflow-hidden rounded-md border border-fr-border p-px"
			style={{ background: s.bg }}
		>
			<span className="size-3 rounded-[3px]" style={{ background: s.surface }} />
			<span className="size-3 rounded-[3px]" style={{ background: s.accent }} />
		</span>
	);
}

function useDropdownDisclosure() {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onClick = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, [open]);
	return { open, ref, setOpen };
}

function ThemePresetOption({
	option,
	value,
	mode,
	onSelect,
}: {
	readonly option: (typeof THEME_PRESET_OPTIONS)[number];
	readonly value: string;
	readonly mode: "dark" | "light";
	readonly onSelect: (id: string) => void;
}) {
	const selected = value === option.id;
	return (
		<button
			type="button"
			onClick={() => onSelect(option.id)}
			className={cn(
				"flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-fr-accent-dim",
				selected && "bg-fr-accent-dim",
			)}
		>
			<ThemeSwatch id={option.id} mode={mode} />
			<span className="min-w-0 flex-1">
				<span className="block fr-overflow text-fr-base text-fr-text">{option.name}</span>
				<span className="block fr-overflow text-fr-2xs text-fr-text-3">{option.note}</span>
			</span>
			{selected && <Icon name="check" size={13} className="shrink-0 text-fr-accent" />}
		</button>
	);
}

function ThemeSelectRow() {
	const { config, update } = useSettings();
	const { resolvedMode } = useTheme();
	const { open, ref, setOpen } = useDropdownDisclosure();
	const value = config.themePreset || DEFAULT_THEME_ID;
	const current = THEME_PRESET_OPTIONS.find(option => option.id === value) ?? THEME_PRESET_OPTIONS[0]!;
	const selectThemePreset = (id: string) => {
		update("themePreset", id === DEFAULT_THEME_ID ? "" : id);
		setOpen(false);
	};
	return (
		<SettingsRow
			name="Theme"
			desc="Full color theme — each ships a light and dark variant; the mode toggle above picks which"
		>
			<div ref={ref} className="relative flex shrink-0 items-center">
				<button
					type="button"
					onClick={() => setOpen(state => !state)}
					className="inline-flex w-[220px] items-center justify-between gap-2 rounded-lg border border-fr-border bg-fr-surface px-[11px] py-2 text-fr-sm text-fr-text transition-colors hover:border-fr-text-3"
				>
					<span className="flex min-w-0 items-center gap-2">
						<ThemeSwatch id={value} mode={resolvedMode} />
						<span className="fr-overflow">{current.name}</span>
					</span>
					<Icon name="caretD" size={12} className="shrink-0 text-fr-text-3" />
				</button>
				{open && (
					<div
						data-slot="settings-dropdown"
						className="absolute right-0 top-full z-50 mt-1.5 max-h-[320px] w-[260px] overflow-y-auto rounded-xl border border-fr-border bg-fr-surface-2 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
					>
						{THEME_PRESET_OPTIONS.map(option => (
							<ThemePresetOption
								key={option.id}
								option={option}
								value={value}
								mode={resolvedMode}
								onSelect={selectThemePreset}
							/>
						))}
					</div>
				)}
			</div>
		</SettingsRow>
	);
}

type SettingsUpdate = ReturnType<typeof useSettings>["update"];
type MotionUpdate = ReturnType<typeof useTheme>["setMotion"];

function AppearanceThemeSelector({
	theme,
	onThemeChange,
}: {
	readonly theme: ThemeMode;
	readonly onThemeChange: (mode: ThemeMode) => void;
}) {
	return (
		<div className="mb-[18px] flex items-center gap-4">
			<div className="min-w-0 flex-1">
				<div className="text-sm font-semibold text-fr-text">Theme</div>
				<div className="mt-0.5 text-fr-sm text-fr-text-2">Use light, dark, or match your system</div>
			</div>
			<div className="flex shrink-0 gap-0.5 rounded-[9px] border border-fr-border bg-fr-surface p-[3px]">
				{THEME_MODE_OPTIONS.map(([id, ic, lbl]) => (
					<button
						key={id}
						type="button"
						className={cn(
							"flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-fr-sm text-fr-text-2 transition-colors duration-[120ms]",
							theme === id ? "bg-fr-surface-3 text-fr-text" : "hover:text-fr-text",
						)}
						onClick={() => onThemeChange(id)}
					>
						<Icon name={ic} size={14} strokeWidth={1.8} />
						{lbl}
					</button>
				))}
			</div>
		</div>
	);
}

/** The base accent painted at theme.css `:root` — the Fraym default, and the hue
 *  every theme inherits in "theme" follow-mode when it doesn't pin its own. */
const THEME_FOLLOW_BASE_ACCENT = "#7a60c1";

/** Accent the active theme paints in "theme" follow-mode: an accent-owning preset's
 *  signature hue, else the Fraym base. Drives the "Theme" swatch + the live preview
 *  so both show the real follow-mode color rather than a placeholder. */
function resolveThemeAccentValue(themePresetId: string, mode: "dark" | "light"): string {
	const preset = themePresetId && themePresetId !== DEFAULT_THEME_ID ? findThemePreset(themePresetId) : undefined;
	if (preset && !preset.inheritAccent) return themeVariantFor(preset, mode).accent;
	return THEME_FOLLOW_BASE_ACCENT;
}

function AppearancePreview({ accent, contrast }: { readonly accent: AccentPalette; readonly contrast: number }) {
	const { config } = useSettings();
	const { resolvedMode } = useTheme();
	const accentValue =
		accent === "theme" ? resolveThemeAccentValue(config.themePreset, resolvedMode) : accents[accent].value;
	return (
		<div className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-fr-border">
			<AppearancePreviewPanel surface="sidebar" accent="#2563eb" contrast={42} tone="del" />
			<AppearancePreviewPanel surface="elevated" accent={accentValue} contrast={contrast} tone="add" />
		</div>
	);
}

function AppearancePreviewPanel({
	surface,
	accent,
	contrast,
	tone,
}: {
	readonly surface: string;
	readonly accent: string;
	readonly contrast: number;
	readonly tone: "add" | "del";
}) {
	return (
		<div
			className={cn(
				"p-3.5 font-secondary text-fr-xs leading-[1.7]",
				tone === "del" && "border-r border-fr-border-soft bg-fr-del-bg",
				tone === "add" && "bg-fr-add-bg",
			)}
		>
			<PreviewLine line={2} keyName="surface" value={surface} />
			<PreviewLine line={3} keyName="accent" value={accent} />
			<PreviewLine line={4} keyName="contrast" value={String(contrast)} quoted={false} />
		</div>
	);
}

function PreviewLine({
	line,
	keyName,
	value,
	quoted = true,
}: {
	readonly line: number;
	readonly keyName: string;
	readonly value: string;
	readonly quoted?: boolean;
}) {
	return (
		<div>
			<span className="mr-3 text-fr-text-3">{line}</span>
			<span className="text-fr-accent">{keyName}</span>:{" "}
			<span className="text-fr-add">{quoted ? `"${value}"` : value}</span>,
		</div>
	);
}

function AppearancePreferencesGroup({
	accent,
	avatarPicker,
	vibrEnabled = true,
	onVibrEnabledChange,
	showAvatars,
	fontPreset,
	translucent,
	contrast,
	verberProfileLabel,
	onAccentChange,
	onShowAvatarsChange,
	onUpdate,
}: {
	readonly accent: AccentPalette;
	readonly avatarPicker?: ReactNode;
	readonly vibrEnabled?: boolean;
	readonly onVibrEnabledChange?: (enabled: boolean) => void;
	readonly showAvatars: boolean;
	readonly fontPreset: string;
	readonly translucent: boolean;
	readonly contrast: number;
	readonly verberProfileLabel: VerberProfileLabel;
	readonly onAccentChange: (accent: AccentPalette) => void;
	readonly onShowAvatarsChange?: (show: boolean) => void;
	readonly onUpdate: SettingsUpdate;
}) {
	return (
		<SettingsGroup>
			<AccentColorRow accent={accent} onAccentChange={onAccentChange} />
			<AccentStyleRow />
			{avatarPicker && (
				<>
					<SettingsRow
						name="Vibr"
						desc="Animated presence shown while Fraym works; off falls back to simple status dots"
					>
						<Toggle checked={vibrEnabled} onCheckedChange={onVibrEnabledChange} />
					</SettingsRow>
					{vibrEnabled && (
						<SettingsRow name="Vibr style" desc="The shape the presence settles on">
							{avatarPicker}
						</SettingsRow>
					)}
					<RailVibrRows />
				</>
			)}
			<RailStyleRow />
			<TextOverflowRow />
			<VerberRow value={verberProfileLabel} onUpdate={onUpdate} />
			<StreamWispRow onUpdate={onUpdate} />
			<ShowAvatarsRow showAvatars={showAvatars} onShowAvatarsChange={onShowAvatarsChange} />
			<FontSelectRow value={fontPreset} />
			<MdBoldRows onUpdate={onUpdate} />
			<SettingsRow name="Translucent sidebar" desc="Blur and tint behind the rail">
				<Toggle checked={translucent} onCheckedChange={value => onUpdate("translucentSidebar", value)} />
			</SettingsRow>
			<SettingsRow name="Contrast">
				<Slider value={contrast} onChange={value => onUpdate("contrast", value)} />
			</SettingsRow>
		</SettingsGroup>
	);
}

const MD_BOLD_WEIGHT_LABELS = ["Normal", "Medium", "Semibold", "Bold"] as const;
type MdBoldWeightLabel = (typeof MD_BOLD_WEIGHT_LABELS)[number];
const MD_BOLD_WEIGHT_BY_LABEL: Record<MdBoldWeightLabel, number> = {
	Normal: 400,
	Medium: 500,
	Semibold: 600,
	Bold: 700,
};
function mdBoldWeightLabel(weight: number): MdBoldWeightLabel {
	if (weight <= 400) return "Normal";
	if (weight <= 500) return "Medium";
	if (weight <= 600) return "Semibold";
	return "Bold";
}

const MD_BOLD_COLOR_LABELS = ["Default", "Soft", "Accent"] as const;
type MdBoldColorLabel = (typeof MD_BOLD_COLOR_LABELS)[number];
const MD_BOLD_COLOR_BY_LABEL: Record<MdBoldColorLabel, MdBoldColor> = {
	Default: "default",
	Soft: "soft",
	Accent: "accent",
};
const MD_BOLD_COLOR_LABEL: Record<MdBoldColor, MdBoldColorLabel> = {
	default: "Default",
	soft: "Soft",
	accent: "Accent",
};

/** Thread-markdown emphasis controls — bold weight + color, written to CSS vars by settings-environment. */
function MdBoldRows({ onUpdate }: { readonly onUpdate: SettingsUpdate }) {
	const { config } = useSettings();
	return (
		<>
			<SettingsRow name="Bold weight" desc="Weight of bold text + headings in the thread">
				<Segmented
					options={MD_BOLD_WEIGHT_LABELS}
					value={mdBoldWeightLabel(config.mdBoldWeight)}
					onChange={label => onUpdate("mdBoldWeight", MD_BOLD_WEIGHT_BY_LABEL[label])}
				/>
			</SettingsRow>
			<SettingsRow name="Bold color" desc="Theme text, a softer tint, or your accent color">
				<Segmented
					options={MD_BOLD_COLOR_LABELS}
					value={MD_BOLD_COLOR_LABEL[config.mdBoldColor]}
					onChange={label => onUpdate("mdBoldColor", MD_BOLD_COLOR_BY_LABEL[label])}
				/>
			</SettingsRow>
		</>
	);
}

function fontSelectOptions(themeFont: { readonly primary: string; readonly mono: string } | undefined) {
	const themeDefault = {
		id: "",
		label: themeFont ? `Theme default · ${fontFamilyLabel(themeFont.primary)}` : "Theme default",
		note: themeFont ? "Follows the active theme" : "Follows the theme (Fraym default)",
		primary: themeFont?.primary ?? "",
		mono: themeFont?.mono ?? "",
	};
	return [themeDefault, ...FONT_PRESETS];
}

function FontSelectOption({
	option,
	value,
	onSelect,
}: {
	readonly option: ReturnType<typeof fontSelectOptions>[number];
	readonly value: string;
	readonly onSelect: (id: string) => void;
}) {
	const selected = value === option.id;
	return (
		<button
			type="button"
			onClick={() => onSelect(option.id)}
			className={cn(
				"flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-fr-accent-dim",
				selected && "bg-fr-accent-dim",
			)}
		>
			<span className="flex items-center justify-between">
				<span className="text-fr-md text-fr-text" style={{ fontFamily: option.primary || undefined }}>
					{option.label}
				</span>
				{selected && <Icon name="check" size={13} className="text-fr-accent" />}
			</span>
			<span className="text-fr-2xs text-fr-text-3">{option.note}</span>
			<span className="text-fr-sm text-fr-text-2" style={{ fontFamily: option.primary || undefined }}>
				The quick brown fox · 0123
			</span>
		</button>
	);
}

function FontSelectRow({ value }: { readonly value: string }) {
	const { config, patch } = useSettings();
	const themeFont = config.themePreset ? findThemePreset(config.themePreset)?.font : undefined;
	const options = fontSelectOptions(themeFont);
	const { open, ref, setOpen } = useDropdownDisclosure();
	const current = options.find(option => option.id === value) ?? options[0]!;
	const selectFontPreset = (id: string) => {
		patch({ fontPreset: id, uiFont: "", codeFont: "" });
		setOpen(false);
	};
	return (
		<SettingsRow name="Font" desc="UI + code typeface pairing — each option previews in its own font">
			<div ref={ref} className="relative flex shrink-0 items-center">
				<button
					type="button"
					onClick={() => setOpen(state => !state)}
					className="inline-flex w-[220px] items-center justify-between rounded-lg border border-fr-border bg-fr-surface px-[11px] py-2 text-fr-sm text-fr-text transition-colors hover:border-fr-text-3"
					style={{ fontFamily: current.primary || undefined }}
				>
					<span className="fr-overflow">{current.label}</span>
					<Icon name="caretD" size={12} className="ml-2 shrink-0 text-fr-text-3" />
				</button>
				{open && (
					<div
						data-slot="settings-dropdown"
						className="absolute right-0 top-full z-50 mt-1.5 w-[260px] rounded-xl border border-fr-border bg-fr-surface-2 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
					>
						{options.map(option => (
							<FontSelectOption
								key={option.id || "default"}
								option={option}
								value={value}
								onSelect={selectFontPreset}
							/>
						))}
					</div>
				)}
			</div>
		</SettingsRow>
	);
}

function AccentColorRow({
	accent,
	onAccentChange,
}: {
	readonly accent: AccentPalette;
	readonly onAccentChange: (accent: AccentPalette) => void;
}) {
	const { config } = useSettings();
	const { resolvedMode } = useTheme();
	const gradient = config.accentStyle === "gradient";
	const themeAccent = resolveThemeAccentValue(config.themePreset, resolvedMode);
	return (
		<SettingsRow name="Accent color" desc="Used for active states, links and primary actions">
			<div className="flex gap-2">
				<button
					key="theme"
					type="button"
					className={cn(
						"relative size-[26px] rounded-md border-2 transition-[border-color] duration-[120ms]",
						accent === "theme" ? "border-fr-text" : "border-dashed border-fr-text-3",
					)}
					data-accent="theme"
					style={{ background: themeAccent }}
					title="Theme — follows the active theme; pick a hue to override"
					onClick={() => onAccentChange("theme")}
				>
					{accent === "theme" && (
						<span
							className="absolute inset-0 flex items-center justify-center text-xs font-bold"
							style={{ color: "#ffffff" }}
						>
							&#10003;
						</span>
					)}
				</button>
				{(Object.keys(accents) as (keyof typeof accents)[]).map(a => (
					<button
						key={a}
						type="button"
						className={cn(
							"relative size-[26px] rounded-md border-2 transition-[border-color] duration-[120ms]",
							accent === a ? "border-fr-text" : "border-transparent",
						)}
						data-accent={a}
						style={{ background: gradient ? "var(--fr-accent-grad-on)" : accents[a].value }}
						title={accents[a].name}
						onClick={() => onAccentChange(a)}
					>
						{accent === a && (
							<span
								className="absolute inset-0 flex items-center justify-center text-xs font-bold"
								style={{ color: a === "mono" ? accents[a].ink : "#ffffff" }}
							>
								&#10003;
							</span>
						)}
					</button>
				))}
			</div>
		</SettingsRow>
	);
}

function AccentStyleRow() {
	const { config, update } = useSettings();
	const value = config.accentStyle === "gradient" ? "Gradient" : "Solid";
	return (
		<SettingsRow name="Accent style" desc="Paint primary buttons and active fills as a solid hue or a gradient">
			<Segmented
				options={["Solid", "Gradient"] as const}
				value={value}
				onChange={v => update("accentStyle", v === "Gradient" ? "gradient" : "solid")}
			/>
		</SettingsRow>
	);
}

function VerberRow({ value, onUpdate }: { readonly value: VerberProfileLabel; readonly onUpdate: SettingsUpdate }) {
	return (
		<SettingsRow name="Verber" desc="The phrase shown beside Vibr while Fraym works">
			<Segmented
				options={["TUI", "Codex", "Expressive", "Quiet"] as const}
				value={value}
				onChange={label => onUpdate("verberProfile", VERBER_PROFILE_BY_LABEL[label])}
			/>
		</SettingsRow>
	);
}

/** Stream wisp — the physics companion that rides the streaming text caret.
 *  The picker is the wisp twin of the Vibr gallery: live preset demos,
 *  filtered to the chosen avatar's kin (lore: same presence, two embodiments).
 *  "Auto" follows the avatar; explicit picks are honored while compatible. */
function StreamWispRow({ onUpdate }: { readonly onUpdate: SettingsUpdate }) {
	const { config } = useSettings();
	return (
		<SettingsRow
			name="Stream wisp"
			desc="A physics companion that rides the streaming text caret — Auto matches the Vibr"
		>
			<div className="flex items-center gap-3">
				{config.streamWisp && (
					<StreamWispSelect
						avatar={config.avatar}
						value={config.streamWispPreset}
						onChange={preset =>
							onUpdate(
								"streamWispPreset",
								(STREAM_WISP_PRESETS as readonly string[]).includes(preset)
									? (preset as StreamWispPreset)
									: "auto",
							)
						}
					/>
				)}
				<Toggle checked={config.streamWisp} onCheckedChange={value => onUpdate("streamWisp", value)} />
			</div>
		</SettingsRow>
	);
}

function ShowAvatarsRow({
	showAvatars,
	onShowAvatarsChange,
}: {
	readonly showAvatars: boolean;
	readonly onShowAvatarsChange?: (show: boolean) => void;
}) {
	return (
		<SettingsRow name="Show avatars in thread" desc="Display message speaker labels and header avatar marks">
			<Toggle checked={showAvatars} onCheckedChange={onShowAvatarsChange} />
		</SettingsRow>
	);
}

/** Rail-specific Vibr controls: whether the session rail animates Vibr at all, and
 *  whether every running row (not just the foreground one) shows its real live state.
 *  Only meaningful while the master Vibr is on, so self-gate on `vibrEnabled`. */
function RailVibrRows() {
	const { config, update } = useSettings();
	if (!config.vibrEnabled) return null;
	return (
		<>
			<SettingsRow name="Vibr on rail" desc="Animate Vibr on session-rail rows; off shows the colored status dots">
				<Toggle checked={config.railVibr} onCheckedChange={value => update("railVibr", value)} />
			</SettingsRow>
			{config.railVibr && (
				<SettingsRow
					name="Live state for every session"
					desc="Show each running session's real live state in the rail, not just the active one"
				>
					<Toggle
						checked={config.railVibrAllSessions}
						onCheckedChange={value => update("railVibrAllSessions", value)}
					/>
				</SettingsRow>
			)}
		</>
	);
}

/** Visual treatment is deliberately independent of the rail's data-grouping filter. */
function RailStyleRow() {
	const { config, update } = useSettings();
	const value = config.sessionRailStyle === "threaded" ? "Threaded" : "Classic";
	return (
		<SettingsRow
			name="Session rail style"
			desc="Choose the visual treatment without changing how sessions are grouped"
		>
			<Segmented
				options={["Classic", "Threaded"] as const}
				value={value}
				onChange={next => update("sessionRailStyle", next === "Threaded" ? "threaded" : "classic")}
			/>
		</SettingsRow>
	);
}

/** One policy for how long text ends everywhere `.fr-overflow` is adopted —
 *  ellipsis and fade solve the same problem, so the user picks once. */
function TextOverflowRow() {
	const { config, update } = useSettings();
	const value = config.textOverflow === "fade" ? "Fade" : "Ellipsis";
	return (
		<SettingsRow name="Text overflow" desc="How long text ends — a hard … or fading out at the edge">
			<Segmented
				options={["Ellipsis", "Fade"] as const}
				value={value}
				onChange={next => update("textOverflow", next === "Fade" ? "fade" : "ellipsis")}
			/>
		</SettingsRow>
	);
}

/** Usage-limit composer-strip controls: master on/off, plus the amber (warn) and
 *  red thresholds. The strip appears at `warn%`, turns red at `red%`, and a
 *  dismissal holds until usage crosses into red (or the window resets). The two
 *  sliders bound each other so the warn band can never sit above the red band. */
function UsageWarnRows() {
	const { config, update } = useSettings();
	return (
		<>
			<SettingsRow name="Usage-limit warnings" desc="Show a strip above the composer as an account nears its quota">
				<Toggle checked={config.usageWarnEnabled} onCheckedChange={value => update("usageWarnEnabled", value)} />
			</SettingsRow>
			{config.usageWarnEnabled && (
				<>
					<SettingsRow name="Warn at" desc="Quota used where the amber strip first appears">
						<UsageThresholdSlider
							value={config.usageWarnThreshold}
							min={5}
							max={config.usageWarnRedThreshold}
							onChange={value => update("usageWarnThreshold", value)}
						/>
					</SettingsRow>
					<SettingsRow name="Red at" desc="Quota used where it turns red — a dismissed strip re-appears only here">
						<UsageThresholdSlider
							value={config.usageWarnRedThreshold}
							min={config.usageWarnThreshold}
							max={100}
							onChange={value => update("usageWarnRedThreshold", value)}
						/>
					</SettingsRow>
				</>
			)}
		</>
	);
}

function UsageThresholdSlider({
	value,
	min,
	max,
	onChange,
}: {
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly onChange: (value: number) => void;
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="w-9 shrink-0 text-right font-secondary text-fr-xs tabular-nums text-fr-text-2">{value}%</span>
			<Slider value={value} min={min} max={max} onChange={onChange} />
		</div>
	);
}

function PointerCursorRow({ pointer, onUpdate }: { readonly pointer: boolean; readonly onUpdate: SettingsUpdate }) {
	return (
		<SettingsRow name="Use pointer cursors" desc="Change the wisp to a pointer over interactive elements">
			<Toggle checked={pointer} onCheckedChange={value => onUpdate("pointerCursors", value)} />
		</SettingsRow>
	);
}

function MotionPreferenceRow({
	motion,
	onMotionChange,
}: {
	readonly motion: MotionMode;
	readonly onMotionChange: MotionUpdate;
}) {
	return (
		<SettingsRow name="Reduce motion" desc="Reduce animations or match your system">
			<Segmented
				options={["System", "On", "Off"] as const}
				value={motion}
				onChange={v => onMotionChange(v === "On" ? "reduced" : v === "Off" ? "full" : "system")}
			/>
		</SettingsRow>
	);
}

function AppearanceFontSizeRows({ state }: { readonly state: ReturnType<typeof useAppearancePaneState> }) {
	return (
		<>
			<FontSizeRow
				name="UI font size"
				value={state.uiSize}
				fallback={state.config.uiFontSize}
				setting="uiFontSize"
				onUpdate={state.update}
			/>
			<FontSizeRow
				name="Code font size"
				value={state.codeSize}
				fallback={state.config.codeFontSize}
				setting="codeFontSize"
				onUpdate={state.update}
			/>
		</>
	);
}

function FontSizeRow({
	name,
	value,
	fallback,
	setting,
	onUpdate,
}: {
	readonly name: string;
	readonly value: string;
	readonly fallback: number;
	readonly setting: "uiFontSize" | "codeFontSize";
	readonly onUpdate: SettingsUpdate;
}) {
	return (
		<SettingsRow
			name={name}
			desc={`Base size used for ${setting === "uiFontSize" ? "the Fraym UI" : "code across chats and diffs"}`}
		>
			<NumberInput value={value} onChange={next => onUpdate(setting, Number(next) || fallback)} />
		</SettingsRow>
	);
}

export interface GeneralPaneProps {
	readonly toolDefaultOpen?: ToolDefaultOpen;
	readonly onToolDefaultOpenChange?: (value: ToolDefaultOpen) => void;
}

const STARTUP_LABEL: Record<StartupView, "Last session" | "New session" | "Home"> = {
	last: "Last session",
	new: "New session",
	home: "Home",
};
const STARTUP_BY_LABEL: Record<"Last session" | "New session" | "Home", StartupView> = {
	"Last session": "last",
	"New session": "new",
	Home: "home",
};
const SEND_MODE_LABEL: Record<ComposerSendMode, "Steer" | "Follow-up"> = {
	steer: "Steer",
	followUp: "Follow-up",
};
const SEND_MODE_BY_LABEL: Record<"Steer" | "Follow-up", ComposerSendMode> = {
	Steer: "steer",
	"Follow-up": "followUp",
};

export function GeneralPane({ toolDefaultOpen = "none", onToolDefaultOpenChange }: GeneralPaneProps) {
	const { config, update } = useSettings();
	const startupLabel = STARTUP_LABEL[config.startup];
	const toolDefaultOpenLabel = TOOL_DEFAULT_OPEN_LABEL[toolDefaultOpen];
	const densityLabel = DENSITY_LABEL[config.density];
	const sendModeLabel = SEND_MODE_LABEL[config.composerSendWhileRunning];

	return (
		<div>
			<SettingsTitle>General</SettingsTitle>
			<SettingsSub>Core behavior of the Fraym workspace.</SettingsSub>
			<SettingsGroup heading="Tools">
				<SettingsRow name="Density" desc="How compact tool cards and the thread render">
					<Segmented
						options={["Compact", "Comfortable", "Spacious"] as const}
						value={densityLabel}
						onChange={label => update("density", DENSITY_BY_LABEL[label])}
					/>
				</SettingsRow>
				<SettingsRow
					name="Auto-expand"
					desc="Which tool calls open automatically — none, while running, on failure, or all"
				>
					<Segmented
						options={TOOL_DEFAULT_OPEN_OPTIONS}
						value={toolDefaultOpenLabel}
						onChange={label => onToolDefaultOpenChange?.(TOOL_DEFAULT_OPEN_BY_LABEL[label])}
					/>
				</SettingsRow>
				<SettingsRow
					name="Message counter"
					desc="Fold completed work into a 'Worked for Xs' summary, or window the streaming turn to the last N blocks"
				>
					<Segmented
						options={COLLAPSE_MODE_OPTIONS}
						value={COLLAPSE_MODE_LABEL[config.collapseMode]}
						onChange={label => update("collapseMode", COLLAPSE_MODE_BY_LABEL[label])}
					/>
				</SettingsRow>
				{config.collapseMode === "simple" && (
					<SettingsRow name="Max blocks" desc="Show up to this many blocks before windowing">
						<NumberInput
							value={config.maxVisibleBlocks}
							onChange={next => update("maxVisibleBlocks", Number(next) || 10)}
						/>
					</SettingsRow>
				)}
				<SettingsRow name="Recent turns" desc="Keep this many recent turns before folding the very early ones">
					<NumberInput
						value={config.maxVisibleTurns}
						onChange={next => update("maxVisibleTurns", Number(next) || 12)}
					/>
				</SettingsRow>
				<SettingsRow name="Show reasoning" desc="Show the model's thinking traces in the thread">
					<Toggle checked={config.showReasoning} onCheckedChange={value => update("showReasoning", value)} />
				</SettingsRow>
				<SettingsRow
					name="Tool grouping"
					desc="Collapse a run of consecutive tool calls into one group card — off, or once 2 / 3 / 5 line up in a row"
				>
					<Segmented
						options={["Off", "2+", "3+", "5+"] as const}
						value={
							config.groupConsecutiveTools
								? config.groupThreshold >= 5
									? "5+"
									: config.groupThreshold >= 3
										? "3+"
										: "2+"
								: "Off"
						}
						onChange={label => {
							if (label === "Off") {
								update("groupConsecutiveTools", false);
								return;
							}
							update("groupConsecutiveTools", true);
							update("groupThreshold", label === "5+" ? 5 : label === "3+" ? 3 : 2);
						}}
					/>
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup>
				<SettingsRow name="On startup" desc="What to open when Fraym launches">
					<Segmented
						options={["Last session", "New session", "Home"] as const}
						value={startupLabel}
						onChange={label => update("startup", STARTUP_BY_LABEL[label])}
					/>
				</SettingsRow>
				<SettingsRow
					name="Send while agent is working"
					desc="Enter injects into the running turn (Steer) or queues until it finishes (Follow-up)"
				>
					<Segmented
						options={["Steer", "Follow-up"] as const}
						value={sendModeLabel}
						onChange={label => update("composerSendWhileRunning", SEND_MODE_BY_LABEL[label])}
					/>
				</SettingsRow>
				<SettingsRow name="Confirm before applying" desc="Ask before writing file changes to disk">
					<Toggle
						checked={config.confirmBeforeApply}
						onCheckedChange={value => update("confirmBeforeApply", value)}
					/>
				</SettingsRow>
				<SettingsRow name="Auto-save transcripts" desc="Keep a local copy of every session">
					<Toggle
						checked={config.autoSaveTranscripts}
						onCheckedChange={value => update("autoSaveTranscripts", value)}
					/>
				</SettingsRow>
				<SettingsRow name="Share anonymous telemetry" desc="Help improve Fraym with usage data">
					<Toggle checked={config.telemetry} onCheckedChange={value => update("telemetry", value)} />
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup heading="Usage limit">
				<UsageWarnRows />
			</SettingsGroup>
		</div>
	);
}

import { Button, Input, TooltipProvider } from "@fraym/ui/elements";
import {
	accents,
	type ACCENT_PALETTES,
	DEFAULT_THEME_ID,
	findThemePreset,
	FONT_PRESETS,
	fontFamilyLabel,
	THEME_MODES,
	THEME_PRESETS,
	useTheme,
} from "@fraym/ui/theme";
import { cn, FraymBrandMark, Icon, useSettings } from "./compat/ui";
import {
	type Dispatch,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { TIERS } from "./entries/registry";
import { DemoDock } from "./showcase/demo-dock";
import { DocPanel } from "./showcase/doc-panel";
import { ToolConfigProvider } from "./showcase/tool-config";
import type { ShowcaseEntry, Tier, TierDef } from "./showcase/types";

type ThemeMode = (typeof THEME_MODES)[number];
type AccentId = (typeof ACCENT_PALETTES)[number];
type ActiveEntry = { tier: Tier; entry: ShowcaseEntry } | null;
type ThemeFont = { readonly primary: string; readonly mono: string };
type KitchenFontOption = {
	readonly id: string;
	readonly label: string;
	readonly note: string;
	readonly primary: string;
	readonly mono: string;
};

function stripBase(raw: string, basePath: string): string {
	if (!basePath) return raw;
	if (raw === basePath) return "";
	const prefix = `${basePath}/`;
	return raw.startsWith(prefix) ? raw.slice(prefix.length) : "";
}

function useHashRoute(basePath = ""): [string, (tier: Tier, id: string) => void] {
	const [hash, setHash] = useState(() => stripBase(window.location.hash.slice(1), basePath));
	useEffect(() => {
		const onHash = () => setHash(stripBase(window.location.hash.slice(1), basePath));
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, [basePath]);
	const go = (tier: Tier, id: string) => {
		window.location.hash = basePath ? `${basePath}/${tier}/${id}` : `${tier}/${id}`;
	};
	return [hash, go];
}

const FIRST = TIERS[0]?.entries[0];
const DEFAULT_ROUTE = FIRST ? `${TIERS[0]?.id}/${FIRST.id}` : "";
const DEFAULT_ACTIVE_ENTRY: ActiveEntry = FIRST && TIERS[0] ? { tier: TIERS[0].id, entry: FIRST } : null;
const ACTIVE_BY_ROUTE = new Map<string, Exclude<ActiveEntry, null>>(
	TIERS.flatMap(tier => tier.entries.map(entry => [`${tier.id}/${entry.id}`, { tier: tier.id, entry }] as const)),
);

function groupEntries(entries: readonly ShowcaseEntry[]): { group?: string | undefined; items: ShowcaseEntry[] }[] {
	const out: { group?: string | undefined; items: ShowcaseEntry[] }[] = [];
	for (const entry of entries) {
		const last = out[out.length - 1];
		if (last && last.group === entry.group) last.items.push(entry);
		else out.push({ group: entry.group, items: [entry] });
	}
	return out;
}

// Font dropdown options — the "Theme default" row names + previews the active theme's font.
function themeDefaultFontOption(themeFont: ThemeFont | undefined): KitchenFontOption {
	return {
		id: "",
		label: themeFont ? `Theme default · ${fontFamilyLabel(themeFont.primary)}` : "Theme default",
		note: themeFont ? "follows the active theme" : "follows the theme",
		primary: themeFont?.primary ?? "",
		mono: themeFont?.mono ?? "",
	};
}

function ksFontOptions(themeFont: ThemeFont | undefined): KitchenFontOption[] {
	return [themeDefaultFontOption(themeFont), ...FONT_PRESETS];
}

function FontPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useFontMenuDismiss(open, ref, setOpen);
	const { options, current } = useKitchenFontOptions(value);
	return (
		<div ref={ref} className="relative flex items-center">
			<span className="fr-eyebrow mr-2">font</span>
			<button
				type="button"
				onClick={() => setOpen(state => !state)}
				className="inline-flex items-center gap-2 rounded-lg border border-fr-border bg-fr-surface px-2.5 py-1.5 text-fr-base text-fr-text transition-colors hover:border-fr-text-3"
				style={{ fontFamily: current.primary || undefined }}
			>
				{current.label}
				<Icon name="caretD" size={12} className="text-fr-text-3" />
			</button>
			{open ? <FontMenu value={value} options={options} onChange={onChange} onClose={() => setOpen(false)} /> : null}
		</div>
	);
}

function useKitchenFontOptions(value: string): { options: KitchenFontOption[]; current: KitchenFontOption } {
	const { config } = useSettings();
	const themeFont = config.themePreset ? findThemePreset(config.themePreset)?.font : undefined;
	const options = ksFontOptions(themeFont);
	const current = options.find(option => option.id === value) ?? options[0]!;
	return { options, current };
}

function useFontMenuDismiss(
	open: boolean,
	ref: RefObject<HTMLDivElement | null>,
	setOpen: Dispatch<SetStateAction<boolean>>,
) {
	useEffect(() => {
		if (!open) return;
		const onClick = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, [open, ref, setOpen]);
}

function FontMenu({
	options,
	value,
	onChange,
	onClose,
}: {
	readonly value: string;
	readonly options: ReturnType<typeof ksFontOptions>;
	readonly onChange: (id: string) => void;
	readonly onClose: () => void;
}) {
	return (
		<div
			data-slot="settings-dropdown"
			className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-fr-border bg-fr-surface-2 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
		>
			{options.map(option => (
				<FontMenuOption
					key={option.id || "default"}
					option={option}
					selected={value === option.id}
					onSelect={() => {
						onChange(option.id);
						onClose();
					}}
				/>
			))}
		</div>
	);
}

function FontMenuOption({
	option,
	selected,
	onSelect,
}: {
	readonly option: KitchenFontOption;
	readonly selected: boolean;
	readonly onSelect: () => void;
}) {
	const previewFont = { fontFamily: option.primary || undefined };
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-fr-accent-dim",
				selected && "bg-fr-accent-dim",
			)}
		>
			<span className="flex items-center justify-between">
				<span className="text-fr-md text-fr-text" style={previewFont}>
					{option.label}
				</span>
				{selected && <Icon name="check" size={13} className="text-fr-accent" />}
			</span>
			<span className="text-fr-2xs text-fr-text-3">{option.note}</span>
			<span className="text-fr-sm text-fr-text-2" style={previewFont}>
				The quick brown fox / 0123
			</span>
		</button>
	);
}

const THEME_PICKER_OPTIONS = [
	{ id: DEFAULT_THEME_ID, name: "Fraym", note: "Default" },
	...THEME_PRESETS.map(preset => ({ id: preset.id, name: preset.name, note: preset.note })),
];

const KS_FRAYM_SWATCH = {
	dark: { surface: "#151518", accent: "#b78cff" },
	light: { surface: "#ffffff", accent: "#7c4ddd" },
} as const;

function themePickerSwatch(id: string, mode: "dark" | "light") {
	if (id === DEFAULT_THEME_ID) return KS_FRAYM_SWATCH[mode];
	const preset = findThemePreset(id);
	if (!preset) return KS_FRAYM_SWATCH[mode];
	const variant = preset[mode];
	return { surface: variant.surface, accent: variant.accent };
}

function ThemeSwatch({ id, mode }: { readonly id: string; readonly mode: "dark" | "light" }) {
	const s = themePickerSwatch(id, mode);
	return (
		<span className="inline-flex items-center gap-px overflow-hidden rounded border border-fr-border p-px">
			<span className="size-3 rounded-[2px]" style={{ background: s.surface }} />
			<span className="size-3 rounded-[2px]" style={{ background: s.accent }} />
		</span>
	);
}

function ThemePicker({
	value,
	mode,
	onChange,
}: {
	readonly value: string;
	readonly mode: "dark" | "light";
	readonly onChange: (id: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useFontMenuDismiss(open, ref, setOpen);
	const current = THEME_PICKER_OPTIONS.find(option => option.id === value) ?? THEME_PICKER_OPTIONS[0]!;
	return (
		<div ref={ref} className="relative flex items-center">
			<span className="fr-eyebrow mr-2">theme</span>
			<button
				type="button"
				onClick={() => setOpen(state => !state)}
				className="inline-flex items-center gap-2 rounded-lg border border-fr-border bg-fr-surface px-2.5 py-1.5 text-fr-base text-fr-text transition-colors hover:border-fr-text-3"
			>
				<ThemeSwatch id={current.id} mode={mode} />
				{current.name}
				<Icon name="caretD" size={12} className="text-fr-text-3" />
			</button>
			{open && (
				<div
					data-slot="settings-dropdown"
					className="absolute right-0 top-full z-50 mt-1.5 max-h-[360px] w-60 overflow-y-auto rounded-xl border border-fr-border bg-fr-surface-2 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
				>
					{THEME_PICKER_OPTIONS.map(option => (
						<button
							key={option.id}
							type="button"
							onClick={() => {
								onChange(option.id);
								setOpen(false);
							}}
							className={cn(
								"flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-fr-accent-dim",
								value === option.id && "bg-fr-accent-dim",
							)}
						>
							<ThemeSwatch id={option.id} mode={mode} />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-fr-base text-fr-text">{option.name}</span>
								<span className="block truncate text-fr-2xs text-fr-text-3">{option.note}</span>
							</span>
							{value === option.id && <Icon name="check" size={13} className="text-fr-accent" />}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function usePersistentDockState() {
	const [dockOpen, setDockOpen] = useState(() => localStorage.getItem("ks-dock-open") === "1");
	const [dockWidth, setDockWidth] = useState(() => {
		const width = Number(localStorage.getItem("ks-dock-width"));
		return Number.isFinite(width) && width >= 340 ? width : 440;
	});
	useEffect(() => {
		localStorage.setItem("ks-dock-open", dockOpen ? "1" : "0");
	}, [dockOpen]);
	useEffect(() => {
		localStorage.setItem("ks-dock-width", String(dockWidth));
	}, [dockWidth]);
	return { dockOpen, dockWidth, setDockOpen, setDockWidth };
}

function useActiveRoute(hash: string): ActiveEntry {
	return useMemo(() => ACTIVE_BY_ROUTE.get(hash || DEFAULT_ROUTE) ?? DEFAULT_ACTIVE_ENTRY, [hash]);
}

function useFilteredTiers(query: string): readonly TierDef[] {
	return useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return TIERS;
		const tiers: TierDef[] = [];
		for (const tier of TIERS) {
			const entries = tier.entries.filter(entry => entry.name.toLowerCase().includes(needle));
			if (entries.length > 0) tiers.push({ ...tier, entries });
		}
		return tiers;
	}, [query]);
}

function useOpenTiers(activeTierId: Tier | undefined) {
	const [openTiers, setOpenTiers] = useState<Set<string>>(() => new Set(activeTierId ? [activeTierId] : []));
	useEffect(() => {
		setOpenTiers(prev => (activeTierId && !prev.has(activeTierId) ? new Set(prev).add(activeTierId) : prev));
	}, [activeTierId]);
	const toggleTier = (id: string) =>
		setOpenTiers(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	return { openTiers, toggleTier };
}

function useDockResize(setDockWidth: Dispatch<SetStateAction<number>>) {
	const cleanupRef = useRef<(() => void) | null>(null);
	useEffect(() => () => cleanupRef.current?.(), []);
	return (event: ReactMouseEvent) => {
		event.preventDefault();
		cleanupRef.current?.();
		const onMove = (moveEvent: MouseEvent) =>
			setDockWidth(Math.min(720, Math.max(340, window.innerWidth - moveEvent.clientX)));
		const cleanup = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", cleanup);
			cleanupRef.current = null;
		};
		cleanupRef.current = cleanup;
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", cleanup);
	};
}

function KitchenLogo({ onExit }: { readonly onExit?: (() => void) | undefined }) {
	const brand = (
		<>
			<FraymBrandMark size={22} />
			<span className="text-fr-lg font-semibold tracking-tight">Fraym Kitchen Sink</span>
		</>
	);
	if (onExit) {
		return (
			<button
				type="button"
				onClick={onExit}
				className="flex min-w-0 items-center gap-2.5 text-fr-text transition-opacity hover:opacity-80"
				title="Back to the Fraym site"
			>
				<span aria-hidden="true" className="text-fr-text-3">
					←
				</span>
				{brand}
			</button>
		);
	}
	return <div className="flex min-w-0 items-center gap-2.5">{brand}</div>;
}

function ThemeControls({
	mode,
	resolvedMode,
	onModeChange,
}: {
	readonly mode: ThemeMode;
	readonly resolvedMode: string;
	readonly onModeChange: (mode: ThemeMode) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2 sm:ml-auto">
			{THEME_MODES.map(item => (
				<Button
					key={item}
					variant={mode === item ? "default" : "outline"}
					size="sm"
					onClick={() => onModeChange(item)}
				>
					<Icon name={item === "dark" ? "moon" : item === "light" ? "sun" : "computer"} size={14} />
					{item}
				</Button>
			))}
			<span className="ml-1 font-secondary text-fr-2xs text-fr-text-3">{resolvedMode}</span>
		</div>
	);
}

function AccentControls({
	accent,
	onAccentChange,
}: {
	readonly accent: AccentId;
	readonly onAccentChange: (accent: AccentId) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{(Object.keys(accents) as (keyof typeof accents)[]).map(item => (
				<button
					key={item}
					type="button"
					className={cn(
						"relative size-6 rounded-lg border-2 transition-colors duration-150",
						accent === item ? "border-fr-text" : "border-transparent",
					)}
					style={{ background: accents[item].value }}
					title={accents[item].name}
					onClick={() => onAccentChange(item)}
				/>
			))}
		</div>
	);
}

function AccentStyleControls({
	value,
	onChange,
}: {
	readonly value: "solid" | "gradient";
	readonly onChange: (style: "solid" | "gradient") => void;
}) {
	return (
		<div className="flex items-center gap-2">
			{(["solid", "gradient"] as const).map(item => (
				<Button
					key={item}
					variant={value === item ? "default" : "outline"}
					size="sm"
					onClick={() => onChange(item)}
					title={`Accent style: ${item}`}
				>
					{item}
				</Button>
			))}
		</div>
	);
}

function KitchenHeader({
	mode,
	accent,
	resolvedMode,
	fontId,
	themeId,
	dockOpen,
	hasActiveDemo,
	onModeChange,
	onAccentChange,
	accentStyle,
	onAccentStyleChange,
	onFontChange,
	onThemeChange,
	onDockOpenChange,
	onExit,
}: {
	readonly mode: ThemeMode;
	readonly accent: AccentId;
	readonly resolvedMode: string;
	readonly fontId: string;
	readonly themeId: string;
	readonly dockOpen: boolean;
	readonly hasActiveDemo: boolean;
	readonly onModeChange: (mode: ThemeMode) => void;
	readonly onAccentChange: (accent: AccentId) => void;
	readonly accentStyle: "solid" | "gradient";
	readonly onAccentStyleChange: (style: "solid" | "gradient") => void;
	readonly onFontChange: (id: string) => void;
	readonly onThemeChange: (id: string) => void;
	readonly onDockOpenChange: Dispatch<SetStateAction<boolean>>;
	readonly onExit?: (() => void) | undefined;
}) {
	return (
		<header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-fr-border-soft px-4 py-3 sm:gap-4 sm:px-6">
			<KitchenLogo onExit={onExit} />
			<ThemeControls mode={mode} resolvedMode={resolvedMode} onModeChange={onModeChange} />
			<AccentControls accent={accent} onAccentChange={onAccentChange} />
			<AccentStyleControls value={accentStyle} onChange={onAccentStyleChange} />
			<ThemePicker value={themeId} mode={resolvedMode === "light" ? "light" : "dark"} onChange={onThemeChange} />
			<FontPicker value={fontId} onChange={onFontChange} />
			<Button
				variant={dockOpen ? "default" : "outline"}
				size="sm"
				disabled={!hasActiveDemo}
				onClick={() => onDockOpenChange(open => !open)}
				title={hasActiveDemo ? "Toggle live demo" : "No live demo for this entry"}
			>
				<Icon name="chat" size={14} />
				Demo
			</Button>
		</header>
	);
}

function KitchenNavEntry({
	entry,
	tier,
	group,
	active,
	onGo,
}: {
	readonly entry: ShowcaseEntry;
	readonly tier: Tier;
	readonly group?: string | undefined;
	readonly active: ActiveEntry;
	readonly onGo: (tier: Tier, id: string) => void;
}) {
	const isActive = active?.tier === tier && active.entry.id === entry.id;
	return (
		<button
			type="button"
			title={entry.name}
			onClick={() => onGo(tier, entry.id)}
			className={navEntryClass({ grouped: Boolean(group), active: isActive })}
		>
			{entry.name}
		</button>
	);
}

function navEntryClass({ grouped, active }: { readonly grouped: boolean; readonly active: boolean }) {
	return cn(
		"relative block w-full truncate rounded-[7px] py-[7px] text-left text-fr-base transition-colors duration-[120ms]",
		grouped ? "pl-4 pr-2.5" : "px-2.5",
		active
			? "bg-fr-surface-2 font-medium text-fr-text before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-[2px] before:bg-fr-accent before:content-['']"
			: "text-fr-text-2 hover:bg-fr-surface hover:text-fr-text",
	);
}

function KitchenNavGroup({
	tier,
	group,
	items,
	active,
	onGo,
}: {
	readonly tier: Tier;
		readonly group?: string | undefined;
	readonly items: readonly ShowcaseEntry[];
	readonly active: ActiveEntry;
	readonly onGo: (tier: Tier, id: string) => void;
}) {
	return (
		<div className="flex flex-col gap-px">
			{group && (
				<div className="px-2.5 pt-2 pb-1 font-secondary text-fr-xs font-medium tracking-fr-tight text-fr-text-3">
					{group}
				</div>
			)}
			{items.map(entry => (
				<KitchenNavEntry key={entry.id} entry={entry} tier={tier} group={group} active={active} onGo={onGo} />
			))}
		</div>
	);
}

function KitchenNavTier({
	tier,
	open,
	active,
	onToggle,
	onGo,
}: {
	readonly tier: TierDef;
	readonly open: boolean;
	readonly active: ActiveEntry;
	readonly onToggle: (id: string) => void;
	readonly onGo: (tier: Tier, id: string) => void;
}) {
	return (
		<div className="flex flex-col">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => onToggle(tier.id)}
				className="group flex items-center justify-between gap-2 rounded-[7px] px-2.5 py-2 text-left text-fr-base font-semibold text-fr-text-2 transition-colors hover:text-fr-text"
			>
				<span>{tier.label}</span>
				<span className="flex items-center gap-1.5">
					<span className="font-secondary text-fr-2xs text-fr-text-3">{tier.entries.length}</span>
					<Icon
						name="caretR"
						size={12}
						strokeWidth={2.2}
						className={cn("text-fr-text-3 transition-transform", open && "rotate-90")}
					/>
				</span>
			</button>
			{open &&
				groupEntries(tier.entries).map(({ group, items }) => (
					<KitchenNavGroup
						key={group ?? "_"}
						tier={tier.id}
						group={group}
						items={items}
						active={active}
						onGo={onGo}
					/>
				))}
		</div>
	);
}

function KitchenNav({
	query,
	tiers,
	openTiers,
	searching,
	active,
	onQueryChange,
	onToggleTier,
	onGo,
}: {
	readonly query: string;
	readonly tiers: readonly TierDef[];
	readonly openTiers: ReadonlySet<string>;
	readonly searching: boolean;
	readonly active: ActiveEntry;
	readonly onQueryChange: (query: string) => void;
	readonly onToggleTier: (id: string) => void;
	readonly onGo: (tier: Tier, id: string) => void;
}) {
	return (
		<nav className="hidden w-[var(--fr-rail-w)] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-fr-border-soft bg-fr-rail p-2 md:flex">
			<div className="px-1 pb-1.5">
				<Input
					placeholder="Search components..."
					value={query}
					onChange={event => onQueryChange(event.target.value)}
				/>
			</div>
			{tiers.map(tier => (
				<KitchenNavTier
					key={tier.id}
					tier={tier}
					open={searching || openTiers.has(tier.id)}
					active={active}
					onToggle={onToggleTier}
					onGo={onGo}
				/>
			))}
		</nav>
	);
}

function ActiveEntryPanel({ active, activeTier }: { readonly active: ActiveEntry; readonly activeTier?: TierDef | undefined }) {
	return (
		<main className="min-w-0 flex-1 overflow-y-auto">
			<div className="mx-auto max-w-[1080px] px-5 py-8 sm:px-10 sm:py-12">
				{active && (
					<>
						<div className="mb-1 fr-eyebrow">{activeTier?.label}</div>
						<h1 className="mb-6 text-fr-2xl font-semibold tracking-tight">{active.entry.name}</h1>
						<active.entry.Component />
						{active.entry.docs && (
							<div className="mt-10 border-t border-fr-border-soft pt-8">
								<DocPanel docs={active.entry.docs} />
							</div>
						)}
					</>
				)}
			</div>
		</main>
	);
}

function DemoAside({
	active,
	dockWidth,
	onResizeStart,
	onClose,
}: {
	readonly active: ActiveEntry;
	readonly dockWidth: number;
	readonly onResizeStart: (event: ReactMouseEvent) => void;
	readonly onClose: () => void;
}) {
	const demo = active?.entry.demo;
	if (!active || !demo) return null;
	return (
		<aside
			className="relative hidden min-h-0 shrink-0 border-l border-fr-border-soft bg-fr-bg lg:flex"
			style={{ width: dockWidth }}
		>
			<button
				type="button"
				aria-label="Resize demo panel"
				onMouseDown={onResizeStart}
				className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-fr-accent-dim"
			/>
			<div className="flex min-h-0 flex-1 flex-col">
				<DemoDock key={active.entry.id} demo={demo} entryName={active.entry.name} onClose={onClose} />
			</div>
		</aside>
	);
}

export function KitchenSink({
	basePath = "",
	onExit,
}: {
	readonly basePath?: string;
	readonly onExit?: () => void;
} = {}) {
	const { mode, accent, resolvedMode, setMode, setAccent } = useTheme();
	const { config, update, patch } = useSettings();
	useEffect(() => {
		document.documentElement.setAttribute("data-accent-style", config.accentStyle);
	}, [config.accentStyle]);
	const [hash, go] = useHashRoute(basePath);
	const [query, setQuery] = useState("");
	const fontId = config.fontPreset;
	const themeId = config.themePreset || DEFAULT_THEME_ID;
	const { dockOpen, dockWidth, setDockOpen, setDockWidth } = usePersistentDockState();
	const active = useActiveRoute(hash);
	const activeTier = TIERS.find(tier => tier.id === active?.tier);
	const activeTierId = active?.tier;
	const activeDemo = active?.entry.demo;
	const tiers = useFilteredTiers(query);
	const searching = query.trim().length > 0;
	const { openTiers, toggleTier } = useOpenTiers(activeTierId);
	const startResize = useDockResize(setDockWidth);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="relative isolate flex h-screen min-h-0 flex-col bg-fr-bg font-primary text-fr-text">
				<KitchenHeader
					mode={mode}
					accent={accent}
					resolvedMode={resolvedMode}
					fontId={fontId}
					themeId={themeId}
					dockOpen={dockOpen}
					hasActiveDemo={Boolean(activeDemo)}
					onModeChange={setMode}
					onAccentChange={setAccent}
					accentStyle={config.accentStyle}
					onAccentStyleChange={style => update("accentStyle", style)}
					onFontChange={id => patch({ fontPreset: id, uiFont: "", codeFont: "" })}
					onThemeChange={id => update("themePreset", id === DEFAULT_THEME_ID ? "" : id)}
					onDockOpenChange={setDockOpen}
					onExit={onExit}
				/>
				<div className="flex min-h-0 flex-1">
					<KitchenNav
						query={query}
						tiers={tiers}
						openTiers={openTiers}
						searching={searching}
						active={active}
						onQueryChange={setQuery}
						onToggleTier={toggleTier}
						onGo={go}
					/>
					<ToolConfigProvider key={active?.entry.id} schema={active?.entry.config}>
						<ActiveEntryPanel active={active} activeTier={activeTier} />
						{dockOpen && (
							<DemoAside
								active={active}
								dockWidth={dockWidth}
								onResizeStart={startResize}
								onClose={() => setDockOpen(false)}
							/>
						)}
					</ToolConfigProvider>
				</div>
			</div>
		</TooltipProvider>
	);
}

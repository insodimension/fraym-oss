import {
	ActionBar,
	AppShell,
	type AskField,
	AskFieldControl,
	AskPicker,
	AvatarSelect,
	Button,
	CommandPalette,
	ConfirmDialog,
	type ConfirmDialogIntent,
	DiffBlock,
	DockSplit,
	EngineModelMenu,
	Explainer,
	Icon,
	IconButton,
	InputGroup,
	Labor,
	type LaborIndicator,
	LaborOverlay,
	type LaborStep,
	Menu,
	MenuBar,
	MenuItem,
	ModelCatalog,
	ModelPicker,
	type ModelSelection,
	PageHeader,
	PopoverDivider,
	PopoverHeading,
	PopoverPanel,
	PopoverRow,
	ProviderAccountSwitcher,
	type RailMode,
	Scrim,
	SelectorMenu,
	TopBar,
} from "@fraym/ui";
import { Presence } from "@fraym/vibr";
import { useEffect, useState } from "react";
import type { CityItem } from "../fixtures";
import {
	ASK_PICKER_DEPLOY_TARGETS,
	ASK_PICKER_SUPERPOWERS,
	AVATAR_OPTIONS,
	CITY_CATEGORIES,
	ENGINE_SETTINGS_RESOURCE_FIXTURE,
	MODEL_CATEGORIES,
	MODEL_FAVORITES,
	MODEL_MOSTUSED,
	PALETTE_CMDS,
	PROVIDER_WITH_ACCOUNTS,
} from "../fixtures";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import { type ShowcaseEntry, withGroup } from "../showcase/types";
import { chartsEntries } from "./charts-entry";
import { nodeGraphEntries } from "./node-graph-entry";

function ActionBarEntry() {
	const { values, panel } = useControls({
		count: { kind: "number", label: "count", default: 3, min: 1, max: 4, step: 1 },
		primaryVariant: {
			kind: "select",
			label: "primary variant",
			options: ["accent", "outline", "ghost"],
			default: "accent",
		},
		icons: { kind: "boolean", label: "icons", default: true },
	});
	const items = [
		{
			label: "View PR #248",
			icon: "arrowR" as const,
			variant: values.primaryVariant as "accent" | "outline" | "ghost",
		},
		{ label: "View full diff", icon: "diff" as const, variant: "outline" as const },
		{ label: "Comment", icon: "chat" as const, variant: "ghost" as const },
		{ label: "Copy link", icon: "link" as const, variant: "ghost" as const },
	]
		.slice(0, values.count)
		.map(item => (values.icons ? item : { label: item.label, variant: item.variant }));
	return (
		<Demo
			summary="A right-aligned row of result actions (accent / outline / ghost). Rendered under diffs and tool results."
			importPath="@fraym/ui/components/action-bar"
			controls={panel}
			stage="stretch"
		>
			<ActionBar items={items} />
		</Demo>
	);
}

function AppShellEntry() {
	const { values, panel } = useControls({
		railMode: { kind: "select", label: "railMode", options: ["expanded", "compact", "hidden"], default: "expanded" },
		dockOpen: { kind: "boolean", label: "dockOpen", default: true },
		dock: { kind: "boolean", label: "dock", default: true },
		dockWidth: { kind: "number", label: "dockWidth", default: 220, min: 160, max: 360, step: 20 },
	});
	return (
		<Demo
			summary="The top-level CSS-grid layout: a rail column that morphs between expanded (264px) / compact (56px) / hidden (0), a fluid main column, and an optional right dock that floats as an overlay below 1240px. The rail track width animates via data-rail-mode (the real shell mechanism). Shown here as a scaled region diagram."
			importPath="@fraym/ui/components/app-shell"
			controls={panel}
			stage="stretch"
		>
			<div className="h-56 w-full overflow-hidden rounded-lg border border-fr-border-soft text-fr-sm">
				<AppShell
					railMode={values.railMode as RailMode}
					dockOpen={values.dockOpen}
					dockWidth={values.dockWidth}
					rail={
						<div
							data-slot="session-rail"
							className="flex h-full items-center justify-center bg-fr-rail text-fr-text-3"
						>
							rail
						</div>
					}
					main={<div className="flex h-full items-center justify-center bg-fr-bg text-fr-text-2">main</div>}
					dock={
						values.dock ? (
							<div
								data-slot="right-dock"
								className="flex h-full items-center justify-center bg-fr-rail text-fr-text-3"
							>
								dock
							</div>
						) : undefined
					}
				/>
			</div>
		</Demo>
	);
}

const PLACEMENT_OPTIONS = ["below", "above", "below-right", "above-right"] as const;
type PlacementOption = (typeof PLACEMENT_OPTIONS)[number];

const AVATAR_SELECT_OPTIONS = AVATAR_OPTIONS.map(option => ({
	id: option.id,
	label: option.label,
	preview: <Presence avatar={option.id} state="thinking" mode="think" />,
}));

const COMMAND_PALETTE_WIDTH_CLASS: Record<number, string> = {
	360: "!w-[360px]",
	380: "!w-[380px]",
	400: "!w-[400px]",
	420: "!w-[420px]",
	440: "!w-[440px]",
	460: "!w-[460px]",
	480: "!w-[480px]",
	500: "!w-[500px]",
	520: "!w-[520px]",
	540: "!w-[540px]",
	560: "!w-[560px]",
	580: "!w-[580px]",
	600: "!w-[600px]",
	620: "!w-[620px]",
	640: "!w-[640px]",
	660: "!w-[660px]",
	680: "!w-[680px]",
	700: "!w-[700px]",
	720: "!w-[720px]",
};

function AvatarSelectEntry() {
	const { values, panel } = useControls({
		initialAvatar: {
			kind: "select",
			label: "initial avatar",
			options: AVATAR_OPTIONS.map(option => option.id),
			default: AVATAR_OPTIONS[0]?.id ?? "blob",
		},
		optionCount: {
			kind: "number",
			label: "option count",
			default: AVATAR_OPTIONS.length,
			min: 1,
			max: AVATAR_OPTIONS.length,
			step: 1,
		},
	});
	const [picked, setPicked] = useState({ seed: values.initialAvatar, value: values.initialAvatar });
	const selectedAvatar = picked.seed === values.initialAvatar ? picked.value : values.initialAvatar;
	const options = AVATAR_SELECT_OPTIONS.slice(0, values.optionCount);
	return (
		<Demo
			summary="A trigger that opens a roomy modal gallery for choosing a presence avatar — each tile previews its live vibr animation, with space to breathe as the set grows."
			importPath="@fraym/ui/components/avatar-select"
			controls={panel}
			clip={false}
		>
			<AvatarSelect
				value={selectedAvatar}
				onChange={id => setPicked({ seed: values.initialAvatar, value: id })}
				options={options}
			/>
		</Demo>
	);
}

function CommandPaletteEntry() {
	const { values, panel } = useControls({
		dataset: {
			kind: "select",
			label: "dataset",
			options: ["default", "single-category", "empty"],
			default: "default",
		},
		open: { kind: "boolean", label: "open", default: false },
		width: { kind: "number", label: "width", default: 540, min: 360, max: 720, step: 20 },
	});
	const categories =
		values.dataset === "empty" ? [] : values.dataset === "single-category" ? PALETTE_CMDS.slice(0, 1) : PALETTE_CMDS;
	const widthClass = COMMAND_PALETTE_WIDTH_CLASS[values.width] ?? "!w-[540px]";
	return (
		<Demo
			summary="A centered ⌘K command palette with categorized commands. Opens as a modal overlay; Escape or backdrop closes."
			importPath="@fraym/ui/components/command-palette"
			controls={panel}
		>
			<Button variant="outline">Open command palette</Button>
			{values.open && (
				<CommandPalette categories={categories} onPick={() => {}} onClose={() => {}} className={widthClass} />
			)}
		</Demo>
	);
}

function DiffBlockEntry() {
	const { values, panel } = useControls({
		isNew: { kind: "boolean", label: "is new", default: false },
		showDeleted: { kind: "boolean", label: "show deleted", default: true },
		lineSet: {
			kind: "select",
			label: "line set",
			options: ["mixed", "add-only", "context-only"],
			default: "mixed",
		},
		path: { kind: "text", label: "path", default: "src/lib/rateLimit.ts" },
	});
	const mixedLines = [
		{ kind: "ctx" as const, lineNo: "22", code: "  check(key) {" },
		{ kind: "del" as const, lineNo: "23", code: "    const hits = this.buckets.get(key) ?? []" },
		{ kind: "add" as const, lineNo: "23", code: "    const now = Date.now()" },
		{ kind: "add" as const, lineNo: "24", code: "    const hits = (this.buckets.get(key) ?? [])" },
		{ kind: "add" as const, lineNo: "25", code: "      .filter(t => now - t < this.windowMs)" },
		{ kind: "ctx" as const, lineNo: "26", code: "    if (hits.length >= this.max) return { ok: false }" },
	];
	const lines = mixedLines.filter(line => {
		if (values.lineSet === "add-only") return line.kind === "add";
		if (values.lineSet === "context-only") return line.kind === "ctx";
		return true;
	});
	const deleted = lines.filter(line => line.kind === "del").length;
	return (
		<Demo
			summary="A compact, syntax-toned diff with a path header and +added / −deleted counts. The lightweight inline diff (see Features ▸ Diff viewer for the full split/unified viewer)."
			importPath="@fraym/ui/components/diff-block"
			controls={panel}
			stage="stretch"
		>
			<DiffBlock
				path={values.path}
				added={lines.filter(line => line.kind === "add").length}
				deleted={values.showDeleted ? deleted : undefined}
				isNew={values.isNew}
				lines={lines}
			/>
		</Demo>
	);
}

function DockSplitEntry() {
	const { values, panel } = useControls({ label: { kind: "text", label: "label", default: "Plan" } });
	return (
		<Demo
			summary="A segmented panel-toggle + caret used in the top bar to open the dock and pick a dock tab."
			importPath="@fraym/ui/components/dock-split"
			controls={panel}
		>
			<DockSplit label={values.label} onToggle={() => {}} onCaret={() => {}} />
		</Demo>
	);
}

function filterCities(items: readonly CityItem[], query: string): readonly CityItem[] {
	const ql = query.trim().toLowerCase();
	if (!ql) return [...items];
	return items.filter(
		item =>
			item.name.toLowerCase().includes(ql) ||
			item.country.toLowerCase().includes(ql) ||
			item.id.toLowerCase().includes(ql),
	);
}

function CitySelectorItem({
	item,
	isSelected,
	onPick,
}: {
	readonly item: CityItem;
	readonly isSelected: boolean;
	readonly onPick: () => void;
}) {
	return (
		<div
			className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-fr-surface-2"
			onClick={onPick}
		>
			<span className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-fr-surface-3 text-fr-text-2">
				<Icon name="pin" size={14} strokeWidth={1.8} />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="min-w-0 flex-1 truncate text-fr-base font-medium">{item.name}</span>
					<span className="shrink-0 whitespace-nowrap text-fr-2xs text-fr-text-3">{item.population}</span>
				</div>
				<span className="text-fr-xs text-fr-text-3">{item.country}</span>
			</div>
			<Icon
				name="check"
				size={15}
				strokeWidth={2.4}
				className="shrink-0 text-fr-accent"
				style={{ opacity: isSelected ? 1 : 0 }}
			/>
		</div>
	);
}

function CityCategoryIcon() {
	return (
		<span className="flex size-[20px] shrink-0 items-center justify-center text-fr-text-3">
			<Icon name="globe" size={17} strokeWidth={2} />
		</span>
	);
}

function CityBeforeCategories({ enabled }: { readonly enabled: boolean }) {
	return enabled ? (
		<div className="mx-2 mb-1 rounded-lg border border-fr-border-soft bg-fr-surface-2 px-2.5 py-2 text-fr-xs text-fr-text-3">
			Preview-only featured cities
		</div>
	) : undefined;
}

function CityFooter({ enabled }: { readonly enabled: boolean }) {
	return enabled ? (
		<div className="border-t border-fr-border-soft px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			{CITY_CATEGORIES.length} regions - {CITY_CATEGORIES.flatMap(category => category.items).length} cities
		</div>
	) : undefined;
}

function SelectorMenuEntry() {
	const [selected, setSelected] = useState<string>("tok");
	const [query, setQuery] = useState("");
	const [rect, setRect] = useState<DOMRect | null>(null);
	const { values, panel } = useControls({
		place: {
			kind: "select",
			label: "place",
			options: PLACEMENT_OPTIONS,
			default: "below",
		},
		footer: { kind: "boolean", label: "footer", default: false },
		beforeCategories: { kind: "boolean", label: "beforeCategories", default: false },
		panelWidth: { kind: "number", label: "panelWidth", default: 300, min: 240, max: 420, step: 20 },
		flyoutWidth: { kind: "number", label: "flyoutWidth", default: 290, min: 220, max: 420, step: 20 },
		initialQuery: { kind: "text", label: "initialQuery", default: "" },
	});
	const selectedItem = CITY_CATEGORIES.flatMap(c => c.items).find(c => c.id === selected);
	const selectedLabel = selectedItem ? `${selectedItem.name}, ${selectedItem.country}` : "Select a city";
	return (
		<Demo
			summary="The generic SelectorMenu<TItem> component: searchable categories with a hover flyout, built for any data type. This demo uses cities."
			importPath="@fraym/ui/components/selector-menu"
			controls={panel}
		>
			<Button variant="outline" onClick={e => setRect(e.currentTarget.getBoundingClientRect())}>
				{selectedLabel}
			</Button>
			{rect && (
				<SelectorMenu<CityItem>
					categories={CITY_CATEGORIES}
					selectedId={selected}
					getItemId={item => item.id}
					query={values.initialQuery || query}
					onQueryChange={setQuery}
					searchPlaceholder="Search cities..."
					filter={filterCities}
					renderItem={(item, isSelected, onPick) => (
						<CitySelectorItem item={item} isSelected={isSelected} onPick={onPick} />
					)}
					renderCategoryIcon={() => <CityCategoryIcon />}
					renderFlyoutHeader={category => (
						<div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">{category.label} cities</div>
					)}
					beforeCategories={<CityBeforeCategories enabled={values.beforeCategories} />}
					footer={<CityFooter enabled={values.footer} />}
					panelWidth={values.panelWidth}
					flyoutWidth={values.flyoutWidth}
					anchorRect={rect}
					place={values.place as PlacementOption}
					onPick={item => {
						setSelected(item.id);
						setRect(null);
					}}
					onClose={() => setRect(null)}
				/>
			)}
		</Demo>
	);
}

function PopoverEntry() {
	const { values, panel } = useControls({
		place: {
			kind: "select",
			label: "place",
			options: PLACEMENT_OPTIONS,
			default: "below",
		},
		width: { kind: "number", label: "width", default: 240, min: 180, max: 360, step: 20 },
		dim: { kind: "boolean", label: "dim", default: false },
		selectedRow: { kind: "boolean", label: "selected row", default: false },
		chevron: { kind: "boolean", label: "chevron", default: true },
		valueAccent: { kind: "boolean", label: "value accent", default: true },
	});
	const [rect, setRect] = useState<DOMRect | null>(null);
	return (
		<Demo
			summary="The overlay toolkit: a fixed-position PopoverPanel anchored to a trigger rect, composed from PopoverHeading / PopoverRow / PopoverDivider, over a Scrim backdrop. Menus and pickers are built from these."
			importPath="@fraym/ui/components/popover"
			controls={panel}
		>
			<Button variant="outline" onClick={e => setRect(e.currentTarget.getBoundingClientRect())}>
				Open popover
			</Button>
			{rect && (
				<>
					<Scrim dim={values.dim} onClick={() => setRect(null)} />
					<PopoverPanel anchorRect={rect} place={values.place as PlacementOption} width={values.width}>
						<PopoverHeading>Session</PopoverHeading>
						<PopoverRow
							icon={<Icon name="branch" size={14} />}
							label="Switch branch"
							kbd="⌘B"
							selected={values.selectedRow}
							onClick={() => setRect(null)}
						/>
						<PopoverRow
							icon={<Icon name="diff" size={14} />}
							label="View diff"
							value="3 files"
							chevron={values.chevron}
							onClick={() => setRect(null)}
						/>
						<PopoverDivider />
						<PopoverRow
							icon={<Icon name="x" size={14} />}
							label="Delete session"
							value="danger"
							valueAccent={values.valueAccent}
							onClick={() => setRect(null)}
						/>
					</PopoverPanel>
				</>
			)}
		</Demo>
	);
}

function MenuEntry() {
	const { values, panel } = useControls({
		disableSave: { kind: "boolean", label: "disable Save", default: false },
		onRail: { kind: "boolean", label: "rail background", default: true },
	});
	return (
		<Demo
			summary="A menubar of triggers, each opening an anchored dropdown of MenuItems. One menu open at a time; outside-click and Escape close. Defaults match desktop titlebar chrome — used by the Fraym shell's File/Edit/View menus."
			importPath="@fraym/ui/components/menu"
			controls={panel}
		>
			<div
				className={
					values.onRail ? "flex h-9 items-stretch rounded-[8px] bg-fr-rail px-1" : "flex h-9 items-stretch"
				}
			>
				<MenuBar>
					<Menu label="File">
						<MenuItem icon={<Icon name="plus" size={13} />} onClick={() => {}}>
							New session
						</MenuItem>
						<MenuItem disabled={values.disableSave} onClick={() => {}}>
							Save
						</MenuItem>
					</Menu>
					<Menu label="Edit">
						<MenuItem onClick={() => {}}>Undo</MenuItem>
						<MenuItem onClick={() => {}}>Redo</MenuItem>
						<MenuItem onClick={() => {}}>Select all</MenuItem>
					</Menu>
					<Menu label="View">
						<MenuItem icon={<Icon name="panel" size={13} />} onClick={() => {}}>
							Toggle sidebar
						</MenuItem>
						<MenuItem onClick={() => {}}>Reload</MenuItem>
					</Menu>
				</MenuBar>
			</div>
		</Demo>
	);
}

function TopBarEntry() {
	const { values, panel } = useControls({
		repo: { kind: "text", label: "repo", default: "fraym-api" },
		title: { kind: "text", label: "title", default: "Rate-limit auth middleware" },
		branch: { kind: "text", label: "branch", default: "feat/ratelimit" },
	});
	return (
		<Demo
			summary="The thread header: repo / title breadcrumb, a branch chip, and a right-slot for actions (icon buttons, dock split)."
			importPath="@fraym/ui/components/top-bar"
			controls={panel}
			stage="stretch"
		>
			<div className="w-full overflow-hidden rounded-lg border border-fr-border-soft">
				<TopBar
					repo={values.repo}
					title={values.title}
					branch={values.branch}
					rightSlot={
						<>
							<IconButton>
								<Icon name="search" size={16} />
							</IconButton>
							<DockSplit label="Diff" onToggle={() => {}} onCaret={() => {}} />
						</>
					}
				/>
			</div>
		</Demo>
	);
}

function ExplainerEntry() {
	const { values, panel } = useControls({
		heading: { kind: "boolean", label: "heading", default: false },
		modelLabel: { kind: "boolean", label: "model label", default: false },
		points: { kind: "number", label: "points", default: 2, min: 1, max: 4, step: 1 },
		takeaway: { kind: "boolean", label: "takeaway", default: true },
	});
	const points = [
		{
			ek: "First principles",
			et: "It's just data",
			ep: <>An interface, not a program — what you can say and hear back.</>,
		},
		{
			ek: "Why it exists",
			et: "Decouple surfaces",
			ep: (
				<>
					Surfaces target a <b>stable contract</b>, never engine internals.
				</>
			),
		},
		{
			ek: "Boundary",
			et: "No hidden side channel",
			ep: <>Every action crosses the same observable seam.</>,
		},
		{
			ek: "Result",
			et: "Swap engines safely",
			ep: <>The UI keeps rendering as long as the contract holds.</>,
		},
	];
	return (
		<Demo
			summary="A mental-model-first explainer: a model callout, a 2-up grid of points, and a takeaway. Used across the architecture docs pages."
			importPath="@fraym/ui/components/explainer"
			controls={panel}
			stage="stretch"
		>
			<Explainer
				heading={values.heading ? "SessionDriver mental model" : undefined}
				modelLabel={values.modelLabel ? "Wall socket model" : undefined}
				model={
					<>
						<b>It's a wall socket.</b> One plug shape fits every appliance — the wiring behind the wall can change
						without touching the appliance.
					</>
				}
				points={points.slice(0, values.points)}
				takeaway={
					values.takeaway ? (
						<>
							<b>Remember:</b> one socket, every appliance, any wire.
						</>
					) : null
				}
			/>
		</Demo>
	);
}

function PageHeaderEntry() {
	const { values, panel } = useControls({
		eyebrow: { kind: "boolean", label: "eyebrow", default: true },
		lede: { kind: "boolean", label: "lede", default: true },
		children: { kind: "boolean", label: "children", default: false },
		title: { kind: "text", label: "title", default: "SessionDriver - the one contract" },
	});
	return (
		<Demo
			summary="A doc/section header: monospace eyebrow, display title, and a lede paragraph."
			importPath="@fraym/ui/components/page-header"
			controls={panel}
			stage="stretch"
		>
			<PageHeader
				eyebrow={values.eyebrow ? "Block · zoom-in" : undefined}
				title={values.title}
				lede={
					values.lede ? (
						<>
							The seam between <b>every surface</b> and the engine — a <b>data-only</b> contract with three
							faces.
						</>
					) : undefined
				}
			>
				{values.children ? (
					<div className="mt-4 rounded-lg border border-fr-border-soft bg-fr-surface px-3 py-2 text-sm text-fr-text-2">
						Optional child content renders below the lede.
					</div>
				) : null}
			</PageHeader>
		</Demo>
	);
}

function AskPickerEntry() {
	const { values, panel } = useControls({
		variation: {
			kind: "select",
			label: "variation",
			options: ["single", "multi-step", "multi-select", "long"],
			default: "single",
		},
	});
	const variation = String(values.variation);
	const multiple = variation === "multi-select";
	const long = variation === "long";
	const base = long ? ASK_PICKER_DEPLOY_TARGETS : ASK_PICKER_SUPERPOWERS;
	const [checked, setChecked] = useState<readonly number[]>([]);
	const [last, setLast] = useState("—");
	const options = base.map((option, index) => ({
		...option,
		checked: multiple ? checked.includes(index) : undefined,
	}));
	return (
		<Demo
			summary="The live `ask` picker (AskPicker): numbered options with descriptions + a Recommended badge, hover-only highlight (hover never selects), an inline Other free-text row, radio (single) / checkbox (multi), and multi-step progress + Back. Click, number key, or ↑/↓ + Enter to choose; Esc cancels."
			importPath="@fraym/ui/components/ask-picker"
			controls={panel}
		>
			<div className="mx-auto w-full max-w-[620px] rounded-[14px] border border-fr-border bg-fr-surface p-3 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.45)]">
				<AskPicker
					question={
						long ? "Choose a deployment target" : "If you could have one superpower, which would you pick?"
					}
					progress={variation === "multi-step" ? "1/3" : undefined}
					options={options}
					multiple={multiple}
					allowOther={!long}
					canBack={variation === "multi-step"}
					onChoose={index => {
						if (multiple) {
							setChecked(prev =>
								prev.includes(index) ? prev.filter(other => other !== index) : [...prev, index],
							);
							setLast(`toggled: ${base[index]?.label}`);
						} else {
							setLast(`chose: ${base[index]?.label}`);
						}
					}}
					onSubmitOther={text => setLast(`other: “${text}”`)}
					onDone={() => setLast(`done: [${checked.map(index => base[index]?.label).join(", ")}]`)}
					onBack={() => setLast("← back")}
					onCancel={() => setLast("cancel")}
				/>
			</div>
			<div className="mt-3 px-1 font-secondary text-fr-xs text-fr-text-3">
				Last action: <span className="text-fr-text">{last}</span>
			</div>
		</Demo>
	);
}

// A 4-field `ask` form (number · slider · toggle · tags) walked one field at a
// time — mirrors how the fork elicits a multi-field ask as sequential typed
// controls. Each answer is the plain-control shape (a string); the toggle sends
// the raw "Yes"/"No" select label. A bare free-text fact (no candidates) is not
// a field — see AskPickerEntry's "Other" row (an `ask` question with `options: []`).
const ASK_FORM_FIELDS: readonly { readonly id: string; readonly question: string; readonly field: AskField }[] = [
	{
		id: "replicas",
		question: "How many replicas?",
		field: { type: "number", min: 1, max: 16, step: 1, default: 3, unit: "pods" },
	},
	{
		id: "cpu",
		question: "CPU limit per pod?",
		field: { type: "slider", min: 0.25, max: 8, step: 0.25, default: 2, unit: "vCPU" },
	},
	{ id: "autoscale", question: "Enable autoscaling?", field: { type: "toggle", default: true } },
	{
		id: "regions",
		question: "Deploy to which regions?",
		field: {
			type: "tags",
			suggestions: ["us-east", "us-west", "eu-central", "ap-south"],
			placeholder: "Add a region…",
		},
	},
];

function AskFieldControlEntry() {
	const [step, setStep] = useState(0);
	const [answers, setAnswers] = useState<readonly { readonly id: string; readonly value: string }[]>([]);
	const done = step >= ASK_FORM_FIELDS.length;
	const current = ASK_FORM_FIELDS[step];
	const reset = () => {
		setStep(0);
		setAnswers([]);
	};
	return (
		<Demo
			summary="AskFieldControl — the native typed controls behind the `ask` FIELD vocabulary: a number stepper (min/max/step + unit), the @fraym/ui Slider, a Switch toggle, and a tags chip picker (suggestions + add-your-own; submits comma-joined). Rendered when a request carries _meta['fraym/dialog'].field; each answers the same plain control shape. This walks a 4-field form one field at a time."
			importPath="@fraym/ui"
		>
			<div className="mx-auto w-full max-w-[620px] rounded-[14px] border border-fr-border bg-fr-surface p-3 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.45)]">
				{done || !current ? (
					<div className="flex flex-col gap-3 p-1">
						<span className="font-primary text-fr-base font-semibold text-fr-text">Form complete</span>
						<div className="flex flex-col gap-1 font-secondary text-fr-sm text-fr-text-2">
							{answers.map(answer => (
								<div key={answer.id} className="flex justify-between gap-3 tabular-nums">
									<span className="text-fr-text-3">{answer.id}</span>
									<span className="text-fr-text">{answer.value}</span>
								</div>
							))}
						</div>
						<Button size="sm" variant="outline" onClick={reset} className="self-start">
							Run again
						</Button>
					</div>
				) : (
					<AskFieldControl
						key={current.id}
						question={current.question}
						progress={`${step + 1}/${ASK_FORM_FIELDS.length}`}
						field={current.field}
						onSubmit={value => {
							setAnswers(prev => [...prev, { id: current.id, value }]);
							setStep(index => index + 1);
						}}
						onCancel={reset}
					/>
				)}
			</div>
		</Demo>
	);
}

function InputGroupEntry() {
	const { values, panel } = useControls({
		leading: { kind: "boolean", label: "leading icon", default: true },
		trailing: { kind: "boolean", label: "trailing clear", default: true },
		variant: { kind: "select", label: "variant", options: ["default", "ghost"], default: "default" },
		size: { kind: "select", label: "size", options: ["sm", "default"], default: "default" },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [q, setQ] = useState("design system");
	return (
		<Demo
			summary="A search/entry row: leading icon, bare input, optional trailing slot. Replaces the 4+ hand-rolled `flex items-center gap-2 rounded-[9px] border bg-fr-surface px-[11px]` patterns across marketplace-shell, selector-menu, connect-provider-wizard, and command-palette."
			importPath="@fraym/ui/components/input-group"
			controls={panel}
			stage="start"
		>
			<div className="w-full max-w-[420px]">
				<InputGroup
					leading={values.leading ? <Icon name="search" size={14} strokeWidth={1.8} /> : undefined}
					trailing={
						values.trailing && q.length > 0 ? (
							<IconButton
								variant="chrome"
								aria-label="Clear"
								className="-mr-1 size-6 rounded-md"
								onClick={() => setQ("")}
							>
								<Icon name="x" size={13} strokeWidth={1.8} />
							</IconButton>
						) : undefined
					}
					variant={values.variant as "default" | "ghost"}
					size={values.size as "sm" | "default"}
					disabled={values.disabled}
					placeholder="Search anything…"
					value={q}
					onChange={event => setQ(event.target.value)}
				/>
			</div>
		</Demo>
	);
}

function ModelPickerEntry() {
	const { values, panel } = useControls({
		place: {
			kind: "select",
			label: "place",
			options: PLACEMENT_OPTIONS,
			default: "below",
		},
		favorites: { kind: "boolean", label: "favorites", default: true },
		mostUsed: { kind: "boolean", label: "mostUsed", default: true },
		effortRow: { kind: "boolean", label: "effortRow", default: true },
		allModels: { kind: "boolean", label: "allModels", default: true },
		initialEffort: {
			kind: "select",
			label: "initialEffort",
			options: ["low", "medium", "high", "max"],
			default: "high",
		},
	});
	const [model, setModel] = useState<ModelSelection>({ name: "Opus 4.7", effort: "high" });
	const [rect, setRect] = useState<DOMRect | null>(null);
	const modelWithEffort = { ...model, effort: values.initialEffort };
	return (
		<Demo
			summary="An anchored model picker: favorites, most-used, and categorized models with a hover flyout, plus a reasoning-effort row. A domain-shaped SelectorMenu for the composer's model switch."
			importPath="@fraym/ui/components/model-picker"
			controls={panel}
		>
			<Button variant="outline" onClick={e => setRect(e.currentTarget.getBoundingClientRect())}>
				{modelWithEffort.name} · {modelWithEffort.effort}
			</Button>
			{rect && (
				<ModelPicker
					model={modelWithEffort}
					onSelect={setModel}
					favorites={values.favorites ? MODEL_FAVORITES : undefined}
					mostUsed={values.mostUsed ? MODEL_MOSTUSED : undefined}
					categories={MODEL_CATEGORIES}
					efforts={values.effortRow ? ["low", "medium", "high", "max"] : []}
					allLabel={values.allModels ? "All" : null}
					anchorRect={rect}
					place={values.place as PlacementOption}
					onClose={() => setRect(null)}
				/>
			)}
		</Demo>
	);
}

function ModelCatalogEntry() {
	const { values, panel } = useControls({
		loading: { kind: "boolean", label: "loading", default: false },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [selected, setSelected] = useState<{ provider: string; modelId: string }>({
		provider: "acme",
		modelId: "assistant-opus-4-8",
	});
	return (
		<Demo
			summary="The inline 'default model' catalog: an always-visible category rail (current, per-provider, capability) beside a searchable model list. Sourced from the live engine model registry, with loading and disabled states."
			importPath="@fraym/ui/components/model-catalog"
			controls={panel}
			stage="stretch"
		>
			<ModelCatalog
				models={ENGINE_SETTINGS_RESOURCE_FIXTURE.models}
				providers={ENGINE_SETTINGS_RESOURCE_FIXTURE.providers}
				selected={selected}
				loading={values.loading}
				disabled={values.disabled}
				onSelect={setSelected}
			/>
		</Demo>
	);
}

type EngineDemoConfig = {
	provider: string;
	modelId: string;
	thinkingLevel: string;
};

const ENGINE_MODEL_MENU_CONTROLS = {
	place: {
		kind: "select",
		label: "place",
		options: PLACEMENT_OPTIONS,
		default: "below",
	},
	session: { kind: "select", label: "session", options: ["known", "missing", "none"], default: "known" },
	efforts: { kind: "select", label: "efforts", options: ["full", "none", "short"], default: "full" },
	providers: { kind: "boolean", label: "providers", default: true },
	initialThinking: {
		kind: "select",
		label: "initialThinking",
		options: ["off", "auto", "minimal", "low", "medium", "high", "xhigh"],
		default: "high",
	},
} as const;

const INITIAL_ENGINE_DEMO_CONFIG: EngineDemoConfig = {
	provider: "acme",
	modelId: "assistant-opus-4-8",
	thinkingLevel: "high",
};

function engineDemoSessionConfig(
	config: EngineDemoConfig,
	session: string,
	initialThinking: string,
): EngineDemoConfig | null {
	const knownConfig = { ...config, thinkingLevel: initialThinking };
	if (session === "none") return null;
	if (session === "missing") return { provider: "missing", modelId: "offline", thinkingLevel: initialThinking };
	return knownConfig;
}

function engineDemoEfforts(kind: string): string[] {
	if (kind === "none") return [];
	if (kind === "short") return ["off", "high"];
	return ["off", "auto", "minimal", "low", "medium", "high", "xhigh"];
}

function selectedEngineDemoModel(sessionConfig: EngineDemoConfig | null) {
	return ENGINE_SETTINGS_RESOURCE_FIXTURE.models.find(
		m => sessionConfig != null && m.providerId === sessionConfig.provider && m.modelId === sessionConfig.modelId,
	);
}

function engineModelMenuSelectedLabel(
	selected: ReturnType<typeof selectedEngineDemoModel>,
	sessionConfig: EngineDemoConfig | null,
): string {
	return selected?.label ?? sessionConfig?.modelId ?? "No session";
}

function engineModelMenuThinkingLevel(sessionConfig: EngineDemoConfig | null): string {
	return sessionConfig?.thinkingLevel ?? "none";
}

function EngineModelMenuTrigger({
	selectedLabel,
	thinkingLevel,
	onOpen,
}: {
	selectedLabel: string;
	thinkingLevel: string;
	onOpen: (rect: DOMRect) => void;
}) {
	return (
		<Button variant="outline" onClick={e => onOpen(e.currentTarget.getBoundingClientRect())}>
			{selectedLabel} · {thinkingLevel}
		</Button>
	);
}

function EngineModelMenuPanel({
	rect,
	values,
	sessionConfig,
	efforts,
	setConfig,
	onClose,
}: {
	rect: DOMRect | null;
	values: { providers: boolean; place: string };
	sessionConfig: EngineDemoConfig | null;
	efforts: string[];
	setConfig: (update: (current: EngineDemoConfig) => EngineDemoConfig) => void;
	onClose: () => void;
}) {
	if (!rect) return null;
	return (
		<EngineModelMenu
			models={ENGINE_SETTINGS_RESOURCE_FIXTURE.models}
			providers={values.providers ? ENGINE_SETTINGS_RESOURCE_FIXTURE.providers : undefined}
			sessionConfig={sessionConfig}
			efforts={efforts}
			anchorRect={rect}
			place={values.place as PlacementOption}
			onSelectModel={sel => setConfig(c => ({ ...c, ...sel }))}
			onSelectThinking={level => setConfig(c => ({ ...c, thinkingLevel: level }))}
			onClose={onClose}
		/>
	);
}

function EngineModelMenuEntry() {
	const { values, panel } = useControls(ENGINE_MODEL_MENU_CONTROLS);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [config, setConfig] = useState<EngineDemoConfig>(INITIAL_ENGINE_DEMO_CONFIG);
	const sessionConfig = engineDemoSessionConfig(config, values.session, values.initialThinking);
	const efforts = engineDemoEfforts(values.efforts);
	const selected = selectedEngineDemoModel(sessionConfig);
	return (
		<Demo
			summary="The in-chat model switch: adapts the live engine model registry (EngineModelRecord[]) to ModelPicker, mapping a pick back to a real provider + modelId and binding reasoning effort to the engine's thinking levels."
			importPath="@fraym/ui/components/engine-model-menu"
			controls={panel}
		>
			<EngineModelMenuTrigger
				selectedLabel={engineModelMenuSelectedLabel(selected, sessionConfig)}
				thinkingLevel={engineModelMenuThinkingLevel(sessionConfig)}
				onOpen={setRect}
			/>
			<EngineModelMenuPanel
				rect={rect}
				values={values}
				sessionConfig={sessionConfig}
				efforts={efforts}
				setConfig={setConfig}
				onClose={() => setRect(null)}
			/>
		</Demo>
	);
}

type ProviderDemoState = "healthy" | "rate-limited" | "auth-failed" | "none";
type ProviderAccount = NonNullable<typeof PROVIDER_WITH_ACCOUNTS.accounts>[number];

function providerDemoDiagnostics(account: ProviderAccount, state: ProviderDemoState) {
	if (state === "auth-failed") {
		return {
			state: "auth_failed" as const,
			checkedAt: 0,
			reason: `${account.label} needs a fresh sign-in.`,
		};
	}
	if (state === "rate-limited") {
		return {
			state: "rate_limited" as const,
			checkedAt: 0,
			reason: `${account.label} is cooling down.`,
			limits: [{ id: "rpm", label: "Requests", usedFraction: 0.96 }],
		};
	}
	return {
		state: "healthy" as const,
		checkedAt: 0,
		limits: [{ id: "rpm", label: "Requests", usedFraction: account.key === "work" ? 0.18 : 0.34 }],
	};
}

function providerDemoAccount(
	account: ProviderAccount,
	pinnedKey: string | undefined,
	providerState: ProviderDemoState,
) {
	return {
		...account,
		active: pinnedKey ? account.key === pinnedKey : account.active,
		pinned: account.key === pinnedKey,
		diagnostics: providerDemoDiagnostics(account, providerState),
	};
}

function providerDemoFixture(
	providerState: ProviderDemoState,
	pinnedKey: string | undefined,
	policy: "weighted" | "priority-fallback",
) {
	if (providerState === "none") return undefined;
	return {
		...PROVIDER_WITH_ACCOUNTS,
		hasAuth: providerState !== "auth-failed",
		accountSelectionPolicy: policy,
		accounts: PROVIDER_WITH_ACCOUNTS.accounts?.map(account => providerDemoAccount(account, pinnedKey, providerState)),
	};
}

function ProviderAccountSwitcherEntry() {
	const { values, panel } = useControls({
		providerState: {
			kind: "select",
			label: "providerState",
			options: ["healthy", "rate-limited", "auth-failed", "none"],
			default: "healthy",
		},
		loading: { kind: "boolean", label: "loading", default: false },
		removeAction: { kind: "boolean", label: "removeAction", default: true },
		reconnectAction: { kind: "boolean", label: "reconnectAction", default: true },
		pin: { kind: "select", label: "pin", options: ["none", "work", "personal"], default: "none" },
		policy: { kind: "select", label: "policy", options: ["weighted", "priority-fallback"], default: "weighted" },
	});
	const [last, setLast] = useState("—");
	const pinnedKey = values.pin === "none" ? undefined : (values.pin as string);
	const provider = providerDemoFixture(
		values.providerState as ProviderDemoState,
		pinnedKey,
		values.policy as "weighted" | "priority-fallback",
	);
	return (
		<Demo
			summary="A control for a provider with 2+ signed-in accounts: pin exactly one account, or keep multiple eligible under a balanced (usage-headroom) or priority-fallback (ordered chain, drag to reorder) policy. Each row shows health diagnostics; per-account Sign out / Sign in again appear when the matching callback is set."
			importPath="@fraym/ui/components/provider-account-switcher"
			controls={panel}
			stage="start"
		>
			<div className="w-full max-w-[440px]">
				<ProviderAccountSwitcher
					provider={provider}
					loading={values.loading}
					onPinAccount={(_providerId, accountKey) => setLast(accountKey ? `pinned ${accountKey}` : "unpinned")}
					onSetAccountPolicy={(_providerId, policy) => setLast(`policy: ${policy}`)}
					onSetAccountPriorityOrder={(_providerId, order) => setLast(`order: ${order.join(" > ")}`)}
					onRemoveAccount={
						values.removeAction ? (_providerId, accountKey) => setLast(`sign out ${accountKey}`) : undefined
					}
					onReconnectAccount={
						values.reconnectAction ? (_providerId, accountKey) => setLast(`reconnect ${accountKey}`) : undefined
					}
				/>
			</div>
			<div className="mt-3 px-1 font-secondary text-fr-xs text-fr-text-3">
				Last action: <span className="text-fr-text">{last}</span>
			</div>
		</Demo>
	);
}

function confirmDialogCopy(danger: boolean) {
	if (danger) {
		return {
			title: "Delete session?",
			description: "This removes the session and its artifacts from disk. This cannot be undone.",
			confirmLabel: "Delete session",
			confirmed: "confirmed delete",
		};
	}
	return {
		title: "Apply configuration?",
		description: "Save these settings and reconnect the workspace to apply them.",
		confirmLabel: "Apply",
		confirmed: "applied",
	};
}

function ConfirmDialogDetails() {
	return (
		<div className="space-y-1">
			<div className="font-medium text-fr-text">WebSocket local harness</div>
			<div className="break-all font-secondary text-fr-2xs text-fr-text-3">019e8ed1-f264-7000-b89d-abf0462d5e83</div>
		</div>
	);
}

function ConfirmDialogEntry() {
	const { values, panel } = useControls({
		intent: { kind: "select", label: "intent", options: ["danger", "default"], default: "danger" },
		busy: { kind: "boolean", label: "busy", default: false },
	});
	const [open, setOpen] = useState(false);
	const [last, setLast] = useState("—");
	const copy = confirmDialogCopy(values.intent === "danger");
	return (
		<Demo
			summary="A confirmation dialog built on Modal chrome (not browser alert()): an intent-toned icon chip, title + description, an optional details panel, and Cancel / Confirm buttons. The danger intent reddens the confirm action."
			importPath="@fraym/ui/components/confirm-dialog"
			controls={panel}
		>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Open dialog
			</Button>
			<span className="font-secondary text-fr-xs text-fr-text-3">
				Last action: <span className="text-fr-text">{last}</span>
			</span>
			{open && (
				<ConfirmDialog
					intent={values.intent as ConfirmDialogIntent}
					title={copy.title}
					description={copy.description}
					confirmLabel={copy.confirmLabel}
					busy={values.busy}
					onConfirm={() => {
						setLast(copy.confirmed);
						setOpen(false);
					}}
					onClose={() => {
						setLast("cancelled");
						setOpen(false);
					}}
					details={<ConfirmDialogDetails />}
				/>
			)}
		</Demo>
	);
}

const LABOR_STEPS: readonly LaborStep[] = [
	{ id: "config", label: "Saving configuration", status: "done" },
	{ id: "key", label: "Storing credentials", status: "done" },
	{ id: "discover", label: "Discovering models", status: "active" },
	{ id: "ready", label: "Ready to chat", status: "pending" },
];
const LABOR_CYCLE = ["Connecting", "Authenticating", "Discovering models"];

function LaborEntry() {
	const { values, panel } = useControls({
		mode: { kind: "select", label: "mode", options: ["steps", "cycle"], default: "steps" },
		layout: { kind: "select", label: "layout", options: ["stack", "inline"], default: "stack" },
		size: { kind: "select", label: "size", options: ["sm", "md"], default: "md" },
		indicator: {
			kind: "select",
			label: "indicator",
			options: ["circular", "dots", "bars", "signal", "orbit", "bounce", "shimmer"],
			default: "circular",
		},
	});
	const layout = values.layout as "stack" | "inline";
	const size = values.size as "sm" | "md";
	const indicator = values.indicator as LaborIndicator;
	return (
		<Demo
			summary="The labor illusion: surface the work during a wait so it reads productive, not frozen. `steps` is a live checklist (done / active / pending); `cycle` rotates reassuring phrases for unknown-duration waits. Powers the Connections add/remove flows."
			importPath="@fraym/ui/components/labor"
			controls={panel}
		>
			{values.mode === "steps" ? (
				<Labor steps={LABOR_STEPS} layout={layout} size={size} indicator={indicator} />
			) : (
				<Labor cycle={LABOR_CYCLE} layout={layout} size={size} indicator={indicator} />
			)}
		</Demo>
	);
}

const laborDocs: EntryDocs = {
	import: 'import { Labor, type LaborStep } from "@fraym/ui";',
	anatomy: `<Labor steps={[{ id: "go", label: "Discovering", status: "active" }]} />`,
	examples: [
		{ label: "Live checklist", code: `<Labor steps={steps} />` },
		{ label: "Cycling phrases", code: `<Labor cycle={["Connecting", "Authenticating", "Discovering models"]} />` },
		{ label: "Inline (compact)", code: `<Labor steps={steps} layout="inline" size="sm" />` },
	],
	api: [
		{
			name: "steps",
			type: "readonly LaborStep[]",
			description: "Known steps with live statuses (done/active/pending/error) — checklist mode.",
		},
		{
			name: "cycle",
			type: "readonly string[]",
			description: "Phrases rotated on a timer; holds on the last — unknown-duration mode.",
		},
		{ name: "cycleIntervalMs", type: "number", default: "1400", description: "Cycle advance interval." },
		{
			name: "layout",
			type: '"stack" | "inline"',
			default: '"stack"',
			description: "Full vertical list vs compact single row.",
		},
		{ name: "size", type: '"sm" | "md"', default: '"md"', description: "Text + glyph scale." },
		{
			name: "indicator",
			type: '"circular" | "dots" | "bars" | "signal" | "orbit" | "bounce" | "shimmer"',
			default: '"circular"',
			description:
				"Live loader — any Spinner kind (circular / dots / bars / signal / orbit / bounce) or shimmering text (no glyph).",
		},
	],
};

function LaborOverlayEntry() {
	const { values, panel } = useControls({
		mode: { kind: "select", label: "mode", options: ["cycle", "steps"], default: "cycle" },
		title: { kind: "text", label: "title", default: "Refreshing connections" },
		indicator: {
			kind: "select",
			label: "indicator",
			options: ["circular", "dots", "bars", "signal", "orbit", "bounce", "shimmer"],
			default: "circular",
		},
	});
	const [active, setActive] = useState(false);
	// Self-dismiss so the demo never traps the kitchen sink behind the blocking modal.
	useEffect(() => {
		if (!active) return;
		const timer = setTimeout(() => setActive(false), 3600);
		return () => clearTimeout(timer);
	}, [active]);
	const title = (values.title as string) || undefined;
	return (
		<Demo
			summary="The blocking modal labor illusion: a full-viewport darkened, blurred backdrop (portaled to body, above any open Modal) with a centered floating panel. Powers the Connections add / remove / refresh waits — replaces dimming every button. Auto-dismisses here after ~3.6s; in product it clears when the work completes."
			importPath="@fraym/ui/components/labor"
			controls={panel}
		>
			<Button variant="outline" onClick={() => setActive(true)} disabled={active}>
				{active ? "Working…" : "Show labor modal"}
			</Button>
			<LaborOverlay
				active={active}
				title={title}
				indicator={values.indicator as LaborIndicator}
				phrases={values.mode === "cycle" ? LABOR_CYCLE : undefined}
				steps={values.mode === "steps" ? LABOR_STEPS : undefined}
			/>
		</Demo>
	);
}

const laborOverlayDocs: EntryDocs = {
	import: 'import { LaborOverlay } from "@fraym/ui";',
	anatomy: `<LaborOverlay active={pending} title="Refreshing" phrases={["Syncing", "Updating"]} />`,
	examples: [
		{
			label: "Refresh wait (cycle)",
			code: `<LaborOverlay active={refreshing} title="Refreshing connections" phrases={["Syncing providers", "Updating credentials"]} />`,
		},
		{ label: "Known steps", code: `<LaborOverlay active={removing} title="Removing provider" steps={steps} />` },
	],
	api: [
		{ name: "active", type: "boolean", description: "Renders the modal when true; nothing when false." },
		{ name: "phrases", type: "readonly string[]", description: "Cycle phrases for unknown-duration waits." },
		{ name: "steps", type: "readonly LaborStep[]", description: "Live checklist — alternative to phrases." },
		{ name: "title", type: "string", description: "Optional heading above the illusion." },
		{
			name: "indicator",
			type: '"circular" | "dots" | "bars" | "signal" | "orbit" | "bounce" | "shimmer"',
			default: '"circular"',
			description:
				"Live loader — any Spinner kind (circular / dots / bars / signal / orbit / bounce) or shimmering text.",
		},
		{ name: "className", type: "string", description: "Extra classes for the centered panel." },
	],
};

const actionBarDocs: EntryDocs = {
	import: 'import { ActionBar } from "@fraym/ui";',
	anatomy: `<ActionBar
  items={[
    { label: "Approve", icon: "check", variant: "accent", onClick: approve },
    { label: "Reject", variant: "outline", onClick: reject },
  ]}
/>`,
	examples: [
		{
			label: "Accent + outline",
			code: `<ActionBar
  items={[
    { label: "Commit", icon: "check", variant: "accent", onClick: commit },
    { label: "Discard", variant: "outline", onClick: discard },
  ]}
/>`,
		},
		{
			label: "Ghost actions",
			code: `<ActionBar
  items={[
    { label: "Copy", icon: "copy", variant: "ghost", onClick: copy },
    { label: "Share", icon: "share", variant: "ghost", onClick: share },
  ]}
/>`,
		},
	],
	api: [
		{ name: "items", type: "readonly ActionItem[]", required: true, description: "Buttons rendered left-to-right." },
		{
			name: "className",
			type: "string",
			description:
				"Additional classes merged onto the flex row. Compose spacing here (the element is margin-neutral).",
		},
		{ name: "ActionItem.label", type: "string", required: true, description: "Button text." },
		{ name: "ActionItem.icon", type: "IconName", description: "Optional leading icon from the Fraym icon registry." },
		{
			name: "ActionItem.variant",
			type: '"accent" | "outline" | "ghost"',
			default: '"outline"',
			description: "Visual emphasis of the button.",
		},
		{ name: "ActionItem.onClick", type: "() => void", description: "Click handler." },
	],
};

const popoverDocs: EntryDocs = {
	import: 'import { Modal, Scrim, PopoverPanel, PopoverHeading, PopoverDivider, PopoverRow } from "@fraym/ui";',
	anatomy: `<PopoverPanel anchorRect={triggerRect} place="below" width={260}>
  <PopoverHeading>Switch model</PopoverHeading>
  <PopoverRow icon={icon} label="GPT-5" value="default" selected />
  <PopoverDivider />
  <PopoverRow label="Settings" kbd="⌘," chevron />
</PopoverPanel>`,
	examples: [
		{
			label: "Anchored panel",
			code: `<PopoverPanel anchorRect={btnRect} place="below-right" width={240}>
  <PopoverRow icon={icon} label="Rename" />
  <PopoverRow icon={icon} label="Duplicate" kbd="⌘D" />
  <PopoverDivider />
  <PopoverRow icon={icon} label="Delete" />
</PopoverPanel>`,
		},
		{
			label: "Modal dialog",
			code: `<Modal onClose={close} placement="upper" className="w-[480px]">
  <div className="p-4">Confirm this action?</div>
</Modal>`,
		},
		{ label: "Bare scrim", code: `<Scrim dim onClick={close} />` },
	],
	api: [
		{
			name: "Scrim.dim",
			type: "boolean",
			default: "false",
			description: "Adds a translucent dark backdrop with blur. Without it the scrim is an invisible click-catcher.",
		},
		{
			name: "Modal.onClose",
			type: "() => void",
			required: true,
			description: "Called on backdrop click and (unless disabled) Escape.",
		},
		{
			name: "Modal.placement",
			type: '"center" | "upper"',
			default: '"center"',
			description: 'Vertical anchor. "upper" (~42%) suits command palettes.',
		},
		{ name: "Modal.closeOnEscape", type: "boolean", default: "true", description: "Close when Escape is pressed." },
		{
			name: "PopoverPanel.width",
			type: "number",
			default: "240",
			description: "Panel width in px (used directly, or to size against anchorRect).",
		},
		{
			name: "PopoverPanel.anchorRect",
			type: "DOMRect | null",
			description: "Trigger rect to anchor against; position is computed from it.",
		},
		{
			name: "PopoverPanel.place",
			type: "Placement",
			default: '"below"',
			description: '"below" | "above" | "below-right" | "above-right".',
		},
		{ name: "PopoverRow.label", type: "string", required: true, description: "Primary row text." },
		{ name: "PopoverRow.icon", type: "React.ReactNode", description: "Leading icon node." },
		{ name: "PopoverRow.value", type: "string", description: "Trailing value text." },
		{
			name: "PopoverRow.valueAccent",
			type: "boolean",
			description: "Render the trailing value in the accent color.",
		},
		{ name: "PopoverRow.kbd", type: "string", description: "Trailing keyboard-shortcut hint." },
		{ name: "PopoverRow.chevron", type: "boolean", description: "Show a trailing chevron (submenu affordance)." },
		{ name: "PopoverRow.selected", type: "boolean", description: "Highlight the row as the current selection." },
	],
};

const menuDocs: EntryDocs = {
	import: 'import { MenuBar, Menu, MenuItem } from "@fraym/ui";',
	anatomy: `<MenuBar>
  <Menu label="File">
    <MenuItem onClick={newSession}>New session</MenuItem>
    <MenuItem onClick={save}>Save</MenuItem>
  </Menu>
</MenuBar>`,
	examples: [
		{
			label: "Menubar",
			code: `<MenuBar>\n  <Menu label="File">\n    <MenuItem onClick={onNew}>New</MenuItem>\n  </Menu>\n  <Menu label="Edit">\n    <MenuItem onClick={onUndo}>Undo</MenuItem>\n  </Menu>\n</MenuBar>`,
		},
		{
			label: "Item with icon",
			code: `<MenuItem icon={<Icon name="plus" size={13} />} onClick={onNew}>New session</MenuItem>`,
		},
		{ label: "Disabled item", code: `<MenuItem disabled>Save</MenuItem>` },
		{ label: "Keep open on select", code: `<MenuItem closeOnSelect={false} onClick={toggle}>Toggle flag</MenuItem>` },
		{
			label: "Trigger guard (desktop titlebar)",
			code: `<Menu label="File" triggerProps={{ onDoubleClick: e => e.stopPropagation() }}>…</Menu>`,
		},
	],
	api: [
		{
			name: "MenuBar.children",
			type: "ReactNode",
			description: "The Menu triggers; MenuBar coordinates so one dropdown is open at a time.",
		},
		{ name: "Menu.label", type: "ReactNode", description: "Trigger content." },
		{ name: "Menu.id", type: "string", default: "auto", description: "Stable id for open-state coordination." },
		{ name: "Menu.triggerClassName", type: "string", description: "Classes merged onto the trigger button." },
		{ name: "Menu.panelClassName", type: "string", description: "Classes merged onto the dropdown panel." },
		{
			name: "Menu.triggerProps",
			type: "ComponentProps<'button'>",
			description: "Extra props spread onto the trigger (e.g. onDoubleClick guards).",
		},
		{ name: "MenuItem.icon", type: "ReactNode", description: "Optional leading icon." },
		{
			name: "MenuItem.closeOnSelect",
			type: "boolean",
			default: "true",
			description: "Close the parent menu after the click handler runs.",
		},
		{
			name: "MenuItem...",
			type: "ComponentProps<'button'>",
			description: "Forwards native button attributes (onClick, disabled, …).",
		},
	],
};

const explainerDocs: EntryDocs = {
	import: 'import { Explainer } from "@fraym/ui";',
	anatomy: `<Explainer
  model={<>The agent reduces a stream of <b>events</b> into UI state.</>}
  points={[{ ek: "01", et: "Events", ep: "Driver emits patches" }]}
  takeaway={<>Everything flows downward.</>}
/>`,
	examples: [
		{
			label: "Mental-model block",
			code: `<Explainer
  heading="Understand the driver"
  model={<>The session driver is a <b>reducer</b> over an event stream.</>}
  points={[
    { ek: "01", et: "Send", ep: "UI dispatches an action" },
    { ek: "02", et: "Patch", ep: "Driver returns a state patch" },
  ]}
  takeaway={<>State is never mutated in place.</>}
/>`,
		},
	],
	api: [
		{
			name: "heading",
			type: "ReactNode",
			default: '"Understand this block"',
			description: "Eyebrow heading above the model callout.",
		},
		{
			name: "modelLabel",
			type: "ReactNode",
			default: '"Mental model"',
			description: "Small label inside the accent callout.",
		},
		{
			name: "model",
			type: "ReactNode",
			required: true,
			description: "The mental-model statement (supports <b> emphasis).",
		},
		{ name: "points", type: "readonly ExplainPoint[]", required: true, description: "Grid of supporting points." },
		{ name: "takeaway", type: "ReactNode", required: true, description: "Closing takeaway in a dashed accent box." },
		{ name: "className", type: "string", description: "Additional classes merged onto the section root." },
		{ name: "ExplainPoint.ek", type: "ReactNode", required: true, description: "Eyebrow kicker (e.g. step number)." },
		{ name: "ExplainPoint.et", type: "ReactNode", required: true, description: "Point title." },
		{ name: "ExplainPoint.ep", type: "ReactNode", required: true, description: "Point prose (supports <b>/<em>)." },
	],
};

const topBarDocs: EntryDocs = {
	import: 'import { TopBar } from "@fraym/ui";',
	anatomy:
		'<TopBar\n  repo="fraym-api"\n  title="Rate-limit auth middleware"\n  branch="feat/ratelimit"\n  rightSlot={<>{/* icon buttons, dock split */}</>}\n/>',
	examples: [
		{
			label: "Thread header with branch chip and actions",
			code: '<div className="w-full overflow-hidden rounded-lg border border-fr-border-soft">\n  <TopBar\n    repo="fraym-api"\n    title="Rate-limit auth middleware"\n    branch="feat/ratelimit"\n    rightSlot={\n      <>\n        <IconButton>\n          <Icon name="search" size={16} />\n        </IconButton>\n        <DockSplit label="Diff" onToggle={() => {}} onCaret={() => {}} />\n      </>\n    }\n  />\n</div>',
		},
		{ label: "Minimal — title only", code: '<TopBar title="Untitled session" />' },
	],
	api: [
		{
			name: "repo",
			type: "string",
			description:
				"Leading breadcrumb segment (repository name); rendered in muted secondary font before the title slash separator.",
		},
		{ name: "title", type: "string", description: "Primary breadcrumb label; truncates when the header is narrow." },
		{
			name: "branch",
			type: "string",
			description:
				"When set, renders a git-branch chip with an inline branch icon; hidden below 520px viewport width.",
		},
		{
			name: "rightSlot",
			type: "React.ReactNode",
			description:
				"Right-aligned action area (icon buttons, dock split, etc.); pushed to the far right with ml-auto.",
		},
		{ name: "className", type: "string", description: "Extra classes merged onto the root <header> element." },
		{
			name: "titleProps",
			type: "HTMLAttributes<HTMLDivElement>",
			description:
				"Spread onto the breadcrumb container div; its className is merged with the default crumb classes.",
		},
	],
};

const pageHeaderDocs: EntryDocs = {
	import: 'import { PageHeader } from "@fraym/ui";',
	anatomy:
		'<PageHeader\n  eyebrow="Block · zoom-in"\n  title="SessionDriver — the one contract"\n  lede="The seam between every surface and the engine."\n/>',
	examples: [
		{
			label: "Doc section header with eyebrow + lede",
			code: '<PageHeader\n  eyebrow="Block · zoom-in"\n  title={<>SessionDriver — the one contract</>}\n  lede={\n    <>\n      The seam between <b>every surface</b> and the engine — a <b>data-only</b> contract with three faces.\n    </>\n  }\n/>',
		},
		{
			label: "Title only with extra content via children",
			code: '<PageHeader title="Architecture">\n  <nav>{/* on-page links */}</nav>\n</PageHeader>',
		},
	],
	api: [
		{
			name: "eyebrow",
			type: "ReactNode",
			description:
				"Small uppercase, letter-spaced accent label rendered above the title; omitted when null/undefined.",
		},
		{
			name: "title",
			type: "ReactNode",
			required: true,
			description: "Display heading rendered as an <h1> in large display font; the only required prop.",
		},
		{
			name: "lede",
			type: "ReactNode",
			description: "Intro paragraph below the title; <b> children are emphasized. Omitted when null/undefined.",
		},
		{
			name: "className",
			type: "string",
			description: "Applied to the root <header> element (no default classes merged).",
		},
		{ name: "children", type: "ReactNode", description: "Extra content rendered after the lede inside the header." },
	],
};

const appShellDocs: EntryDocs = {
	import: 'import { AppShell } from "@fraym/ui";',
	anatomy:
		'<AppShell\n  rail={<SessionRail />}\n  main={<MainColumn />}\n  dock={<RightDock />}\n  dockOpen\n  railMode="expanded"\n  dockWidth={420}\n/>',
	examples: [
		{
			label: "Full shell: rail + main + dock",
			code: "<AppShell\n  rail={<SessionRail />}\n  main={<MainColumn />}\n  dock={<RightDock />}\n  dockOpen={isDockOpen}\n  railMode={railMode}\n  dockWidth={420}\n/>",
		},
		{ label: "Rail + main only (dock closed)", code: "<AppShell rail={<SessionRail />} main={<MainColumn />} />" },
	],
	api: [
		{
			name: "rail",
			type: "React.ReactNode",
			required: true,
			description:
				'Left rail column; rendered unless railMode is "hidden". Its width follows railMode (expanded 264px / compact 56px).',
		},
		{
			name: "main",
			type: "React.ReactNode",
			required: true,
			description: "Fluid center column (the primary content area).",
		},
		{
			name: "dock",
			type: "React.ReactNode",
			description:
				'Optional right dock; the element should carry data-slot="right-dock" to pick up overlay styling below 1240px.',
		},
		{
			name: "dockOpen",
			type: "boolean",
			default: "false",
			description:
				"Whether the dock column is allocated grid space; below 1240px the dock floats as a fixed overlay instead.",
		},
		{
			name: "railMode",
			type: '"expanded" | "compact" | "hidden"',
			default: '"expanded"',
			description:
				"Rail layout state: expanded (264px), compact (56px icon rail), or hidden (0). The rail track width morphs via the data-rail-mode attribute; the rail node is unmounted only when hidden.",
		},
		{
			name: "dockWidth",
			type: "number",
			description:
				"Dock width in pixels; sets the --fr-dock-w CSS variable (with a --fr-dock-w-live override hook). No grid effect when unset/0.",
		},
		{ name: "className", type: "string", description: "Extra classes merged onto the root grid container." },
	],
};

const selectorMenuDocs: EntryDocs = {
	import: 'import { SelectorMenu, type SelectorMenuCategory, type SelectorMenuProps } from "@fraym/ui";',
	anatomy:
		'<SelectorMenu<TItem>\n  categories={categories}\n  selectedId={selectedId}\n  getItemId={item => item.id}\n  query={query}\n  onQueryChange={setQuery}\n  renderItem={(item, selected, onPick) => <Row item={item} selected={selected} onClick={onPick} />}\n  anchorRect={rect}\n  place="below"\n  onPick={item => setSelectedId(item.id)}\n  onClose={() => setRect(null)}\n/>',
	examples: [
		{
			label: "City picker with flyout, search, and custom rows",
			code: 'const [selected, setSelected] = useState("tok");\nconst [query, setQuery] = useState("");\nconst [rect, setRect] = useState<DOMRect | null>(null);\n\n<Button variant="outline" onClick={e => setRect(e.currentTarget.getBoundingClientRect())}>\n  Select a city\n</Button>\n{rect && (\n  <SelectorMenu<CityItem>\n    categories={CITY_CATEGORIES}\n    selectedId={selected}\n    getItemId={item => item.id}\n    query={query}\n    onQueryChange={setQuery}\n    searchPlaceholder="Search cities..."\n    filter={(items, q) => {\n      const ql = q.trim().toLowerCase();\n      if (!ql) return [...items];\n      return items.filter(i => i.name.toLowerCase().includes(ql) || i.country.toLowerCase().includes(ql));\n    }}\n    renderItem={(item, isSelected, onPick) => (\n      <div className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-fr-surface-2" onClick={onPick}>\n        <span className="min-w-0 flex-1 truncate">{item.name}</span>\n        <Icon name="check" size={15} className="text-fr-accent" style={{ opacity: isSelected ? 1 : 0 }} />\n      </div>\n    )}\n    renderCategoryIcon={() => <Icon name="globe" size={17} />}\n    renderFlyoutHeader={category => <div className="fr-eyebrow">{category.label} cities</div>}\n    anchorRect={rect}\n    place="below"\n    onPick={item => { setSelected(item.id); setRect(null); }}\n    onClose={() => setRect(null)}\n  />\n)}',
		},
	],
	api: [
		{
			name: "categories",
			type: "readonly SelectorMenuCategory<TItem>[]",
			required: true,
			description: "Categorized items rendered as rail rows, each opening a flyout of its items.",
		},
		{
			name: "selectedId",
			type: "string",
			required: true,
			description: "Identity of the currently-selected item, compared against getItemId.",
		},
		{
			name: "getItemId",
			type: "(item: TItem) => string",
			required: true,
			description: "Extracts a stable string identity from an item.",
		},
		{ name: "query", type: "string", required: true, description: "Controlled search query." },
		{
			name: "onQueryChange",
			type: "(query: string) => void",
			required: true,
			description: "Called when the user types in the search field.",
		},
		{ name: "searchPlaceholder", type: "string", description: "Placeholder text for the search field." },
		{
			name: "filter",
			type: "(items: readonly TItem[], query: string) => readonly TItem[]",
			description: "Custom filter; defaults to matching getItemId(item) against the query.",
		},
		{
			name: "renderItem",
			type: "(item: TItem, selected: boolean, onPick: () => void) => React.ReactNode",
			required: true,
			description: "Renders a single item row given the item, its selected state, and a pick callback.",
		},
		{
			name: "renderCategoryIcon",
			type: "(category: SelectorMenuCategory<TItem>) => React.ReactNode",
			description: "Icon rendered before each category label in the rail.",
		},
		{
			name: "renderCategoryLabel",
			type: "(category: SelectorMenuCategory<TItem>) => React.ReactNode",
			description: "Custom label for a category row; defaults to category.label.",
		},
		{
			name: "renderFlyoutHeader",
			type: "(category: SelectorMenuCategory<TItem>) => React.ReactNode",
			description: "Header rendered at the top of the category flyout.",
		},
		{
			name: "beforeCategories",
			type: "React.ReactNode",
			description: "Content rendered inside the scrollable area before the category list.",
		},
		{ name: "footer", type: "React.ReactNode", description: "Fixed footer rendered below the scrollable area." },
		{
			name: "anchorRect",
			type: "DOMRect | null",
			description: "Trigger rect to anchor the panel against (preferred over style).",
		},
		{ name: "place", type: "Placement", description: "Preferred placement of the panel relative to the anchor." },
		{
			name: "style",
			type: "React.CSSProperties",
			description: "Positioning fallback used when anchorRect is absent.",
		},
		{ name: "className", type: "string", description: "Extra classes for the panel." },
		{
			name: "onPick",
			type: "(item: TItem) => void",
			required: true,
			description: "Called when the user picks an item.",
		},
		{
			name: "onClose",
			type: "() => void",
			required: true,
			description: "Called when the scrim is clicked or the consumer wants to close.",
		},
		{ name: "panelWidth", type: "number", default: "300", description: "Width of the main panel in px." },
		{ name: "searchWidth", type: "number", default: "320", description: "Width of the search-results panel in px." },
		{ name: "flyoutWidth", type: "number", default: "290", description: "Width of the category flyout in px." },
		{
			name: "SelectorMenuCategory.id",
			type: "string",
			required: true,
			description: "Stable identity of the category.",
		},
		{
			name: "SelectorMenuCategory.label",
			type: "string",
			required: true,
			description: "Display label for the category row.",
		},
		{
			name: "SelectorMenuCategory.items",
			type: "readonly TItem[]",
			required: true,
			description: "Items belonging to the category, shown in its flyout.",
		},
		{
			name: "SelectorMenuCategory.providerId",
			type: "string",
			description: 'Optional provider identifier (e.g. "acme") so renderCategoryIcon can show a brand logo.',
		},
	],
};

const avatarSelectDocs: EntryDocs = {
	import: 'import { AvatarSelect, type AvatarOption, type AvatarSelectProps } from "@fraym/ui";',
	anatomy:
		'<AvatarSelect\n  value={value}\n  onChange={setValue}\n  options={[\n    { id: "blob", label: "Blob", preview: <Presence avatar="blob" state="thinking" mode="think" /> },\n  ]}\n/>',
	examples: [
		{
			label: "Presence avatar picker with live previews",
			code: 'const [picked, setPicked] = useState<AvatarId>("blob");\n\n<AvatarSelect\n  value={picked}\n  onChange={id => setPicked(id as AvatarId)}\n  options={AVATAR_OPTIONS.map(o => ({\n    id: o.id,\n    label: o.label,\n    preview: <Presence avatar={o.id} state="thinking" mode="think" />,\n  }))}\n/>',
		},
	],
	api: [
		{
			name: "options",
			type: "readonly AvatarOption[]",
			required: true,
			description: "Selectable avatars, each with a live preview node, shown in the modal gallery.",
		},
		{ name: "value", type: "string", required: true, description: "Id of the currently-selected avatar." },
		{
			name: "onChange",
			type: "(id: string) => void",
			required: true,
			description: "Called with the chosen avatar id.",
		},
		{ name: "className", type: "string", description: "Extra classes for the wrapper element." },
		{ name: "AvatarOption.id", type: "string", required: true, description: "Stable identity of the avatar option." },
		{ name: "AvatarOption.label", type: "string", required: true, description: "Display label for the option tile." },
		{
			name: "AvatarOption.preview",
			type: "React.ReactNode",
			required: true,
			description: "Live preview node (e.g. a @fraym/vibr <Presence>); kept vibr-agnostic.",
		},
	],
};

const commandPaletteDocs: EntryDocs = {
	import:
		'import { CommandPalette, type PaletteCommand, type PaletteCategory, type CommandPaletteProps } from "@fraym/ui";',
	anatomy:
		"{open && (\n  <CommandPalette\n    categories={categories}\n    onPick={cmd => { run(cmd); setOpen(false); }}\n    onClose={() => setOpen(false)}\n  />\n)}",
	examples: [
		{
			label: "⌘K palette opened from a button",
			code: 'const [open, setOpen] = useState(false);\n\n<Button variant="outline" onClick={() => setOpen(true)}>\n  Open command palette\n</Button>\n{open && (\n  <CommandPalette\n    categories={PALETTE_CMDS}\n    onPick={() => setOpen(false)}\n    onClose={() => setOpen(false)}\n  />\n)}',
		},
		{
			label: "Categories shape",
			code: 'const PALETTE_CMDS: PaletteCategory[] = [\n  {\n    name: "Navigation",\n    items: [\n      { cmd: "/open", desc: "Open a file", icon: "file" },\n      { cmd: "/goto", desc: "Go to symbol", icon: "search" },\n    ],\n  },\n];',
		},
	],
	api: [
		{
			name: "categories",
			type: "readonly PaletteCategory[]",
			required: true,
			description: "Grouped commands; each group renders an eyebrow header and its filtered items.",
		},
		{
			name: "onPick",
			type: "(cmd: string) => void",
			required: true,
			description: "Called with the cmd string of the chosen command.",
		},
		{
			name: "onClose",
			type: "() => void",
			required: true,
			description: "Called when Escape or the backdrop closes the modal.",
		},
		{ name: "className", type: "string", description: "Extra classes for the modal panel." },
		{
			name: "PaletteCategory.name",
			type: "string",
			required: true,
			description: "Category heading shown above its commands.",
		},
		{
			name: "PaletteCategory.items",
			type: "readonly PaletteCommand[]",
			required: true,
			description: "Commands in the category, filtered live by the search query.",
		},
		{
			name: "PaletteCommand.cmd",
			type: "string",
			required: true,
			description: "Command string shown and passed to onPick; matched against the query.",
		},
		{
			name: "PaletteCommand.desc",
			type: "string",
			required: true,
			description: "Description shown right-aligned; also matched against the query.",
		},
		{
			name: "PaletteCommand.icon",
			type: "IconName",
			required: true,
			description: "Icon rendered in the command's leading tile.",
		},
	],
};

const askPickerDocs: EntryDocs = {
	import: 'import { AskPicker } from "@fraym/ui";',
	anatomy:
		'<AskPicker\n  question="If you could have one superpower, which would you pick?"\n  options={[\n    { label: "Flight", description: "Move through the air at will", recommended: true },\n    { label: "Invisibility", description: "Go unseen on demand" },\n  ]}\n  onChoose={(index) => choose(index)}\n  onCancel={cancel}\n/>',
	examples: [
		{
			label: "Single-select (radio) with Other",
			code: '<AskPicker\n  question="If you could have one superpower, which would you pick?"\n  options={options}\n  allowOther\n  onChoose={index => choose(index)}\n  onSubmitOther={text => submitOther(text)}\n  onCancel={cancel}\n/>',
		},
		{
			label: "Multi-select (checkbox) with Continue",
			code: '<AskPicker\n  question="Pick the powers you want"\n  options={options.map((o, i) => ({ ...o, checked: checked.includes(i) }))}\n  multiple\n  onChoose={(index) => toggle(index)}\n  onDone={commitSelection}\n  onCancel={cancel}\n/>',
		},
		{
			label: "Multi-step with progress + Back",
			code: '<AskPicker\n  question="Choose a deployment target"\n  progress="1/3"\n  options={options}\n  canBack\n  onChoose={next}\n  onBack={prev}\n  onCancel={cancel}\n/>',
		},
	],
	api: [
		{ name: "question", type: "string", required: true, description: "The prompt shown above the option list." },
		{ name: "progress", type: "string", description: 'Multi-question progress indicator, e.g. "1/3".' },
		{
			name: "options",
			type: "readonly AskPickerOption[]",
			required: true,
			description: "Numbered options to render.",
		},
		{
			name: "multiple",
			type: "boolean",
			default: "false",
			description: "Checkbox (multi-select) vs radio (single-select, default).",
		},
		{
			name: "allowOther",
			type: "boolean",
			default: "false",
			description: 'Render the inline "Other (type your own)" free-text row.',
		},
		{
			name: "otherPlaceholder",
			type: "string",
			default: '"Type your own answer here"',
			description: "Placeholder text for the Other free-text input.",
		},
		{
			name: "canBack",
			type: "boolean",
			default: "false",
			description: "Show the Back control (multi-question, not the first question).",
		},
		{
			name: "onChoose",
			type: "(index: number) => void",
			required: true,
			description: "A listed option was chosen by click, number key, or ↑/↓ + Enter.",
		},
		{
			name: "onSubmitOther",
			type: "(text: string) => void",
			description: "The inline Other free-text answer was submitted.",
		},
		{ name: "onDone", type: "() => void", description: "Multi-select: commit the current checkbox selection." },
		{ name: "onBack", type: "() => void", description: "The Back control was pressed." },
		{ name: "onCancel", type: "() => void", required: true, description: "Cancel the picker (also fired on Esc)." },
		{ name: "className", type: "string", description: "Additional classes merged onto the root." },
		{ name: "AskPickerOption.label", type: "string", required: true, description: "Option text." },
		{
			name: "AskPickerOption.description",
			type: "string",
			description: "Secondary description shown under the label.",
		},
		{
			name: "AskPickerOption.recommended",
			type: "boolean",
			description: 'Show a "Recommended" badge on the option.',
		},
		{ name: "AskPickerOption.checked", type: "boolean", description: "Checkbox state (multi-select only)." },
	],
};

const askFieldControlDocs: EntryDocs = {
	import: 'import { AskFieldControl } from "@fraym/ui";',
	anatomy:
		'<AskFieldControl\n  question="How many replicas?"\n  field={{ type: "number", min: 1, max: 16, step: 1, default: 3, unit: "pods" }}\n  onSubmit={(value) => answer(value)}\n  onCancel={cancel}\n/>',
	examples: [
		{
			label: "Text field (also serves /goal and TTSR-amend's plain ui.input(), which carry no field spec)",
			code: '<AskFieldControl\n  question="What should we call this deploy?"\n  field={{ type: "text", placeholder: "e.g. prod-blue" }}\n  onSubmit={answer}\n  onCancel={cancel}\n/>',
		},
		{
			label: "Slider with unit",
			code: '<AskFieldControl\n  question="CPU limit per pod?"\n  field={{ type: "slider", min: 0.25, max: 8, step: 0.25, default: 2, unit: "vCPU" }}\n  onSubmit={answer}\n  onCancel={cancel}\n/>',
		},
		{
			label: "Toggle (submits the raw select label)",
			code: '<AskFieldControl\n  question="Enable autoscaling?"\n  field={{ type: "toggle", default: true }}\n  toggleSubmit={{ on: "Yes", off: "No" }}\n  onSubmit={answer}\n  onCancel={cancel}\n/>',
		},
		{
			label: "Tags (suggestions + add-your-own; submits comma-joined)",
			code: '<AskFieldControl\n  question="Deploy to which regions?"\n  field={{ type: "tags", suggestions: ["us-east", "eu-central"], placeholder: "Add a region…" }}\n  onSubmit={answer}\n  onCancel={cancel}\n/>',
		},
	],
	api: [
		{ name: "question", type: "string", required: true, description: "The prompt shown above the control." },
		{ name: "progress", type: "string", description: 'Multi-question progress indicator, e.g. "2/4".' },
		{
			name: "field",
			type: "AskField",
			required: true,
			description:
				'The typed control: { type: "text" | "number" | "toggle" | "slider" | "tags", placeholder?, min?, max?, step?, default?, unit?, suggestions? }. The `ask` TOOL never sends `type: "text"` (a bare free-text fact is an `ask` question with `options: []` instead, not a field) — `text` survives here for other host-UI `input` requests with no field spec, e.g. /goal and TTSR-amend.',
		},
		{
			name: "initialValue",
			type: "string",
			description: "Seed string (e.g. the request's initialValue); overrides field.default.",
		},
		{
			name: "toggleSubmit",
			type: "{ on: string; off: string }",
			default: '{ on: "Yes", off: "No" }',
			description: "Toggle only: the raw labels submitted for on/off (byte-compatible with the select contract).",
		},
		{
			name: "onSubmit",
			type: "(value: string) => void",
			required: true,
			description: "Answer the request — always the plain-control shape (a string).",
		},
		{ name: "onCancel", type: "() => void", required: true, description: "Cancel the control (also fired on Esc)." },
		{ name: "className", type: "string", description: "Additional classes merged onto the root." },
	],
};

const dockSplitDocs: EntryDocs = {
	import: 'import { DockSplit } from "@fraym/ui";',
	anatomy: '<DockSplit\n  label="Plan"\n  onToggle={() => togglePanel()}\n  onCaret={() => openTabMenu()}\n/>',
	examples: [
		{
			label: "Top-bar dock toggle",
			code: "<DockSplit\n  label={activeTab}\n  onToggle={() => togglePanel()}\n  onCaret={() => openTabMenu()}\n/>",
		},
		{
			label: "Custom label node",
			code: "<DockSplit\n  label={<span>Plan</span>}\n  onToggle={togglePanel}\n  onCaret={openTabMenu}\n/>",
		},
	],
	api: [
		{
			name: "label",
			type: "React.ReactNode",
			required: true,
			description: "Label shown on the main button (e.g. the active dock tab).",
		},
		{
			name: "onToggle",
			type: "React.MouseEventHandler<HTMLButtonElement>",
			description: "Fired when the main (panel) button is pressed.",
		},
		{
			name: "onCaret",
			type: "React.MouseEventHandler<HTMLButtonElement>",
			description: "Fired when the caret button is pressed (opens the tab menu).",
		},
		{ name: "className", type: "string", description: "Additional classes merged onto the root container." },
	],
};

const diffBlockDocs: EntryDocs = {
	import: 'import { DiffBlock } from "@fraym/ui";',
	anatomy:
		'<DiffBlock\n  path="src/lib/rateLimit.ts"\n  added={5}\n  deleted={2}\n  lines={[\n    { kind: "ctx", lineNo: "22", code: "  check(key) {" },\n    { kind: "del", lineNo: "23", code: "    const hits = this.buckets.get(key) ?? []" },\n    { kind: "add", lineNo: "23", code: "    const now = Date.now()" },\n  ]}\n/>',
	examples: [
		{
			label: "Inline unified diff",
			code: '<DiffBlock\n  path="src/lib/rateLimit.ts"\n  added={5}\n  deleted={2}\n  lines={[\n    { kind: "ctx", lineNo: "22", code: "  check(key) {" },\n    { kind: "del", lineNo: "23", code: "    const hits = this.buckets.get(key) ?? []" },\n    { kind: "add", lineNo: "23", code: "    const now = Date.now()" },\n    { kind: "add", lineNo: "24", code: "    const hits = (this.buckets.get(key) ?? [])" },\n    { kind: "ctx", lineNo: "26", code: "    if (hits.length >= this.max) return { ok: false }" },\n  ]}\n/>',
		},
		{
			label: "New file",
			code: '<DiffBlock\n  path="src/lib/newModule.ts"\n  added={3}\n  isNew\n  lines={[\n    { kind: "add", lineNo: "1", code: "export const VERSION = \'1.0.0\'" },\n  ]}\n/>',
		},
	],
	api: [
		{ name: "path", type: "string", required: true, description: "File path shown in the header." },
		{ name: "added", type: "number", required: true, description: "Count of added lines shown as +N in the header." },
		{
			name: "deleted",
			type: "number",
			default: "0",
			description: "Count of deleted lines shown as −N (hidden when 0).",
		},
		{ name: "isNew", type: "boolean", description: 'Show a "new" badge next to the path for new files.' },
		{
			name: "lines",
			type: "readonly DiffLine[]",
			required: true,
			description: "Diff rows rendered with gutter line numbers and syntax-toned code.",
		},
		{ name: "className", type: "string", description: "Additional classes merged onto the root container." },
		{
			name: "DiffLine.kind",
			type: '"ctx" | "add" | "del"',
			required: true,
			description: "Line kind: context, addition, or deletion (controls row tint).",
		},
		{ name: "DiffLine.lineNo", type: "string", required: true, description: "Gutter line number text." },
		{
			name: "DiffLine.code",
			type: "string",
			required: true,
			description: "Source code for the line (keyword/string highlighting applied).",
		},
	],
};

const modelPickerDocs: EntryDocs = {
	import: 'import { ModelPicker, type ModelSelection } from "@fraym/ui";',
	anatomy: `<ModelPicker
  model={{ name: "Opus 4.7", effort: "high" }}
  favorites={favorites}
  mostUsed={mostUsed}
  categories={categories}
  efforts={["low", "medium", "high", "max"]}
  anchorRect={triggerRect}
  place="above-right"
  onSelect={setModel}
  onClose={close}
/>`,
	examples: [
		{
			label: "Anchored to a trigger",
			code: `const [rect, setRect] = useState<DOMRect | null>(null);

<Button onClick={e => setRect(e.currentTarget.getBoundingClientRect())}>
  {model.name} · {model.effort}
</Button>
{rect && (
  <ModelPicker
    model={model}
    categories={categories}
    anchorRect={rect}
    place="below"
    onSelect={setModel}
    onClose={() => setRect(null)}
  />
)}`,
		},
		{
			label: "Favorites + most-used",
			code: `<ModelPicker
  model={model}
  favorites={[{ name: "Opus 4.7", tag: "Frontier", tone: "accent", desc: "Hard refactors", ctx: "1M" }]}
  mostUsed={[{ name: "Auto", tag: "Default", tone: "mute", desc: "Route per turn", ctx: "auto" }]}
  categories={categories}
  onSelect={setModel}
  onClose={close}
/>`,
		},
	],
	api: [
		{
			name: "model",
			type: "ModelSelection",
			required: true,
			description: "The current selection { id?, name, effort } — highlights the active row and effort.",
		},
		{
			name: "onSelect",
			type: "(model: ModelSelection) => void",
			required: true,
			description:
				"Called when a model or effort is chosen. Picking a model also fires onClose; changing effort keeps the menu open.",
		},
		{
			name: "categories",
			type: "readonly ModelCategory[]",
			required: true,
			description: "Grouped models shown as a category rail with a per-category flyout list.",
		},
		{
			name: "favorites",
			type: "readonly ModelDef[]",
			description: "Pinned rows rendered above the categories under a Favorites heading.",
		},
		{
			name: "mostUsed",
			type: "readonly ModelDef[]",
			description: "Recently-used rows rendered under a Most used heading.",
		},
		{
			name: "efforts",
			type: "readonly string[]",
			default: '["low","medium","high","max"]',
			description: "Reasoning-effort options shown as a segmented row. Empty hides the row.",
		},
		{
			name: "allLabel",
			type: "string | null",
			default: '"All"',
			description: "Label for the synthetic all-models category appended to the list. Pass null to omit it.",
		},
		{
			name: "onClose",
			type: "() => void",
			required: true,
			description: "Called on backdrop click, Escape, or after a model is picked.",
		},
		{
			name: "anchorRect",
			type: "DOMRect | null",
			description: "Trigger rect to anchor against (preferred). Falls back to style.",
		},
		{
			name: "place",
			type: "Placement",
			default: '"above-right"',
			description: 'Where the panel opens: "below" | "above" | "below-right" | "above-right".',
		},
		{
			name: "style",
			type: "React.CSSProperties",
			description: "Fallback positioning when no anchorRect is supplied.",
		},
		{ name: "className", type: "string", description: "Extra classes merged onto the panel." },
		{ name: "ModelDef.name", type: "string", required: true, description: "Model display name." },
		{ name: "ModelDef.id", type: "string", description: "Stable identity; falls back to name when omitted." },
		{
			name: "ModelDef.desc",
			type: "string",
			required: true,
			description: "Secondary line under the name — model id or one-line description.",
		},
		{
			name: "ModelDef.ctx",
			type: "string",
			description: "Optional context-window hint shown beside the model id (e.g. 200K, 1M).",
		},
		{
			name: "ModelDef.capabilities",
			type: 'readonly ("vision" | "reasoning")[]',
			description: "Capability flags rendered as labelled chips beside the model id.",
		},
		{
			name: "ModelDef.unavailable",
			type: "boolean",
			description: 'Marks a configured-but-unavailable model; renders an "Unavailable" chip.',
		},
		{
			name: "ModelDef.meta",
			type: "ModelMeta",
			description:
				"Numeric metadata (contextWindow, maxOutputTokens, cost, supportsTools, inputModalities) rendered as a muted chip row beneath the capabilities.",
		},
		{ name: "ModelDef.tag", type: "string", description: "Short badge label (e.g. Frontier)." },
		{ name: "ModelDef.tone", type: "Tone", default: '"accent"', description: "Badge tone for the tag." },
		{
			name: "ModelDef.providerId",
			type: "string",
			description: "Provider id; pairs with providerName to render a brand icon.",
		},
		{ name: "ModelDef.providerName", type: "string", description: "Provider display name for the brand icon." },
	],
};

const modelCatalogDocs: EntryDocs = {
	import: 'import { ModelCatalog } from "@fraym/ui";',
	anatomy: `<ModelCatalog
  models={engineModels}
  providers={engineProviders}
  selected={{ provider: "acme", modelId: "assistant-opus-4-8" }}
  onSelect={({ provider, modelId }) => setDefault(provider, modelId)}
/>`,
	examples: [
		{
			label: "Default-model picker",
			code: `<ModelCatalog
  models={snapshot.models}
  providers={snapshot.providers}
  selected={defaultModel}
  onSelect={setDefaultModel}
/>`,
		},
		{
			label: "Loading + disabled",
			code: `<ModelCatalog
  models={[]}
  loading={isFetching}
  disabled={!connected}
  onSelect={setDefaultModel}
/>`,
		},
	],
	api: [
		{
			name: "models",
			type: "readonly EngineModelRecord[]",
			required: true,
			description: "Live engine model registry. Unavailable models are filtered out of the browsable list.",
		},
		{
			name: "onSelect",
			type: "(s: { provider: string; modelId: string }) => void",
			required: true,
			description: "Called with the chosen model mapped back to a real provider + modelId.",
		},
		{
			name: "providers",
			type: "readonly EngineProviderRecord[]",
			description: "Provider records; used to order and label the per-provider categories.",
		},
		{
			name: "selected",
			type: "EngineModelChoice | null",
			description:
				"The current { provider, modelId }. Marks the active row and surfaces a Current category when it is unavailable.",
		},
		{
			name: "loading",
			type: "boolean",
			default: "false",
			description: "Shows a skeleton on first load, then dims interaction during refreshes.",
		},
		{ name: "disabled", type: "boolean", default: "false", description: "Dims the catalog and blocks selection." },
		{ name: "className", type: "string", description: "Extra classes merged onto the framed container." },
	],
};

const engineModelMenuDocs: EntryDocs = {
	import: 'import { EngineModelMenu } from "@fraym/ui";',
	anatomy: `<EngineModelMenu
  models={engineModels}
  providers={engineProviders}
  sessionConfig={{ provider: "acme", modelId: "assistant-opus-4-8", thinkingLevel: "high" }}
  efforts={["low", "medium", "high"]}
  anchorRect={triggerRect}
  onSelectModel={bindModel}
  onSelectThinking={bindThinking}
  onClose={close}
/>`,
	examples: [
		{
			label: "In-chat model switch",
			code: `const [rect, setRect] = useState<DOMRect | null>(null);

<Button onClick={e => setRect(e.currentTarget.getBoundingClientRect())}>
  {modelLabel} · {thinkingLevel}
</Button>
{rect && (
  <EngineModelMenu
    models={snapshot.models}
    providers={snapshot.providers}
    sessionConfig={session.config}
    efforts={engineThinkingLevels}
    anchorRect={rect}
    onSelectModel={({ provider, modelId }) => bind(provider, modelId)}
    onSelectThinking={setThinking}
    onClose={() => setRect(null)}
  />
)}`,
		},
		{
			label: "Model-only (no effort row)",
			code: `<EngineModelMenu
  models={snapshot.models}
  sessionConfig={session.config}
  anchorRect={rect}
  onSelectModel={bind}
  onClose={close}
/>`,
		},
	],
	api: [
		{
			name: "models",
			type: "readonly EngineModelRecord[]",
			required: true,
			description:
				"Live engine model registry. Only available models are shown; the active one resolves by provider+modelId first, then by modelId.",
		},
		{
			name: "onSelectModel",
			type: "(s: { provider: string; modelId: string }) => void",
			required: true,
			description:
				"Called with the chosen model mapped to a real provider + modelId. Picking a model also closes the menu.",
		},
		{
			name: "onClose",
			type: "() => void",
			required: true,
			description: "Called on backdrop click, Escape, or after a model is picked.",
		},
		{
			name: "providers",
			type: "readonly EngineProviderRecord[]",
			description: "Provider records used to order the per-provider categories.",
		},
		{
			name: "sessionConfig",
			type: "SessionConfig | null",
			description:
				"The session's bound { provider, modelId, thinkingLevel }; highlights the active model and effort.",
		},
		{
			name: "efforts",
			type: "readonly string[]",
			default: "[]",
			description: "Engine thinking levels to offer in the effort row. Empty hides the row.",
		},
		{
			name: "onSelectThinking",
			type: "(level: string) => void",
			description: "Called when the reasoning effort changes (keeps the menu open).",
		},
		{
			name: "anchorRect",
			type: "DOMRect | null",
			description: "Trigger rect to anchor the popover against.",
		},
		{
			name: "place",
			type: "Placement",
			default: '"above-right"',
			description: 'Where the panel opens: "below" | "above" | "below-right" | "above-right".',
		},
	],
};

const providerAccountSwitcherDocs: EntryDocs = {
	import: 'import { ProviderAccountSwitcher } from "@fraym/ui";',
	anatomy: `<ProviderAccountSwitcher
  provider={provider}
  onPinAccount={(providerId, accountKey) => resources.pinProviderAccount(providerId, accountKey)}
  onSetAccountPolicy={(providerId, policy) => resources.setProviderAccountPolicy(providerId, policy)}
  onSetAccountPriorityOrder={(providerId, order) => resources.setProviderAccountPriorityOrder(providerId, order)}
  onRemoveAccount={(providerId, accountKey) => signOut(providerId, accountKey)}
/>`,
	examples: [
		{
			label: "Pin or balance accounts",
			code: `<ProviderAccountSwitcher
  provider={provider}
  loading={switching}
  onPinAccount={resources.pinProviderAccount}
  onSetAccountPolicy={resources.setProviderAccountPolicy}
  onSetAccountPriorityOrder={resources.setProviderAccountPriorityOrder}
/>`,
		},
		{
			label: "With per-account sign out",
			code: `<ProviderAccountSwitcher
  provider={provider}
  onPinAccount={resources.pinProviderAccount}
  onSetAccountPolicy={resources.setProviderAccountPolicy}
  onSetAccountPriorityOrder={resources.setProviderAccountPriorityOrder}
  onRemoveAccount={resources.removeProviderAccount}
/>`,
		},
	],
	api: [
		{
			name: "provider",
			type: "EngineProviderRecord | null",
			description:
				"Provider whose signed-in accounts are listed. Renders nothing when absent, it has no accounts, or any of the three required callbacks below is missing.",
		},
		{
			name: "onPinAccount",
			type: "(providerId: string, accountKey: string | null) => void",
			description:
				"Pin a specific signed-in account as the active credential; `null` unpins (back to multi-account).",
		},
		{
			name: "onSetAccountPolicy",
			type: '(providerId: string, policy: "weighted" | "priority-fallback") => void',
			description:
				"Set the multi-account selection policy — balanced (usage-headroom) or an ordered fallback chain.",
		},
		{
			name: "onSetAccountPriorityOrder",
			type: "(providerId: string, order: readonly string[]) => void",
			description: "Reorder the priority-fallback chain (fired by dragging account rows in that mode).",
		},
		{
			name: "onRemoveAccount",
			type: "(providerId: string, accountKey: string) => void",
			description: "When provided, each real account row gets a Sign out control (per-account logout).",
		},
		{
			name: "onReconnectAccount",
			type: "(providerId: string, accountKey: string) => void",
			description: 'When provided, an auth_failed account row gets a "Sign in again" control instead of Sign out.',
		},
		{
			name: "loading",
			type: "boolean",
			default: "false",
			description: "Disables the mode toggle, policy picker, and rows while a mutation is in flight.",
		},
		{ name: "className", type: "string", description: "Extra classes merged onto the switcher container." },
	],
};

const confirmDialogDocs: EntryDocs = {
	import: 'import { ConfirmDialog } from "@fraym/ui";',
	anatomy: `<ConfirmDialog
  intent="danger"
  title="Delete session?"
  description="This cannot be undone."
  confirmLabel="Delete session"
  onConfirm={remove}
  onClose={close}
/>`,
	examples: [
		{
			label: "Destructive confirm",
			code: `{open && (
  <ConfirmDialog
    intent="danger"
    title="Delete session?"
    description="This removes the session and its artifacts from disk."
    confirmLabel="Delete session"
    onConfirm={() => { remove(); setOpen(false); }}
    onClose={() => setOpen(false)}
  />
)}`,
		},
		{
			label: "Default + details + busy",
			code: `<ConfirmDialog
  title="Apply configuration?"
  description="Save these settings and reconnect the workspace."
  details={<code>019e8ed1-f264-7000-b89d</code>}
  busy={isApplying}
  onConfirm={apply}
  onClose={close}
/>`,
		},
	],
	api: [
		{
			name: "title",
			type: "string",
			required: true,
			description: "Dialog heading, also used as the accessible label.",
		},
		{
			name: "onConfirm",
			type: "() => void",
			required: true,
			description: "Called when the confirm button is pressed.",
		},
		{
			name: "onClose",
			type: "() => void",
			required: true,
			description: "Called on Cancel, backdrop click, or Escape.",
		},
		{ name: "description", type: "ReactNode", description: "Body copy under the title." },
		{
			name: "details",
			type: "ReactNode",
			description: "Optional inset panel for secondary detail (e.g. the target id).",
		},
		{
			name: "intent",
			type: '"default" | "danger"',
			default: '"default"',
			description: "Visual tone. danger reddens the confirm button and the icon chip.",
		},
		{
			name: "icon",
			type: "IconName",
			default: '"shield" / "trash"',
			description: "Icon in the chip. Defaults to trash for danger, shield otherwise.",
		},
		{ name: "confirmLabel", type: "string", default: '"Confirm"', description: "Confirm button text." },
		{ name: "cancelLabel", type: "string", default: '"Cancel"', description: "Cancel button text." },
		{
			name: "busy",
			type: "boolean",
			default: "false",
			description: "Disables both buttons while the action is in flight.",
		},
	],
};

const inputGroupDocs: EntryDocs = {
	import: 'import { InputGroup } from "@fraym/ui";',
	anatomy: JSON.stringify(
		'<InputGroup\n  leading={<Icon name="search" />}\n  trailing={<IconButton aria-label="Clear"><Icon name="x" /></IconButton>}\n  placeholder="Search…"\n  value={query}\n  onChange={event => setQuery(event.target.value)}\n/>',
	),
	examples: [
		{
			label: "Search bar with leading magnifier",
			code: JSON.stringify(
				'<InputGroup\n  leading={<Icon name="search" size={14} strokeWidth={1.8} />}\n  placeholder="Search plugins…"\n  value={query}\n  onChange={event => setQuery(event.target.value)}\n/>',
			),
		},
		{
			label: "Trailing clear button (controlled)",
			code: JSON.stringify(
				'<InputGroup\n  leading={<Icon name="search" size={14} strokeWidth={1.8} />}\n  trailing={\n    <IconButton aria-label="Clear" onClick={() => setQuery("")}>\n      <Icon name="x" size={13} />\n    </IconButton>\n  }\n  placeholder="Search…"\n  value={query}\n  onChange={event => setQuery(event.target.value)}\n/>',
			),
		},
		{
			label: "API key with reveal toggle",
			code: JSON.stringify(
				'<InputGroup\n  type={reveal ? "text" : "password"}\n  placeholder="sk-..."\n  value={apiKey}\n  onChange={event => setApiKey(event.target.value)}\n  trailing={\n    <IconButton aria-label={reveal ? "Hide key" : "Show key"} onClick={() => setReveal(v => !v)}>\n      <Icon name={reveal ? "eyeOff" : "eye"} size={14} />\n    </IconButton>\n  }\n/>',
			),
		},
		{
			label: "Ghost variant, sm size (in-panel search)",
			code: JSON.stringify(
				'<InputGroup\n  variant="ghost"\n  size="sm"\n  leading={<Icon name="search" size={13} strokeWidth={1.8} />}\n  placeholder="Filter…"\n  value={q}\n  onChange={event => setQ(event.target.value)}\n/>',
			),
		},
	],
	api: [
		{
			name: "leading",
			type: "ReactNode",
			description:
				"Element rendered before the input (typically an Icon). Wrapped in a flex shrink-0 span with text-fr-text-3 so a bare icon inherits the muted tone.",
		},
		{
			name: "trailing",
			type: "ReactNode",
			description:
				"Element rendered after the input (typically an IconButton for clear / reveal). Wrapped in a flex shrink-0 span.",
		},
		{
			name: "variant",
			type: '"default" | "ghost"',
			default: '"default"',
			description:
				"Chrome style. default uses border + fr-surface; ghost uses border-soft + fr-surface-2 (the selector-menu in-panel look).",
		},
		{
			name: "size",
			type: '"sm" | "default"',
			default: '"default"',
			description: "Tight or roomy padding. sm fits inside popovers and dense lists.",
		},
		{
			name: "inputClassName",
			type: "string",
			description: "Extra classes merged onto the inner <input>.",
		},
		{
			name: "className",
			type: "string",
			description: "Extra classes merged onto the wrapper (border + bg).",
		},
		{
			name: "(native input props)",
			type: "ComponentProps<'input'>",
			description:
				"value, onChange, onKeyDown, type, placeholder, autoFocus, etc. all flow through to the bare <input>. Disabled cascades to muted opacity + not-allowed cursor.",
		},
	],
};

export const componentsEntries: readonly ShowcaseEntry[] = [
	...withGroup("Chrome & shell", [
		{ id: "top-bar", name: "TopBar", Component: TopBarEntry, docs: topBarDocs },
		{ id: "page-header", name: "PageHeader", Component: PageHeaderEntry, docs: pageHeaderDocs },
		{ id: "app-shell", name: "AppShell", Component: AppShellEntry, docs: appShellDocs },
		{ id: "action-bar", name: "ActionBar", Component: ActionBarEntry, docs: actionBarDocs },
		{ id: "input-group", name: "InputGroup", Component: InputGroupEntry, docs: inputGroupDocs },
	]),
	...withGroup("Pickers & menus", [
		{ id: "selector-menu", name: "SelectorMenu", Component: SelectorMenuEntry, docs: selectorMenuDocs },
		{ id: "avatar-select", name: "AvatarSelect", Component: AvatarSelectEntry, docs: avatarSelectDocs },
		{ id: "command-palette", name: "CommandPalette", Component: CommandPaletteEntry, docs: commandPaletteDocs },
		{ id: "popover", name: "Popover", Component: PopoverEntry, docs: popoverDocs },
		{ id: "menu", name: "Menu", Component: MenuEntry, docs: menuDocs },
		{ id: "ask-picker", name: "AskPicker", Component: AskPickerEntry, docs: askPickerDocs },
		{
			id: "ask-field-control",
			name: "AskFieldControl",
			Component: AskFieldControlEntry,
			docs: askFieldControlDocs,
		},
	]),
	...withGroup("Models & providers", [
		{ id: "model-picker", name: "ModelPicker", Component: ModelPickerEntry, docs: modelPickerDocs },
		{ id: "model-catalog", name: "ModelCatalog", Component: ModelCatalogEntry, docs: modelCatalogDocs },
		{ id: "engine-model-menu", name: "EngineModelMenu", Component: EngineModelMenuEntry, docs: engineModelMenuDocs },
		{
			id: "provider-account-switcher",
			name: "ProviderAccountSwitcher",
			Component: ProviderAccountSwitcherEntry,
			docs: providerAccountSwitcherDocs,
		},
	]),
	...withGroup("Layout & info", [
		{ id: "dock-split", name: "DockSplit", Component: DockSplitEntry, docs: dockSplitDocs },
		{ id: "diff-block", name: "DiffBlock", Component: DiffBlockEntry, docs: diffBlockDocs },
		{ id: "explainer", name: "Explainer", Component: ExplainerEntry, docs: explainerDocs },
		{ id: "labor", name: "Labor", Component: LaborEntry, docs: laborDocs },
	]),
	...withGroup("Canvas", nodeGraphEntries),
	...withGroup("Charts", chartsEntries),
	...withGroup("Overlays", [
		{ id: "confirm-dialog", name: "ConfirmDialog", Component: ConfirmDialogEntry, docs: confirmDialogDocs },
		{ id: "labor-overlay", name: "LaborOverlay", Component: LaborOverlayEntry, docs: laborOverlayDocs },
	]),
];


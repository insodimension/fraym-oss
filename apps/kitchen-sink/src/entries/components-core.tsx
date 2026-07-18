import { type AskField, AskFieldControl, Button, ConfirmDialog, type ConfirmDialogIntent, DiffBlock, DockSplit, Icon, IconButton, InputGroup, Menu, MenuBar, MenuItem, PageHeader, PopoverDivider, PopoverHeading, PopoverPanel, PopoverRow, Scrim, SelectorMenu } from "@fraym/ui";
import { useState } from "react";
import type { CityItem } from "../fixtures";
import { CITY_CATEGORIES } from "../fixtures";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import { type ShowcaseEntry, withGroup } from "../showcase/types";

const PLACEMENT_OPTIONS = ["below", "above", "below-right", "above-right"] as const;

type PlacementOption = (typeof PLACEMENT_OPTIONS)[number];

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
		{ id: "page-header", name: "PageHeader", Component: PageHeaderEntry, docs: pageHeaderDocs },
		{ id: "input-group", name: "InputGroup", Component: InputGroupEntry, docs: inputGroupDocs },
	]),
	...withGroup("Pickers & menus", [
		{ id: "selector-menu", name: "SelectorMenu", Component: SelectorMenuEntry, docs: selectorMenuDocs },
		{ id: "popover", name: "Popover", Component: PopoverEntry, docs: popoverDocs },
		{ id: "menu", name: "Menu", Component: MenuEntry, docs: menuDocs },
		{
			id: "ask-field-control",
			name: "AskFieldControl",
			Component: AskFieldControlEntry,
			docs: askFieldControlDocs,
		},
	]),
	...withGroup("Layout & info", [
		{ id: "dock-split", name: "DockSplit", Component: DockSplitEntry, docs: dockSplitDocs },
		{ id: "diff-block", name: "DiffBlock", Component: DiffBlockEntry, docs: diffBlockDocs },
	]),
	...withGroup("Overlays", [
		{ id: "confirm-dialog", name: "ConfirmDialog", Component: ConfirmDialogEntry, docs: confirmDialogDocs },
	]),
];

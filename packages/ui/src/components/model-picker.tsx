import { useState } from "react";
import { Badge } from "../elements/badge";
import { formatTokenCount } from "../elements/message-usage";
import type { Placement } from "../elements/popover";
import { Slider, type SliderStep } from "../elements/slider";
import { Icon, type IconName } from "../icons";
import type { Tone } from "../types";
import { ProviderBrandIcon } from "./provider-brand-icon";
import { SelectorMenu, type SelectorMenuCategory } from "./selector-menu";

const WIDTH = 300;
const SEARCH_WIDTH = 340;
const SUB_WIDTH = 344;
const DEFAULT_EFFORTS = ["low", "medium", "high", "max"] as const;

/** Capability flags a model advertises, rendered as labelled chips. */
export type ModelCapability = "vision" | "reasoning";

export interface ModelDef {
	readonly id?: string;
	readonly providerId?: string;
	readonly providerName?: string;
	/** Host-supplied provider logo (from `EngineModelRecord.logoUrl`). Brands the
	 *  row's avatar instead of the built-in table / monogram fallback. */
	readonly providerLogoUrl?: string;
	readonly name: string;
	readonly tag?: string;
	readonly tone?: Tone;
	readonly desc: string;
	/** Context-window hint (e.g. "200K", "1M"). Omitted when unknown. */
	readonly ctx?: string;
	/** Structured capabilities shown as chips beside the model id. */
	readonly capabilities?: readonly ModelCapability[];
	/** Configured but not currently available (e.g. missing key). */
	readonly unavailable?: boolean;
	/** Secondary numeric metadata rendered as a muted chip row beneath. */
	readonly meta?: ModelMeta;
}

/** Numeric model metadata shown as muted chips beneath the capabilities. */
export interface ModelMeta {
	/** Max input context in tokens (e.g. 200_000). */
	readonly contextWindow?: number;
	/** Max output tokens per response. */
	readonly maxOutputTokens?: number;
	/** USD per million tokens (full rate breakdown; the chip shows input / output). */
	readonly cost?: {
		readonly input: number;
		readonly output: number;
		readonly cacheRead?: number;
		readonly cacheWrite?: number;
	};
	/** Native tool-call support. `false` is the only signal worth surfacing. */
	readonly supportsTools?: boolean;
	/** Accepted input modalities (e.g. "text", "image"). */
	readonly inputModalities?: readonly string[];
}

export interface ModelCategory {
	readonly id: string;
	readonly label: string;
	readonly items: readonly ModelDef[];
	readonly providerId?: string;
	/** Host-supplied provider logo for a provider category heading (from
	 *  `EngineModelRecord.logoUrl` / `EngineProviderRecord.logoUrl`). */
	readonly providerLogoUrl?: string;
}

export interface ModelSelection {
	readonly id?: string;
	readonly name: string;
	readonly effort: string;
	/** Host-supplied provider logo (from `EngineModelRecord.logoUrl`). Opt-in: when
	 *  set, the composer chip renders this mark and a BARE model name; when absent
	 *  the chip is unchanged (full `provider/model` id, no logo). */
	readonly logoUrl?: string;
	/** Provider identity behind `logoUrl`, used to tile/label the chip's avatar. */
	readonly providerId?: string;
	readonly providerName?: string;
}

export interface ModelPickerProps {
	readonly model: ModelSelection;
	readonly onSelect: (model: ModelSelection) => void;
	readonly favorites?: readonly ModelDef[];
	readonly mostUsed?: readonly ModelDef[];
	readonly categories: readonly ModelCategory[];
	readonly efforts?: readonly string[];
	/** Label for the synthetic "all models" category appended to the list. Pass null to omit. */
	readonly allLabel?: string | null;
	readonly onClose: () => void;
	/** Trigger rect to anchor against (preferred). Falls back to `style`. */
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly style?: React.CSSProperties;
	readonly className?: string;
}

function modelIdentity(model: Pick<ModelDef, "id" | "name">): string {
	return model.id ?? model.name;
}

function selectionIdentity(model: Pick<ModelSelection, "id" | "name">): string {
	return model.id ?? model.name;
}

function allModelsFromCategories(categories: readonly ModelCategory[]): ModelDef[] {
	const seen = new Set<string>();
	const allModels: ModelDef[] = [];
	for (const category of categories) {
		for (const model of category.items) {
			const id = modelIdentity(model);
			if (seen.has(id)) continue;
			seen.add(id);
			allModels.push(model);
		}
	}
	return allModels;
}

function categoriesWithAll(
	categories: readonly ModelCategory[],
	allLabel: string | null,
	allModels: readonly ModelDef[],
): ModelCategory[] {
	return allLabel != null ? [...categories, { id: "all", label: allLabel, items: allModels }] : [...categories];
}

function filterModels(models: readonly ModelDef[], query: string): ModelDef[] {
	const ql = query.trim().toLowerCase();
	if (!ql) return [...models];
	return models.filter(
		model =>
			model.name.toLowerCase().includes(ql) ||
			model.desc.toLowerCase().includes(ql) ||
			(model.tag ?? "").toLowerCase().includes(ql) ||
			(model.capabilities ?? []).some(capability => capability.includes(ql)),
	);
}

const CAPABILITY_META: Record<
	ModelCapability,
	{ readonly label: string; readonly icon: IconName; readonly tone: Tone }
> = {
	vision: { label: "Vision", icon: "eye", tone: "blue" },
	reasoning: { label: "Reasoning", icon: "bolt", tone: "accent" },
};

/** Labelled capability chips (vision / reasoning), or an "Unavailable" marker. */
export function ModelCapabilityChips({
	capabilities,
	unavailable,
}: {
	readonly capabilities?: readonly ModelCapability[];
	readonly unavailable?: boolean;
}) {
	if (unavailable) {
		return (
			<span className="flex shrink-0 items-center gap-1">
				<Badge variant="outline" tone="mute">
					Unavailable
				</Badge>
			</span>
		);
	}
	if (!capabilities || capabilities.length === 0) return null;
	return (
		<span className="flex shrink-0 items-center gap-1">
			{capabilities.map(capability => {
				const meta = CAPABILITY_META[capability];
				return (
					<Badge key={capability} variant="soft" tone={meta.tone} className="gap-1">
						<Icon name={meta.icon} size={11} strokeWidth={2.2} />
						{meta.label}
					</Badge>
				);
			})}
		</span>
	);
}

function formatUsd(amount: number): string {
	if (amount === 0) return "$0";
	return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** Muted secondary metadata chips (context, output, price, tools). Renders nothing when empty. */
export function ModelMetaChips({ meta }: { readonly meta?: ModelMeta }) {
	if (!meta) return null;
	const chips: { readonly key: string; readonly label: string; readonly title: string }[] = [];
	if (meta.contextWindow != null)
		chips.push({
			key: "ctx",
			label: `${formatTokenCount(meta.contextWindow)} ctx`,
			title: `Context window: ${meta.contextWindow.toLocaleString()} tokens`,
		});
	if (meta.maxOutputTokens != null)
		chips.push({
			key: "out",
			label: `${formatTokenCount(meta.maxOutputTokens)} out`,
			title: `Max output: ${meta.maxOutputTokens.toLocaleString()} tokens`,
		});
	if (meta.cost)
		chips.push({
			key: "cost",
			label: `${formatUsd(meta.cost.input)} / ${formatUsd(meta.cost.output)}`,
			title: `${formatUsd(meta.cost.input)} in · ${formatUsd(meta.cost.output)} out per million tokens`,
		});
	if (meta.supportsTools === false)
		chips.push({ key: "tools", label: "no tools", title: "No native tool-calling support" });
	if (chips.length === 0) return null;
	return (
		<div className="mt-1 flex flex-wrap items-center gap-1.5">
			{chips.map(chip => (
				<Badge key={chip.key} variant="code" tone="mute" title={chip.title}>
					{chip.label}
				</Badge>
			))}
		</div>
	);
}

function ModelRow({
	m,
	selected,
	onPick,
}: {
	readonly m: ModelDef;
	readonly selected: boolean;
	readonly onPick: (m: ModelDef) => void;
}) {
	return (
		<div
			data-slot="model-row"
			data-model-id={modelIdentity(m)}
			data-selected={selected || undefined}
			className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-fr-surface-2"
			onClick={() => onPick(m)}
		>
			{m.providerId && m.providerName ? (
				<ProviderBrandIcon
					providerId={m.providerId}
					providerName={m.providerName}
					logoUrl={m.providerLogoUrl}
					className="size-[22px] rounded-[7px]"
				/>
			) : null}
			<div className="min-w-0 flex-1">
				<div className="fr-overflow text-fr-base font-medium">{m.name}</div>
				<div className="mt-1 flex items-center gap-2">
					{m.tag && <Badge tone={m.tone ?? "accent"}>{m.tag}</Badge>}
					{m.desc && (
						<span className="min-w-0 flex-1 fr-overflow font-secondary text-fr-xs text-fr-text-3">{m.desc}</span>
					)}
					{m.ctx && <span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">{m.ctx}</span>}
					<ModelCapabilityChips capabilities={m.capabilities} unavailable={m.unavailable} />
				</div>
				<ModelMetaChips meta={m.meta} />
			</div>
			<Icon
				name="check"
				size={15}
				strokeWidth={2.4}
				className="shrink-0 text-fr-accent"
				style={{ opacity: selected ? 1 : 0 }}
			/>
		</div>
	);
}

const CATEGORY_GLYPHS: Record<string, IconName> = {
	current: "spark",
	"capability:reasoning": "bolt",
	"capability:vision": "eye",
	all: "grid",
};

function CategoryIcon({ category }: { readonly category: SelectorMenuCategory<ModelDef> }) {
	if (category.providerId) {
		return (
			<ProviderBrandIcon
				providerId={category.providerId}
				providerName={category.label}
				logoUrl={category.providerLogoUrl}
				className="size-[20px] rounded-[6px]"
			/>
		);
	}
	return (
		<span className="flex size-[20px] shrink-0 items-center justify-center text-fr-text-3">
			<Icon name={CATEGORY_GLYPHS[category.id] ?? "spark"} size={17} strokeWidth={2} />
		</span>
	);
}

function ModelRowsSection({
	label,
	models,
	keyPrefix,
	selectedId,
	onPick,
}: {
	readonly label: string;
	readonly models: readonly ModelDef[];
	readonly keyPrefix: string;
	readonly selectedId: string;
	readonly onPick: (model: ModelDef) => void;
}) {
	if (models.length === 0) return null;
	return (
		<>
			<div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">{label}</div>
			{models.map(model => (
				<ModelRow
					key={`${keyPrefix}-${modelIdentity(model)}`}
					m={model}
					selected={selectedId === modelIdentity(model)}
					onPick={onPick}
				/>
			))}
		</>
	);
}

const EFFORT_RANK: Record<string, number> = { off: 0, minimal: 1, low: 2, medium: 3, high: 4, max: 5, xhigh: 6 };
const EFFORT_LABEL: Record<string, string> = {
	off: "Off",
	minimal: "Minimal",
	low: "Low",
	medium: "Medium",
	high: "High",
	max: "Max",
	xhigh: "X-High",
	auto: "Auto",
};

function effortLabel(value: string): string {
	return EFFORT_LABEL[value] ?? value;
}

/** Exported for its co-located tests: it is hook-free by design, so a test can call it
 *  as a plain function and inspect the element tree it returns without a DOM. */
export function ModelEffortPicker({
	efforts,
	model,
	onSelect,
}: {
	readonly efforts: readonly string[];
	readonly model: ModelSelection;
	readonly onSelect: (model: ModelSelection) => void;
}) {
	if (efforts.length === 0) return null;
	const hasAuto = efforts.includes("auto");
	const steps: SliderStep[] = efforts
		.filter(effort => effort !== "auto")
		.sort((a, b) => (EFFORT_RANK[a] ?? 99) - (EFFORT_RANK[b] ?? 99))
		.map(effort => ({ value: effort, label: effortLabel(effort) }));
	if (steps.length === 0 && !hasAuto) return null;
	const current = model.effort ?? "";
	const isAuto = current === "auto";
	// A slider only expresses a choice across a real gradient, and the notches carry no
	// labels of their own — just "Faster"/"Smarter" at the ends. Real engines report a
	// per-model list, and most accept nothing but `off` / `auto`: one graded step, a thumb
	// that can never move. Anything short of three graded steps is rendered as pills
	// instead, so every value the engine accepts is visible, named, and one click away.
	const segmented = steps.length < 3;
	const pills: readonly SliderStep[] = segmented
		? [...steps, ...(hasAuto ? [{ value: "auto", label: effortLabel("auto") }] : [])]
		: [];
	return (
		<>
			<div className="mx-2 my-[5px] h-px bg-fr-border-soft" />
			<div className="px-2.5 pt-2 pb-1.5">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-baseline gap-2">
						<span className="fr-eyebrow">Reasoning effort</span>
						{/* The eyebrow alone above a drawn thumb reads as "something is selected, we
						    won't say what". Name the active value always — including `auto`, which is an
						    ordinary engine value — and admit it when the host reported none. */}
						{current ? (
							<span className="font-secondary text-fr-xs font-medium text-fr-accent">
								{effortLabel(current)}
							</span>
						) : (
							<span className="font-secondary text-fr-xs font-medium text-fr-text-3">Not set</span>
						)}
					</div>
					{/* In segmented form `Auto` is one of the pills, so the corner badge would double it. */}
					{hasAuto && !segmented && (
						<Badge asChild variant="code" tone={isAuto ? "accent" : "mute"} className="shrink-0 cursor-pointer">
							<button type="button" onClick={() => onSelect({ ...model, effort: "auto" })}>
								Auto
							</button>
						</Badge>
					)}
				</div>
				{segmented ? (
					<div className="flex flex-wrap items-center gap-1.5 pt-2.5">
						{pills.map(pill => (
							<Badge
								key={pill.value}
								asChild
								variant="code"
								tone={current === pill.value ? "accent" : "mute"}
								className="cursor-pointer"
							>
								<button
									type="button"
									aria-pressed={current === pill.value}
									onClick={() => onSelect({ ...model, effort: pill.value })}
								>
									{pill.label}
								</button>
							</Badge>
						))}
					</div>
				) : (
					<div className="pt-2.5">
						<Slider
							steps={steps}
							value={isAuto ? undefined : current || undefined}
							onValueChange={effort => onSelect({ ...model, effort })}
							startLabel="Faster"
							endLabel="Smarter"
							muted={isAuto}
							aria-label="Reasoning effort"
						/>
					</div>
				)}
			</div>
		</>
	);
}

export function ModelPicker(props: ModelPickerProps) {
	const [query, setQuery] = useState("");
	const favorites = props.favorites ?? [];
	const mostUsed = props.mostUsed ?? [];
	const efforts = props.efforts ?? DEFAULT_EFFORTS;
	const selectedId = selectionIdentity(props.model);
	const allModels = allModelsFromCategories(props.categories);
	// `??` defeats the whole point: `allLabel={null}` MEANS "no aggregate row", and
	// nullish-coalescing turned that explicit null straight back into "All", so the
	// suppression check in `categoriesWithAll` never saw it. Only `undefined` (the
	// prop omitted) takes the default.
	const cats = categoriesWithAll(props.categories, props.allLabel === undefined ? "All" : props.allLabel, allModels);
	const place = props.place ?? "above-right";

	const pick = (next: ModelDef) => {
		props.onSelect({
			...props.model,
			id: next.id,
			name: next.name,
			logoUrl: next.providerLogoUrl,
			providerId: next.providerId,
			providerName: next.providerName,
		});
		props.onClose();
	};

	return (
		<SelectorMenu<ModelDef>
			categories={cats}
			selectedId={selectedId}
			getItemId={modelIdentity}
			query={query}
			onQueryChange={setQuery}
			searchPlaceholder="Search models..."
			filter={filterModels}
			renderItem={(m, selected, onPick) => <ModelRow m={m} selected={selected} onPick={onPick} />}
			renderCategoryIcon={category => <CategoryIcon category={category} />}
			renderFlyoutHeader={category => <div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">{category.label} models</div>}
			beforeCategories={
				<>
					<ModelRowsSection
						label="Favorites"
						models={favorites}
						keyPrefix="fav"
						selectedId={selectedId}
						onPick={pick}
					/>
					<ModelRowsSection
						label="Most used"
						models={mostUsed}
						keyPrefix="mu"
						selectedId={selectedId}
						onPick={pick}
					/>
					<div className="mx-2 my-[5px] h-px bg-fr-border-soft" />
				</>
			}
			footer={<ModelEffortPicker efforts={efforts} model={props.model} onSelect={props.onSelect} />}
			anchorRect={props.anchorRect}
			place={place}
			style={props.style}
			className={props.className}
			onPick={pick}
			onClose={props.onClose}
			panelWidth={WIDTH}
			searchWidth={SEARCH_WIDTH}
			flyoutWidth={SUB_WIDTH}
			sheetTitle="Choose model"
		/>
	);
}

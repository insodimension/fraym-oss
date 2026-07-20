import type { EngineModelRecord, EngineProviderRecord } from "@fraym/driver";
import { useMemo, useState } from "react";
import { Badge } from "../elements/badge";
import { Skeleton, SkeletonGroup } from "../elements/skeleton";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import {
	buildCategories,
	type EngineModelChoice,
	modelCapabilities,
	modelKey,
	modelMeta,
	selectedKey,
	sortModels,
} from "./model-category-picker";
import { ModelCapabilityChips, type ModelCategory, type ModelDef, ModelMetaChips } from "./model-picker";

export interface ModelCatalogProps {
	readonly models: readonly EngineModelRecord[];
	readonly providers?: readonly EngineProviderRecord[];
	readonly selected?: EngineModelChoice | null;
	readonly disabled?: boolean;
	readonly loading?: boolean;
	readonly className?: string;
	readonly onSelect: (selection: { readonly provider: string; readonly modelId: string }) => void;
}

const ALL_CATEGORY_ID = "all";

function catalogModelDef(model: EngineModelRecord): ModelDef {
	return {
		id: modelKey(model),
		name: model.label,
		tag: model.providerName,
		desc: `${model.providerId}/${model.modelId}`,
		capabilities: model.available ? modelCapabilities(model) : undefined,
		meta: model.available ? modelMeta(model) : undefined,
		unavailable: !model.available,
	};
}

function missingSelectedModelDef(key: string): ModelDef {
	return {
		id: key,
		name: key,
		tag: "Current",
		desc: "Configured default model is not in the live registry.",
		unavailable: true,
	};
}

function CatalogRow({
	model,
	selected,
	disabled,
	onPick,
}: {
	readonly model: ModelDef;
	readonly selected: boolean;
	readonly disabled?: boolean;
	readonly onPick: () => void;
}) {
	return (
		<button
			type="button"
			data-slot="model-catalog-row"
			data-model-id={model.id}
			data-selected={selected || undefined}
			disabled={disabled}
			onClick={onPick}
			className={cn(
				"flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-fr-surface-2 disabled:cursor-not-allowed disabled:opacity-60",
				selected && "bg-fr-surface-2",
			)}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="min-w-0 flex-1 fr-overflow text-fr-base font-medium text-fr-text">{model.name}</span>
					{model.tag && <Badge tone={model.tone ?? "accent"}>{model.tag}</Badge>}
				</div>
				<div className="mt-px flex items-center gap-2">
					<span className="min-w-0 flex-1 fr-overflow font-secondary text-fr-xs text-fr-text-3">{model.desc}</span>
					<ModelCapabilityChips capabilities={model.capabilities} unavailable={model.unavailable} />
				</div>
				<ModelMetaChips meta={model.meta} />
			</div>
			<Icon
				name="check"
				size={15}
				strokeWidth={2.4}
				className="shrink-0 text-fr-accent"
				style={{ opacity: selected ? 1 : 0 }}
			/>
		</button>
	);
}

function collectCatalogModels(categories: readonly ModelCategory[]) {
	const seen = new Set<string>();
	const out: ModelDef[] = [];
	for (const category of categories) {
		for (const item of category.items) {
			const id = item.id ?? item.name;
			if (!seen.has(id)) {
				seen.add(id);
				out.push(item);
			}
		}
	}
	return out;
}

function useCatalogModelGroups({
	models,
	providers,
	selected,
}: Pick<ModelCatalogProps, "models" | "providers" | "selected">) {
	const currentKey = selectedKey(selected);
	const selectedRecord = useMemo(() => models.find(model => modelKey(model) === currentKey), [models, currentKey]);
	const currentUnavailable = useMemo(() => {
		if (selectedRecord && !selectedRecord.available) return catalogModelDef(selectedRecord);
		if (currentKey && !selectedRecord) return missingSelectedModelDef(currentKey);
		return null;
	}, [currentKey, selectedRecord]);
	const availableModels = useMemo(() => sortModels(models.filter(model => model.available)), [models]);
	const recordByKey = useMemo(() => {
		const map = new Map<string, EngineModelRecord>();
		for (const model of availableModels) map.set(modelKey(model), model);
		return map;
	}, [availableModels]);
	const categories = useMemo(() => {
		const base = buildCategories(availableModels, selected, providers);
		if (!currentUnavailable) return base;
		return [{ id: "current", label: "Current", items: [currentUnavailable] }, ...base] satisfies ModelCategory[];
	}, [availableModels, currentUnavailable, providers, selected]);
	const allModels = useMemo(() => collectCatalogModels(categories), [categories]);
	const cats = useMemo(
		() => [...categories, { id: ALL_CATEGORY_ID, label: "All available", items: allModels }],
		[categories, allModels],
	);

	return { currentKey, currentUnavailable, availableModels, recordByKey, allModels, cats };
}

function visibleCatalogModels({
	query,
	allModels,
	cats,
	effectiveCat,
}: {
	readonly query: string;
	readonly allModels: readonly ModelDef[];
	readonly cats: readonly ModelCategory[];
	readonly effectiveCat: string;
}) {
	const ql = query.trim().toLowerCase();
	if (!ql) return cats.find(category => category.id === effectiveCat)?.items ?? [];
	return allModels.filter(
		model =>
			model.name.toLowerCase().includes(ql) ||
			model.desc.toLowerCase().includes(ql) ||
			(model.tag ?? "").toLowerCase().includes(ql) ||
			(model.capabilities ?? []).some(capability => capability.includes(ql)),
	);
}

function ModelCatalogNotice({
	children,
	className,
}: {
	readonly children: React.ReactNode;
	readonly className?: string;
}) {
	return (
		<div
			data-slot="model-catalog"
			className={cn("rounded-[12px] border border-fr-border bg-fr-surface px-3 py-6 text-center", className)}
		>
			<span className="text-fr-sm text-fr-text-3">{children}</span>
		</div>
	);
}

function ModelCatalogSkeleton({ className }: { readonly className?: string }) {
	return (
		<SkeletonGroup
			label="Loading models…"
			data-slot="model-catalog"
			className={cn(
				"flex max-h-[420px] overflow-hidden rounded-[12px] border border-fr-border bg-fr-surface",
				className,
			)}
		>
			<div className="w-[180px] shrink-0 border-r border-fr-border-soft p-2">
				{[0, 1, 2, 3].map(i => (
					<Skeleton key={i} h={13} rounded="sm" w={i % 2 ? "62%" : "82%"} className="mb-2.5" />
				))}
			</div>
			<div className="min-w-0 flex-1 p-2">
				{[0, 1, 2, 3, 4].map(i => (
					<div key={i} className="mb-1.5 px-2 py-1.5">
						<Skeleton h={12} rounded="sm" w="52%" className="mb-1.5" />
						<Skeleton h={9} rounded="sm" w="34%" />
					</div>
				))}
			</div>
		</SkeletonGroup>
	);
}

function CatalogRail({
	cats,
	currentKey,
	effectiveCat,
	query,
	disabled,
	onSelect,
}: {
	readonly cats: readonly ModelCategory[];
	readonly currentKey: string | null;
	readonly effectiveCat: string;
	readonly query: string;
	readonly disabled: boolean;
	readonly onSelect: (categoryId: string) => void;
}) {
	const searching = query.trim() !== "";
	return (
		<div className="flex w-[180px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-fr-border-soft p-1.5">
			{cats.map(category => {
				const hasSelected = category.items.some(item => (item.id ?? item.name) === currentKey);
				const isActive = !searching && category.id === effectiveCat;
				return (
					<button
						key={category.id}
						type="button"
						data-slot="model-catalog-category"
						data-category-id={category.id}
						data-active={isActive || undefined}
						disabled={disabled}
						onClick={() => onSelect(category.id)}
						className={cn(
							"flex items-center gap-1.5 rounded-lg px-2.5 py-[7px] text-left font-secondary text-fr-sm text-fr-text-2 hover:bg-fr-surface-2",
							isActive && "bg-fr-surface-2 text-fr-text",
						)}
					>
						<span className="min-w-0 flex-1 fr-overflow">{category.label}</span>
						{hasSelected && <span className="size-[5px] shrink-0 rounded-full bg-fr-accent" />}
						<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">{category.items.length}</span>
					</button>
				);
			})}
		</div>
	);
}

function CatalogSearch({
	query,
	disabled,
	onQueryChange,
}: {
	readonly query: string;
	readonly disabled: boolean;
	readonly onQueryChange: (query: string) => void;
}) {
	return (
		<div className="m-1.5 flex items-center gap-2 rounded-[9px] border border-fr-border-soft bg-fr-surface-2 px-2.5 py-2">
			<Icon name="search" size={14} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
			<input
				value={query}
				onChange={event => onQueryChange(event.target.value)}
				placeholder="Search all models..."
				disabled={disabled}
				className="flex-1 bg-transparent text-fr-base text-fr-text outline-none placeholder:text-fr-text-3"
			/>
		</div>
	);
}

function CatalogList({
	models,
	query,
	currentKey,
	disabled,
	onPick,
}: {
	readonly models: readonly ModelDef[];
	readonly query: string;
	readonly currentKey: string | null;
	readonly disabled: boolean;
	readonly onPick: (model: ModelDef) => void;
}) {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
			{models.length > 0 ? (
				models.map(model => (
					<CatalogRow
						key={model.id ?? model.name}
						model={model}
						selected={(model.id ?? model.name) === currentKey}
						disabled={disabled}
						onPick={() => onPick(model)}
					/>
				))
			) : (
				<div className="px-3 py-[18px] text-center text-fr-xs text-fr-text-3">
					{query.trim() ? `No models match "${query.trim()}".` : "No models in this category."}
				</div>
			)}
		</div>
	);
}

function useModelCatalogView({
	models,
	providers,
	selected,
	disabled = false,
	loading = false,
	onSelect,
}: ModelCatalogProps) {
	const [query, setQuery] = useState("");
	const [activeCat, setActiveCat] = useState<string | null>(null);
	const interactionDisabled = disabled || loading;
	const { currentKey, currentUnavailable, availableModels, recordByKey, allModels, cats } = useCatalogModelGroups({
		models,
		providers,
		selected,
	});
	const effectiveCat = activeCat ?? cats[0]?.id ?? ALL_CATEGORY_ID;

	const pick = (model: ModelDef) => {
		if (interactionDisabled) return;
		const record = model.id ? recordByKey.get(model.id) : undefined;
		if (record) onSelect({ provider: record.providerId, modelId: record.modelId });
	};

	const visibleModels = visibleCatalogModels({ query, allModels, cats, effectiveCat });
	return {
		query,
		setQuery,
		setActiveCat,
		interactionDisabled,
		currentKey,
		currentUnavailable,
		availableModels,
		cats,
		effectiveCat,
		pick,
		visibleModels,
		loading,
	};
}

function ModelCatalogFrame({
	className,
	view,
}: {
	readonly className?: string;
	readonly view: ReturnType<typeof useModelCatalogView>;
}) {
	return (
		<div
			data-slot="model-catalog"
			className={cn(
				"flex max-h-[420px] overflow-hidden rounded-[12px] border border-fr-border bg-fr-surface",
				view.interactionDisabled && "pointer-events-none opacity-60",
				className,
			)}
		>
			<CatalogRail
				cats={view.cats}
				currentKey={view.currentKey}
				effectiveCat={view.effectiveCat}
				query={view.query}
				disabled={view.interactionDisabled}
				onSelect={categoryId => {
					view.setQuery("");
					view.setActiveCat(categoryId);
				}}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<CatalogSearch query={view.query} disabled={view.interactionDisabled} onQueryChange={view.setQuery} />
				<CatalogList
					models={view.visibleModels}
					query={view.query}
					currentKey={view.currentKey}
					disabled={view.interactionDisabled}
					onPick={view.pick}
				/>
			</div>
		</div>
	);
}

/**
 * Inline model catalog: an always-visible left category rail + searchable list,
 * for the primary "default model" choice. Role-matrix cells use the compact
 * `ModelCategoryPicker` popover instead. Both share the same category logic.
 */
export function ModelCatalog(props: ModelCatalogProps) {
	const view = useModelCatalogView(props);

	if (view.loading && view.availableModels.length === 0 && !view.currentUnavailable) {
		return <ModelCatalogSkeleton className={props.className} />;
	}

	if (view.availableModels.length === 0 && !view.currentUnavailable) {
		return (
			<ModelCatalogNotice className={props.className}>
				No models available. Connect a provider first.
			</ModelCatalogNotice>
		);
	}

	return <ModelCatalogFrame className={props.className} view={view} />;
}

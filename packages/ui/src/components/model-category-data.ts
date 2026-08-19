import type { EngineModelRecord, EngineProviderRecord } from "@fraym-ai/driver";
import type { ModelCapability, ModelCategory, ModelDef, ModelMeta } from "./model-picker";

export interface EngineModelChoice {
	readonly provider?: string;
	readonly modelId?: string;
}

type ProviderGroup = readonly [string, readonly EngineModelRecord[]];

export function modelKey(model: Pick<EngineModelRecord, "providerId" | "modelId">): string {
	return `${model.providerId}/${model.modelId}`;
}

export function selectedKey(selected: EngineModelChoice | null | undefined): string {
	return selected?.provider && selected.modelId ? `${selected.provider}/${selected.modelId}` : "";
}

export function modelCapabilities(model: Pick<EngineModelRecord, "supportsImages" | "reasoning">): ModelCapability[] {
	const capabilities: ModelCapability[] = [];
	if (model.supportsImages) capabilities.push("vision");
	if (model.reasoning) capabilities.push("reasoning");
	return capabilities;
}

export function modelMeta(
	model: Pick<EngineModelRecord, "contextWindow" | "maxOutputTokens" | "cost" | "supportsTools" | "inputModalities">,
): ModelMeta | undefined {
	const meta: { -readonly [K in keyof ModelMeta]: ModelMeta[K] } = {};
	if (model.contextWindow != null) meta.contextWindow = model.contextWindow;
	if (model.maxOutputTokens != null) meta.maxOutputTokens = model.maxOutputTokens;
	if (model.cost) meta.cost = { ...model.cost };
	if (model.supportsTools === false) meta.supportsTools = false;
	if (model.inputModalities?.length) meta.inputModalities = model.inputModalities;
	return Object.keys(meta).length > 0 ? meta : undefined;
}

function modelDef(model: EngineModelRecord): ModelDef {
	return {
		id: modelKey(model),
		providerId: model.providerId,
		providerName: model.providerName,
		...(model.logoUrl ? { providerLogoUrl: model.logoUrl } : {}),
		name: model.label,
		desc: model.modelId,
		capabilities: modelCapabilities(model),
		meta: modelMeta(model),
	};
}

export function sortModels(models: readonly EngineModelRecord[]): EngineModelRecord[] {
	return [...models].sort(compareModels);
}

function compareModels(a: EngineModelRecord, b: EngineModelRecord): number {
	const provider = a.providerName.localeCompare(b.providerName);
	return provider || a.label.localeCompare(b.label);
}

export function buildCategories(
	availableModels: readonly EngineModelRecord[],
	selected: EngineModelChoice | null | undefined,
	providers: readonly EngineProviderRecord[] | undefined,
): ModelCategory[] {
	const sorted = sortModels(availableModels);
	return [
		...currentCategory(sorted, selected),
		...providerCategories(sorted, providers),
		...capabilityCategories(sorted),
	];
}

function currentCategory(
	sortedModels: readonly EngineModelRecord[],
	selected: EngineModelChoice | null | undefined,
): ModelCategory[] {
	const current = sortedModels.find(model => modelKey(model) === selectedKey(selected));
	return current ? [{ id: "current", label: "Current", items: [modelDef(current)] }] : [];
}

function providerCategories(
	sortedModels: readonly EngineModelRecord[],
	providers: readonly EngineProviderRecord[] | undefined,
): ModelCategory[] {
	return sortProviderGroups(groupModelsByProvider(sortedModels), providerSortOrder(providers)).map(group =>
		providerCategory(group, providers),
	);
}

function groupModelsByProvider(sortedModels: readonly EngineModelRecord[]): ProviderGroup[] {
	const providerGroups = new Map<string, EngineModelRecord[]>();
	for (const model of sortedModels) {
		const group = providerGroups.get(model.providerId) ?? [];
		group.push(model);
		providerGroups.set(model.providerId, group);
	}
	return [...providerGroups.entries()];
}

function providerSortOrder(providers: readonly EngineProviderRecord[] | undefined): Map<string, number> {
	return new Map((providers ?? []).map((provider, index) => [provider.id, index]));
}

function sortProviderGroups(groups: readonly ProviderGroup[], providerOrder: Map<string, number>): ProviderGroup[] {
	return [...groups].sort((a, b) => compareProviderGroups(a, b, providerOrder));
}

function compareProviderGroups(a: ProviderGroup, b: ProviderGroup, providerOrder: Map<string, number>): number {
	const order = providerOrderIndex(a[0], providerOrder) - providerOrderIndex(b[0], providerOrder);
	return order || providerLabel(a).localeCompare(providerLabel(b));
}

function providerOrderIndex(providerId: string, providerOrder: Map<string, number>): number {
	return providerOrder.get(providerId) ?? Number.MAX_SAFE_INTEGER;
}

function providerLabel([providerId, models]: ProviderGroup): string {
	return models[0]?.providerName ?? providerId;
}

function providerCategory(group: ProviderGroup, providers: readonly EngineProviderRecord[] | undefined): ModelCategory {
	const [providerId, models] = group;
	// Host-supplied brand: the model records carry it per-row, but the heading
	// needs one URL — take the first model that has one, else the provider record.
	const logoUrl =
		models.find(model => model.logoUrl)?.logoUrl ??
		providers?.find(provider => provider.id === providerId)?.logoUrl;
	return {
		id: `provider:${providerId}`,
		label: providerLabel(group),
		items: models.map(modelDef),
		providerId,
		...(logoUrl ? { providerLogoUrl: logoUrl } : {}),
	};
}

function capabilityCategories(sortedModels: readonly EngineModelRecord[]): ModelCategory[] {
	return [
		...capabilityCategory(
			"capability:reasoning",
			"Reasoning",
			sortedModels.filter(model => model.reasoning),
		),
		...capabilityCategory(
			"capability:vision",
			"Vision",
			sortedModels.filter(model => model.supportsImages),
		),
	];
}

function capabilityCategory(id: string, label: string, models: readonly EngineModelRecord[]): ModelCategory[] {
	return models.length > 0 ? [{ id, label, items: models.map(modelDef) }] : [];
}

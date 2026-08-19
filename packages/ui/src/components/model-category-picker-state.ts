import type { EngineModelRecord, EngineProviderRecord } from "@fraym-ai/driver";
import { useCallback, useMemo, useState } from "react";
import { useDeploymentGates } from "../deployment-gates";
import { buildCategories, type EngineModelChoice, modelKey, selectedKey, sortModels } from "./model-category-data";
import type { ModelCategory, ModelSelection } from "./model-picker";

interface UseModelCategoryPickerArgs {
	readonly models: readonly EngineModelRecord[];
	readonly providers?: readonly EngineProviderRecord[];
	readonly selected?: EngineModelChoice | null;
	readonly selectedLabel?: string;
	readonly placeholder: string;
	readonly disabled: boolean;
	readonly loading: boolean;
	readonly onSelect: (selection: { readonly provider: string; readonly modelId: string }) => void;
}

export interface ModelCategoryPickerState {
	readonly anchorRect: DOMRect | null | undefined;
	readonly categories: readonly ModelCategory[];
	/** Label for ModelPicker's synthetic "all models" tab; `null` omits it. */
	readonly allLabel: string | null;
	readonly isDisabled: boolean;
	readonly pickerSelection: ModelSelection;
	readonly triggerText: string;
	readonly openFromElement: (element: HTMLElement) => void;
	readonly close: () => void;
	readonly selectModel: (next: ModelSelection) => void;
}

export function useModelCategoryPickerState({
	models,
	providers,
	selected,
	selectedLabel,
	placeholder,
	disabled,
	loading,
	onSelect,
}: UseModelCategoryPickerArgs): ModelCategoryPickerState {
	const [anchorRect, setAnchorRect] = useState<DOMRect | null | undefined>(undefined);
	const availableModels = useAvailableModels(models);
	const currentKey = selectedKey(selected);
	const selectedModel = useSelectedModel(availableModels, currentKey);
	// A single-provider deployment opts out of the aggregate groups: no "Current"
	// category, and no synthetic "All available" tab from ModelPicker.
	const providerGroupsOnly = useDeploymentGates().modelPickerGroups === "providers-only";
	const categories = useMemo(
		() => buildCategories(availableModels, selected, providers, { providerGroupsOnly }),
		[availableModels, providers, selected, providerGroupsOnly],
	);
	const pickerSelection = usePickerSelection(currentKey, selectedModel, selectedLabel, placeholder);

	return {
		anchorRect,
		categories,
		allLabel: providerGroupsOnly ? null : "All available",
		isDisabled: disabled || loading || availableModels.length === 0,
		pickerSelection,
		triggerText: loading ? "Loading models" : triggerLabel(selectedModel, selectedLabel, placeholder),
		openFromElement: useOpenFromElement(setAnchorRect),
		close: useCallback(() => setAnchorRect(undefined), []),
		selectModel: useSelectModel(availableModels, onSelect),
	};
}

function useAvailableModels(models: readonly EngineModelRecord[]): readonly EngineModelRecord[] {
	return useMemo(() => sortModels(models.filter(model => model.available)), [models]);
}

function useSelectedModel(
	availableModels: readonly EngineModelRecord[],
	currentKey: string,
): EngineModelRecord | undefined {
	return useMemo(() => availableModels.find(model => modelKey(model) === currentKey), [availableModels, currentKey]);
}

function usePickerSelection(
	currentKey: string,
	selectedModel: EngineModelRecord | undefined,
	selectedLabel: string | undefined,
	placeholder: string,
): ModelSelection {
	return useMemo(
		() => createPickerSelection(currentKey, selectedModel, selectedLabel, placeholder),
		[currentKey, placeholder, selectedLabel, selectedModel],
	);
}

function createPickerSelection(
	currentKey: string,
	selectedModel: EngineModelRecord | undefined,
	selectedLabel: string | undefined,
	placeholder: string,
): ModelSelection {
	return {
		id: selectionId(currentKey),
		name: selectionName(selectedModel, selectedLabel, placeholder),
		effort: "",
	};
}

function selectionId(currentKey: string): string | undefined {
	return currentKey === "" ? undefined : currentKey;
}

function selectionName(
	selectedModel: EngineModelRecord | undefined,
	selectedLabel: string | undefined,
	placeholder: string,
): string {
	return selectedModel?.label ?? selectedLabel ?? placeholder;
}

function useOpenFromElement(setAnchorRect: (rect: DOMRect | null | undefined) => void) {
	return useCallback(
		(element: HTMLElement) => {
			setAnchorRect(usableRect(element.getBoundingClientRect?.() ?? null));
		},
		[setAnchorRect],
	);
}

function useSelectModel(
	availableModels: readonly EngineModelRecord[],
	onSelect: (selection: { readonly provider: string; readonly modelId: string }) => void,
) {
	return useCallback(
		(next: ModelSelection) => {
			const picked = availableModels.find(model => modelKey(model) === next.id);
			if (picked) onSelect({ provider: picked.providerId, modelId: picked.modelId });
		},
		[availableModels, onSelect],
	);
}

function triggerLabel(
	selectedModel: EngineModelRecord | undefined,
	selectedLabel: string | undefined,
	placeholder: string,
): string {
	return selectedModel ? `${selectedModel.providerName} / ${selectedModel.label}` : selectedLabel || placeholder;
}

function usableRect(rect: DOMRect | null): DOMRect | null {
	return rect && hasUsableViewport() && hasFiniteRect(rect) ? rect : null;
}

function hasUsableViewport(): boolean {
	return typeof window !== "undefined" && Number.isFinite(window.innerWidth) && Number.isFinite(window.innerHeight);
}

function hasFiniteRect(rect: DOMRect): boolean {
	return [rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite);
}

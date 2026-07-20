import type { EngineModelRecord, EngineProviderRecord } from "@fraym/driver";
import {
	buildCategories,
	type EngineModelChoice,
	modelCapabilities,
	modelKey,
	modelMeta,
	selectedKey,
	sortModels,
} from "./model-category-data";
import { useModelCategoryPickerState } from "./model-category-picker-state";
import { ModelCategoryMenu, ModelCategoryTrigger } from "./model-category-picker-view";

export { buildCategories, type EngineModelChoice, modelCapabilities, modelKey, modelMeta, selectedKey, sortModels };

export interface ModelCategoryPickerProps {
	readonly models: readonly EngineModelRecord[];
	readonly providers?: readonly EngineProviderRecord[];
	readonly selected?: EngineModelChoice | null;
	readonly selectedLabel?: string;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly loading?: boolean;
	readonly pickerId?: string;
	readonly className?: string;
	readonly onSelect: (selection: { readonly provider: string; readonly modelId: string }) => void;
}

export function ModelCategoryPicker({
	models,
	providers,
	selected,
	selectedLabel,
	placeholder = "Select model",
	disabled = false,
	loading = false,
	pickerId,
	className,
	onSelect,
}: ModelCategoryPickerProps) {
	const picker = useModelCategoryPickerState({
		models,
		providers,
		selected,
		selectedLabel,
		placeholder,
		disabled,
		loading,
		onSelect,
	});

	return (
		<>
			<ModelCategoryTrigger
				className={className}
				disabled={picker.isDisabled}
				pickerId={pickerId}
				text={picker.triggerText}
				openFromElement={picker.openFromElement}
			/>
			<ModelCategoryMenu state={picker} />
		</>
	);
}

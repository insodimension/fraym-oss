import type { EngineModelRecord, EngineProviderRecord, SessionConfig } from "@fraym-ai/driver";
import { useCallback, useMemo } from "react";
import type { Placement } from "../elements/popover";
import { buildCategories, modelKey, selectedKey, sortModels } from "./model-category-picker";
import { ModelPicker, type ModelSelection } from "./model-picker";

export interface EngineModelMenuProps {
	readonly models: readonly EngineModelRecord[];
	readonly providers?: readonly EngineProviderRecord[];
	/** The current session's bound model/thinking, used to highlight the active choice. */
	readonly sessionConfig?: SessionConfig | null;
	/** Reasoning-effort options to offer (engine thinking levels). Empty hides the row. */
	readonly efforts?: readonly string[];
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly onSelectModel: (selection: { readonly provider: string; readonly modelId: string }) => void;
	readonly onSelectThinking?: (level: string) => void;
	readonly onClose: () => void;
}

type EngineModelSelection = { readonly provider: string; readonly modelId: string };
type ModelMatch = (model: EngineModelRecord, modelId: string, provider: string | undefined) => boolean;

function sessionModelId(sessionConfig: SessionConfig | null | undefined): string | null {
	return sessionConfig?.modelId ?? null;
}

// Resolve the selected model in PRIORITY order: an exact provider+modelId match wins over
// a looser modelId-only match, so a subscription provider (e.g. openai-codex) is never
// shadowed by an API-key provider that exposes the same modelId.
const MODEL_MATCHERS: readonly ModelMatch[] = [
	(model, modelId, provider) => Boolean(provider && model.providerId === provider && model.modelId === modelId),
	(model, modelId) => modelKey(model) === modelId,
	(model, modelId) => model.modelId === modelId,
];

function selectedEngineModel(
	available: readonly EngineModelRecord[],
	sessionConfig: SessionConfig | null | undefined,
): EngineModelRecord | null {
	const modelId = sessionModelId(sessionConfig);
	if (!modelId) return null;
	const provider = sessionConfig?.provider;
	for (const matches of MODEL_MATCHERS) {
		const found = available.find(model => matches(model, modelId, provider));
		if (found) return found;
	}
	return null;
}

function selectionFromRecord(record: EngineModelRecord | null): EngineModelSelection | null {
	return record ? { provider: record.providerId, modelId: record.modelId } : null;
}

function pickerModelSelection(
	selectedRecord: EngineModelRecord | null,
	sessionConfig: SessionConfig | null | undefined,
	currentKey: string,
	currentThinking: string,
): ModelSelection {
	return {
		id: optionalCurrentKey(currentKey),
		name: pickerModelName(selectedRecord, sessionConfig),
		effort: currentThinking,
	};
}

function optionalCurrentKey(currentKey: string): string | undefined {
	return currentKey.length > 0 ? currentKey : undefined;
}

function selectedRecordLabel(selectedRecord: EngineModelRecord | null): string | undefined {
	return selectedRecord?.label;
}

function sessionConfigModelId(sessionConfig: SessionConfig | null | undefined): string | undefined {
	return sessionConfig?.modelId;
}

function pickerModelName(
	selectedRecord: EngineModelRecord | null,
	sessionConfig: SessionConfig | null | undefined,
): string {
	return selectedRecordLabel(selectedRecord) ?? sessionConfigModelId(sessionConfig) ?? "Select model";
}

function applyModelSelection(
	next: ModelSelection,
	currentKey: string,
	available: readonly EngineModelRecord[],
	onSelectModel: (selection: EngineModelSelection) => void,
): void {
	if (!next.id || next.id === currentKey) return;
	const record = available.find(model => modelKey(model) === next.id);
	if (record) onSelectModel({ provider: record.providerId, modelId: record.modelId });
}

function applyThinkingSelection(
	next: ModelSelection,
	currentThinking: string,
	onSelectThinking: ((level: string) => void) | undefined,
): void {
	if (next.effort && next.effort !== currentThinking) onSelectThinking?.(next.effort);
}

/**
 * Adapts the live engine model registry (`EngineModelRecord[]`) to the composer's
 * `ModelPicker`. Selecting a model maps back to a real `{ provider, modelId }` and
 * is committed to the active session; this is the in-chat counterpart to the
 * Settings "Default model" catalog, both sourced from the same resource snapshot.
 */
export function EngineModelMenu({
	models,
	providers,
	sessionConfig,
	efforts = [],
	anchorRect,
	place = "above-right",
	onSelectModel,
	onSelectThinking,
	onClose,
}: EngineModelMenuProps) {
	const available = useMemo(() => sortModels(models.filter(model => model.available)), [models]);

	const selectedRecord = useMemo(() => selectedEngineModel(available, sessionConfig), [available, sessionConfig]);

	const selected = useMemo(() => selectionFromRecord(selectedRecord), [selectedRecord]);

	const categories = useMemo(() => buildCategories(available, selected, providers), [available, selected, providers]);

	const currentKey = selectedKey(selected);
	const currentThinking = sessionConfig?.thinkingLevel ?? "";
	const pickerModel = pickerModelSelection(selectedRecord, sessionConfig, currentKey, currentThinking);
	const select = useCallback(
		(next: ModelSelection) => {
			applyModelSelection(next, currentKey, available, onSelectModel);
			applyThinkingSelection(next, currentThinking, onSelectThinking);
		},
		[available, currentKey, currentThinking, onSelectModel, onSelectThinking],
	);

	return (
		<ModelPicker
			model={pickerModel}
			categories={categories}
			efforts={efforts}
			allLabel="All available"
			anchorRect={anchorRect}
			place={place}
			onClose={onClose}
			onSelect={select}
		/>
	);
}

import type { EngineConfigSettingRecord, EngineConfigValueRecord } from "@fraym/driver";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "../elements/button";
import { Input } from "../elements/input";
import { Switch } from "../elements/switch";
import { Textarea } from "../elements/textarea";
import { cn } from "../lib/cn";
import { parseSettingDraft, settingValueToDraft } from "./setting-draft";
import { SettingSourceBadge, type SettingSourceBadgeProps } from "./setting-source-badge";
import { PatternListEditor, RecordMapEditor } from "./structured-setting-editors";
import { classifyStructuredSetting, effectiveStructuredValue, structuredSourceKey } from "./structured-setting-model";

export type { SettingSourceBadgeProps };
export { SettingSourceBadge };

export interface SettingControlRendererProps {
	readonly record: EngineConfigSettingRecord;
	readonly value?: EngineConfigValueRecord;
	readonly disabled?: boolean;
	readonly onCommit?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}

const SEGMENTED_OPTION_LIMIT = 6;

interface SettingDraftState {
	readonly path: string;
	readonly sourceDraft: string;
	readonly draft: string;
	readonly error: string | null;
}

interface ScalarControlState {
	readonly record: EngineConfigSettingRecord;
	readonly value?: EngineConfigValueRecord;
	readonly currentValue: unknown;
	readonly busy: boolean;
	readonly draft: string;
	readonly error: string | null;
	readonly localSaving: boolean;
	readonly draftInputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
	readonly setDraft: (draft: string) => void;
	readonly commitValue: (nextValue: unknown) => Promise<void>;
	readonly saveDraft: () => void;
	readonly reset: () => Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}

export function SettingControlRenderer(props: SettingControlRendererProps) {
	const structuredKind = classifyStructuredSetting(props.record, props.value);
	if (structuredKind === "string-list") {
		return <PatternListEditor key={structuredSourceKey(props.record, props.value)} {...props} />;
	}
	if (structuredKind === "record-map") {
		return <RecordMapEditor key={structuredSourceKey(props.record, props.value)} {...props} />;
	}
	return <ScalarSettingControl {...props} />;
}

function useDraftState(record: EngineConfigSettingRecord, sourceDraft: string) {
	const [draftState, setDraftState] = useState<SettingDraftState>(() => ({
		path: record.path,
		sourceDraft,
		draft: sourceDraft,
		error: null,
	}));
	const fresh = draftState.path === record.path && draftState.sourceDraft === sourceDraft;
	const updateDraftState = useCallback(
		(update: (state: Pick<SettingDraftState, "draft" | "error">) => Pick<SettingDraftState, "draft" | "error">) => {
			setDraftState(previous => {
				const current =
					previous.path === record.path && previous.sourceDraft === sourceDraft
						? previous
						: { path: record.path, sourceDraft, draft: sourceDraft, error: null };
				return { path: record.path, sourceDraft, ...update({ draft: current.draft, error: current.error }) };
			});
		},
		[record.path, sourceDraft],
	);
	return {
		draft: fresh ? draftState.draft : sourceDraft,
		error: fresh ? draftState.error : null,
		setDraft: (draft: string) => updateDraftState(state => ({ ...state, draft })),
		setError: (error: string | null) => updateDraftState(state => ({ ...state, error })),
	};
}

function useScalarControlState({
	record,
	value,
	disabled = false,
	onCommit,
	onReset,
}: SettingControlRendererProps): ScalarControlState {
	const currentValue = effectiveStructuredValue(record, value);
	const sourceDraft = useMemo(() => settingValueToDraft(record, currentValue), [record, currentValue]);
	const draftInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
	const [localSaving, setLocalSaving] = useState(false);
	const { draft, error, setDraft, setError } = useDraftState(record, sourceDraft);
	const busy = disabled || localSaving || !record.writable;
	const commitValue = useCallback(
		async (nextValue: unknown) => {
			if (!onCommit || busy) return;
			setLocalSaving(true);
			setError(null);
			try {
				await onCommit(record.path, nextValue);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : String(cause));
			} finally {
				setLocalSaving(false);
			}
		},
		[busy, onCommit, record.path, setError],
	);
	const saveDraft = () => {
		try {
			void commitValue(parseSettingDraft(record, draftInputRef.current?.value ?? draft));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		}
	};
	const reset = async () => {
		if (!onReset || busy) return;
		setLocalSaving(true);
		setError(null);
		try {
			await onReset(record.path);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setLocalSaving(false);
		}
	};
	return {
		record,
		value,
		currentValue,
		busy,
		draft,
		error,
		localSaving,
		draftInputRef,
		setDraft,
		commitValue,
		saveDraft,
		reset,
		onReset,
	};
}

function ChangedResetButton({
	state,
	variant = "ghost",
}: {
	readonly state: ScalarControlState;
	readonly variant?: "ghost" | "outline";
}) {
	if (!state.onReset) return null;
	return (
		<Button
			type="button"
			variant={variant}
			size="sm"
			data-setting-reset={state.record.path}
			disabled={state.busy}
			onClick={state.reset}
		>
			Reset
		</Button>
	);
}

function BooleanSettingControl({ state }: { readonly state: ScalarControlState }) {
	const { record, value, currentValue, busy, commitValue, error } = state;
	return (
		<div data-slot="setting-control-renderer" data-setting-path={record.path} className="flex items-center gap-2">
			<Switch
				checked={Boolean(currentValue)}
				disabled={busy}
				onCheckedChange={checked => void commitValue(Boolean(checked))}
			/>
			<SettingSourceBadge record={record} value={value} />
			{value?.changed && <ChangedResetButton state={state} />}
			{error && <span className="max-w-[220px] text-xs text-fr-del">{error}</span>}
		</div>
	);
}

function SegmentedSettingControl({ state }: { readonly state: ScalarControlState }) {
	const { record, value, currentValue, busy, commitValue, error } = state;
	if (!record.options) return null;
	return (
		<div
			data-slot="setting-control-renderer"
			data-setting-path={record.path}
			className="flex flex-wrap items-center justify-end gap-2"
		>
			<div
				data-slot="segmented"
				className="flex shrink-0 gap-0.5 rounded-lg border border-fr-border bg-fr-surface p-[3px]"
			>
				{record.options.map(option => (
					<button
						key={option.value}
						type="button"
						className={cn(
							"rounded-md px-3 py-[5px] font-secondary text-xs text-fr-text-2",
							String(currentValue ?? "") === option.value && "bg-fr-surface-3 text-fr-text",
						)}
						disabled={busy}
						onClick={() => void commitValue(option.value)}
					>
						{option.label}
					</button>
				))}
			</div>
			<SettingSourceBadge record={record} value={value} />
			{value?.changed && <ChangedResetButton state={state} />}
			{error && <span className="basis-full text-right text-xs text-fr-del">{error}</span>}
		</div>
	);
}

function SelectSettingControl({ state }: { readonly state: ScalarControlState }) {
	const { record, value, draft, busy, setDraft, commitValue, error } = state;
	if (!record.options) return null;
	return (
		<div data-slot="setting-control-renderer" data-setting-path={record.path} className="flex items-center gap-2">
			<select
				data-setting-input={record.path}
				className="w-[240px] shrink-0 rounded-[8px] border border-fr-border bg-fr-surface px-[11px] py-2 font-secondary text-fr-sm text-fr-text outline-none focus-visible:border-fr-accent-line"
				value={draft}
				disabled={busy}
				onChange={event => {
					setDraft(event.target.value);
					void commitValue(event.target.value);
				}}
			>
				{record.options.map(option => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<SettingSourceBadge record={record} value={value} />
			{value?.changed && <ChangedResetButton state={state} />}
			{error && <span className="max-w-[220px] text-xs text-fr-del">{error}</span>}
		</div>
	);
}

function DraftInput({
	state,
	isJsonFallback,
}: {
	readonly state: ScalarControlState;
	readonly isJsonFallback: boolean;
}) {
	const { record, draft, busy, setDraft, draftInputRef } = state;
	return isJsonFallback ? (
		<Textarea
			ref={node => {
				draftInputRef.current = node;
			}}
			data-setting-input={record.path}
			className="min-h-[112px] max-h-[280px] font-secondary text-xs"
			value={draft}
			disabled={busy}
			onChange={event => setDraft(event.target.value)}
		/>
	) : (
		<Input
			ref={node => {
				draftInputRef.current = node;
			}}
			data-setting-input={record.path}
			className="w-[280px] shrink-0"
			type={record.type === "number" ? "number" : "text"}
			value={draft}
			disabled={busy}
			onChange={event => setDraft(event.target.value)}
		/>
	);
}

function DraftSettingControl({ state }: { readonly state: ScalarControlState }) {
	const { record, value, busy, localSaving, saveDraft, error } = state;
	const isJsonFallback = record.type === "array" || record.type === "record";
	return (
		<div
			data-slot="setting-control-renderer"
			data-setting-path={record.path}
			className={cn("flex items-center gap-2", isJsonFallback && "w-full flex-col items-stretch")}
		>
			<DraftInput state={state} isJsonFallback={isJsonFallback} />
			<div className={cn("flex shrink-0 items-center gap-2", isJsonFallback && "self-end")}>
				<SettingSourceBadge record={record} value={value} />
				<ChangedResetButton state={state} variant="outline" />
				<Button type="button" size="sm" data-setting-save={record.path} disabled={busy} onClick={saveDraft}>
					{localSaving ? "Saving" : "Save"}
				</Button>
			</div>
			{error && (
				<div className={cn("text-xs text-fr-del", isJsonFallback ? "text-right" : "max-w-[220px]")}>{error}</div>
			)}
		</div>
	);
}

function ScalarSettingControl(props: SettingControlRendererProps) {
	const state = useScalarControlState(props);
	const hasOptions = Boolean(state.record.options?.length);
	const compactOptions = hasOptions && (state.record.options?.length ?? 0) <= SEGMENTED_OPTION_LIMIT;
	if (state.record.type === "boolean") return <BooleanSettingControl state={state} />;
	if (compactOptions) return <SegmentedSettingControl state={state} />;
	if (hasOptions) return <SelectSettingControl state={state} />;
	return <DraftSettingControl state={state} />;
}

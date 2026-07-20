import type { EngineConfigSettingRecord, EngineConfigValueRecord } from "@fraym/driver";
import { useId, useState } from "react";
import { Button } from "../elements/button";
import { Input } from "../elements/input";
import { cn } from "../lib/cn";
import { SettingSourceBadge } from "./setting-source-badge";
import {
	coerceStringEntries,
	coerceStringList,
	effectiveStructuredValue,
	entriesToRecord,
} from "./structured-setting-model";

export interface StructuredSettingEditorProps {
	readonly record: EngineConfigSettingRecord;
	readonly value?: EngineConfigValueRecord;
	readonly disabled?: boolean;
	readonly onCommit?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}

const SELECT_CLASS =
	"shrink-0 rounded-[8px] border border-fr-border bg-fr-surface px-[11px] py-2 font-secondary text-fr-sm text-fr-text outline-none focus-visible:border-fr-accent-line disabled:cursor-not-allowed disabled:opacity-50";

// Stable per-row identity so React reconciles by row (not array index) across
// add/remove/reorder. Editors remount (via `key` at the dispatch site) when the
// committed value changes, so a process-wide counter is enough to keep keys
// unique within a mounted editor's lifetime.
let rowIdSeq = 0;
const nextRowId = () => {
	rowIdSeq += 1;
	return `row-${rowIdSeq}`;
};

/** Shared commit/reset/error/busy machinery for the structured editors. */
function useStructuredCommit(props: StructuredSettingEditorProps) {
	const { record, disabled, onCommit, onReset } = props;
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const busy = Boolean(disabled) || saving || !record.writable;

	const run = async (action: () => Promise<void> | void) => {
		setSaving(true);
		setError(null);
		try {
			await action();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setSaving(false);
		}
	};

	return {
		busy,
		saving,
		error,
		commit: (next: unknown) => {
			if (!onCommit || busy) return;
			void run(() => onCommit(record.path, next));
		},
		reset: () => {
			if (!onReset || busy) return;
			void run(() => onReset(record.path));
		},
	};
}

interface StructuredEditorFooterProps {
	readonly record: EngineConfigSettingRecord;
	readonly value?: EngineConfigValueRecord;
	readonly busy: boolean;
	readonly saving: boolean;
	readonly dirty: boolean;
	readonly error: string | null;
	readonly onReset?: (path: string) => void | Promise<void>;
	readonly onResetClick: () => void;
	readonly onSave: () => void;
}

function StructuredEditorFooter({
	record,
	value,
	busy,
	saving,
	dirty,
	error,
	onReset,
	onResetClick,
	onSave,
}: StructuredEditorFooterProps) {
	return (
		<div className="flex w-full flex-col gap-1">
			<div className="flex w-full items-center justify-end gap-2">
				{dirty && <span className="mr-auto text-xs text-fr-text-3">Unsaved changes</span>}
				<SettingSourceBadge record={record} value={value} />
				{onReset && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						data-setting-reset={record.path}
						disabled={busy}
						onClick={onResetClick}
					>
						Reset
					</Button>
				)}
				<Button type="button" size="sm" data-setting-save={record.path} disabled={busy || !dirty} onClick={onSave}>
					{saving ? "Saving" : "Save"}
				</Button>
			</div>
			{error && <p className="text-right text-xs text-fr-del">{error}</p>}
		</div>
	);
}

interface ListRow {
	readonly id: string;
	readonly value: string;
}

/** Single pass: trim entries and drop blanks. */
function trimmedList(rows: readonly ListRow[]): string[] {
	const out: string[] = [];
	for (const row of rows) {
		const trimmed = row.value.trim();
		if (trimmed) out.push(trimmed);
	}
	return out;
}

/**
 * Editor for `array` settings whose entries are flat strings (tool/agent names,
 * glob patterns, server names…). One row per entry with add/remove; commits the
 * whole list. When the catalog declares value `options`, they are offered as
 * autocomplete suggestions while still allowing free-form entries.
 */
export function PatternListEditor(props: StructuredSettingEditorProps) {
	const { record, value, onReset } = props;
	const [sourceKey] = useState(() => JSON.stringify(coerceStringList(effectiveStructuredValue(record, value))));
	const [rows, setRows] = useState<readonly ListRow[]>(() =>
		coerceStringList(effectiveStructuredValue(record, value)).map(item => ({ id: nextRowId(), value: item })),
	);
	const { busy, saving, error, commit, reset } = useStructuredCommit(props);
	const dirty = JSON.stringify(trimmedList(rows)) !== sourceKey;
	const listId = useId();
	const suggestions = record.options ?? [];

	const editItem = (id: string, next: string) =>
		setRows(rows.map(row => (row.id === id ? { ...row, value: next } : row)));
	const removeItem = (id: string) => setRows(rows.filter(row => row.id !== id));
	const addItem = () => setRows([...rows, { id: nextRowId(), value: "" }]);

	return (
		<div data-slot="pattern-list-editor" data-setting-path={record.path} className="flex w-full flex-col gap-2">
			{suggestions.length > 0 && (
				<datalist id={listId}>
					{suggestions.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</datalist>
			)}
			{rows.length === 0 ? (
				<p className="text-xs text-fr-text-3">No entries. Add one below.</p>
			) : (
				<ul className="flex flex-col gap-1.5">
					{rows.map(row => (
						<li key={row.id} className="flex items-center gap-2">
							<Input
								data-list-item={record.path}
								className="font-secondary text-xs"
								value={row.value}
								disabled={busy}
								list={suggestions.length > 0 ? listId : undefined}
								placeholder="value"
								onChange={event => editItem(row.id, event.target.value)}
							/>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								data-list-remove={record.path}
								disabled={busy}
								onClick={() => removeItem(row.id)}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}
			<div className="flex items-center">
				<Button
					type="button"
					variant="outline"
					size="sm"
					data-list-add={record.path}
					disabled={busy}
					onClick={addItem}
				>
					Add entry
				</Button>
			</div>
			<StructuredEditorFooter
				record={record}
				value={value}
				busy={busy}
				saving={saving}
				dirty={dirty}
				error={error}
				onReset={onReset}
				onResetClick={reset}
				onSave={() => commit(trimmedList(rows))}
			/>
		</div>
	);
}

interface MapRow {
	readonly id: string;
	readonly key: string;
	readonly value: string;
}

/**
 * Editor for `record` settings whose values are flat strings (per-key maps such
 * as tool approval policies). One row per entry: a key field plus a value field
 * (a `<select>` when the catalog declares value `options`, otherwise free text).
 * Commits the whole map; blank keys are dropped and later keys win on duplicates.
 */
export function RecordMapEditor(props: StructuredSettingEditorProps) {
	const { record, value, onReset } = props;
	const [sourceKey] = useState(() =>
		JSON.stringify(entriesToRecord(coerceStringEntries(effectiveStructuredValue(record, value)))),
	);
	const [rows, setRows] = useState<readonly MapRow[]>(() =>
		coerceStringEntries(effectiveStructuredValue(record, value)).map(([key, item]) => ({
			id: nextRowId(),
			key,
			value: item,
		})),
	);
	const { busy, saving, error, commit, reset } = useStructuredCommit(props);
	const options = record.options ?? [];
	const draftRecord = entriesToRecord(rows.map(row => [row.key, row.value] as const));
	const dirty = JSON.stringify(draftRecord) !== sourceKey;

	const editKey = (id: string, key: string) => setRows(rows.map(row => (row.id === id ? { ...row, key } : row)));
	const editValue = (id: string, next: string) =>
		setRows(rows.map(row => (row.id === id ? { ...row, value: next } : row)));
	const removeEntry = (id: string) => setRows(rows.filter(row => row.id !== id));
	const addEntry = () => setRows([...rows, { id: nextRowId(), key: "", value: options[0]?.value ?? "" }]);

	return (
		<div data-slot="record-map-editor" data-setting-path={record.path} className="flex w-full flex-col gap-2">
			{rows.length === 0 ? (
				<p className="text-xs text-fr-text-3">No entries. Add one below.</p>
			) : (
				<ul className="flex flex-col gap-1.5">
					{rows.map(row => (
						<li key={row.id} className="flex items-center gap-2">
							<Input
								data-record-key={record.path}
								className="font-secondary text-xs"
								value={row.key}
								disabled={busy}
								placeholder="key"
								onChange={event => editKey(row.id, event.target.value)}
							/>
							{options.length > 0 ? (
								<select
									data-record-value={record.path}
									className={cn(SELECT_CLASS, "w-[150px]")}
									value={row.value}
									disabled={busy}
									onChange={event => editValue(row.id, event.target.value)}
								>
									{options.some(option => option.value === row.value) ? null : (
										<option value={row.value}>{row.value}</option>
									)}
									{options.map(option => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							) : (
								<Input
									data-record-value={record.path}
									className="font-secondary text-xs"
									value={row.value}
									disabled={busy}
									placeholder="value"
									onChange={event => editValue(row.id, event.target.value)}
								/>
							)}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								data-record-remove={record.path}
								disabled={busy}
								onClick={() => removeEntry(row.id)}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}
			<div className="flex items-center">
				<Button
					type="button"
					variant="outline"
					size="sm"
					data-record-add={record.path}
					disabled={busy}
					onClick={addEntry}
				>
					Add entry
				</Button>
			</div>
			<StructuredEditorFooter
				record={record}
				value={value}
				busy={busy}
				saving={saving}
				dirty={dirty}
				error={error}
				onReset={onReset}
				onResetClick={reset}
				onSave={() => commit(draftRecord)}
			/>
		</div>
	);
}

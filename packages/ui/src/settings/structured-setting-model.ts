import type { EngineConfigSettingRecord, EngineConfigValueRecord } from "@fraym-ai/driver";
import {
	effectiveStructuredValue,
	isNonEmptyStringRecordValue,
	isStringArrayValue,
	isStringRecordValue,
} from "./structured-setting-values";

export {
	coerceStringEntries,
	coerceStringList,
	effectiveStructuredValue,
	entriesToRecord,
} from "./structured-setting-values";

/**
 * Which structured editor (if any) should render an `array`/`record` setting.
 * `json` is the raw-textarea fallback for anything richer than a flat list or a
 * string-valued map.
 */
export type StructuredSettingKind = "string-list" | "record-map" | "json";

/**
 * A stable string key derived from a setting's effective value, used to remount
 * a structured editor when the committed value changes externally (so the
 * editor re-seeds its draft) without resync bookkeeping inside the editor.
 */
export function structuredSourceKey(record: EngineConfigSettingRecord, value?: EngineConfigValueRecord): string {
	return JSON.stringify(effectiveStructuredValue(record, value) ?? null);
}

/**
 * Decide which structured editor should render an `array`/`record` setting,
 * based purely on the `@fraym-ai/driver` contract: the declared `type` plus the
 * *shape* of the effective value, default, and any declared value `options`.
 * This stays engine-agnostic — no provider- or engine-specific paths — so it
 * works for any driver's catalog. Anything richer than a flat string list or a
 * string-valued map degrades to the raw JSON editor.
 *
 * Arrays and records are deliberately asymmetric on the *empty* case:
 * - An empty array routes to the list editor (string arrays dominate; the rare
 *   object-array settings carry a non-empty object default, so the default-shape
 *   guard still catches them).
 * - An empty record is genuinely ambiguous (a flat string map vs. an unset
 *   nested-object record such as `models.providers`, default `{}`), so it only
 *   routes to the map editor given a positive flat-value signal: declared value
 *   `options`, a non-empty string-valued current value, or a non-empty
 *   string-valued default. Otherwise it stays on the JSON fallback.
 */
export function classifyStructuredSetting(
	record: EngineConfigSettingRecord,
	value?: EngineConfigValueRecord,
): StructuredSettingKind {
	const candidate = effectiveStructuredValue(record, value);
	if (record.type === "array") {
		const defaultOk = record.defaultValue === undefined || isStringArrayValue(record.defaultValue);
		return defaultOk && isStringArrayValue(candidate) ? "string-list" : "json";
	}
	if (record.type === "record") {
		if (!isStringRecordValue(candidate)) return "json";
		const hasFlatSignal =
			isNonEmptyStringRecordValue(candidate) ||
			Boolean(record.options?.length) ||
			isNonEmptyStringRecordValue(record.defaultValue);
		return hasFlatSignal ? "record-map" : "json";
	}
	return "json";
}

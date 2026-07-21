import type { EngineConfigSettingRecord, EngineConfigValueRecord } from "@fraym-ai/driver";

/** The effective value of a setting: the explicit value if set, else its default. */
export function effectiveStructuredValue(record: EngineConfigSettingRecord, value?: EngineConfigValueRecord): unknown {
	const explicit = value?.value;
	return explicit === undefined || explicit === null ? record.defaultValue : explicit;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An array whose entries are all strings (an empty array qualifies). */
export function isStringArrayValue(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every(item => typeof item === "string");
}

/** A plain object whose values are all strings (an empty object qualifies). */
export function isStringRecordValue(value: unknown): value is Record<string, string> {
	return isPlainObject(value) && Object.values(value).every(item => typeof item === "string");
}

/** A non-empty plain object whose values are all strings. */
export function isNonEmptyStringRecordValue(value: unknown): boolean {
	return isStringRecordValue(value) && Object.keys(value).length > 0;
}

/** Coerce an unknown engine value into a string list (drops non-string entries). */
export function coerceStringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Coerce an unknown engine value into ordered `[key, value]` string entries. */
export function coerceStringEntries(value: unknown): Array<readonly [string, string]> {
	if (!isPlainObject(value)) return [];
	const entries: Array<readonly [string, string]> = [];
	for (const [key, item] of Object.entries(value)) {
		if (typeof item === "string") entries.push([key, item]);
	}
	return entries;
}

/**
 * Build a record object from ordered entries: keys are trimmed, blank keys are
 * dropped, and later entries win on duplicate keys (matching how the engine
 * would coalesce a map).
 */
export function entriesToRecord(entries: Iterable<readonly [string, string]>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, item] of entries) {
		const trimmed = key.trim();
		if (trimmed) out[trimmed] = item;
	}
	return out;
}

import type { EngineConfigSettingRecord } from "@fraym/driver";

const EMPTY_DRAFT = "";
const JSON_INDENT = 2;

type SettingType = EngineConfigSettingRecord["type"];
type StructuredSettingType = Extract<SettingType, "array" | "record">;
type DraftParser = (record: EngineConfigSettingRecord, draft: string) => unknown;

const STRUCTURED_DEFAULTS: Record<StructuredSettingType, unknown> = {
	array: [],
	record: {},
};

const DRAFT_PARSERS: Partial<Record<SettingType, DraftParser>> = {
	array: parseJsonDraft,
	number: parseNumberDraft,
	record: parseJsonDraft,
};

/** Serialize a setting value into the editable draft string shown in scalar controls. */
export function settingValueToDraft(record: EngineConfigSettingRecord, value: unknown): string {
	const { type } = record;

	if (isStructuredSettingType(type)) {
		return JSON.stringify(resolveStructuredDraftValue(type, record.defaultValue, value), null, JSON_INDENT);
	}
	if (isEmptyDraftValue(value)) return EMPTY_DRAFT;
	return String(value);
}

/** Parse a draft string back into a typed setting value, throwing on malformed input. */
export function parseSettingDraft(record: EngineConfigSettingRecord, draft: string): unknown {
	const parser = DRAFT_PARSERS[record.type];
	return parser ? parser(record, draft) : draft;
}

function isStructuredSettingType(type: SettingType): type is StructuredSettingType {
	return type in STRUCTURED_DEFAULTS;
}

function resolveStructuredDraftValue(type: StructuredSettingType, defaultValue: unknown, value: unknown): unknown {
	if (!isEmptyDraftValue(value)) return value;
	if (!isEmptyDraftValue(defaultValue)) return defaultValue;
	return STRUCTURED_DEFAULTS[type];
}

function isEmptyDraftValue(value: unknown): boolean {
	return value === undefined || value === null;
}

function parseNumberDraft(record: EngineConfigSettingRecord, draft: string): number {
	const value = Number(draft);
	if (!Number.isFinite(value)) throw new Error(`Expected a finite number for ${record.label}.`);
	return value;
}

function parseJsonDraft(_record: EngineConfigSettingRecord, draft: string): unknown {
	return JSON.parse(draft);
}

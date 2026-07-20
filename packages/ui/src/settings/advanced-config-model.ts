import type { EngineConfigSettingRecord, EngineConfigValueRecord } from "@fraym/driver";

/**
 * Pure model for the Advanced config explorer — a power-user view over the
 * *entire* engine config catalog (not just the curated panes). Engine-agnostic:
 * everything here reads only the `@fraym/driver` contract shape, so a third-party
 * engine's catalog browses exactly the same way.
 */

/** Active filter state for the explorer toolbar. */
export interface AdvancedConfigFilter {
	/** Free-text query matched across path/label/description/group. */
	readonly query: string;
	/** Restrict to a single catalog group, or `null` for all groups. */
	readonly group: string | null;
	/** Show only settings with an active override (`value.changed`). */
	readonly changedOnly: boolean;
}

/** Neutral filter: matches every record. */
export const EMPTY_ADVANCED_CONFIG_FILTER: AdvancedConfigFilter = {
	query: "",
	group: null,
	changedOnly: false,
};

/** A catalog group plus the records it owns, ready to render as one section. */
export interface AdvancedConfigGroup {
	readonly group: string;
	readonly records: readonly EngineConfigSettingRecord[];
}

/** True when any filter narrows the catalog (used to auto-expand result groups). */
export function isAdvancedConfigFilterActive(filter: AdvancedConfigFilter): boolean {
	return filter.query.trim().length > 0 || filter.group !== null || filter.changedOnly;
}

/** Match a record against the free-text query across path/label/description/group. */
export function matchesConfigQuery(record: EngineConfigSettingRecord, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return [record.path, record.label, record.description, record.group].some(field =>
		field?.toLowerCase().includes(needle),
	);
}

/** Distinct group names present in the catalog, sorted alphabetically. */
export function collectConfigGroups(records: readonly EngineConfigSettingRecord[]): string[] {
	return [...new Set(records.map(record => record.group))].sort((a, b) => a.localeCompare(b));
}

/** Apply the query, group facet, and changed-only toggle to the catalog records. */
export function filterConfigRecords(
	records: readonly EngineConfigSettingRecord[],
	valuesByPath: ReadonlyMap<string, EngineConfigValueRecord>,
	filter: AdvancedConfigFilter,
): EngineConfigSettingRecord[] {
	return records.filter(record => {
		if (filter.group !== null && record.group !== filter.group) return false;
		if (filter.changedOnly && !valuesByPath.get(record.path)?.changed) return false;
		return matchesConfigQuery(record, filter.query);
	});
}

/** Bucket records by their `group` field; groups and rows are each sorted stably. */
export function groupConfigRecords(records: readonly EngineConfigSettingRecord[]): AdvancedConfigGroup[] {
	const byGroup = new Map<string, EngineConfigSettingRecord[]>();
	for (const record of records) {
		const bucket = byGroup.get(record.group);
		if (bucket) bucket.push(record);
		else byGroup.set(record.group, [record]);
	}
	return [...byGroup.entries()]
		.map(([group, groupRecords]) => ({
			group,
			records: groupRecords.sort((a, b) => a.path.localeCompare(b.path)),
		}))
		.sort((a, b) => a.group.localeCompare(b.group));
}

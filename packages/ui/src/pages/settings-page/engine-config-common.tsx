import type {
	EngineConfigCatalog,
	EngineConfigSettingRecord,
	EngineConfigSnapshot,
	EngineConfigValueRecord,
} from "@fraym-ai/driver";
import { Skeleton, SkeletonGroup } from "../../elements/skeleton";
import { SettingControlRenderer } from "../../settings/setting-control-renderer";
import { SettingsGroup, SettingsRow } from "./settings-controls";

export function configValuesByPath(
	snapshot: EngineConfigSnapshot | null | undefined,
): Map<string, EngineConfigValueRecord> {
	return new Map((snapshot?.values ?? []).map(value => [value.path, value]));
}

export function configRecordsByPath(
	catalog: EngineConfigCatalog | null | undefined,
): Map<string, EngineConfigSettingRecord> {
	return new Map((catalog?.records ?? []).map(record => [record.path, record]));
}

function configRecordDescription(
	record: EngineConfigSettingRecord,
	value: EngineConfigValueRecord | undefined,
): string {
	const parts = [record.description, record.source, value?.changed ? value.scope : "default"].filter(Boolean);
	return parts.join(" | ");
}

export function ConfigSettingRow({
	record,
	value,
	loading,
	onChange,
	onReset,
}: {
	readonly record: EngineConfigSettingRecord;
	readonly value?: EngineConfigValueRecord;
	readonly loading?: boolean;
	readonly onChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}) {
	const stack = record.type === "array" || record.type === "record";
	return (
		<SettingsRow name={record.label} desc={configRecordDescription(record, value)} stack={stack}>
			<SettingControlRenderer
				record={record}
				value={value}
				disabled={loading || record.sensitive}
				onCommit={onChange}
				onReset={onReset}
			/>
		</SettingsRow>
	);
}

export function ModelConfigGroup({
	heading,
	description,
	paths,
	recordsByPath,
	valuesByPath,
	loading,
	onChange,
	onReset,
}: {
	readonly heading: string;
	readonly description?: string;
	readonly paths: readonly string[];
	readonly recordsByPath: ReadonlyMap<string, EngineConfigSettingRecord>;
	readonly valuesByPath: ReadonlyMap<string, EngineConfigValueRecord>;
	readonly loading?: boolean;
	readonly onChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}) {
	const records = paths
		.map(path => recordsByPath.get(path))
		.filter((record): record is EngineConfigSettingRecord => Boolean(record));
	if (records.length === 0) return null;
	return (
		<SettingsGroup heading={heading}>
			{description && <div className="mb-3 text-xs text-fr-text-3">{description}</div>}
			{records.map(record => (
				<ConfigSettingRow
					key={record.path}
					record={record}
					value={valuesByPath.get(record.path)}
					loading={loading}
					onChange={onChange}
					onReset={onReset}
				/>
			))}
		</SettingsGroup>
	);
}

export function EngineConfigSkeleton() {
	return (
		<SkeletonGroup label="Loading settings…" className="flex flex-col gap-3.5 py-2">
			{[0, 1, 2, 3, 4].map(i => (
				<div key={i} className="flex items-center justify-between gap-4">
					<div className="min-w-0 flex-1">
						<Skeleton h={12} rounded="sm" w={`${32 + ((i * 9) % 22)}%`} className="mb-1.5" />
						<Skeleton h={9} rounded="sm" w={`${52 + ((i * 11) % 28)}%`} />
					</div>
					<Skeleton h={26} w={i % 2 ? 44 : 120} rounded="md" className="shrink-0" />
				</div>
			))}
		</SkeletonGroup>
	);
}

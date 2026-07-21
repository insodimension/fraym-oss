import type {
	EngineConfigCatalog,
	EngineConfigSettingRecord,
	EngineConfigSnapshot,
	EngineConfigValueRecord,
} from "@fraym-ai/driver";
import { useMemo } from "react";
import { Button } from "../../elements/button";
import {
	type EngineConfigPaneSectionDefinition,
	type EngineCuratedConfigPaneId,
	engineConfigPaneDefinition,
} from "../../settings/engine-settings-panes";
import type { EngineConfigState } from "../../shell/engine-state";
import {
	ConfigSettingRow,
	configRecordsByPath,
	configValuesByPath,
	EngineConfigSkeleton,
} from "./engine-config-common";
import { SettingsGroup, SettingsRow, SettingsSub, SettingsTitle } from "./settings-controls";

function effectiveConfigValue(
	record: EngineConfigSettingRecord | undefined,
	value: EngineConfigValueRecord | undefined,
): unknown {
	return value?.value ?? record?.defaultValue;
}

function valuesEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== typeof b) return false;
	if (!a || !b || typeof a !== "object") return false;
	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return false;
	}
}

function sectionVisible(
	section: EngineConfigPaneSectionDefinition,
	recordsByPath: ReadonlyMap<string, EngineConfigSettingRecord>,
	valuesByPath: ReadonlyMap<string, EngineConfigValueRecord>,
): boolean {
	if (!section.visibleWhen) return true;
	const record = recordsByPath.get(section.visibleWhen.path);
	const current = effectiveConfigValue(record, valuesByPath.get(section.visibleWhen.path));
	return valuesEqual(current, section.visibleWhen.equals);
}

function sectionRecords(
	section: EngineConfigPaneSectionDefinition,
	recordsByPath: ReadonlyMap<string, EngineConfigSettingRecord>,
): EngineConfigSettingRecord[] {
	return section.paths.flatMap(path => {
		const record = recordsByPath.get(path);
		return record ? [record] : [];
	});
}

export interface EngineConfigPaneProps {
	readonly pane: EngineCuratedConfigPaneId;
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configSnapshot?: EngineConfigSnapshot | null;
	readonly configLoading?: boolean;
	readonly configError?: string | null;
	readonly onConfigRefresh?: () => void;
	readonly onConfigValueChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onConfigValueReset?: (path: string) => void | Promise<void>;
}

interface ConfigSectionProps {
	readonly section: EngineConfigPaneSectionDefinition;
	readonly records: readonly EngineConfigSettingRecord[];
	readonly valuesByPath: ReadonlyMap<string, EngineConfigValueRecord>;
	readonly loading?: boolean;
	readonly onChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}

function ConfigSection({ section, records, valuesByPath, loading, onChange, onReset }: ConfigSectionProps) {
	if (records.length === 0) return null;
	const rows = records.map(record => (
		<ConfigSettingRow
			key={record.path}
			record={record}
			value={valuesByPath.get(record.path)}
			loading={loading}
			onChange={onChange}
			onReset={onReset}
		/>
	));

	if (section.collapsible) {
		return (
			<details className="mb-[30px]" open={section.defaultOpen}>
				<summary className="mb-3 cursor-pointer fr-eyebrow">{section.heading}</summary>
				{section.description && <p className="-mt-1 mb-3 text-xs text-fr-text-3">{section.description}</p>}
				{rows}
			</details>
		);
	}

	return (
		<SettingsGroup heading={section.heading}>
			{section.description && <div className="mb-3 text-xs text-fr-text-3">{section.description}</div>}
			{rows}
		</SettingsGroup>
	);
}

interface VisibleConfigSection {
	readonly section: EngineConfigPaneSectionDefinition;
	readonly records: readonly EngineConfigSettingRecord[];
}

function useVisibleConfigSections(
	definition: ReturnType<typeof engineConfigPaneDefinition>,
	recordsByPath: ReadonlyMap<string, EngineConfigSettingRecord>,
	valuesByPath: ReadonlyMap<string, EngineConfigValueRecord>,
): readonly VisibleConfigSection[] {
	return useMemo(
		() =>
			definition.sections
				.filter(section => sectionVisible(section, recordsByPath, valuesByPath))
				.map(section => ({ section, records: sectionRecords(section, recordsByPath) }))
				.filter(item => item.records.length > 0),
		[definition, recordsByPath, valuesByPath],
	);
}

export function EngineConfigPane({
	pane,
	configCatalog,
	configSnapshot,
	configLoading = false,
	configError,
	onConfigRefresh,
	onConfigValueChange,
	onConfigValueReset,
}: EngineConfigPaneProps) {
	const definition = engineConfigPaneDefinition(pane);
	const recordsByPath = useMemo(() => configRecordsByPath(configCatalog), [configCatalog]);
	const valuesByPath = useMemo(() => configValuesByPath(configSnapshot), [configSnapshot]);
	const sections = useVisibleConfigSections(definition, recordsByPath, valuesByPath);
	const visibleRecordCount = sections.reduce((sum, section) => sum + section.records.length, 0);

	return (
		<div>
			<EngineConfigPaneHeader definition={definition} loading={configLoading} onRefresh={onConfigRefresh} />
			{configError && <SettingsRow name="Settings unavailable" desc={configError} />}
			{!configCatalog && !configError && configLoading && <EngineConfigSkeleton />}
			{!configCatalog && !configError && !configLoading && (
				<SettingsRow name="Settings unavailable" desc="Connect the engine config driver to edit engine settings." />
			)}
			{configCatalog && (
				<EngineConfigStatus visibleRecordCount={visibleRecordCount} configSnapshot={configSnapshot} />
			)}
			<EngineConfigSections
				sections={sections}
				valuesByPath={valuesByPath}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
		</div>
	);
}

export interface StackedEngineConfigPaneProps {
	readonly pane: EngineCuratedConfigPaneId;
	readonly engineConfig: EngineConfigState;
}

/** Stacks an engine config pane (appearance / mcp) onto a host surface; null until the config catalog loads. */
export function StackedEngineConfigPane({ pane, engineConfig }: StackedEngineConfigPaneProps) {
	if (!engineConfig.catalog) return null;
	return (
		<EngineConfigPane
			pane={pane}
			configCatalog={engineConfig.catalog}
			configSnapshot={engineConfig.snapshot}
			configLoading={engineConfig.loading}
			configError={engineConfig.error}
			onConfigRefresh={engineConfig.refresh}
			onConfigValueChange={engineConfig.setConfigValue}
			onConfigValueReset={engineConfig.resetConfigValue}
		/>
	);
}

function EngineConfigPaneHeader({
	definition,
	loading,
	onRefresh,
}: {
	readonly definition: ReturnType<typeof engineConfigPaneDefinition>;
	readonly loading: boolean;
	readonly onRefresh?: () => void;
}) {
	return (
		<div className="mb-5 flex items-start gap-3">
			<div className="min-w-0 flex-1">
				<SettingsTitle>{definition.title}</SettingsTitle>
				<SettingsSub>{definition.sub}</SettingsSub>
			</div>
			{onRefresh && (
				<Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
					{loading ? "Refreshing" : "Refresh"}
				</Button>
			)}
		</div>
	);
}

function EngineConfigStatus({
	visibleRecordCount,
	configSnapshot,
}: {
	readonly visibleRecordCount: number;
	readonly configSnapshot?: EngineConfigSnapshot | null;
}) {
	const changedCount = configSnapshot?.values.filter(value => value.changed).length ?? 0;
	return (
		<SettingsGroup heading="Status">
			<SettingsRow name="Visible settings" desc={`${visibleRecordCount} settings in this pane`} />
			<SettingsRow name="Changed values" desc={`${changedCount} active overrides`} />
		</SettingsGroup>
	);
}

function EngineConfigSections({
	sections,
	valuesByPath,
	loading,
	onChange,
	onReset,
}: {
	readonly sections: readonly VisibleConfigSection[];
	readonly valuesByPath: ReadonlyMap<string, EngineConfigValueRecord>;
	readonly loading: boolean;
	readonly onChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}) {
	return (
		<>
			{sections.map(({ section, records }) => (
				<ConfigSection
					key={section.id}
					section={section}
					records={records}
					valuesByPath={valuesByPath}
					loading={loading}
					onChange={onChange}
					onReset={onReset}
				/>
			))}
		</>
	);
}

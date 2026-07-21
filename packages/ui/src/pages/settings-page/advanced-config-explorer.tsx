import type { EngineConfigCatalog, EngineConfigSnapshot } from "@fraym-ai/driver";
import { useMemo, useState } from "react";
import { Collapsible } from "../../components/collapsible";
import { Button } from "../../elements/button";
import { Input } from "../../elements/input";
import { Toggle } from "../../elements/toggle";
import { Icon } from "../../icons";
import {
	type AdvancedConfigFilter,
	collectConfigGroups,
	filterConfigRecords,
	groupConfigRecords,
	isAdvancedConfigFilterActive,
} from "../../settings/advanced-config-model";
import { ConfigSettingRow, configValuesByPath } from "./engine-config-common";
import { SettingsRow, SettingsSub, SettingsTitle } from "./settings-controls";

const ADVANCED_GROUP_SELECT_CLASS =
	"shrink-0 rounded-lg border border-fr-border bg-fr-surface px-[11px] py-2 font-secondary text-fr-sm text-fr-text outline-none focus-visible:border-fr-accent-line";

export interface AdvancedConfigExplorerProps {
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configSnapshot?: EngineConfigSnapshot | null;
	readonly configLoading?: boolean;
	readonly configError?: string | null;
	readonly onConfigRefresh?: () => void;
	readonly onConfigValueChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onConfigValueReset?: (path: string) => void | Promise<void>;
	readonly onBack?: () => void;
}

/**
 * Power-user view over the *entire* engine config catalog — search, group filter,
 * changed-only toggle, and collapsible per-group sections — covering settings the
 * curated panes don't surface. Engine-agnostic: reads only the `@fraym-ai/driver`
 * catalog, so a third-party engine browses identically.
 */
function useAdvancedConfigExplorerState(
	configCatalog?: EngineConfigCatalog | null,
	configSnapshot?: EngineConfigSnapshot | null,
) {
	const [query, setQuery] = useState("");
	const [group, setGroup] = useState<string | null>(null);
	const [changedOnly, setChangedOnly] = useState(false);
	const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
	const toggleGroup = (name: string) =>
		setOpenGroups(previous => {
			const next = new Set(previous);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	const records = useMemo(() => configCatalog?.records ?? [], [configCatalog]);
	const valuesByPath = useMemo(() => configValuesByPath(configSnapshot), [configSnapshot]);
	const groups = useMemo(() => collectConfigGroups(records), [records]);
	const effectiveGroup = group !== null && groups.includes(group) ? group : null;
	const filter = useMemo<AdvancedConfigFilter>(
		() => ({ query, group: effectiveGroup, changedOnly }),
		[query, effectiveGroup, changedOnly],
	);
	const grouped = useMemo(
		() => groupConfigRecords(filterConfigRecords(records, valuesByPath, filter)),
		[records, valuesByPath, filter],
	);
	const filtersActive = isAdvancedConfigFilterActive(filter);

	return {
		query,
		setQuery,
		effectiveGroup,
		setGroup,
		changedOnly,
		setChangedOnly,
		records,
		valuesByPath,
		groups,
		grouped,
		isGroupOpen: (name: string) => filtersActive || openGroups.has(name),
		toggleGroup,
		visibleCount: grouped.reduce((sum, item) => sum + item.records.length, 0),
		changedCount: configSnapshot?.values.filter(value => value.changed).length ?? 0,
	};
}

export function AdvancedConfigExplorer({
	configCatalog,
	configSnapshot,
	configLoading = false,
	configError,
	onConfigRefresh,
	onConfigValueChange,
	onConfigValueReset,
	onBack,
}: AdvancedConfigExplorerProps) {
	const state = useAdvancedConfigExplorerState(configCatalog, configSnapshot);
	// Ignore a selected group the catalog no longer exposes (e.g. after a refresh)
	// without a reset effect — derive the effective selection from current groups.

	return (
		<div>
			{onBack && <AdvancedConfigBackButton onBack={onBack} />}
			<AdvancedConfigHeader loading={configLoading} onRefresh={onConfigRefresh} />

			{configError && <SettingsRow name="Settings unavailable" desc={configError} />}
			{!configCatalog && !configError && (
				<SettingsRow name="Settings unavailable" desc="Connect the engine config driver to edit engine settings." />
			)}

			{configCatalog && (
				<AdvancedConfigResults
					state={state}
					loading={configLoading}
					onChange={onConfigValueChange}
					onReset={onConfigValueReset}
				/>
			)}
		</div>
	);
}

type AdvancedConfigExplorerState = ReturnType<typeof useAdvancedConfigExplorerState>;

function AdvancedConfigBackButton({ onBack }: { readonly onBack: () => void }) {
	return (
		<button
			type="button"
			onClick={onBack}
			data-slot="all-settings-back"
			className="mb-5 flex items-center gap-2 text-fr-sm text-fr-text-2 transition-colors hover:text-fr-text"
		>
			<Icon name="back" size={16} strokeWidth={2} />
			Back to settings
		</button>
	);
}

function AdvancedConfigHeader({ loading, onRefresh }: { readonly loading: boolean; readonly onRefresh?: () => void }) {
	return (
		<div className="mb-5 flex items-start gap-3">
			<div className="min-w-0 flex-1">
				<SettingsTitle>All settings</SettingsTitle>
				<SettingsSub>
					Search and edit every engine setting, including the ones the curated panes don't surface.
				</SettingsSub>
			</div>
			{onRefresh && (
				<Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
					{loading ? "Refreshing" : "Refresh"}
				</Button>
			)}
		</div>
	);
}

function AdvancedConfigResults({
	state,
	loading,
	onChange,
	onReset,
}: {
	readonly state: AdvancedConfigExplorerState;
	readonly loading: boolean;
	readonly onChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}) {
	return (
		<>
			<AdvancedConfigFilters state={state} />
			<AdvancedConfigStats state={state} />
			<AdvancedConfigGroups state={state} loading={loading} onChange={onChange} onReset={onReset} />
		</>
	);
}

function AdvancedConfigFilters({ state }: { readonly state: AdvancedConfigExplorerState }) {
	return (
		<div className="mb-4 flex flex-wrap items-center gap-3" data-slot="advanced-config-filters">
			<Input
				value={state.query}
				onChange={event => state.setQuery(event.target.value)}
				placeholder="Search settings..."
				className="w-[260px]"
			/>
			<select
				data-slot="advanced-config-group"
				className={ADVANCED_GROUP_SELECT_CLASS}
				value={state.effectiveGroup ?? ""}
				onChange={event => state.setGroup(event.target.value || null)}
			>
				<option value="">All groups</option>
				{state.groups.map(name => (
					<option key={name} value={name}>
						{name}
					</option>
				))}
			</select>
			<span className="flex items-center gap-2 text-fr-sm text-fr-text-2">
				Changed only
				<Toggle
					checked={state.changedOnly}
					onCheckedChange={state.setChangedOnly}
					aria-label="Changed only"
					data-setting-filter="changed-only"
				/>
			</span>
		</div>
	);
}

function AdvancedConfigStats({ state }: { readonly state: AdvancedConfigExplorerState }) {
	return (
		<div className="mb-[26px] flex flex-wrap gap-x-6 gap-y-1 text-xs text-fr-text-3">
			<span>{state.records.length} total</span>
			<span>{state.visibleCount} shown</span>
			<span>{state.changedCount} active overrides</span>
		</div>
	);
}

function AdvancedConfigGroups({
	state,
	loading,
	onChange,
	onReset,
}: {
	readonly state: AdvancedConfigExplorerState;
	readonly loading: boolean;
	readonly onChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onReset?: (path: string) => void | Promise<void>;
}) {
	if (state.grouped.length === 0) {
		return <SettingsRow name="No matching settings" desc="Adjust the search or filters above." />;
	}
	return (
		<>
			{state.grouped.map(item => (
				<Collapsible
					key={item.group}
					title={item.group}
					count={item.records.length}
					open={state.isGroupOpen(item.group)}
					onToggle={() => state.toggleGroup(item.group)}
					className="border-b border-fr-border-soft"
				>
					<div className="pb-2">
						{item.records.map(record => (
							<ConfigSettingRow
								key={record.path}
								record={record}
								value={state.valuesByPath.get(record.path)}
								loading={loading}
								onChange={onChange}
								onReset={onReset}
							/>
						))}
					</div>
				</Collapsible>
			))}
		</>
	);
}

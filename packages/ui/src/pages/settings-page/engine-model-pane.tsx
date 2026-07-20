import type {
	EngineConfigCatalog,
	EngineConfigSnapshot,
	EngineConfigValueRecord,
	EngineModelInsightsResult,
	EngineResourceSettingsSnapshot,
	EngineResourceSnapshot,
} from "@fraym/driver";
import { useEffect, useMemo, useState } from "react";
import { ModelCatalog } from "../../components/model-catalog";
import type { ModelProfiles } from "../../components/model-intelligence";
import { Button } from "../../elements/button";
import { Textarea } from "../../elements/textarea";
import { Toggle } from "../../elements/toggle";
import { MODEL_REASONING_PATHS, MODEL_RETRY_PATHS, MODEL_SAMPLING_PATHS } from "../../settings/engine-settings-panes";
import { configRecordsByPath, configValuesByPath, ModelConfigGroup } from "./engine-config-common";
import { Segmented, SettingsGroup, SettingsRow, SettingsSub, SettingsTitle } from "./settings-controls";

const THINKING_LEVEL_OPTIONS = ["minimal", "low", "medium", "high", "xhigh"] as const satisfies readonly NonNullable<
	EngineResourceSettingsSnapshot["defaultThinkingLevel"]
>[];

const MODEL_ROLE_ORDER = ["default", "smol", "slow", "vision", "plan", "designer", "commit", "task"] as const;

function roleName(path: string): string {
	return path.startsWith("modelRoles.") ? path.slice("modelRoles.".length) : path;
}

function roleSort(a: { readonly path: string }, b: { readonly path: string }): number {
	const aIndex = MODEL_ROLE_ORDER.indexOf(roleName(a.path) as (typeof MODEL_ROLE_ORDER)[number]);
	const bIndex = MODEL_ROLE_ORDER.indexOf(roleName(b.path) as (typeof MODEL_ROLE_ORDER)[number]);
	if (aIndex !== -1 || bIndex !== -1) {
		return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
	}
	return a.path.localeCompare(b.path);
}

export interface EngineModelPaneProps {
	readonly snapshot?: EngineResourceSnapshot | null;
	/** Benchmark/usage feed for the team builder's insight affordances. */
	readonly insights?: EngineModelInsightsResult | null;
	readonly loading?: boolean;
	readonly error?: string | null;
	readonly onRefresh?: () => void;
	readonly onDefaultModelChange?: (selection: { readonly provider: string; readonly modelId: string }) => void;
	readonly onDefaultThinkingLevelChange?: (
		level: NonNullable<EngineResourceSettingsSnapshot["defaultThinkingLevel"]>,
	) => void;
	readonly onEnableSkillCommandsChange?: (enabled: boolean) => void;
	readonly onModelPatternsChange?: (patterns: readonly string[]) => void;
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configSnapshot?: EngineConfigSnapshot | null;
	readonly configLoading?: boolean;
	readonly configError?: string | null;
	readonly onConfigRefresh?: () => void;
	readonly onConfigValueChange?: (path: string, value: unknown) => void;
	readonly onConfigValueReset?: (path: string) => void;
	readonly onOpenModels?: () => void;
}

export function EngineModelPane({
	snapshot,
	insights,
	loading = false,
	error,
	onRefresh,
	onDefaultModelChange,
	onDefaultThinkingLevelChange,
	onEnableSkillCommandsChange,
	onModelPatternsChange,
	configCatalog,
	configSnapshot,
	configLoading = false,
	configError,
	onConfigRefresh,
	onConfigValueChange,
	onConfigValueReset,
	onOpenModels,
}: EngineModelPaneProps) {
	const snapshotPatterns = snapshot?.settings.enabledModelPatterns.join("\n") ?? "";
	const [patternsText, setPatternsText] = useState(snapshotPatterns);
	const currentThinking = snapshot?.settings.defaultThinkingLevel ?? "high";
	const configValues = useMemo(() => configValuesByPath(configSnapshot), [configSnapshot]);
	const recordsByPath = useMemo(() => configRecordsByPath(configCatalog), [configCatalog]);

	useEffect(() => {
		setPatternsText(snapshotPatterns);
	}, [snapshotPatterns]);

	return (
		<div>
			<EngineModelHeader loading={loading} onRefresh={onRefresh} />
			{error && (
				<div className="mb-4 rounded-lg border border-fr-del bg-fr-del-bg px-3 py-2 text-fr-sm text-fr-del">
					{error}
				</div>
			)}
			<EngineModelDefaultsGroup
				snapshot={snapshot}
				loading={loading}
				currentThinking={currentThinking}
				patternsText={patternsText}
				onPatternsTextChange={setPatternsText}
				onDefaultModelChange={onDefaultModelChange}
				onDefaultThinkingLevelChange={onDefaultThinkingLevelChange}
				onEnableSkillCommandsChange={onEnableSkillCommandsChange}
				onModelPatternsChange={onModelPatternsChange}
			/>
			<EngineModelConfigSections
				snapshot={snapshot}
				insights={insights}
				configCatalog={configCatalog}
				configValues={configValues}
				recordsByPath={recordsByPath}
				configLoading={configLoading}
				configError={configError}
				onConfigRefresh={onConfigRefresh}
				onConfigValueChange={onConfigValueChange}
				onConfigValueReset={onConfigValueReset}
				onOpenModels={onOpenModels}
			/>
		</div>
	);
}

function EngineModelHeader({ loading, onRefresh }: { readonly loading: boolean; readonly onRefresh?: () => void }) {
	return (
		<div className="mb-5 flex items-start gap-3">
			<div className="min-w-0 flex-1">
				<SettingsTitle>Model</SettingsTitle>
				<SettingsSub>Defaults reported by the connected engine.</SettingsSub>
			</div>
			<button
				type="button"
				className="rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm text-fr-text-2 hover:text-fr-text"
				disabled={loading}
				onClick={onRefresh}
			>
				{loading ? "Refreshing" : "Refresh"}
			</button>
		</div>
	);
}

function EngineModelDefaultsGroup({
	snapshot,
	loading,
	currentThinking,
	patternsText,
	onPatternsTextChange,
	onDefaultModelChange,
	onDefaultThinkingLevelChange,
	onEnableSkillCommandsChange,
	onModelPatternsChange,
}: {
	readonly snapshot?: EngineResourceSnapshot | null;
	readonly loading: boolean;
	readonly currentThinking: NonNullable<EngineResourceSettingsSnapshot["defaultThinkingLevel"]>;
	readonly patternsText: string;
	readonly onPatternsTextChange: (value: string) => void;
	readonly onDefaultModelChange?: (selection: { readonly provider: string; readonly modelId: string }) => void;
	readonly onDefaultThinkingLevelChange?: (
		level: NonNullable<EngineResourceSettingsSnapshot["defaultThinkingLevel"]>,
	) => void;
	readonly onEnableSkillCommandsChange?: (enabled: boolean) => void;
	readonly onModelPatternsChange?: (patterns: readonly string[]) => void;
}) {
	return (
		<SettingsGroup>
			<DefaultModelRow snapshot={snapshot} loading={loading} onDefaultModelChange={onDefaultModelChange} />
			<ThinkingLevelRow currentThinking={currentThinking} onChange={onDefaultThinkingLevelChange} />
			<SkillCommandsRow snapshot={snapshot} onChange={onEnableSkillCommandsChange} />
			<ModelPatternsRow
				patternsText={patternsText}
				onPatternsTextChange={onPatternsTextChange}
				onModelPatternsChange={onModelPatternsChange}
			/>
		</SettingsGroup>
	);
}

function DefaultModelRow({
	snapshot,
	loading,
	onDefaultModelChange,
}: {
	readonly snapshot?: EngineResourceSnapshot | null;
	readonly loading: boolean;
	readonly onDefaultModelChange?: (selection: { readonly provider: string; readonly modelId: string }) => void;
}) {
	return (
		<SettingsRow name="Default model" desc="Used by new engine sessions unless a session overrides it" stack>
			<ModelCatalog
				models={snapshot?.models ?? []}
				providers={snapshot?.providers}
				selected={{
					provider: snapshot?.settings.defaultProvider,
					modelId: snapshot?.settings.defaultModelId,
				}}
				disabled={loading}
				loading={loading}
				onSelect={onDefaultModelChange ?? (() => {})}
			/>
		</SettingsRow>
	);
}

function ThinkingLevelRow({
	currentThinking,
	onChange,
}: {
	readonly currentThinking: NonNullable<EngineResourceSettingsSnapshot["defaultThinkingLevel"]>;
	readonly onChange?: (level: NonNullable<EngineResourceSettingsSnapshot["defaultThinkingLevel"]>) => void;
}) {
	return (
		<SettingsRow name="Thinking level" desc="Persisted default reasoning depth">
			<Segmented
				options={THINKING_LEVEL_OPTIONS}
				value={currentThinking === "off" ? "high" : currentThinking}
				onChange={level => onChange?.(level)}
			/>
		</SettingsRow>
	);
}

function SkillCommandsRow({
	snapshot,
	onChange,
}: {
	readonly snapshot?: EngineResourceSnapshot | null;
	readonly onChange?: (enabled: boolean) => void;
}) {
	const enabled = snapshot?.settings.enableSkillCommands ?? true;
	return (
		<SettingsRow name="Skill commands" desc="Register skills as slash commands">
			<Toggle checked={enabled} onCheckedChange={onChange} />
		</SettingsRow>
	);
}

function parseModelPatterns(text: string): readonly string[] {
	return text.split(/\r?\n/).flatMap(line => {
		const pattern = line.trim();
		return pattern ? [pattern] : [];
	});
}

function ModelPatternsRow({
	patternsText,
	onPatternsTextChange,
	onModelPatternsChange,
}: {
	readonly patternsText: string;
	readonly onPatternsTextChange: (value: string) => void;
	readonly onModelPatternsChange?: (patterns: readonly string[]) => void;
}) {
	return (
		<SettingsRow name="Enabled model patterns" desc="One provider/model or glob pattern per line" stack>
			<Textarea
				className="min-h-24"
				value={patternsText}
				onChange={event => onPatternsTextChange(event.target.value)}
			/>
			<button
				type="button"
				className="rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm text-fr-text-2 hover:text-fr-text"
				onClick={() => onModelPatternsChange?.(parseModelPatterns(patternsText))}
			>
				Save patterns
			</button>
		</SettingsRow>
	);
}

function EngineModelConfigSections({
	snapshot,
	insights,
	configCatalog,
	configValues,
	recordsByPath,
	configLoading,
	configError,
	onConfigRefresh,
	onConfigValueChange,
	onConfigValueReset,
	onOpenModels,
}: {
	readonly snapshot?: EngineResourceSnapshot | null;
	readonly insights?: EngineModelInsightsResult | null;
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configValues: ReadonlyMap<string, EngineConfigValueRecord>;
	readonly recordsByPath: ReturnType<typeof configRecordsByPath>;
	readonly configLoading: boolean;
	readonly configError?: string | null;
	readonly onConfigRefresh?: () => void;
	readonly onConfigValueChange?: (path: string, value: unknown) => void;
	readonly onConfigValueReset?: (path: string) => void;
	readonly onOpenModels?: () => void;
}) {
	return (
		<>
			<ModelRoutingConfigGroups
				configValues={configValues}
				recordsByPath={recordsByPath}
				configLoading={configLoading}
				onConfigValueChange={onConfigValueChange}
				onConfigValueReset={onConfigValueReset}
			/>
			<EngineModelRolesSection
				snapshot={snapshot}
				insights={insights}
				configCatalog={configCatalog}
				configValues={configValues}
				configLoading={configLoading}
				configError={configError}
				onConfigRefresh={onConfigRefresh}
				onConfigValueChange={onConfigValueChange}
				onConfigValueReset={onConfigValueReset}
				onOpenModels={onOpenModels}
			/>
		</>
	);
}

function ModelRoutingConfigGroups({
	configValues,
	recordsByPath,
	configLoading,
	onConfigValueChange,
	onConfigValueReset,
}: {
	readonly configValues: ReadonlyMap<string, EngineConfigValueRecord>;
	readonly recordsByPath: ReturnType<typeof configRecordsByPath>;
	readonly configLoading: boolean;
	readonly onConfigValueChange?: (path: string, value: unknown) => void;
	readonly onConfigValueReset?: (path: string) => void;
}) {
	return (
		<>
			<ModelConfigGroup
				heading="Reasoning"
				paths={MODEL_REASONING_PATHS}
				recordsByPath={recordsByPath}
				valuesByPath={configValues}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
			<ModelConfigGroup
				heading="Sampling"
				description="Generation controls. Leave at defaults unless the target model honors them."
				paths={MODEL_SAMPLING_PATHS}
				recordsByPath={recordsByPath}
				valuesByPath={configValues}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
			<ModelConfigGroup
				heading="Retry & fallback"
				paths={MODEL_RETRY_PATHS}
				recordsByPath={recordsByPath}
				valuesByPath={configValues}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
		</>
	);
}

function EngineModelRolesSection({
	snapshot,
	insights,
	configCatalog,
	configValues,
	configLoading,
	configError,
	onConfigRefresh,
	onConfigValueChange,
	onConfigValueReset,
	onOpenModels,
}: {
	readonly snapshot?: EngineResourceSnapshot | null;
	readonly insights?: EngineModelInsightsResult | null;
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configValues: ReadonlyMap<string, EngineConfigValueRecord>;
	readonly configLoading: boolean;
	readonly configError?: string | null;
	readonly onConfigRefresh?: () => void;
	readonly onConfigValueChange?: (path: string, value: unknown) => void;
	readonly onConfigValueReset?: (path: string) => void;
	readonly onOpenModels?: () => void;
}) {
	const profiles = (configValues.get("modelProfiles")?.value as ModelProfiles | undefined) ?? {};
	const roleRecords = useMemo(
		() =>
			(configCatalog?.records ?? [])
				.filter(record => record.path.startsWith("modelRoles.") && record.exposedInNativeUi)
				.sort(roleSort),
		[configCatalog],
	);
	const defaultRoles = useMemo(() => {
		const out: Record<string, string | undefined> = {};
		for (const record of roleRecords) {
			const value = configValues.get(record.path)?.value;
			out[roleName(record.path)] = typeof value === "string" && value.trim() ? value.trim() : undefined;
		}
		return out;
	}, [roleRecords, configValues]);
	const teamCount = Object.keys(profiles).length + (roleRecords.length > 0 ? 1 : 0);
	const defaultGlance =
		defaultRoles.default ??
		(snapshot?.settings.defaultModelId ? `${snapshot.settings.defaultModelId} (engine default)` : "engine default");

	return (
		<SettingsGroup heading="Model teams">
			{configError && <SettingsRow name="Role settings unavailable" desc={configError} />}
			{!configCatalog && !configError && (
				<RoleSettingsUnavailable loading={configLoading} onRefresh={onConfigRefresh} />
			)}
			<SettingsRow
				name="Model Intelligence"
				desc={`${teamCount} team${teamCount === 1 ? "" : "s"} · Default runs ${defaultGlance} · benchmarks, dossiers, and role assembly in one place`}
			>
				<Button type="button" size="sm" onClick={onOpenModels} disabled={!onOpenModels}>
					Open Models page
				</Button>
			</SettingsRow>
		</SettingsGroup>
	);
}

function RoleSettingsUnavailable({
	loading,
	onRefresh,
}: {
	readonly loading: boolean;
	readonly onRefresh?: () => void;
}) {
	return (
		<SettingsRow name="Role settings unavailable" desc="Connect the engine config driver to edit engine roles.">
			{onRefresh && (
				<Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
					{loading ? "Refreshing" : "Refresh"}
				</Button>
			)}
		</SettingsRow>
	);
}

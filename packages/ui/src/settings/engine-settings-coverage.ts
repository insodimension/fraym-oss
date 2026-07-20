import type { EngineConfigSettingRecord } from "@fraym/driver";

export type EngineSettingsPaneId =
	| "appearance"
	| "model"
	| "connections"
	| "interaction"
	| "context"
	| "memory"
	| "editing"
	| "tools"
	| "tasks"
	| "worktrees"
	| "mcp";

export interface EngineSettingsPaneRule {
	readonly paneId: EngineSettingsPaneId;
	readonly label: string;
	readonly paths: readonly string[];
	readonly patterns?: readonly string[];
}

export interface EngineSettingsCoverageEntry {
	readonly path: string;
	readonly label: string;
	readonly group: string;
}

export interface EngineSettingsCoverageResult {
	readonly totalRecords: number;
	readonly tuiFacingRecords: number;
	readonly assignedRecords: number;
	readonly unassignedRecords: readonly EngineSettingsCoverageEntry[];
	readonly byPane: Readonly<Record<EngineSettingsPaneId, number>>;
}

const ZERO_COUNTS: Readonly<Record<EngineSettingsPaneId, number>> = {
	appearance: 0,
	model: 0,
	connections: 0,
	interaction: 0,
	context: 0,
	memory: 0,
	editing: 0,
	tools: 0,
	tasks: 0,
	worktrees: 0,
	mcp: 0,
};

export const ENGINE_SETTINGS_PANE_RULES: readonly EngineSettingsPaneRule[] = [
	{
		paneId: "appearance",
		label: "Appearance",
		paths: ["appearance.theme", "appearance.density"],
	},
	{
		paneId: "model",
		label: "Model",
		paths: ["model.default", "model.reasoning"],
		patterns: ["modelRoles.*"],
	},
	{
		paneId: "connections",
		label: "Connections",
		paths: ["connections.search", "connections.images"],
	},
	{
		paneId: "interaction",
		label: "Interaction",
		paths: ["interaction.resume", "interaction.confirmation"],
	},
	{
		paneId: "context",
		label: "Context",
		paths: ["context.compaction", "context.limit"],
	},
	{
		paneId: "memory",
		label: "Memory",
		paths: ["memory.enabled", "memory.retention"],
	},
	{
		paneId: "editing",
		label: "Editing",
		paths: ["editing.mode", "editing.lineNumbers"],
	},
	{
		paneId: "tools",
		label: "Tools",
		paths: ["tools.enabled", "tools.timeout"],
	},
	{
		paneId: "tasks",
		label: "Tasks",
		paths: ["tasks.parallelism", "tasks.isolation"],
	},
	{
		paneId: "worktrees",
		label: "Workspaces",
		paths: ["workspaces.isolation"],
	},
	{
		paneId: "mcp",
		label: "Integrations",
		paths: ["integrations.discovery"],
	},
];

function patternMatches(pattern: string, path: string): boolean {
	if (!pattern.includes("*")) return pattern === path;
	const escaped = pattern
		.split("*")
		.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(`^${escaped}$`).test(path);
}

export function paneForEngineSetting(
	path: string,
	rules: readonly EngineSettingsPaneRule[] = ENGINE_SETTINGS_PANE_RULES,
): EngineSettingsPaneId | null {
	for (const rule of rules) {
		if (rule.paths.includes(path)) return rule.paneId;
		if (rule.patterns?.some(pattern => patternMatches(pattern, path))) return rule.paneId;
	}
	return null;
}

export function analyzeEngineSettingsCoverage(
	records: readonly EngineConfigSettingRecord[],
	rules: readonly EngineSettingsPaneRule[] = ENGINE_SETTINGS_PANE_RULES,
): EngineSettingsCoverageResult {
	const byPane: Record<EngineSettingsPaneId, number> = { ...ZERO_COUNTS };
	const unassignedRecords: EngineSettingsCoverageEntry[] = [];
	const tuiRecords = records.filter(record => record.exposedInNativeUi);

	for (const record of tuiRecords) {
		const pane = paneForEngineSetting(record.path, rules);
		if (pane) byPane[pane] += 1;
		else unassignedRecords.push({ path: record.path, label: record.label, group: record.group });
	}

	return {
		totalRecords: records.length,
		tuiFacingRecords: tuiRecords.length,
		assignedRecords: tuiRecords.length - unassignedRecords.length,
		unassignedRecords,
		byPane,
	};
}

/**
 * Shape shared by deterministic fixture coverage baselines.
 *
 * Production engines supply their own catalogs; this package only defines the
 * stable public pane taxonomy used to classify them.
 */
export interface EngineConfigCoverageBaseline {
	readonly totalRecords: number;
	readonly tuiFacingRecords: number;
	readonly byPane: Readonly<Record<EngineSettingsPaneId, number>>;
}

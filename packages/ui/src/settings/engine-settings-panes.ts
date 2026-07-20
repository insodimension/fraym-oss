import type { EngineSettingsPaneId } from "./engine-settings-coverage";

export type EngineCuratedConfigPaneId = Extract<
	EngineSettingsPaneId,
	"appearance" | "interaction" | "context" | "memory" | "editing" | "tools" | "tasks" | "worktrees" | "mcp"
>;

export interface EngineConfigPaneSectionDefinition {
	readonly id: string;
	readonly heading: string;
	readonly description?: string;
	readonly paths: readonly string[];
	readonly collapsible?: boolean;
	readonly defaultOpen?: boolean;
	readonly visibleWhen?: {
		readonly path: string;
		readonly equals: unknown;
	};
}

export interface EngineConfigPaneDefinition {
	readonly id: EngineCuratedConfigPaneId;
	readonly label: string;
	readonly title: string;
	readonly sub: string;
	readonly sections: readonly EngineConfigPaneSectionDefinition[];
}

export const ENGINE_CURATED_CONFIG_PANES: readonly EngineConfigPaneDefinition[] = [
	{
		id: "interaction",
		label: "Interaction",
		title: "Interaction",
		sub: "Control how sessions resume and request confirmation.",
		sections: [
			{
				id: "session-behavior",
				heading: "Session behavior",
				paths: ["interaction.resume", "interaction.confirmation"],
			},
		],
	},
	{
		id: "context",
		label: "Context",
		title: "Context",
		sub: "Manage context compaction and its limit.",
		sections: [
			{
				id: "compaction",
				heading: "Compaction",
				paths: ["context.compaction", "context.limit"],
			},
		],
	},
	{
		id: "memory",
		label: "Memory",
		title: "Memory",
		sub: "Choose whether memory is available and how long it is retained.",
		sections: [
			{
				id: "retention",
				heading: "Retention",
				paths: ["memory.enabled", "memory.retention"],
			},
		],
	},
	{
		id: "editing",
		label: "Editing",
		title: "Editing",
		sub: "Set editing behavior and read output preferences.",
		sections: [
			{
				id: "editing-preferences",
				heading: "Editing preferences",
				paths: ["editing.mode", "editing.lineNumbers"],
			},
		],
	},
	{
		id: "tools",
		label: "Tools",
		title: "Tools",
		sub: "Control tool availability and execution time.",
		sections: [
			{
				id: "tool-preferences",
				heading: "Tool preferences",
				paths: ["tools.enabled", "tools.timeout"],
			},
		],
	},
	{
		id: "tasks",
		label: "Tasks",
		title: "Tasks",
		sub: "Choose task parallelism and isolation behavior.",
		sections: [
			{
				id: "task-preferences",
				heading: "Task preferences",
				paths: ["tasks.parallelism", "tasks.isolation"],
			},
		],
	},
	{
		id: "worktrees",
		label: "Workspaces",
		title: "Workspaces",
		sub: "Keep task work isolated when needed.",
		sections: [
			{
				id: "workspace-isolation",
				heading: "Workspace isolation",
				paths: ["workspaces.isolation"],
			},
		],
	},
	{
		id: "appearance",
		label: "Appearance",
		title: "Appearance",
		sub: "Set the visual theme and density.",
		sections: [
			{
				id: "appearance-preferences",
				heading: "Appearance preferences",
				paths: ["appearance.theme", "appearance.density"],
			},
		],
	},
	{
		id: "mcp",
		label: "Integrations",
		title: "Integrations",
		sub: "Control discovery for connected capabilities.",
		sections: [
			{
				id: "integration-discovery",
				heading: "Integration discovery",
				paths: ["integrations.discovery"],
			},
		],
	},
];

export function engineConfigPaneDefinition(id: EngineCuratedConfigPaneId): EngineConfigPaneDefinition {
	const pane = ENGINE_CURATED_CONFIG_PANES.find(item => item.id === id);
	if (!pane) throw new Error(`Unknown engine config pane: ${id}`);
	return pane;
}

// ---------------------------------------------------------------------------
// Shared rendered-path registry.
//
// The curated panes above cover most settings, but the Model & Routing pane
// (resource-backed, in settings-page.tsx) and the Connections provider
// preferences are rendered by hand-rolled groups rather than curated sections.
// These lists are the single source of truth shared by those renderers and the
// Kitchen Sink section-level drift guard, so an exposed setting that is wired
// nowhere fails CI.
// ---------------------------------------------------------------------------

/** Model controls rendered in the Model pane. */
export const MODEL_REASONING_PATHS = ["model.reasoning"] as const;

/** Default model control rendered in the Model pane. */
export const MODEL_SAMPLING_PATHS = ["model.default"] as const;

/** No separate retry controls are represented in the synthetic public catalog. */
export const MODEL_RETRY_PATHS = [] as const;

/** No resource-backed config paths are represented in the synthetic catalog. */
export const MODEL_RESOURCE_PATHS = [] as const;

/** Connection preferences rendered in the Connections pane. */
export const CONNECTIONS_SEARCH_PATHS = ["connections.search"] as const;

/** Image connection preferences rendered in the Connections pane. */
export const CONNECTIONS_IMAGE_PATHS = ["connections.images"] as const;

/** No additional connection API preferences are represented in the synthetic catalog. */
export const CONNECTIONS_API_PATHS = [] as const;

/** All connection preferences rendered in the Connections pane. */
export const CONNECTIONS_PREFERENCE_PATHS = [
	...CONNECTIONS_SEARCH_PATHS,
	...CONNECTIONS_IMAGE_PATHS,
	...CONNECTIONS_API_PATHS,
] as const;

/** Dynamic model-role controls rendered by the Model teams surface. */
export const ENGINE_RENDERED_PATH_PATTERNS = ["modelRoles.*"] as const;

function renderedPatternMatches(pattern: string, path: string): boolean {
	if (!pattern.includes("*")) return pattern === path;
	const escaped = pattern
		.split("*")
		.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(`^${escaped}$`).test(path);
}

/**
 * Every fixed config-catalog path wired into a Fraym renderer: curated pane
 * sections plus the Model and Connections hand-rolled groups. Dynamic patterns
 * (`ENGINE_RENDERED_PATH_PATTERNS`) are intentionally excluded — use
 * `isEngineSettingRendered` for membership checks that honor them.
 */
export function enginePaneRenderedPaths(): Set<string> {
	const paths = new Set<string>();
	for (const pane of ENGINE_CURATED_CONFIG_PANES) {
		for (const section of pane.sections) {
			for (const path of section.paths) paths.add(path);
		}
	}
	for (const path of MODEL_REASONING_PATHS) paths.add(path);
	for (const path of MODEL_SAMPLING_PATHS) paths.add(path);
	for (const path of MODEL_RETRY_PATHS) paths.add(path);
	for (const path of MODEL_RESOURCE_PATHS) paths.add(path);
	for (const path of CONNECTIONS_PREFERENCE_PATHS) paths.add(path);
	return paths;
}

/** True when `path` is rendered by some Fraym surface (fixed path or dynamic pattern). */
export function isEngineSettingRendered(path: string): boolean {
	if (enginePaneRenderedPaths().has(path)) return true;
	return ENGINE_RENDERED_PATH_PATTERNS.some(pattern => renderedPatternMatches(pattern, path));
}

// Showcase fixtures for the kitchen-sink. View-model data + a couple of inline
// surface bodies used by the tool-timeline fixtures.

import type {
	ComposerControl,
	ContextRow,
	EngineModelPaneProps,
	HostUiRequest,
	McpServer,
	ModelCategory,
	ModelDef,
	PaletteCategory,
	PermissionDef,
	PlanLimit,
	StatusSegment,
	SubagentBatch,
	Tone,
	ToolTimelineItem,
} from "@fraym/ui";
import { DataInspectorBody, WorkPlanBody } from "@fraym/ui";
import type { SettingsPreviewSection } from "@fraym/ui/agent-surfaces";
import type { AvatarId, AvatarMode, AvatarState } from "@fraym/vibr";

export {
	ANALYTICS_EMPTY,
	ANALYTICS_HIGH_VOLUME,
	ANALYTICS_READY,
	ANALYTICS_STALE,
} from "./analytics-snapshot";
export { ASK_PICKER_DEPLOY_TARGETS, ASK_PICKER_SUPERPOWERS } from "./ask-picker";
export {
	AST_EDIT_BROAD,
	AST_EDIT_MULTI,
	AST_EDIT_SINGLE,
	AST_GREP_BROAD,
	AST_GREP_CAPTURES,
	AST_GREP_NODE,
} from "./ast-operations";
export type { CityItem } from "./cities";
export { CITY_CATEGORIES } from "./cities";
export {
	AGENT_MESSAGE,
	COCKPIT_ATTACHMENTS,
	COCKPIT_QUEUE,
	FOLLOWUP_MESSAGE,
	USER_MESSAGE,
} from "./composer-data";
export { DEMO_CONTEXT_BREAKDOWN } from "./context-breakdown";
export { DIAGRAM_EDGES } from "./diagram-edges";
export { DOCK_TABS_FULL, DOCK_TABS_MINI, DOCK_TABS_PLAIN } from "./dock-tabs";
export { FEATURE_DIRS, RENDER_FILES, ROOT_FILES } from "./file-tree";
export {
	CELL_AGENTS,
	CELL_JS,
	CELL_LOAD,
	CELL_PLOT,
	CELL_SINGLE,
	CELL_SUMMARIZE,
	JSON_OUTPUTS,
} from "./notebook-cells";
export { ACTIVE_WORK_TOOLS } from "./planning";
export {
	BASE_PATH,
	CODE_FULL,
	CODE_RANGE,
	CODE_SUMMARY,
	DB_LISTING,
	DIR_LISTING,
	IMG_META,
	MD_TEXT,
	SEL_SUFFIX,
	URL_PREVIEW,
} from "./read-contents";
export { CONTENT_TEXT, CUSTOM_SUMMARY } from "./reasoning-traces";
export {
	CONTENT,
	INPUT,
	MULTI_FILE,
	SINGLE_FILE,
} from "./search-results";
export { SESSION_GROUPS } from "./session-groups";
export {
	DEPLOY_OUTPUT,
	INPUT as SSH_INPUT,
	RESTART_OUTPUT,
	SERVICE_DOWN,
	STATUS_OUTPUT,
	TRUNCATED_OUTPUT as SSH_TRUNCATED_OUTPUT,
} from "./ssh-outputs";
export { ENGINE_TASK_DETAILS } from "./task-engine";
export {
	BUILD_OUTPUT,
	DEV_OUTPUT,
	TEST_OUTPUT,
	TRUNCATED_OUTPUT,
	TYPECHECK_ERROR,
	TYPECHECK_OK,
} from "./terminal-outputs";
export type { TodoPhase, TodoTask } from "./todo-phases";
export { PHASES_BY_VARIATION } from "./todo-phases";
export {
	assistant_ACCOUNT,
	CODEX_ACCOUNT,
	COPILOT_ACCOUNT,
	EMPTY_SNAPSHOT,
	HEALTHY_SNAPSHOT,
	SINGLE_SNAPSHOT,
	STALE_SNAPSHOT,
	TOP_LIMITS,
} from "./usage-accounts";

export const SAMPLE_PATCH = [
	"diff --git a/src/rate-limit.ts b/src/rate-limit.ts",
	"--- a/src/rate-limit.ts",
	"+++ b/src/rate-limit.ts",
	"@@ -1,4 +1,5 @@",
	" export function rateLimit(key: string) {",
	"-  const now = Date.now();",
	"+  const now = performance.now();",
	"+  const windowMs = 60_000;",
	"   return buckets.get(key);",
	" }",
].join("\n");

export const SAMPLE_SEARCH = [
	{
		file: "src/registries/tool-renderer-registry.tsx",
		matches: [
			{ line: 14, text: "export type ToolRenderer = (call: ToolRenderInput) => React.ReactNode;" },
			{ line: 52, text: "export function useToolRenderer(toolName: string) {" },
		],
	},
	{
		file: "src/features/tool-card/tools/tool-render.tsx",
		matches: [{ line: 47, text: "export function ToolRender({ call }: ToolRenderProps) {" }],
	},
];

export const SUBAGENT_BATCHES: SubagentBatch[] = [
	{
		callId: "task-build-orchestrated",
		agent: "build",
		status: "running",
		context:
			"# Goal\nPort the auth, billing, and notifications modules onto the new session contract.\n\n# Constraints\n- Each module agent owns its files; spawn explorers/reviewers as needed.\n- Scout on a cheap model; take a second-opinion review on a different model.",
		runs: [
			{
				index: 0,
				id: "b0",
				agent: "build",
				status: "running",
				description: "auth module — port to session contract",
				task: "Port the auth module",
				lastIntent: "edit: rewriting the token-refresh guard",
				currentTool: "Edit",
				toolCount: 14,
				tokens: 86_500,
				contextTokens: 112_000,
				contextWindow: 200_000,
				cost: 0.52,
				durationMs: 0,
				resolvedModel: "aurora/assistant",
				children: [
					{
						index: 0,
						id: "b0a",
						agent: "explore",
						status: "running",
						description: "map auth call-sites",
						task: "Find everything that touches auth",
						lastIntent: "find: mapping auth call-sites",
						currentTool: "Find",
						toolCount: 6,
						tokens: 18_400,
						contextTokens: 44_000,
						contextWindow: 200_000,
						cost: 0.03,
						durationMs: 0,
						resolvedModel: "nova/scout",
						children: [
							{
								index: 0,
								id: "b0a0",
								agent: "explore",
								status: "completed",
								description: "OAuth provider sweep",
								task: "Enumerate OAuth providers",
								toolCount: 4,
								tokens: 9_200,
								contextTokens: 22_000,
								contextWindow: 200_000,
								cost: 0.01,
								durationMs: 12_400,
								resolvedModel: "nova/scout",
								exitCode: 0,
							},
						],
					},
					{
						index: 1,
						id: "b0b",
						agent: "reviewer",
						status: "running",
						description: "second-opinion review",
						task: "Audit the auth port",
						lastIntent: "read: auditing token refresh",
						currentTool: "Read",
						toolCount: 3,
						tokens: 27_800,
						contextTokens: 58_000,
						contextWindow: 200_000,
						cost: 0.19,
						durationMs: 0,
						resolvedModel: "nova/builder",
					},
				],
			},
			{
				index: 1,
				id: "b1",
				agent: "build",
				status: "running",
				description: "billing module — invoice schema",
				task: "Port the billing module",
				lastIntent: "edit: porting the invoice schema",
				currentTool: "Edit",
				toolCount: 9,
				tokens: 54_300,
				contextTokens: 78_000,
				contextWindow: 200_000,
				cost: 0.31,
				durationMs: 0,
				resolvedModel: "aurora/assistant",
			},
			{
				index: 2,
				id: "b2",
				agent: "build",
				status: "completed",
				description: "notifications module",
				task: "Port the notifications module",
				toolCount: 11,
				tokens: 61_700,
				contextTokens: 90_000,
				contextWindow: 200_000,
				cost: 0.28,
				durationMs: 38_900,
				resolvedModel: "aurora/assistant",
				exitCode: 0,
			},
		],
	},
	{
		callId: "task-explore-dispatch",
		agent: "explore",
		status: "dispatching",
		context:
			"# Goal\nMap the public agent workflow so we can draw its turn flow — not a box of cards.\n\n# Constraints\n- READ-ONLY. Do NOT edit, build, run, or format.\n- Output COMPRESSED and FLOW-FOCUSED — not file dumps.\n- Cite relevant symbols (functions, classes, event kinds) from the source.",
		runs: [
			{
				index: 0,
				id: "d0",
				agent: "explore",
				status: "pending",
				description: "AgentLoopCore — map the core agent loop",
				task: "Map the core agent loop",
				toolCount: 0,
				tokens: 0,
				contextTokens: 40_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
			{
				index: 1,
				id: "d1",
				agent: "explore",
				status: "pending",
				description: "ModelLayer — AI / model provider layer",
				task: "Map the AI/model provider layer",
				toolCount: 0,
				tokens: 0,
				contextTokens: 40_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
			{
				index: 2,
				id: "d2",
				agent: "explore",
				status: "pending",
				description: "ToolsExecution — tool defs + approvals",
				task: "Map tool definition + execution + approvals",
				toolCount: 0,
				tokens: 0,
				contextTokens: 59_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
			{
				index: 3,
				id: "d3",
				agent: "explore",
				status: "pending",
				description: "ContextMemory — assembly + compaction",
				task: "Map context assembly, compaction, memory",
				toolCount: 0,
				tokens: 0,
				contextTokens: 60_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
			{
				index: 4,
				id: "d4",
				agent: "explore",
				status: "pending",
				description: "SessionsStorage — persistence",
				task: "Map sessions + persistence",
				toolCount: 0,
				tokens: 0,
				contextTokens: 71_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
			{
				index: 5,
				id: "d5",
				agent: "explore",
				status: "pending",
				description: "ExtensionsMCP — MCP client, skills, hooks",
				task: "Map extensions, MCP client, skills, hooks, rules",
				toolCount: 0,
				tokens: 0,
				contextTokens: 41_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
			{
				index: 6,
				id: "d6",
				agent: "explore",
				status: "pending",
				description: "Subagents — swarm executor",
				task: "Map subagents / swarm",
				toolCount: 0,
				tokens: 0,
				contextTokens: 59_000,
				contextWindow: 200_000,
				cost: 0,
				durationMs: 0,
			},
		],
	},
	{
		callId: "task-review-running",
		agent: "reviewer",
		status: "running",
		runs: [
			{
				index: 0,
				id: "v0",
				agent: "reviewer",
				status: "running",
				description: "correctness — bugs & logic",
				task: "Review correctness",
				lastIntent: "read: scanning rate-limit.ts diff",
				currentTool: "Read",
				toolCount: 7,
				tokens: 48_200,
				contextTokens: 96_000,
				contextWindow: 200_000,
				cost: 0.21,
				durationMs: 0,
				resolvedModel: "aurora/architect",
			},
			{
				index: 1,
				id: "v1",
				agent: "reviewer",
				status: "running",
				description: "security — injection & authz",
				task: "Review security",
				lastIntent: "grep: hunting unsanitized inputs",
				currentTool: "Grep",
				toolCount: 5,
				tokens: 31_900,
				contextTokens: 64_000,
				contextWindow: 200_000,
				cost: 0.14,
				durationMs: 0,
			},
			{
				index: 2,
				id: "v2",
				agent: "reviewer",
				status: "completed",
				description: "performance — hot paths",
				task: "Review performance",
				toolCount: 9,
				tokens: 72_400,
				contextTokens: 138_000,
				contextWindow: 200_000,
				cost: 0.33,
				durationMs: 41_000,
				exitCode: 0,
				assignment:
					"Audit the rate-limit refactor for performance regressions on the hot path. Flag any added allocation or blocking call in the request loop.",
				review: {
					verdict: "incorrect",
					confidence: 0.82,
					explanation:
						"The refactor adds a per-request allocation and a synchronous read in the request loop; both regress the hot path under load.",
					findings: [
						{
							priority: "P0",
							title: "Per-request allocation in hot loop",
							filePath: "src/engine/rate-limit.ts",
							lineStart: 142,
							lineEnd: 142,
							body: "A fresh Map is allocated on every request; hoist it out of the loop and reuse it.",
						},
						{
							priority: "P1",
							title: "Synchronous file read blocks the request loop",
							filePath: "src/engine/rate-limit.ts",
							lineStart: 88,
							lineEnd: 90,
							body: "readFileSync stalls the event loop under concurrency; switch to the async cache.",
						},
						{
							priority: "P2",
							title: "Redundant Date.now() calls",
							filePath: "src/engine/window.ts",
							lineStart: 33,
							lineEnd: 41,
						},
					],
				},
			},
			{
				index: 3,
				id: "v3",
				agent: "reviewer",
				status: "completed",
				description: "tests — coverage gaps",
				task: "Review tests",
				toolCount: 6,
				tokens: 40_100,
				contextTokens: 88_000,
				contextWindow: 200_000,
				cost: 0.18,
				durationMs: 33_500,
				exitCode: 0,
				assignment:
					"Check test coverage for the rate-limit changes. List any new branch or error path left untested.",
				output:
					"Ran the suite: 412 pass, 0 fail.\nCoverage for rate-limit.ts: 74% (was 81%).\nUncovered: the 429 retry path and the window-reset branch.\nRecommend adding 2 cases before merge.\n... (output capped)",
				truncated: true,
			},
			{
				index: 4,
				id: "v4",
				agent: "reviewer",
				status: "running",
				description: "types — unsound casts",
				task: "Review types",
				lastIntent: "blocked: waiting on provider quota",
				toolCount: 2,
				tokens: 8_800,
				contextTokens: 18_000,
				contextWindow: 200_000,
				cost: 0.04,
				durationMs: 0,
				retry: { attempt: 2, maxAttempts: 5, message: "429 — retrying in 12s" },
			},
			{
				index: 5,
				id: "v5",
				agent: "reviewer",
				status: "aborted",
				description: "docs - comment drift",
				task: "Review doc comments",
				toolCount: 1,
				tokens: 3_200,
				contextTokens: 9_000,
				contextWindow: 200_000,
				cost: 0.02,
				durationMs: 6_000,
				exitCode: 1,
				abortReason: "Cancelled: superseded by the correctness pass.",
			},
		],
	},
	{
		callId: "task-explore-done",
		agent: "explore",
		status: "completed",
		totalDurationMs: 184_000,
		runs: [
			{
				index: 0,
				id: "c0",
				agent: "explore",
				status: "completed",
				description: "AgentLoopCore — core loop",
				task: "Map the core agent loop",
				toolCount: 14,
				tokens: 131_000,
				contextTokens: 152_000,
				contextWindow: 200_000,
				cost: 0.62,
				durationMs: 172_000,
				exitCode: 0,
			},
			{
				index: 1,
				id: "c1",
				agent: "explore",
				status: "completed",
				description: "ModelLayer — provider layer",
				task: "Map the AI/model provider layer",
				toolCount: 9,
				tokens: 88_400,
				contextTokens: 104_000,
				contextWindow: 200_000,
				cost: 0.39,
				durationMs: 121_000,
				exitCode: 0,
			},
			{
				index: 2,
				id: "c2",
				agent: "explore",
				status: "failed",
				description: "ToolsExecution — defs + approvals",
				task: "Map tool definition + execution + approvals",
				toolCount: 11,
				tokens: 96_700,
				contextTokens: 142_000,
				contextWindow: 200_000,
				cost: 0.44,
				durationMs: 160_000,
				exitCode: 1,
				error: "subagent exited non-zero: output truncated at the 500KB cap",
			},
			{
				index: 3,
				id: "c3",
				agent: "explore",
				status: "completed",
				description: "ContextMemory — compaction",
				task: "Map context assembly, compaction, memory",
				toolCount: 8,
				tokens: 73_900,
				contextTokens: 88_000,
				contextWindow: 200_000,
				cost: 0.31,
				durationMs: 104_000,
				exitCode: 0,
			},
		],
	},
];
export const SURFACE_TOKENS: { token: string; label: string }[] = [
	{ token: "--fr-bg", label: "bg" },
	{ token: "--fr-rail", label: "rail" },
	{ token: "--fr-surface", label: "surface" },
	{ token: "--fr-surface-2", label: "surface-2" },
	{ token: "--fr-surface-3", label: "surface-3" },
	{ token: "--fr-border", label: "border" },
	{ token: "--fr-border-soft", label: "border-soft" },
];
export const TEXT_TOKENS: { token: string; label: string }[] = [
	{ token: "--fr-text", label: "text" },
	{ token: "--fr-text-2", label: "text-2" },
	{ token: "--fr-text-3", label: "text-3" },
];
export const STATE_TOKENS: { token: string; label: string }[] = [
	{ token: "--fr-accent", label: "accent" },
	{ token: "--fr-accent-2", label: "accent-2" },
	{ token: "--fr-add", label: "add" },
	{ token: "--fr-del", label: "del" },
	{ token: "--fr-warn", label: "warn" },
	{ token: "--fr-blue", label: "blue" },
];

export const BADGE_TONES: Tone[] = ["accent", "add", "blue", "warn", "mute", "del"];

export const AVATARS: AvatarId[] = [
	"blob",
	"aurora",
	"nebula",
	"siri",
	"orbit",
	"quasar",
	"matrix",
	"lattice",
	"liquid",
	"koi",
	"duel",
	"smiley",
	"rorschach",
	"inkblot",
	"ember",
	"blackhole",
	"static",
];

export const VIBR_STATES: AvatarState[] = ["idle", "thinking", "typing"];
export const VIBR_MODES: AvatarMode[] = ["", "search", "read", "run", "edit", "skill", "mcp", "think"];

export const PALETTE_CMDS: PaletteCategory[] = [
	{
		name: "Session",
		items: [
			{ cmd: "/compact", desc: "Summarize & trim context", icon: "history" },
			{ cmd: "/diff", desc: "Show working-tree diff", icon: "diff" },
			{ cmd: "/pr", desc: "Commit & open pull request", icon: "arrowR" },
		],
	},
	{
		name: "Context & tools",
		items: [
			{ cmd: "/mcp", desc: "Manage MCP servers", icon: "shield" },
			{ cmd: "/skill", desc: "Invoke a skill", icon: "spark" },
			{ cmd: "/model", desc: "Switch model & effort", icon: "gear" },
		],
	},
];

export const MODEL_FAVORITES: ModelDef[] = [
	{
		name: "Aurora Apex",
		tag: "Frontier",
		tone: "accent",
		desc: "Most capable fictional route · hard refactors",
		meta: { contextWindow: 1_000_000, cost: { input: 5, output: 25 } },
		capabilities: ["vision", "reasoning"],
	},
];
export const MODEL_MOSTUSED: ModelDef[] = [
	{ name: "Auto", tag: "Default", tone: "mute", desc: "Let Fraym choose the route per turn", ctx: "auto" },
	{
		name: "Aurora Core",
		tag: "Frontier",
		tone: "accent",
		desc: "Deep reasoning · best for hard problems",
		meta: { contextWindow: 200_000, cost: { input: 3, output: 15 } },
		capabilities: ["vision", "reasoning"],
	},
];
export const MODEL_CATEGORIES: ModelCategory[] = [
	{
		id: "best",
		label: "Best value",
		items: [
			{
				name: "Nova Spark",
				tag: "Best",
				tone: "add",
				desc: "Top eval-per-dollar in current set",
				ctx: "200K",
				capabilities: ["vision", "reasoning"],
			},
			{
				name: "Lumen Mini",
				tag: "Strong",
				tone: "blue",
				desc: "Fast, inexpensive fictional route",
				ctx: "128K",
				capabilities: ["vision"],
			},
		],
	},
	{
		id: "frontier",
		label: "Frontier",
		items: [
			{
				name: "Aurora Apex",
				tag: "Frontier",
				tone: "accent",
				desc: "Most capable fictional route",
				ctx: "1M",
				capabilities: ["vision", "reasoning"],
			},
			{
				name: "Lumen Prime",
				tag: "Frontier",
				tone: "accent",
				desc: "Latest fictional route · strong tool use",
				ctx: "400K",
				capabilities: ["vision", "reasoning"],
			},
		],
	},
];

type EngineResourceFixture = NonNullable<EngineModelPaneProps["snapshot"]>;
type EngineConfigSnapshotFixture = NonNullable<EngineModelPaneProps["configSnapshot"]>;

const ENGINE_PROVIDERS: EngineResourceFixture["providers"] = [
	{
		id: "aurora",
		name: "Aurora Cloud",
		hasAuth: true,
		authType: "api_key",
		authSource: "auth_file",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "nova",
		name: "Nova API",
		hasAuth: true,
		authType: "api_key",
		authSource: "auth_file",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "local",
		name: "Local Lab",
		hasAuth: true,
		authType: "none",
		authSource: "none",
		oauthSupported: false,
		apiKeySetupSupported: false,
	},
];

type ModelOverrides = Partial<
	Omit<
		EngineResourceFixture["models"][number],
		"providerId" | "providerName" | "modelId" | "label" | "authType" | "supportsImages"
	>
> & { readonly vision?: boolean };

function engineModel(
	providerId: string,
	providerName: string,
	modelId: string,
	label: string,
	overrides: ModelOverrides = {},
): EngineResourceFixture["models"][number] {
	const { vision, available, reasoning, ...rest } = overrides;
	return {
		...rest,
		providerId,
		providerName,
		modelId,
		label,
		available: available ?? true,
		authType: providerId === "local" ? "none" : "api_key",
		reasoning: Boolean(reasoning),
		supportsImages: Boolean(vision),
	};
}

export const ENGINE_SETTINGS_RESOURCE_FIXTURE: EngineResourceFixture = {
	workspace: { workspaceId: "example-studio", path: "example-studio", displayName: "Example Studio" },
	providers: ENGINE_PROVIDERS,
	models: [
		engineModel("aurora", "Aurora Cloud", "assistant", "Aurora Assistant", {
			reasoning: true,
			vision: true,
			contextWindow: 120_000,
			maxOutputTokens: 16_000,
			cost: { input: 1, output: 4, cacheRead: 0.1, cacheWrite: 1 },
		}),
		engineModel("nova", "Nova API", "builder", "Nova Builder", {
			reasoning: true,
			contextWindow: 80_000,
			maxOutputTokens: 8_000,
			cost: { input: 0.5, output: 2, cacheRead: 0.05, cacheWrite: 0.5 },
		}),
		engineModel("local", "Local Lab", "workbench", "Local Workbench", {
			contextWindow: 32_000,
			supportsTools: false,
		}),
		engineModel("offline", "Offline Provider", "unavailable", "Unavailable Model", { available: false }),
	],
	skills: [],
	extensions: [],
	mcpServers: [],
	plugins: [],
	permissions: [],
	settings: {
		defaultProvider: "aurora",
		defaultModelId: "assistant",
		defaultThinkingLevel: "high",
		enableSkillCommands: true,
		enabledModelPatterns: ["aurora/*", "nova/*"],
	},
};

// A provider carrying multiple sample accounts for the ProviderAccountSwitcher demo.
export const PROVIDER_WITH_ACCOUNTS: EngineResourceFixture["providers"][number] = {
	id: "aurora",
	name: "Aurora Cloud",
	hasAuth: true,
	authType: "oauth",
	authSource: "oauth",
	oauthSupported: true,
	apiKeySetupSupported: true,
	accounts: [
		{
			key: "operator",
			label: "operator@example.test",
			active: true,
			pinned: false,
			diagnostics: {
				state: "healthy",
				checkedAt: 0,
				limits: [
					{ id: "requests", label: "Requests", usedFraction: 0.18 },
					{ id: "tokens", label: "Tokens", usedFraction: 0.42 },
				],
			},
		},
		{
			key: "member",
			label: "member@example.test",
			active: false,
			pinned: false,
			diagnostics: {
				state: "rate_limited",
				checkedAt: 0,
				reason: "Resets in about 12 minutes",
				limits: [{ id: "requests", label: "Requests", usedFraction: 0.97 }],
			},
		},
	],
};

export const ENGINE_SETTINGS_CONFIG_SNAPSHOT_FIXTURE: EngineConfigSnapshotFixture = {
	workspace: ENGINE_SETTINGS_RESOURCE_FIXTURE.workspace,
	values: [
		{ path: "appearance.theme", value: "dark", defaultValue: "system", scope: "global", changed: true },
		{ path: "model.default", value: "aurora/assistant", scope: "global", changed: true },
		{ path: "model.reasoning", value: true, defaultValue: true, scope: "global", changed: false },
		{ path: "connections.search", value: true, defaultValue: true, scope: "global", changed: false },
		{ path: "interaction.resume", value: true, defaultValue: false, scope: "global", changed: true },
		{
			path: "interaction.confirmation",
			value: "always",
			defaultValue: "when-needed",
			scope: "project",
			changed: true,
		},
		{ path: "context.compaction", value: true, defaultValue: true, scope: "global", changed: false },
		{ path: "context.limit", value: 120_000, defaultValue: 120_000, scope: "global", changed: false },
		{ path: "memory.enabled", value: true, defaultValue: true, scope: "global", changed: false },
		{ path: "editing.mode", value: "guided", defaultValue: "guided", scope: "project", changed: false },
		{ path: "tools.enabled", value: true, defaultValue: true, scope: "global", changed: false },
		{ path: "tasks.parallelism", value: 3, defaultValue: 3, scope: "project", changed: false },
		{ path: "workspaces.isolation", value: true, defaultValue: true, scope: "project", changed: false },
		{ path: "integrations.discovery", value: true, defaultValue: true, scope: "global", changed: false },
	],
};

export const PERMS: PermissionDef[] = [
	{ id: "default", label: "Default permissions", desc: "Asks before risky tools", icon: "hand", tone: "warn" },
	{ id: "review", label: "Auto-review", desc: "Stages changes for your review", icon: "eye", tone: "add" },
	{ id: "full", label: "Full access", desc: "Reads & writes, no shell guard", icon: "bolt", tone: "del" },
];

export const CTX_BREAKDOWN: ContextRow[] = [
	{ name: "Messages", k: 96, pct: 48 },
	{ name: "System tools", k: 17.9, pct: 9 },
	{ name: "MCP tools", k: 9.1, pct: 4.6 },
	{ name: "Free space", k: 77.1, pct: 38, free: true },
];
export const PLAN_LIMITS: PlanLimit[] = [
	{ name: "5-hour limit", pct: 20, resets: "resets 3h" },
	{ name: "Weekly · all models", pct: 28, resets: "resets 4d" },
];

export const MCP_SERVERS: McpServer[] = [
	{
		logo: "Gh",
		bg: "#1c1c20",
		fg: "#fff",
		name: "github",
		transport: "stdio",
		desc: "Issues, PRs, code search.",
		on: true,
	},
	{
		logo: "Pg",
		bg: "#1b2c3a",
		fg: "#7fb4e0",
		name: "postgres",
		transport: "stdio",
		desc: "Query the dev database.",
		on: true,
	},
	{
		logo: "Lin",
		bg: "#332a1b",
		fg: "var(--fr-warn)",
		name: "linear",
		transport: "stdio",
		desc: "Issues, cycles, projects.",
		on: false,
	},
];

export const COMPOSER_TOOLBAR: ComposerControl[] = [
	{ id: "mode", label: "Plan", icon: "list", tone: "accent", active: true },
	{ id: "attach", label: "Attach", icon: "plus" },
	{ id: "history", label: "History", icon: "history" },
	{ id: "editor", label: "Editor", icon: "type" },
	{ id: "voice", label: "STT", icon: "keyboard", disabled: true },
];

export const COMPOSER_SEND_ACTIONS: ComposerControl[] = [
	{ id: "send", label: "Send", icon: "send", tone: "accent", active: true },
	{ id: "steer", label: "Steer", icon: "branch" },
	{ id: "continue", label: "Continue", icon: "play" },
];

export const ASSET_TASK_PHASES = [
	{
		name: "ACF Assets",
		tasks: [
			{
				content: "Inspect existing ACF asset patterns",
				status: "in_progress" as const,
				notes: ["ue_acf_asset_list_types"],
			},
			{ content: "Create knight character data", status: "pending" as const },
			{ content: "Create sword weapon data", status: "pending" as const },
			{ content: "Create sword slash action", status: "pending" as const },
			{ content: "Link sword and ability", status: "pending" as const },
		],
	},
	{
		name: "Verification",
		tasks: [{ content: "Inspect created assets", status: "pending" as const }],
	},
];

export const ENTITY_SUMMARY_FIELDS = [
	{ id: "transport", label: "transport", value: "ue-editor", tone: "blue" as const },
	{ id: "version", label: "version", value: "v0.1.0" },
	{ id: "owner", label: "agent", value: "@blueprint-architect", tone: "accent" as const },
	{ id: "scope", label: "scope", value: "workspace" },
];

export const CAPABILITY_GROUPS = [
	{
		id: "ue",
		title: "Unreal Engine",
		description: "Reusable list body for any capability set.",
		items: [
			{
				id: "asset-types",
				label: "List asset types",
				description: "Enumerates ACF data asset templates.",
				detail: "ue_acf_asset_list_types",
				icon: "db" as const,
				tone: "blue" as const,
				status: { label: "ready", tone: "add" as const },
			},
			{
				id: "asset-schema",
				label: "Inspect asset schema",
				description: "Returns typed fields, class, tags, and defaults.",
				detail: "ue_acf_asset_schema",
				icon: "shield" as const,
				tone: "accent" as const,
				status: { label: "used", tone: "accent" as const },
			},
			{
				id: "create-blueprint",
				label: "Create Blueprint class",
				description: "Creates an editor asset from a typed request.",
				detail: "create-blueprint-class",
				icon: "spark" as const,
				tone: "add" as const,
			},
		],
	},
];

export const DATA_INSPECTOR_VALUE = {
	status: "success",
	type_tag: "DataAssetCreator.Character",
	display_name: "Character",
	category: "Character/AI",
	fields: {
		class: "/Script/AscentCombatFramework.ACFCharacterDataAsset",
		tags: ["character", "acf", "data-asset"],
	},
};

export const EXECUTION_LOG_LINES = [
	["prompt", "$ ", "plain", "bun --filter @fraym/ui check"],
	["plain", "Typechecking component exports..."],
	["pass", "no type errors"],
] as const;

export const ARTIFACT_PREVIEW_ITEMS = [
	{
		id: "browser",
		title: "Browser capture",
		description: "Screenshot, URL, status, and open controls.",
		detail: "https://example.test/browser-capture",
		kind: "browser" as const,
		tone: "blue" as const,
		metadata: [{ id: "size", label: "viewport", value: "1365x900" }],
		actions: [{ id: "open", label: "Open", icon: "arrowUpRight" as const, variant: "outline" as const }],
	},
	{
		id: "file",
		title: "Generated artifact",
		description: "Works for files, images, docs, and tool outputs.",
		detail: "example-artifacts/schema-preview.json",
		kind: "file" as const,
		tone: "accent" as const,
		metadata: [{ id: "format", label: "format", value: "json", tone: "blue" as const }],
		actions: [{ id: "inspect", label: "Inspect", icon: "eye" as const, variant: "outline" as const }],
	},
];

export const TOOL_TIMELINE_ITEMS: ToolTimelineItem[] = [
	{
		id: "tool-todo",
		kind: "todo",
		title: (
			<>
				Todo Write <b className="font-secondary text-xs font-medium">6 tasks</b>
			</>
		),
		stat: "planned",
		status: "success",
		defaultOpen: true,
		body: <WorkPlanBody phases={ASSET_TASK_PHASES} />,
		metadata: [
			{ id: "tokens", label: "tokens", value: "1.1K" },
			{ id: "cache", label: "cache", value: "32K", tone: "blue" },
		],
	},
	{
		id: "tool-read",
		kind: "read",
		title: (
			<>
				Read <b className="font-secondary text-xs font-medium">3 files</b>
			</>
		),
		stat: "248 lines",
		status: "success",
		args: [["path", "src/middleware/auth.ts"]],
	},
	{
		id: "tool-search",
		kind: "grep",
		title: (
			<>
				Search <b className="font-secondary text-xs font-medium">HostUiRequest</b>
			</>
		),
		stat: "18 matches",
		status: "success",
		args: [
			["query", "HostUiRequest"],
			["scope", "packages/ui"],
		],
	},
	{
		id: "tool-bash",
		kind: "command",
		title: (
			<>
				Run <b className="font-secondary text-xs font-medium">bun check</b>
			</>
		),
		stat: "running",
		status: "running",
		defaultOpen: true,
		output: [
			["prompt", "$ ", "plain", "bun --filter @fraym/ui check"],
			["plain", "Typechecking component exports..."],
			["pass", "no type errors"],
		],
	},
	{
		id: "tool-mcp",
		kind: "realm",
		title: (
			<>
				ue-editor <b className="font-secondary text-xs font-medium">ue_acf_asset_schema</b>
			</>
		),
		stat: "schema",
		status: "success",
		defaultOpen: true,
		args: [
			["display_name", "Character"],
			["config_path", ""],
		],
		body: (
			<DataInspectorBody
				label="result"
				value={{
					status: "success",
					success: true,
					type_tag: "DataAssetCreator.Character",
					display_name: "Character",
					category: "Character/AI",
					asset_class: "/Script/AscentCombatFramework.ACFCharacterDataAsset",
				}}
			/>
		),
		metadata: [
			{ id: "tokens", label: "tokens", value: "2.2K" },
			{ id: "latency", label: "latency", value: "46ms", tone: "add" },
			{ id: "cache", label: "cache", value: "33K", tone: "blue" },
		],
	},
];

export const TASK_PHASES = [
	{
		name: "Plan",
		tasks: [
			{ content: "Inspect current chat layout and message blocks", status: "completed" as const },
			{ content: "Decide which tool outputs need dedicated renderers", status: "completed" as const },
		],
	},
	{
		name: "Implement",
		tasks: [
			{
				content: "Render tool calls as compact inline activity",
				status: "in_progress" as const,
				notes: ["read", "grep", "bash", "mcp"],
			},
			{ content: "Expose status segments through settings", status: "pending" as const },
			{ content: "Wire host approvals through the session driver", status: "pending" as const },
		],
	},
];

export const HOST_REQUESTS: HostUiRequest[] = [
	{
		id: "approve-edit",
		title: "Approve workspace edit",
		description: "The agent wants to update source files in the current workspace.",
		detail: "packages/ui/src/features/composer-cockpit/composer-cockpit.tsx",
		tone: "warn",
		icon: "shield",
		actions: [
			{ id: "allow", label: "Allow", variant: "default" },
			{ id: "deny", label: "Deny", variant: "outline" },
			{ id: "details", label: "Details", variant: "ghost" },
		],
	},
];

export const STATUS_SEGMENTS: StatusSegment[] = [
	{ id: "session", label: "fraym", value: "v1", icon: "branch", active: true, tone: "accent" },
	{ id: "model", label: "Apex", value: "high", icon: "spark" },
	{ id: "context", label: "Context", value: "71%", icon: "panel", tone: "warn", active: true },
	{ id: "tools", label: "Tools", value: "4", icon: "termBox", tone: "blue" },
	{ id: "cost", label: "Cost", value: "$0.42", icon: "card" },
	{ id: "git", label: "Git", value: "dirty", icon: "diff", tone: "warn" },
];

export const SETTINGS_SECTIONS: SettingsPreviewSection[] = [
	{
		id: "surfaces",
		title: "Surfaces",
		description: "Visibility, placement and defaults for agent UI surfaces.",
		rows: [
			{
				id: "tool-timeline",
				label: "Tool timeline",
				description: "Show tool cards inline, docked or hidden.",
				value: "inline",
				enabled: true,
			},
			{
				id: "host-ui",
				label: "Host approvals",
				description: "Block in dialog or collect in side stack.",
				value: "stack",
				enabled: true,
			},
			{
				id: "queue",
				label: "Composer queue",
				description: "Queued prompts can be edited, restored or removed.",
				value: "toolbar",
				enabled: true,
			},
		],
	},
	{
		id: "rendering",
		title: "Rendering",
		description: "Shared controls for density, motion and detail.",
		rows: [
			{
				id: "density",
				label: "Density",
				description: "Passed to every component as a typed setting.",
				value: "comfortable",
				enabled: true,
			},
			{
				id: "tool-output",
				label: "Tool output",
				description: "Collapsed, expanded or smart per renderer.",
				value: "smart",
				enabled: true,
			},
			{
				id: "vibr",
				label: "Vibr accent resting color",
				description: "Idle avatar follows the active accent token.",
				value: "accent",
				enabled: true,
			},
		],
	},
];

export const AVATAR_OPTIONS: { id: AvatarId; label: string }[] = AVATARS.map(id => ({
	id,
	label: id.charAt(0).toUpperCase() + id.slice(1),
}));

export {
	SYNTHETIC_ENGINE_CONFIG_CATALOG,
	SYNTHETIC_ENGINE_CONFIG_COVERAGE,
	type SyntheticEngineConfigCoverage,
} from "./engine-config-catalog.fixture";


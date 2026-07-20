// @fraym/driver - engine resource contract.
//
// This is live engine inventory and domain mutations: provider auth, model
// registry, skills, extensions, commands, and model defaults. Persistent raw
// settings belong to EngineConfigDriver, not this resource driver.

import type { Unsubscribe, WorkspaceRef } from "./session-driver";

export type EngineResourceAuthType = "oauth" | "api_key" | "none";
export type EngineProviderAuthSource = "none" | "oauth" | "auth_file" | "env" | "external";
export type EngineResourceSourceScope = "user" | "project" | "native" | "temporary";
export type EngineResourceSourceOrigin = "package" | "top-level";
export type EngineCommandSource = "builtin" | "extension" | "prompt" | "skill";
export type EngineMcpTransport = "stdio" | "sse" | "http";
export type EngineApprovalMode = "always-ask" | "write" | "yolo";
export type EngineToolApprovalPolicy = "allow" | "prompt" | "deny";

export interface EngineResourceSourceInfo {
	readonly path: string;
	readonly source: string;
	readonly scope: EngineResourceSourceScope;
	readonly origin: EngineResourceSourceOrigin;
	readonly baseDir?: string;
}
export type EngineProviderAccountSelectionPolicy = "weighted" | "priority-fallback";
export type EngineProviderAccountHealthState =
	| "healthy"
	| "rate_limited"
	| "overloaded"
	| "auth_failed"
	| "unavailable"
	| "unknown";

export interface EngineProviderAccountLimitRecord {
	readonly id: string;
	readonly label: string;
	readonly status?: "ok" | "warning" | "exhausted" | "unknown";
	readonly usedFraction?: number;
	readonly remainingFraction?: number;
	readonly resetsAt?: number;
}

export interface EngineProviderAccountDiagnostics {
	readonly state: EngineProviderAccountHealthState;
	readonly checkedAt: number;
	readonly reason?: string;
	readonly accountId?: string;
	readonly limits?: readonly EngineProviderAccountLimitRecord[];
}

export interface EngineProviderAccountRecord {
	readonly key: string;
	readonly label: string;
	readonly active: boolean;
	/** Explicitly pinned: ONLY this account is ever used, even past its rate
	 *  limit — distinct from `active` (currently in effect, e.g. the P0 of a
	 *  priority-fallback chain that can still fail over). */
	readonly pinned: boolean;
	readonly priority?: number;
	readonly diagnostics?: EngineProviderAccountDiagnostics;
}

export interface EngineProviderRecord {
	readonly id: string;
	readonly name: string;
	readonly hasAuth: boolean;
	readonly authType: EngineResourceAuthType;
	readonly authSource: EngineProviderAuthSource;
	readonly oauthSupported: boolean;
	readonly apiKeySetupSupported: boolean;
	/** Provider-level auth failure: a present credential was rejected (e.g. 401/403).
	 *  Set only when the effective credential failed, so multi-account OAuth with one
	 *  dead account among healthy ones stays unflagged. */
	readonly authFailed?: boolean;
	readonly accountSelectionPolicy?: EngineProviderAccountSelectionPolicy;
	readonly accounts?: readonly EngineProviderAccountRecord[];
}

export interface EngineModelCost {
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
}

export interface EngineModelRecord {
	readonly providerId: string;
	readonly providerName: string;
	readonly modelId: string;
	readonly label: string;
	readonly available: boolean;
	readonly authType: EngineResourceAuthType;
	readonly reasoning: boolean;
	readonly supportsImages: boolean;
	/** Max input context in tokens. Absent when the catalog does not know it. */
	readonly contextWindow?: number;
	/** Max output tokens per response. Absent when unknown. */
	readonly maxOutputTokens?: number;
	/** Accepted input modalities (e.g. "text", "image"). */
	readonly inputModalities?: readonly string[];
	/** Native tool-call support. Absent ⇒ supported; only `false` is meaningful. */
	readonly supportsTools?: boolean;
	/** USD per million tokens. Absent when the catalog does not price the model. */
	readonly cost?: EngineModelCost;
}

// --- model insights (deterministic benchmark/usage feed; optional lane) -------

export interface EngineModelBenchmarkCategory {
	readonly id: string;
	readonly label: string;
	readonly elo: number;
	readonly winRate: number;
	/** Rank within the feed's listed models for this category (lower = better). */
	readonly rank: number;
}

export interface EngineModelInsightIndices {
	readonly intelligence?: number;
	readonly coding?: number;
	readonly agentic?: number;
}

/** One model's DeepSWE result (Datacurve's long-horizon SWE benchmark —
 *  113 original tasks over live OSS repos, fixed mini-swe-agent harness). */
export interface EngineModelDeepSwe {
	/** pass@1, percent 0-100 (attempt pass rate over scored rollouts). */
	readonly passAt1: number;
	/** pass@4, percent 0-100 (tasks with ≥1 passing rollout). */
	readonly passAt4?: number;
	/** Reasoning effort of the best-scoring config (e.g. "max"). */
	readonly effort?: string;
	/** Median cost per task, USD. */
	readonly medianCostPerTaskUsd?: number;
	/** Median agent steps per task. */
	readonly medianAgentSteps?: number;
	/** Snapshot timestamp from the producer's artifact. */
	readonly generatedAt?: string;
}

/** Per-model benchmark/usage enrichment served by the engine's insight feed. */
export interface EngineModelInsight {
	/** OpenRouter's coding RANKING: position by Artificial Analysis coding index
	 *  across the feed's benchmarked models (lower = better). */
	readonly rank?: number;
	/** Design Arena `codecategories` rank (crowd pairwise votes; lower = better). */
	readonly arenaRank?: number;
	/** Design Arena coding ELO. */
	readonly elo?: number;
	/** Design Arena coding win rate (0-100). */
	readonly winRate?: number;
	/** Derived "good at" tags, e.g. `#1 coding`. */
	readonly strengths?: readonly string[];
	/** Artificial Analysis indices (0-100). */
	readonly indices?: EngineModelInsightIndices;
	/** Real weekly-usage rank across the catalog (lower = more used). */
	readonly usageRank?: number;
	/** Full per-category benchmark table. */
	readonly categories?: readonly EngineModelBenchmarkCategory[];
	/** DeepSWE long-horizon agentic result (fixed-harness, first-party feed). */
	readonly deepSwe?: EngineModelDeepSwe;
	/** LMArena (arena.ai) human-preference leaderboard standing. */
	readonly arenaTextElo?: number;
	readonly arenaTextRank?: number;
	readonly arenaTextVotes?: number;
	readonly arenaCodeElo?: number;
	readonly arenaCodeRank?: number;
	readonly arenaCodeVotes?: number;
}

export interface EngineModelInsightsResult {
	/** Keyed `providerId/modelId` — matches {@link EngineModelRecord} identity. */
	readonly insights: Readonly<Record<string, EngineModelInsight>>;
	/** ISO timestamp of the oldest contributing source snapshot. */
	readonly fetchedAt: string;
	/** Source ids that contributed (e.g. `["openrouter"]`). */
	readonly sources: readonly string[];
	/** True when a source served expired cache after a fetch failure. */
	readonly stale?: boolean;
}

export interface EngineSkillRecord {
	readonly name: string;
	readonly description: string;
	/** Full skill instructions body (markdown, frontmatter stripped) — the source
	 *  the agent itself loads when the skill fires. */
	readonly content: string;
	readonly filePath: string;
	readonly baseDir: string;
	readonly source: string;
	readonly enabled: boolean;
	readonly disableModelInvocation: boolean;
	readonly slashCommand: string;
	readonly sourceInfo: EngineResourceSourceInfo;
}

export interface EngineExtensionDiagnostic {
	readonly type: "warning" | "error" | "collision";
	readonly message: string;
	readonly path?: string;
}

export interface EngineExtensionRecord {
	readonly path: string;
	readonly displayName: string;
	readonly enabled: boolean;
	readonly sourceInfo: EngineResourceSourceInfo;
	readonly commands: readonly string[];
	readonly tools: readonly string[];
	readonly flags: readonly string[];
	readonly shortcuts: readonly string[];
	readonly diagnostics: readonly EngineExtensionDiagnostic[];
}

export interface EngineMcpToolRecord {
	readonly name: string;
	readonly description?: string;
}

export interface EngineMcpServerRecord {
	readonly id: string;
	readonly name: string;
	readonly enabled: boolean;
	readonly transport: EngineMcpTransport;
	readonly sourceInfo: EngineResourceSourceInfo;
	readonly endpoint?: string;
	readonly command?: string;
	readonly timeoutMs?: number;
	readonly hasAuth: boolean;
	readonly shadowed?: boolean;
	/** Cached tool list (name + description) from the last successful connect —
	 *  read from the same on-disk tool cache the MCP client warms, never a live
	 *  connection. `undefined` when this server has never been connected. */
	readonly tools?: readonly EngineMcpToolRecord[];
}

export interface EnginePermissionRecord {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
	readonly source: string;
	readonly scope: "global" | "tool";
	readonly mode?: EngineApprovalMode;
	readonly toolName?: string;
	readonly policy?: EngineToolApprovalPolicy;
}

/**
 * Semantic affordance hint for a command. The UI resolver maps this to an
 * existing Fraym surface (model picker, MCP modal, dock tab, ...) so a picked
 * command can open the right affordance instead of being sent as plain text.
 */
export const ENGINE_COMMAND_UI_HINTS = [
	"model-picker",
	"mcp",
	"context",
	"settings",
	"session-tree",
	"tasks",
	"plan-toggle",
	"tools",
	"plugins",
	"usage",
	"new-session",
	"compact",
	"diff",
] as const;

export type EngineCommandUiHint = (typeof ENGINE_COMMAND_UI_HINTS)[number];

export function isEngineCommandUiHint(value: unknown): value is EngineCommandUiHint {
	return typeof value === "string" && (ENGINE_COMMAND_UI_HINTS as readonly string[]).includes(value);
}

/** One declarative argument-completion row advertised for a command (mirrors Engine's
 *  TUI subcommand dropdown); carried in `_meta["fraym/command"].subcommands`. */
export interface EngineCommandSubcommand {
	readonly name: string;
	readonly description?: string;
	/** Usage hint, e.g. `<name> [--scope project|user]`. */
	readonly usage?: string;
}

export interface EngineCommandRecord {
	readonly name: string;
	readonly description?: string;
	readonly source: EngineCommandSource;
	readonly sourceInfo: EngineResourceSourceInfo;
	readonly uiHint?: EngineCommandUiHint;
	/**
	 * Engine-advertised semantic kind of the command's output; clients may
	 * override; unknown = generic rendering.
	 */
	readonly renderKind?: string;
	/** Declarative argument completions offered once this command is committed. */
	readonly subcommands?: readonly EngineCommandSubcommand[];
	/** Free-text argument hint from the ACP command's `input.hint` (e.g. `<what to work on>`). */
	readonly inputHint?: string;
}

/**
 * Driver-layer authority over engine-advertised command affordances.
 *
 * Keys are normalized command names (`normalizeEngineCommandName`). Precedence
 * is override ?? wire ?? none; `null` suppresses the wire-advertised value.
 */
export interface CommandUiOverrides {
	readonly uiHint?: Readonly<Record<string, EngineCommandUiHint | null>>;
	readonly renderKind?: Readonly<Record<string, string | null>>;
}

export function normalizeEngineCommandName(value: string): string {
	return value.trim().replace(/^\/+/, "");
}

export function engineCommandToken(name: string): string {
	return `/${normalizeEngineCommandName(name)}`;
}

export function skillCommandName(name: string): string {
	return `skill:${normalizeEngineCommandName(name)}`;
}

export function skillSlashCommand(name: string): string {
	return engineCommandToken(skillCommandName(name));
}

export interface EngineResourceSettingsSnapshot {
	readonly defaultProvider?: string;
	readonly defaultModelId?: string;
	readonly defaultThinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
	readonly enableSkillCommands: boolean;
	readonly enabledModelPatterns: readonly string[];
}

export interface ModelSettingsSnapshot {
	readonly defaultProvider?: string;
	readonly defaultModelId?: string;
	readonly defaultThinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
	readonly enabledModelPatterns: readonly string[];
}

// ── Pipelines (doc 38: Pipelines are content, not code) ────────────────────────

/** A convergence condition on a looping stage — open named-signal vocabulary. */
export interface EnginePipelineStageUntil {
	readonly signal: string;
	readonly threshold?: number;
	readonly maxIterations: number;
}

/** A Critic gate: the team that gates this stage plus optional deterministic
 *  evaluators. The team (a data plugin, e.g. "design-jury") owns the rubric. */
export interface EnginePipelineCritic {
	readonly team?: string;
	readonly evaluators?: readonly string[];
}

/** The verdict a `team` builtin tool returns (the fork's team-tool contract). The
 *  Fraym `team` tool-card renderer reads this off the call result to draw a verdict
 *  header above the subagent swarm rows; `batch` carries the juror runs. */
export interface EngineTeamToolDetails {
	readonly team: string;
	readonly strategy: string;
	readonly threshold: number;
	readonly composite: number;
	readonly decision: "pass" | "revise";
	readonly critique: string;
	readonly members: readonly {
		readonly name: string;
		readonly weight: number;
		readonly score: number;
		readonly mustFix: readonly string[];
	}[];
	/** The subagent batch that carries the juror runs (renders the swarm rows). */
	readonly batch?: unknown;
}

/** An interactive gate — data only; the product owns the renderer. */
export interface EnginePipelineGate {
	readonly surface: "form" | "choice" | "confirmation" | "connect-prompt";
	readonly prompt: string;
	readonly persist: "run" | "conversation" | "project";
	readonly timeout: "abort" | "default" | "skip";
}

/** One node of the Run graph a Pipeline unrolls into. */
export interface EnginePipelineStage {
	readonly id: string;
	readonly title: string;
	readonly artifactory: string;
	readonly hosted?: boolean;
	readonly artifactClass: "deliverable" | "intermediate" | "conditioning";
	readonly needs?: readonly string[];
	readonly until?: EnginePipelineStageUntil;
	readonly branch?: { readonly directions: number };
	readonly gate?: EnginePipelineGate;
	readonly critic?: EnginePipelineCritic;
	/** Skills this stage loads when active (agent knowledge). */
	readonly skills?: readonly string[];
	/** Tool ids this stage may use on top of the Kind pack's tools. */
	readonly tools?: readonly string[];
}

/** A terminal pipeline stage: how the Run ships. */
export interface EnginePipelineDistribution {
	readonly verb: "publish" | "deploy" | "export" | "share" | "submit-for-review" | "set-active";
	readonly target?: string;
}

/** A context chip the pick brings to the composer. */
export interface EnginePipelineContextChip {
	readonly kind: "design-system" | "brand-kit" | "assets" | "connector" | "tool" | "command" | "mcp" | "plugin";
	readonly ref: string;
	readonly sections?: readonly string[];
}

/** One loaded Pipeline from the engine catalog (`*.recipe.md` files shipped by
 *  plugins or dropped in the workspace; project wins on id collision). */
export interface EnginePipelineRecord {
	readonly specVersion: number;
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly icon: string;
	/** Card art as a data URI, when the pipeline ships one. */
	readonly artUrl?: string;
	readonly kind: string;
	readonly seed: string;
	readonly brings?: readonly EnginePipelineContextChip[];
	/** Skills the run applies (agent knowledge; loaded into run conditioning). */
	readonly skills?: readonly string[];
	readonly stages: readonly EnginePipelineStage[];
	readonly distribution: readonly EnginePipelineDistribution[];
	/** Agent-facing run instructions (the file's markdown body). */
	readonly body: string;
	readonly source: "project" | "plugin";
	readonly pluginId?: string;
}

/** A pipeline file that failed to parse/validate — it fails alone. */
export interface EnginePipelineIssue {
	readonly file: string;
	readonly pluginId?: string;
	readonly errors: readonly string[];
}
/** Canonical design axes a DESIGN.md may cover — a closed union so consumers
 *  keep autocomplete/exhaustiveness. */
export type EngineDesignAxis =
	| "theme"
	| "color"
	| "typography"
	| "components"
	| "layout"
	| "depth"
	| "responsive"
	| "anti-patterns"
	| "guide";

/** One design system from the engine catalog (`design-systems/<id>/DESIGN.md`
 *  shipped by plugins or dropped in the project `.fraym/`; project wins on id
 *  collision). Mirrors the engine's `DesignSystemRecord`. */
export interface EngineDesignSystemRecord {
	readonly id: string;
	readonly title: string;
	/** Raw `##` headings the DESIGN.md declares (numbering stripped). */
	readonly sections: readonly string[];
	/** Canonical axes covered — a pipeline's `brings` chip prunes to these. */
	readonly axes: readonly EngineDesignAxis[];
	readonly source: "project" | "plugin";
	readonly pluginId?: string;
	/** Absolute path to the DESIGN.md on the engine's machine. */
	readonly path: string;
}

/** A DESIGN.md that failed the engine's lint — it fails alone. */
export interface EngineDesignSystemIssue {
	readonly dir: string;
	readonly pluginId?: string;
	readonly errors: readonly string[];
}

// ── Teams (the jury primitive, doc 38) ───────────────────────────────────────

/** One member of a team's roster: an LLM juror (backed by an agent) or a
 *  deterministic code check (backed by an evaluator). */
export interface EngineTeamMemberRecord {
	readonly name: string;
	readonly kind: "llm" | "deterministic";
	readonly weight: number;
	/** The juror agent name (llm) or evaluator id (deterministic) this member runs. */
	readonly ref: string;
	readonly label: string;
	readonly description: string;
}

/** One bundled team (jury) — a named roster + fold strategy + gate threshold.
 *  Static catalog data, distinct from {@link EngineTeamToolDetails} (the runtime
 *  verdict a `team` call returns). */
export interface EngineTeamRecord {
	readonly id: string;
	readonly strategy: string;
	readonly strategyLabel: string;
	readonly strategyDescription: string;
	readonly threshold: number;
	readonly members: readonly EngineTeamMemberRecord[];
}

/** A deterministic evaluator a pipeline stage can thread onto a team's roster. */
export interface EngineEvaluatorRecord {
	readonly id: string;
	readonly label: string;
	readonly description: string;
}

/** An artifactory PACK a plugin contributes via `the plugin manifest`
 *  `artifactories[]` (doc 44 §15, 2026-07-17 transport ruling: the renderer
 *  bundle runs in a sandboxed iframe, served by the engine's `/plugin-assets`
 *  route; `@fraym/ui`'s bridged host adapts it into the stage registry).
 *  Mirrors the engine's `EngineArtifactoryRecord`. */
export interface EngineArtifactoryRecord {
	readonly id: string;
	readonly pluginId: string;
	readonly contractVersion: number;
	readonly label: string;
	readonly icon?: string;
	readonly extensions: readonly string[];
	/** Plugin-root-relative bundle path; the client composes
	 *  `GET /plugin-assets/<pluginId>/<bundle>` with the engine token. */
	readonly bundle: string;
	readonly signals?: readonly string[];
}

/** Install and enablement status for a plugin-contributed space. The snapshot
 * plugin inventory is authoritative: an absent owner is not installed and
 * therefore cannot be enabled. */
export interface EngineSpacePluginState {
	readonly installed: boolean;
	readonly enabled: boolean;
}

// ── Plugin-contributed spaces (doc 44 §13 — the assembly-tier lane) ──────────

/** A whole space a plugin contributes via `the plugin manifest` `spaces[]` as
 *  PURE DATA (assembly tier, ruled 2026-07-17: no plugin JS ships — the def
 *  mounts built-in surfaces and the classic kind implementations). Mirrors the
 *  engine's `EngineSpaceRecord`; the UI slice is structurally `SpaceUiDef`
 *  (`@fraym/ui`), the agent/dependency fields are the Space SDK's territory. */
export interface EngineSpaceRecord {
	readonly specVersion: 1;
	readonly id: string;
	readonly label: string;
	readonly icon: string;
	readonly order?: number;
	readonly description?: string;
	readonly implementations?: {
		readonly rail?: string;
		readonly dock?: string;
		readonly workspace?: string;
	};
	readonly rail: {
		readonly preferredMode?: "expanded" | "compact" | "hidden";
		readonly actions: readonly {
			readonly id: string;
			readonly label: string;
			readonly icon: string;
			readonly target: string;
			readonly surface?: string;
			readonly kbd?: string;
			readonly primary?: boolean;
			readonly disabled?: boolean;
		}[];
	};
	readonly workspace: {
		readonly surfaces: readonly string[];
		readonly fills?: Readonly<Record<string, string>>;
		readonly start: string;
		readonly session: string;
		readonly switchPolicy?: "remember" | "resetToStart";
	};
	readonly generalAgents?: {
		readonly list: readonly string[] | "discoverable";
		readonly default: string;
	};
	readonly requires?: {
		readonly plugins?: readonly string[];
		readonly skills?: readonly string[];
		readonly mcp?: readonly string[];
	};
	readonly pipelines?: string;
	readonly pluginId: string;
	readonly source: "plugin";
}

/** A registered project (engine project registry) — powers the plugin detail
 *  "Applies to: these projects" multi-select. Absent on engines that predate it. */
export interface EngineResourceProjectRef {
	readonly workspaceId: string;
	readonly displayName: string;
}

export interface EngineResourceSnapshot {
	readonly workspace: WorkspaceRef;
	readonly providers: readonly EngineProviderRecord[];
	readonly models: readonly EngineModelRecord[];
	readonly skills: readonly EngineSkillRecord[];
	readonly extensions: readonly EngineExtensionRecord[];
	readonly mcpServers: readonly EngineMcpServerRecord[];
	readonly plugins: readonly EnginePluginRecord[];
	readonly permissions: readonly EnginePermissionRecord[];
	/** The Pipeline catalog (absent on engines that predate it). */
	readonly pipelines?: readonly EnginePipelineRecord[];
	readonly pipelineIssues?: readonly EnginePipelineIssue[];
	/** The design-system catalog (absent on engines that predate it). */
	readonly designSystems?: readonly EngineDesignSystemRecord[];
	readonly designSystemIssues?: readonly EngineDesignSystemIssue[];
	/** The bundled team (jury) catalog + threadable evaluators (absent on engines
	 *  that predate it). */
	readonly teams?: readonly EngineTeamRecord[];
	readonly evaluators?: readonly EngineEvaluatorRecord[];
	/** Plugin-contributed spaces (assembly tier, doc 44 §13; absent on engines
	 *  that predate the lane). */
	readonly spaces?: readonly EngineSpaceRecord[];
	/** Plugin-contributed artifactory packs (bridged tier, doc 44 §15; absent
	 *  on engines that predate the lane). */
	readonly artifactories?: readonly EngineArtifactoryRecord[];
	/** Registered projects for the plugin "Applies to" control (absent on engines
	 *  that predate per-project plugin scope). */
	readonly projects?: readonly EngineResourceProjectRef[];
	readonly settings: EngineResourceSettingsSnapshot;
}

export type EnginePluginScope = "user" | "project";

/** Per-plugin tool-loading policy. `eager` registers the plugin's tools active at
 *  session start; `deferred` registers them inactive + discoverable so the model
 *  pulls them in via tool search only when needed. The EFFECTIVE value on a plugin
 *  record = user override ?? manifest `engine.toolLoading` default ?? `"deferred"`. */
export type PluginToolLoadingMode = "eager" | "deferred";

export interface PluginToolInfo {
	readonly name: string;
	/** Human display name for the tool card (falls back to `name`). */
	readonly label?: string;
	readonly description?: string;
}

/** A named capability a plugin ships (skill, rule, command, agent). */
export interface PluginCapabilityItem {
	readonly name: string;
	readonly description?: string;
}

/** An MCP server a plugin declares in its `.mcp.json`. */
export interface PluginMcpServerInfo {
	readonly name: string;
	readonly transport?: string;
}

export interface EnginePluginRecord {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly source: "npm" | "marketplace";
	readonly scope?: EnginePluginScope;
	readonly enabled: boolean;
	/** Per-project scope. Absent → global (every workspace); a list of workspace
	 *  ids → only those projects load the plugin + its MCP servers. */
	readonly projectScope?: readonly string[];
	/** Effective tool-loading policy (user override ?? manifest default ?? deferred). */
	readonly toolLoading?: PluginToolLoadingMode;
	readonly description?: string;
	/** Publisher display name (engine `author`: marketplace entry / package.json). */
	readonly developer?: string;
	readonly features?: readonly string[];
	readonly connect?: PluginConnectDescriptor;
	readonly lifecycle?: PluginLifecycle;
	readonly toolRenderer?: readonly PluginToolRendererDescriptor[];
	readonly skillCard?: PluginSkillCardDescriptor;
	/** 1–3 author-curated example prompts (detail page); clicking one seeds a session. */
	readonly examples?: readonly string[];
	/** Tools the plugin exposes (detail-page Tools section) — declared, or the
	 *  engine's enumeration of its registered tools when undeclared. */
	readonly tools?: readonly PluginToolInfo[];
	/** Plugin-shipped slash commands, enumerated from its loaded extension. */
	readonly commands?: readonly PluginCapabilityItem[];
	/** Plugin-shipped skills (skills/<name>/SKILL.md frontmatter). */
	readonly skills?: readonly PluginCapabilityItem[];
	/** Plugin-shipped rules (rules/*.md frontmatter). */
	readonly rules?: readonly PluginCapabilityItem[];
	/** Plugin-shipped subagents (agents/*.md frontmatter). */
	readonly agents?: readonly PluginCapabilityItem[];
	/** Plugin-shipped prompt templates (prompts/*.md, slash-invoked) — manifest-declared, or enumerated. */
	readonly prompts?: readonly PluginCapabilityItem[];
	/** MCP servers the plugin declares in its `.mcp.json`. */
	readonly mcpServers?: readonly PluginMcpServerInfo[];
	/** Extension event hooks the plugin registers. */
	readonly hooks?: readonly { readonly name: string; readonly description?: string }[];
	/** Approximate tokens statically added by always-applied rules. */
	readonly systemPromptTokens?: number;
	/** Fraym display name (`the plugin manifest` `title`) — overrides the title-cased slug. */
	readonly title?: string;
	/** Data-URI for a plugin-shipped icon asset (`the plugin manifest` `icon`). */
	readonly iconUrl?: string;
}

export interface EngineMarketplaceEntry {
	readonly name: string;
	readonly sourceType: "github" | "git" | "url" | "local";
	readonly sourceUri: string;
	readonly addedAt: string;
	readonly updatedAt: string;
}

export interface EngineMarketplacePlugin {
	readonly name: string;
	readonly marketplace: string;
	readonly description?: string;
	readonly version?: string;
	readonly author?: string;
	readonly homepage?: string;
	readonly category?: string;
	readonly keywords: readonly string[];
	readonly installed: boolean;
	/** Fraym display name from the plugin's `the plugin manifest` `title` (overrides the slug). */
	readonly title?: string;
	/** Card icon: a data-URI (plugin-shipped asset) or a bare glyph name, read from
	 *  the plugin's `the plugin manifest` in the marketplace clone. Absent → letter tile. */
	readonly icon?: string;
}

export interface EngineInstalledPlugin {
	readonly id: string;
	readonly scope: EnginePluginScope;
	readonly version: string;
	readonly enabled: boolean;
	readonly installedAt: string;
	readonly lastUpdated: string;
	readonly shadowed: boolean;
}

export interface EnginePluginUpdate {
	readonly pluginId: string;
	readonly scope: EnginePluginScope;
	readonly from: string;
	readonly to: string;
}

/**
 * UI-facing connect descriptor — the safe subset of a plugin manifest's
 * `connect` block (NO secrets). The engine derives it from the manifest; the
 * Fraym app renders the Connect/Reconnect/Disconnect affordance from it.
 */
export type PluginConnectKind = "oauth" | "form" | "cli";
export type PluginConnectStatus = "not-connected" | "connecting" | "connected" | "error" | "needs-install";

export interface PluginConnectFormField {
	readonly id: string;
	readonly label: string;
	readonly secret?: boolean;
	readonly placeholder?: string;
	readonly help?: string;
	readonly helpUrl?: string;
	readonly helpUrlLabel?: string;
}

/** A pre-connect setup step ("Before you connect") rendered by the generic
 *  connect modal as a check-off guide — display data straight from the plugin
 *  manifest (`connect.setup`). */
export interface PluginConnectSetupStep {
	readonly title: string;
	readonly detail?: string;
	readonly url?: string;
	readonly urlLabel?: string;
}

/** One connect-time OAuth scope choice (`connect.oauth.scopeOptions`) — display
 *  data only (id/label/detail/default). The scope strings themselves stay
 *  host-only in the engine; the modal sends the chosen `id` as `values.scopeOption`. */
export interface PluginConnectScopeOption {
	readonly id: string;
	readonly label: string;
	readonly detail?: string;
	readonly default?: boolean;
}

export interface PluginConnectDescriptor {
	readonly kind: readonly PluginConnectKind[];
	readonly form?: readonly PluginConnectFormField[];
	readonly requiresCommands?: readonly string[];
	/** UI-safe display id for the `oauth` fix kind (e.g. "google") — the CTA
	 *  reads "Connect with `<oauthProvider>`" generically off this. */
	readonly oauthProvider?: string;
	/** Pre-connect setup steps ("Before you connect") — display data only. */
	readonly setup?: readonly PluginConnectSetupStep[];
	/** Connect-time OAuth scope choices (e.g. google-drive readonly vs write).
	 *  Rendered as a radio group above the oauth Connect CTA; the picked `id`
	 *  rides the connect values as `scopeOption`. Display data only. */
	readonly oauthScopeOptions?: readonly PluginConnectScopeOption[];
}

/** Configured built-in tool-card `use` a plugin's `toolRenderer` entry selects. */
export type PluginToolRendererUse = "table" | "json" | "keyValue" | "summary";

/** UI-facing descriptor for one declared tool card — a matched tool name paired
 *  with a built-in renderer + its display config. No plugin code; the plugin
 *  selects a built-in (`use`) and configures it. */
export interface PluginToolRendererDescriptor {
	readonly match: string;
	readonly use: PluginToolRendererUse;
	readonly icon?: string;
	readonly title?: string;
	readonly columns?: readonly string[];
	readonly fields?: readonly string[];
	/** Input arg names rendered as head badges (e.g. `["op","name"]`). */
	readonly badges?: readonly string[];
}

/** Configured built-in skill-card `use` a plugin's `skillCard` entry selects. */
export type PluginSkillCardUse = "summary" | "steps";

/** UI-facing descriptor for the plugin's declared skill card. */
export interface PluginSkillCardDescriptor {
	readonly skill: string;
	readonly use: PluginSkillCardUse;
	readonly icon?: string;
	readonly title?: string;
}

/** An actionable follow-up attached to a connect state — from the engine's
 *  verify-failure mapping (e.g. Google's "API disabled" → an enable-API link).
 *  The modal renders title/detail plus an optional link button. */
export interface PluginConnectAction {
	readonly title: string;
	readonly detail?: string;
	readonly url?: string;
	readonly urlLabel?: string;
}

export interface PluginConnectState {
	readonly status: PluginConnectStatus;
	readonly detail?: string;
	/** Present when a verify probe failed with a KNOWN, fixable cause. */
	readonly action?: PluginConnectAction;
}

/**
 * Plugin Lifecycle Standard (docs/design/35-plugin-ui-contract.md) — ONE generic,
 * source-agnostic readiness state, computed by the engine and shipped in the
 * snapshot. Fraym renders plugin status from this single state everywhere (card,
 * detail, connect modal), so a plugin can never show "Installed" while a required
 * dependency is missing. The literals are load-bearing — they cross the ACP wire.
 */
export type PluginRequirementKind = "command" | "config" | "verify" | "liveness";
export type PluginRequirementStatus = "satisfied" | "missing" | "unknown";
export type PluginFixKind = "install" | "form" | "oauth" | "open-app" | "reconnect" | "agent";

export interface PluginRequirementFix {
	readonly kind: PluginFixKind;
	readonly detail?: string;
}

export interface PluginRequirement {
	readonly kind: PluginRequirementKind;
	readonly id: string;
	readonly label: string;
	readonly status: PluginRequirementStatus;
	readonly detail?: string;
	readonly fix?: PluginRequirementFix;
	readonly expensive?: boolean;
}

export type PluginLifecycleStatus = "off" | "blocked" | "ready";

export interface PluginLifecycle {
	readonly status: PluginLifecycleStatus;
	readonly requirements: readonly PluginRequirement[];
}

/** The first unmet requirement — drives the gallery chip label + the morphing CTA. */
export function firstUnmet(requirements: readonly PluginRequirement[]): PluginRequirement | undefined {
	return requirements.find(req => req.status === "missing");
}

/** ONE readiness state: the engine lifecycle status when present, else the
 *  enabled-boolean fallback. The single source for status DISPLAY everywhere —
 *  never read `installed` for status directly (that was the bug). */
export function resolveLifecycleStatus(
	lifecycle: PluginLifecycle | undefined,
	installed: boolean | undefined,
): PluginLifecycleStatus {
	return lifecycle?.status ?? (installed ? "ready" : "off");
}

export interface ResourceLoginAuthInfo {
	readonly url: string;
	readonly instructions?: string;
}

export interface ResourceLoginPrompt {
	readonly message: string;
	readonly placeholder?: string;
	readonly allowEmpty?: boolean;
}

export interface ResourceLoginCallbacks {
	readonly onAuth: (info: ResourceLoginAuthInfo) => void | Promise<void>;
	readonly onPrompt: (prompt: ResourceLoginPrompt) => Promise<string>;
	readonly onProgress?: (message: string) => void | Promise<void>;
	readonly onManualCodeInput?: () => Promise<string>;
	readonly signal?: AbortSignal;
}

/** A freshly minted phone-pairing link (single-use, TTL-bounded). */
export interface EngineMobilePairingInfo {
	readonly uri: string;
	readonly nodeId: string;
	readonly expiresInSecs: number;
	/** LAN install-page URL (QR #1: download + install), when the host serves an APK. */
	readonly downloadUrl?: string | null;
}

/** Pairing-bridge status — drives the Settings → Mobile pane's live states. */
export interface EngineMobilePairingStatus {
	readonly available: boolean;
	readonly running: boolean;
	readonly nodeId: string | null;
	readonly pairedCount: number;
	readonly lastPairedNodeId: string | null;
	readonly lastPairedAt: number | null;
	readonly error: string | null;
	/** LAN install-page URL (see {@link EngineMobilePairingInfo.downloadUrl}). */
	readonly downloadUrl?: string | null;
}

export interface EngineResourceDriver {
	getResourceSnapshot(workspace: WorkspaceRef): Promise<EngineResourceSnapshot>;
	refreshResources(workspace: WorkspaceRef): Promise<EngineResourceSnapshot>;
	/** Push: the engine saw an out-of-band plugin/marketplace/MCP registry write
	 *  (CLI, agent tool, another process) — refetch the snapshot. Optional
	 *  capability — pull-only drivers omit it. */
	subscribeResourcesChanged?(listener: () => void): Unsubscribe;
	/** Benchmark/usage insights for the model catalog, keyed `providerId/modelId`.
	 *  Optional capability — engines without the insight feed omit it. */
	getModelInsights?(workspace: WorkspaceRef): Promise<EngineModelInsightsResult>;
	/** Last snapshot this driver produced, if any — a synchronous read for
	 *  callers with no live UI state (e.g. resolving per-plugin deferred tools
	 *  at session start). Undefined on drivers that do not cache. */
	getLastSnapshot?(): EngineResourceSnapshot | null;
	login(
		workspace: WorkspaceRef,
		providerId: string,
		callbacks: ResourceLoginCallbacks,
	): Promise<EngineResourceSnapshot>;
	logout(workspace: WorkspaceRef, providerId: string): Promise<EngineResourceSnapshot>;
	setProviderApiKey(workspace: WorkspaceRef, providerId: string, apiKey: string): Promise<EngineResourceSnapshot>;
	pinProviderAccount(
		workspace: WorkspaceRef,
		providerId: string,
		accountKey: string | null,
	): Promise<EngineResourceSnapshot>;
	setProviderAccountPolicy(
		workspace: WorkspaceRef,
		providerId: string,
		policy: EngineProviderAccountSelectionPolicy,
	): Promise<EngineResourceSnapshot>;
	setProviderAccountPriorityOrder(
		workspace: WorkspaceRef,
		providerId: string,
		order: readonly string[],
	): Promise<EngineResourceSnapshot>;
	removeProviderAccount(
		workspace: WorkspaceRef,
		providerId: string,
		accountKey: string,
	): Promise<EngineResourceSnapshot>;
	setDefaultModel(
		workspace: WorkspaceRef,
		selection: {
			readonly provider: string;
			readonly modelId: string;
		},
	): Promise<EngineResourceSnapshot>;
	setDefaultThinkingLevel(
		workspace: WorkspaceRef,
		thinkingLevel: EngineResourceSettingsSnapshot["defaultThinkingLevel"],
	): Promise<EngineResourceSnapshot>;
	setEnableSkillCommands(workspace: WorkspaceRef, enabled: boolean): Promise<EngineResourceSnapshot>;
	setScopedModelPatterns(workspace: WorkspaceRef, patterns: readonly string[]): Promise<EngineResourceSnapshot>;
	setSkillEnabled(workspace: WorkspaceRef, filePath: string, enabled: boolean): Promise<EngineResourceSnapshot>;
	setExtensionEnabled(workspace: WorkspaceRef, filePath: string, enabled: boolean): Promise<EngineResourceSnapshot>;
	setMcpServerEnabled(workspace: WorkspaceRef, name: string, enabled: boolean): Promise<EngineResourceSnapshot>;
	listMarketplaces(workspace: WorkspaceRef): Promise<readonly EngineMarketplaceEntry[]>;
	addMarketplace(workspace: WorkspaceRef, source: string): Promise<readonly EngineMarketplaceEntry[]>;
	removeMarketplace(workspace: WorkspaceRef, name: string): Promise<readonly EngineMarketplaceEntry[]>;
	updateMarketplace(workspace: WorkspaceRef, name: string): Promise<readonly EngineMarketplaceEntry[]>;
	listAvailablePlugins(workspace: WorkspaceRef, marketplace?: string): Promise<readonly EngineMarketplacePlugin[]>;
	listInstalledPlugins(workspace: WorkspaceRef): Promise<readonly EngineInstalledPlugin[]>;
	installPlugin(
		workspace: WorkspaceRef,
		name: string,
		marketplace: string,
		scope?: EnginePluginScope,
	): Promise<EngineResourceSnapshot>;
	uninstallPlugin(
		workspace: WorkspaceRef,
		pluginId: string,
		scope?: EnginePluginScope,
	): Promise<EngineResourceSnapshot>;
	setPluginEnabled(
		workspace: WorkspaceRef,
		pluginId: string,
		enabled: boolean,
		scope?: EnginePluginScope,
	): Promise<EngineResourceSnapshot>;
	setPluginToolLoading(
		workspace: WorkspaceRef,
		pluginId: string,
		mode: PluginToolLoadingMode,
	): Promise<EngineResourceSnapshot>;
	setPluginProjectScope(
		workspace: WorkspaceRef,
		pluginId: string,
		projectScope: readonly string[] | null,
		scope?: EnginePluginScope,
	): Promise<EngineResourceSnapshot>;
	checkPluginUpdates(workspace: WorkspaceRef): Promise<readonly EnginePluginUpdate[]>;
	upgradePlugin(workspace: WorkspaceRef, pluginId: string, scope?: EnginePluginScope): Promise<EngineResourceSnapshot>;
	pluginConnectStatus(workspace: WorkspaceRef, pluginId: string): Promise<PluginConnectState>;
	pluginConnect(
		workspace: WorkspaceRef,
		pluginId: string,
		values: Record<string, string>,
	): Promise<PluginConnectState>;
	pluginDisconnect(workspace: WorkspaceRef, pluginId: string): Promise<PluginConnectState>;
	pluginInstallRequirement(workspace: WorkspaceRef, pluginId: string, command: string): Promise<PluginConnectState>;
	/** Run a plugin's `oauth` connect flow — same interactive auth/progress/prompt
	 *  event lane as `login()`. */
	pluginOAuthConnect(
		workspace: WorkspaceRef,
		pluginId: string,
		values: Record<string, string>,
		callbacks: ResourceLoginCallbacks,
	): Promise<PluginConnectState>;
	/**
	 * Mobile pairing (Settings → Mobile). Optional — engines without the iroh
	 * bridge omit both and the pane falls back to paste-a-link.
	 * `mobilePairingGet` mints a fresh single-use pairing link; the pane renders
	 * it as the QR a phone's stock camera scans.
	 */
	mobilePairingGet?(): Promise<EngineMobilePairingInfo>;
	mobilePairingStatus?(): Promise<EngineMobilePairingStatus>;
}

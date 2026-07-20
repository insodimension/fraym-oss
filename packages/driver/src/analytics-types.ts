import type { WorkspaceRef } from "./session-driver";

export type AnalyticsRange = "1d" | "3d" | "7d" | "30d" | "all";

export interface AnalyticsQuery {
	readonly range?: AnalyticsRange;
}

export type AnalyticsFreshnessStatus = "ready" | "syncing" | "stale" | "unavailable";

export interface AnalyticsFreshness {
	readonly status: AnalyticsFreshnessStatus;
	readonly source: string;
	readonly syncedAt?: string;
	readonly processedFiles?: number;
	readonly processedRows?: number;
	readonly error?: string;
}

export interface AnalyticsOverview {
	readonly sessions: number;
	readonly messages: number;
	readonly requests: number;
	readonly errors: number;
	readonly errorRate: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cacheReadTokens: number;
	readonly cacheWriteTokens: number;
	readonly totalTokens: number;
	readonly cacheRate: number;
	readonly totalCost: number;
	readonly premiumRequests: number;
	readonly activeDays: number;
	readonly currentStreak: number;
	readonly peakHour?: number | null;
	readonly latestActivityAt?: string;
	readonly averageDurationMs?: number | null;
	readonly averageTtftMs?: number | null;
	readonly averageTokensPerSecond?: number | null;
}

export interface AnalyticsActivityBucket {
	readonly timestamp: number;
	readonly date: string;
	readonly sessions?: number;
	readonly messages: number;
	readonly requests: number;
	readonly errors: number;
	readonly tokens: number;
	readonly cost: number;
	readonly level: number;
}

/**
 * External-benchmark "world" standing for a model, joined from public leaderboards.
 * OpenRouter aggregates **Design Arena** (coding ELO/rank/win-rate) and
 * **Artificial Analysis** indices; pricing is the model's published list price.
 *
 * Latency/throughput here are OPTIONAL and default to null: OpenRouter does NOT
 * expose world TTFT/tok-s, so they stay absent until a latency source
 * (Artificial Analysis API / llm-stats) is wired. Never fabricate them.
 */
export interface AnalyticsModelWorld {
	/** Matched external model slug, e.g. "openai/gpt-4o". */
	readonly slug: string;
	/** Design Arena coding ELO (arena "models" / category "codecategories"). */
	readonly codingElo?: number | null;
	/** Design Arena coding rank (1 = best). */
	readonly codingRank?: number | null;
	/** Total models ranked in that arena — denominator for "rank N of M". */
	readonly rankPool?: number | null;
	/** Design Arena coding win-rate, 0-100. */
	readonly codingWinRate?: number | null;
	/** Artificial Analysis indices (0-100), when published for this model. */
	readonly intelligenceIndex?: number | null;
	readonly codingIndex?: number | null;
	readonly agenticIndex?: number | null;
	/** Published list price, USD per million tokens. */
	readonly priceInputPerMTok?: number | null;
	readonly priceOutputPerMTok?: number | null;
	/** World-measured latency/throughput — only when a non-OpenRouter source supplies it. */
	readonly ttftMs?: number | null;
	readonly tokensPerSecond?: number | null;
}

/** Provenance for the joined external-benchmark layer (snapshot-level). */
export interface AnalyticsBenchmarkMeta {
	/** Human label for the world-data source, e.g. "Design Arena + Artificial Analysis". */
	readonly source: string;
	/** ISO timestamp the world data was last fetched/cached. */
	readonly syncedAt?: string;
	/** Models in the ranked pool (for global rank denominators). */
	readonly rankPool?: number | null;
}

export interface AnalyticsModelStats {
	readonly model: string;
	readonly provider: string;
	readonly requests: number;
	readonly errors: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly totalTokens: number;
	readonly cacheRate: number;
	readonly totalCost: number;
	readonly averageTtftMs?: number | null;
	readonly averageTokensPerSecond?: number | null;
	readonly lastActivityAt?: string;
	/** TTFT percentiles (ms), when the aggregator retains per-request samples. */
	readonly ttftP50Ms?: number | null;
	readonly ttftP95Ms?: number | null;
	/** External-benchmark standing for this model, joined from public leaderboards. */
	readonly world?: AnalyticsModelWorld | null;
}

export interface AnalyticsCostBucket {
	readonly timestamp: number;
	readonly date: string;
	readonly model: string;
	readonly provider: string;
	readonly cost: number;
	readonly costInput: number;
	readonly costOutput: number;
	readonly costCacheRead: number;
	readonly costCacheWrite: number;
	readonly requests: number;
}

export interface AnalyticsBehaviorStats {
	readonly messages: number;
	readonly yelling: number;
	readonly profanity: number;
	readonly anguish: number;
	readonly negation: number;
	readonly repetition: number;
	readonly blame: number;
	readonly characters: number;
}

export interface AnalyticsBehaviorModelStats extends AnalyticsBehaviorStats {
	readonly model: string;
	readonly provider: string;
	readonly lastActivityAt?: string;
}

export interface AnalyticsRecentRequest {
	readonly id?: number;
	readonly timestamp: number;
	readonly model: string;
	readonly provider: string;
	readonly stopReason: string;
	readonly errorMessage?: string | null;
	readonly totalTokens: number;
	readonly cost: number;
}

/** Per-tool latency/error rollup — Phase 2 (harness performance). */
export interface AnalyticsToolStats {
	readonly name: string;
	readonly calls: number;
	readonly errors: number;
	readonly avgLatencyMs: number | null;
	readonly p50LatencyMs: number | null;
	readonly p95LatencyMs: number | null;
}

/** Tool-calls/messages per turn (turn = bounded by consecutive user messages). */
export interface AnalyticsTurnShape {
	readonly turns: number;
	readonly avgToolCallsPerTurn: number;
	readonly avgAssistantMessagesPerTurn: number;
	readonly maxToolCallsInTurn: number;
}

/** Requests/tokens/cost attributed to the main agent vs task subagents vs the advisor. */
export interface AnalyticsAgentTypeStats {
	readonly agentType: "main" | "subagent" | "advisor";
	readonly requests: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cacheReadTokens: number;
	readonly cacheWriteTokens: number;
	readonly totalCost: number;
}

export interface AnalyticsHarnessStats {
	readonly tools: readonly AnalyticsToolStats[];
	readonly turnShape: AnalyticsTurnShape;
	readonly byAgentType: readonly AnalyticsAgentTypeStats[];
}

/** Window-over-window comparison for one model ("opus vs last week"). */
export interface AnalyticsModelDegradation {
	readonly model: string;
	readonly provider: string;
	readonly currentAvgTtftMs: number | null;
	readonly previousAvgTtftMs: number | null;
	readonly ttftDeltaPct: number | null;
	readonly currentTokensPerSecond: number | null;
	readonly previousTokensPerSecond: number | null;
	readonly throughputDeltaPct: number | null;
	readonly currentRequests: number;
	readonly previousRequests: number;
	readonly trend: "slower" | "faster" | "flat";
}

export interface AnalyticsDegradation {
	readonly windowDays: number;
	readonly currentWindowStart: string;
	readonly previousWindowStart: string;
	readonly models: readonly AnalyticsModelDegradation[];
}

export interface AnalyticsSnapshot {
	readonly workspace: WorkspaceRef;
	readonly range: AnalyticsRange;
	readonly freshness: AnalyticsFreshness;
	readonly overview: AnalyticsOverview;
	readonly activity: readonly AnalyticsActivityBucket[];
	readonly models: readonly AnalyticsModelStats[];
	readonly costs: readonly AnalyticsCostBucket[];
	readonly behavior?: {
		readonly overall: AnalyticsBehaviorStats;
		readonly byModel: readonly AnalyticsBehaviorModelStats[];
	};
	readonly harness?: AnalyticsHarnessStats;
	readonly degradation?: AnalyticsDegradation;
	readonly recentRequests: readonly AnalyticsRecentRequest[];
	readonly recentErrors: readonly AnalyticsRecentRequest[];
	readonly benchmarks?: AnalyticsBenchmarkMeta;
}

/** Result of a live "Test my models now" speed test — real, billed API calls, never automatic. */
export interface AnalyticsBenchResult {
	readonly selector: string;
	readonly model: string;
	readonly ttftMs: number | null;
	readonly tokensPerSecond: number | null;
	readonly outputTokens: number | null;
	readonly runs: number;
	readonly failures: number;
	readonly error?: string;
}

export interface AnalyticsDriver {
	getWorkspaceAnalytics(workspace: WorkspaceRef, query?: AnalyticsQuery): Promise<AnalyticsSnapshot>;
	refreshWorkspaceAnalytics(workspace: WorkspaceRef, query?: AnalyticsQuery): Promise<AnalyticsSnapshot>;
	runBenchmark(models: readonly string[], runs?: number): Promise<readonly AnalyticsBenchResult[]>;
}

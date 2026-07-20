// Subscription/provider usage limits — live quota windows with reset times.
//
// Distinct from analytics (historical tokens/cost/requests) and from
// `ContextUsage` (per-session context-window meter). This contract describes the
// account-global usage limits Engine fetches from each provider's quota endpoint,
// normalized into UI-friendly view shapes by the adapter layer.

export type UsageUnit = "percent" | "tokens" | "requests" | "usd" | "minutes" | "bytes" | "unknown";

export type UsageStatus = "ok" | "warning" | "exhausted" | "unknown";

export type UsageFreshnessStatus = "ready" | "syncing" | "stale" | "unavailable";

export interface UsageFreshness {
	readonly status: UsageFreshnessStatus;
	readonly source: string;
	readonly fetchedAt?: number;
	readonly error?: string;
}

/** Reset window for a limit (e.g. 5h, 7d, monthly). */
export interface UsageWindowView {
	readonly id: string;
	readonly label: string;
	readonly durationMs?: number;
	/** Absolute reset timestamp in milliseconds since epoch. */
	readonly resetsAt?: number;
}

/** A single normalized limit row, ready to render. */
export interface UsageLimitView {
	readonly id: string;
	readonly label: string;
	readonly provider: string;
	readonly accountLabel?: string;
	readonly scopeTier?: string;
	readonly status: UsageStatus;
	/** 0..100, or `null` when the provider reports no quantifiable usage. */
	readonly usedPercent: number | null;
	readonly used?: number;
	readonly limit?: number;
	readonly remaining?: number;
	readonly unit: UsageUnit;
	readonly window?: UsageWindowView;
	readonly notes?: readonly string[];
	/** True when this limit's account is in use by the active session. */
	readonly inUse?: boolean;
}

/** A provider account grouping its limit rows. */
export interface UsageAccountView {
	readonly id: string;
	readonly provider: string;
	readonly label: string;
	readonly planType?: string;
	readonly accountId?: string;
	/** True when this account is the one in use by the active session. */
	readonly inUse?: boolean;
	/** When this account's report was actually fetched from the provider — may lag `UsageSnapshot.fetchedAt` when a per-account fetch is failing and a cached report is being served. */
	readonly fetchedAt?: number;
	readonly limits: readonly UsageLimitView[];
}

export interface UsageSnapshot {
	readonly fetchedAt: number;
	readonly freshness: UsageFreshness;
	readonly accounts: readonly UsageAccountView[];
	/** Flattened limits across every account, for quick glance rendering. */
	readonly limits: readonly UsageLimitView[];
}

export interface UsageQuery {
	/** Bypass any cached report and force a fresh upstream fetch. */
	readonly force?: boolean;
	/**
	 * Scope `inUse` resolution to this session's actual routed account (a
	 * pooled OAuth credential can fail over mid-session) instead of the
	 * process-wide priority-order default. Omit for the session-agnostic
	 * account overview (e.g. a settings/dashboard view).
	 */
	readonly sessionId?: string;
}

export interface UsageDriver {
	getUsage(query?: UsageQuery): Promise<UsageSnapshot>;
	refreshUsage(query?: UsageQuery): Promise<UsageSnapshot>;
}

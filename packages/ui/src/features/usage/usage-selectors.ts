import type { UsageLimitView, UsageSnapshot } from "@fraym-ai/driver";

export interface UsageLimitSelectionOptions {
	readonly provider?: string | null;
}

const USAGE_PROVIDER_ALIASES: Record<string, string> = {
	"openai-codex": "openai",
};

function canonicalUsageProvider(provider: string): string {
	return USAGE_PROVIDER_ALIASES[provider] ?? provider;
}

function matchesProvider(limit: UsageLimitView, provider: string): boolean {
	return canonicalUsageProvider(limit.provider) === canonicalUsageProvider(provider);
}

export function usageSnapshotHasData(snapshot: UsageSnapshot | null | undefined): boolean {
	return Boolean(snapshot && snapshot.limits.length > 0);
}

export function selectTopUsageLimits(
	snapshot: UsageSnapshot | null | undefined,
	count: number,
	options?: UsageLimitSelectionOptions,
): readonly UsageLimitView[] {
	if (!snapshot || count <= 0) return [];
	const provider = options?.provider;
	const scoped = provider ? snapshot.limits.filter(limit => matchesProvider(limit, provider)) : snapshot.limits;
	// When the engine has pinned an in-use account for this provider (priority
	// fallback), show ITS limits — not the globally heaviest-used account, which
	// would misrepresent the session's actual plan usage.
	const inUse = scoped.filter(limit => limit.inUse);
	const pool = inUse.length > 0 ? inUse : scoped;
	return [...pool].sort((a, b) => (b.usedPercent ?? -1) - (a.usedPercent ?? -1)).slice(0, count);
}

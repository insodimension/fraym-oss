import type { ContextUsage, SessionDriver, SessionRef } from "@fraym/driver";
import { contextBreakdownPercent } from "../features/context-popover/context-popover";
import { useContextBreakdown } from "./use-context-breakdown";

export interface LiveContextSource {
	readonly driver: SessionDriver | null;
	readonly sessionRef: SessionRef | null;
	readonly contextUsage: ContextUsage | null;
	readonly isStreaming: boolean;
	readonly isCompacting?: boolean;
}

/**
 * Percent (0..100) of the context window used, for the always-visible context
 * ring/badge. Derives from the on-demand `getContextBreakdown` — the SAME
 * source the context popover trusts — so the ring agrees with the popover by
 * construction and is correct on session open, where the engine has not yet
 * pushed a live `contextUsage` (it only emits one at end-of-turn). The breakdown
 * refetches on a per-turn cadence (streaming toggle + last usage tokens) and on
 * compaction lifecycle changes, because compaction can rewrite/clear context
 * without changing the last pushed usage token count.
 *
 * Falls back to the live `contextUsage` meter while the breakdown is still
 * loading or when the driver lacks the capability, and returns `undefined` when
 * neither source has data yet (so a conditional ring can stay hidden).
 */
export function useLiveContextPercent(session: LiveContextSource | null | undefined): number | undefined {
	const refreshKey = `${session?.isStreaming ? "s" : "i"}:${session?.isCompacting ? "c" : "n"}:${session?.contextUsage?.tokens ?? ""}`;
	const { breakdown } = useContextBreakdown(session?.driver, session?.sessionRef, true, refreshKey);
	if (breakdown && breakdown.contextWindow > 0) return contextBreakdownPercent(breakdown);
	return contextUsagePercent(session?.contextUsage);
}

/**
 * Percent from the live `contextUsage` meter — the cheap fallback used until the
 * breakdown lands. Prefers the real token/window ratio; otherwise normalizes the
 * adapter `percent` (a 0..1 fraction on ACP, 0..100 on native Engine). Returns
 * `undefined` when usage carries no usable number.
 */
export function contextUsagePercent(usage: ContextUsage | null | undefined): number | undefined {
	let raw: number;
	if (usage?.tokens != null && usage.contextWindow > 0) {
		raw = (usage.tokens / usage.contextWindow) * 100;
	} else if (usage?.percent != null) {
		raw = (usage.percent > 1 ? usage.percent / 100 : usage.percent) * 100;
	} else {
		return undefined;
	}
	return Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;
}

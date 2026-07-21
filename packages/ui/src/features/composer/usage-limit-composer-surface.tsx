import type { UsageLimitView } from "@fraym-ai/driver";
import { memo, useEffect, useState } from "react";
import { useSessionOptional, useUsage } from "../../hooks";
import { Icon } from "../../icons";
import { useSettings } from "../../settings/use-settings";
import { useUsageDriverContext } from "../command-dock/usage-state";
import { formatResetCountdown } from "../usage/usage-format";
import { usageWarnColor, usageWarnTier } from "../usage/usage-warn";
import { isUsageDismissed, usageDismissKey, withUsageDismissed } from "../usage/usage-warn-dismiss";

/**
 * Single-line account-quota warning pinned above the composer (same chrome as
 * `GoalComposerSurface`). Shows only the window CLOSEST to its limit; every
 * window in warning is listed in the hover title.
 *
 * Domain-state lane, realtime: reads the polled `UsageSnapshot` from the
 * workspace usage driver (the same typed data as the Usage & limits dock) — it
 * appears as a window nears its limit and clears itself after the window
 * resets. It does NOT read the `usage:limit` custom messages: those are
 * transcript/TUI warning EVENTS, while this strip presents current STATE.
 *
 * Subscription binding: warnings are scoped to the session's ACTIVE provider
 * (`session.config.provider` — the same provider-id namespace usage reports
 * use, so the binding is pure id equality, no mapping table). Switching the
 * model re-binds the strip; without a session/model it falls back to all
 * subscriptions. Other providers' warnings stay visible in the hover title.
 *
 * Dismissal is keyed to (worst window, band) and PERSISTED to localStorage, so
 * it survives remount, session-switch and reload — it re-appears only when usage
 * climbs into a higher band, a different window becomes the worst offender, or
 * the window resets.
 */

/** Provider-first so two accounts sharing an email never read alike —
 *  e.g. `openai-codex · 7 days [alex@…]` vs another provider's weekly window. */
function limitTitle(limit: {
	readonly provider: string;
	readonly label: string;
	readonly accountLabel?: string;
}): string {
	const account = limit.accountLabel ? ` [${limit.accountLabel}]` : "";
	return `${limit.provider} · ${limit.label}${account}`;
}

/** Percent-or-status label. A provider that reports no quantifiable usage
 *  (Codex often reports only `limit_reached`, no percentage) has
 *  `usedPercent: null`; show its status instead of a false "0.0% used". */
function usedLabel(limit: UsageLimitView): string {
	if (limit.usedPercent === null) return limit.status === "exhausted" ? "limit reached" : "usage unknown";
	return `${limit.usedPercent.toFixed(1)}% used`;
}

function useResetCountdownNow(resetsAt: number | undefined): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!resetsAt || resetsAt <= Date.now()) return;
		let timer = 0;
		const tick = () => {
			const next = Date.now();
			setNow(next);
			const remaining = resetsAt - next;
			if (remaining <= 0) return;
			const delay = remaining <= 60_000 ? 1000 : Math.min(60_000, remaining - 60_000);
			timer = window.setTimeout(tick, Math.max(1000, delay));
		};
		tick();
		return () => window.clearTimeout(timer);
	}, [resetsAt]);
	return now;
}

/**
 * Picks the usage warnings the strip should show, bound to the session's active
 * provider. While a session is opening (or open before its provider resolves) it
 * shows NOTHING rather than falling back to every subscription — otherwise another
 * account's limit (e.g. an exhausted openai-codex window) flashes above an
 * unrelated session for the ~1s until the active provider binds. The
 * all-subscriptions fallback is reserved for the genuine no-session view.
 */
export function selectProviderWarnings(
	allWarnings: readonly UsageLimitView[],
	activeProvider: string | undefined,
	sessionActive: boolean,
): readonly UsageLimitView[] {
	if (activeProvider) return allWarnings.filter(l => l.provider === activeProvider);
	return sessionActive ? [] : allWarnings;
}

/**
 * A provider with per-model caps reports BOTH account-wide
 * windows (5h / 7d — `scopeTier` undefined) AND per-model weekly caps
 * (`scopeTier` = "fable" | "opus" | "sonnet" | "mythos" | …). A model-scoped cap
 * is only relevant when THAT model is the active one: a Fable 7-day cap at 100%
 * must NOT warn an Opus session that has full headroom. Keep every account-wide
 * window; keep a model-scoped window only when its tier matches the active model.
 * A tier-scoped row for a different model still surfaces in the hover title (as an
 * "other subscriptions" line), just not as the primary warning strip.
 */
const MODEL_TIERS = ["fable", "mythos", "sonnet", "opus", "haiku"] as const;

export function modelTierFromId(modelId: string | undefined): string | undefined {
	if (!modelId) return undefined;
	const id = modelId.toLowerCase();
	// Longest/most-specific kinds first; substring match tolerates version suffixes
	// (claude-fable-5, claude-opus-4-8, claude-sonnet-4-5, claude-mythos-5, …).
	for (const tier of MODEL_TIERS) {
		if (id.includes(tier)) return tier;
	}
	return undefined;
}

export function selectModelScopedWarnings(
	limits: readonly UsageLimitView[],
	activeModelId: string | undefined,
): readonly UsageLimitView[] {
	// No active model (the genuine no-session glance) → don't hide anything.
	if (!activeModelId) return limits;
	const activeTier = modelTierFromId(activeModelId);
	// Keep account-wide windows (no scopeTier) and any NON-model scopeTier (an
	// account plan some providers put here, e.g. Codex "pro") — only a real
	// per-MODEL cap is scoped to its model, so a maxed Fable cap still never
	// warns an Opus session.
	return limits.filter(
		l => !l.scopeTier || !(MODEL_TIERS as readonly string[]).includes(l.scopeTier) || l.scopeTier === activeTier,
	);
}

/**
 * Restrict to the account the active session is actually BILLING when the snapshot
 * marks one (`inUse` — set under the priority-fallback policy that pins a single
 * account); otherwise fall back to every account (weighted rotation pins none → warn
 * on the worst). Without this, a pooled-but-idle account (e.g. a disabled one sitting
 * at 71%) warns over the account actually in use that's nowhere near its limit.
 */
export function selectInUseLimits(limits: readonly UsageLimitView[]): readonly UsageLimitView[] {
	const inUse = limits.filter(l => l.inUse);
	return inUse.length > 0 ? inUse : limits;
}

export const UsageLimitComposerSurface = memo(function UsageLimitComposerSurface() {
	const { config, update } = useSettings();
	const session = useSessionOptional();
	const usageDriver = useUsageDriverContext();
	// Own poll, scoped to THIS session's sessionId — `inUse` must reflect the
	// account this session is actually routed to right now, not the root's
	// session-agnostic priority-order guess. A pooled OAuth credential can fail
	// over mid-session (rate-limited -> next account in the pool); the strip
	// used to keep naming the pre-failover account forever because the shared
	// app-root snapshot never knew which session moved off it.
	const usage = useUsage(usageDriver, { sessionId: session?.sessionRef?.sessionId });

	const limits = selectInUseLimits(usage.snapshot?.limits ?? []);
	const allWarnings = limits.filter(
		l => l.status === "exhausted" || (l.usedPercent !== null && l.usedPercent >= config.usageWarnThreshold),
	);
	const activeProvider = session?.snapshot?.config?.provider;
	const activeModelId = session?.snapshot?.config?.modelId;
	// A present-or-opening session whose provider hasn't bound yet must not flash
	// another subscription's warning; only the true no-session view shows all.
	const sessionActive = Boolean(session?.isOpening || session?.snapshot);
	// Scope by provider AND by the active model's tier — a per-model cap (e.g.
	// Fable's weekly limit) must not warn a session on a different model.
	const warning = selectModelScopedWarnings(
		selectProviderWarnings(allWarnings, activeProvider, sessionActive),
		activeModelId,
	);
	// Rank a hard-exhausted row (a provider like Codex reports exhaustion with no
	// percentage → usedPercent null) above any quantified row so it wins as `worst`.
	const rankWarning = (l: UsageLimitView) =>
		l.status === "exhausted" ? Number.POSITIVE_INFINITY : (l.usedPercent ?? 0);
	const worst = warning.reduce<(typeof warning)[number] | null>(
		(top, l) => (!top || rankWarning(l) > rankWarning(top) ? l : top),
		null,
	);
	const now = useResetCountdownNow(worst?.window?.resetsAt);
	if (!config.usageWarnEnabled || !worst) return null;

	const percent = Math.min(100, Math.max(0, worst.usedPercent ?? 100));

	const warnAt = config.usageWarnThreshold;
	const redAt = Math.max(warnAt, config.usageWarnRedThreshold);
	const currentTier = usageWarnTier(percent, redAt);
	const liveResetsAt = worst.window?.resetsAt ?? 0;
	const dismissKey = usageDismissKey(worst.id, worst.accountLabel ?? "");
	if (isUsageDismissed(config.usageWarnDismissed, dismissKey, currentTier, liveResetsAt)) return null;

	const color = usageWarnColor(percent, warnAt, redAt);
	const resetsIn = formatResetCountdown(worst.window?.resetsAt, now);
	const otherWarnings = allWarnings.filter(l => !warning.includes(l));
	const detailTitle = [
		...warning.map(l => `${limitTitle(l)}: ${usedLabel(l)}`),
		...(otherWarnings.length > 0
			? ["— other subscriptions —", ...otherWarnings.map(l => `${limitTitle(l)}: ${usedLabel(l)}`)]
			: []),
	].join("\n");

	return (
		<div
			data-slot="usage-limit-composer-surface"
			title={detailTitle}
			className="relative z-10 mx-5 -mb-px flex min-h-9 items-center gap-2 rounded-t-[14px] border border-fr-border bg-fr-surface/95 px-3 py-2 shadow-[0_10px_26px_-22px_rgba(0,0,0,0.75)] backdrop-blur"
		>
			<Icon name="bolt" size={14} className="shrink-0" style={{ color }} />
			<span className="shrink-0 text-fr-sm font-medium" style={{ color }}>
				Usage limit
			</span>
			<span className="min-w-0 flex-1 fr-overflow text-fr-sm text-fr-text-3">{limitTitle(worst)}</span>
			<span className="shrink-0 font-secondary text-fr-xs tabular-nums" style={{ color }}>
				{usedLabel(worst)}
			</span>
			{resetsIn && (
				<>
					<span className="shrink-0 text-fr-text-3">•</span>
					<span className="shrink-0 font-secondary text-fr-xs text-fr-text-2">{resetsIn}</span>
				</>
			)}
			{warning.length > 1 && (
				<span className="shrink-0 font-secondary text-fr-xs text-fr-text-3">+{warning.length - 1} more</span>
			)}
			<button
				type="button"
				aria-label="Dismiss usage warning"
				title="Dismiss until usage goes red"
				onClick={() =>
					update(
						"usageWarnDismissed",
						withUsageDismissed(config.usageWarnDismissed, dismissKey, currentTier, liveResetsAt),
					)
				}
				className="flex size-6 shrink-0 items-center justify-center rounded-full text-fr-text-3 transition-colors hover:bg-fr-surface-3 hover:text-fr-text"
			>
				<Icon name="x" size={13} />
			</button>
			<div className="absolute inset-x-3 bottom-0 h-px overflow-hidden bg-fr-surface-3">
				<div
					role="progressbar"
					aria-valuenow={Math.round(percent)}
					aria-valuemin={0}
					aria-valuemax={100}
					className="h-full transition-[width] duration-500"
					style={{ width: `${percent}%`, backgroundColor: color }}
				/>
			</div>
		</div>
	);
});

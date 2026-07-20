import type { UsageLimitView } from "@fraym/driver";
import type { PlanLimit } from "../context-popover/context-popover";
import { formatResetCountdown } from "./usage-format";

/**
 * Compact, distinguishing token for a pooled account, derived from its label
 * (usually an email). The dominant multi-account setup is one person with
 * several provider accounts that share an email local part and differ only by
 * domain (e.g. `me@example.com` vs `me@acme.test`), so the domain's
 * second-level name (`example`, `acme`) is the clearest compact distinguisher.
 * Non-email labels pass through unchanged.
 */
function accountToken(accountLabel: string | undefined): string | undefined {
	if (!accountLabel) return undefined;
	const at = accountLabel.indexOf("@");
	if (at <= 0) return accountLabel;
	const domain = accountLabel.slice(at + 1);
	return domain.split(".")[0] || accountLabel;
}

/**
 * Map the selected usage limits to context-popover plan rows.
 *
 * When two pooled accounts are active the selection can surface the same window
 * twice (e.g. two `Claude 7 Day` rows, one per account). Rendered with only
 * `limit.label` they read as confusing duplicates — and collide on the popover's
 * `key={name}`. Rows whose label appears more than once are disambiguated with a
 * compact per-account token (`Claude 7 Day · example` / `· acme`); unique rows
 * keep their bare label.
 */
export function toPlanLimits(limits: readonly UsageLimitView[]): PlanLimit[] {
	const labelCounts = new Map<string, number>();
	for (const limit of limits) labelCounts.set(limit.label, (labelCounts.get(limit.label) ?? 0) + 1);
	return limits.map(limit => {
		const ambiguous = (labelCounts.get(limit.label) ?? 0) > 1;
		const token = ambiguous ? accountToken(limit.accountLabel) : undefined;
		return {
			name: token ? `${limit.label} · ${token}` : limit.label,
			pct: limit.usedPercent == null ? 0 : Math.round(limit.usedPercent),
			resets: formatResetCountdown(limit.window?.resetsAt) ?? limit.window?.label ?? "",
			status: limit.status,
		};
	});
}

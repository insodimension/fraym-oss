import type { UsageAccountCard, UsageMeter, UsagePanel } from "@fraym/ui";
import { selectTopUsageLimits } from "@fraym/ui";
import type { ComponentProps } from "react";

type UsageSnapshot = NonNullable<ComponentProps<typeof UsagePanel>["snapshot"]>;
type UsageAccountView = ComponentProps<typeof UsageAccountCard>["account"];
type UsageLimitView = ComponentProps<typeof UsageMeter>["limit"];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function resetIn(ms: number): number {
	return Date.now() + ms;
}

function limit(overrides: Partial<UsageLimitView> & Pick<UsageLimitView, "id" | "label" | "provider">): UsageLimitView {
	return {
		status: "ok",
		usedPercent: 0,
		unit: "percent",
		...overrides,
	};
}

export const assistant_ACCOUNT: UsageAccountView = {
	id: "assistant:default",
	provider: "assistant",
	label: "assistant",
	planType: "Max",
	accountId: "alex@fraym.dev",
	inUse: true,
	limits: [
		limit({
			id: "assistant-5h",
			label: "5-hour session",
			provider: "assistant",
			accountLabel: "alex@fraym.dev",
			status: "ok",
			usedPercent: 22,
			used: 22,
			limit: 100,
			unit: "percent",
			window: { id: "5h", label: "5 Hour", durationMs: 5 * HOUR, resetsAt: resetIn(3 * HOUR + 12 * 60 * 1000) },
		}),
		limit({
			id: "assistant-7d",
			label: "Weekly · all models",
			provider: "assistant",
			status: "warning",
			usedPercent: 88,
			used: 88,
			limit: 100,
			unit: "percent",
			window: { id: "7d", label: "7 Day", durationMs: 7 * DAY, resetsAt: resetIn(4 * DAY) },
		}),
		limit({
			id: "assistant-opus",
			label: "Weekly · Opus",
			provider: "assistant",
			status: "exhausted",
			usedPercent: 100,
			used: 100,
			limit: 100,
			unit: "percent",
			window: { id: "7d-opus", label: "7 Day", durationMs: 7 * DAY, resetsAt: resetIn(2 * DAY + 6 * HOUR) },
		}),
	],
};

export const CODEX_ACCOUNT: UsageAccountView = {
	id: "openai-codex:default",
	provider: "openai-codex",
	label: "OpenAI Codex",
	planType: "Plus",
	limits: [
		limit({
			id: "codex-5h",
			label: "5-hour limit",
			provider: "openai-codex",
			status: "ok",
			usedPercent: 41,
			used: 2050,
			limit: 5000,
			remaining: 2950,
			unit: "requests",
			window: { id: "5h", label: "5 Hour", resetsAt: resetIn(1 * HOUR + 40 * 60 * 1000) },
		}),
		limit({
			id: "codex-credits",
			label: "Monthly credits",
			provider: "openai-codex",
			status: "ok",
			usedPercent: 63,
			used: 31.5,
			limit: 50,
			remaining: 18.5,
			unit: "usd",
			window: { id: "monthly", label: "Monthly", resetsAt: resetIn(12 * DAY) },
		}),
	],
};

export const COPILOT_ACCOUNT: UsageAccountView = {
	id: "github-copilot:default",
	provider: "github-copilot",
	label: "GitHub Copilot",
	planType: "Business",
	limits: [
		limit({
			id: "copilot-premium",
			label: "Premium requests",
			provider: "github-copilot",
			status: "warning",
			usedPercent: 92,
			used: 276,
			limit: 300,
			remaining: 24,
			unit: "requests",
			window: { id: "monthly", label: "Monthly", resetsAt: resetIn(9 * DAY) },
		}),
	],
};

function snapshot(
	accounts: readonly UsageAccountView[],
	freshness?: Partial<UsageSnapshot["freshness"]>,
): UsageSnapshot {
	return {
		fetchedAt: Date.now(),
		freshness: { status: "ready", source: "kitchen-sink", fetchedAt: Date.now(), ...freshness },
		accounts,
		limits: accounts.flatMap(account => account.limits),
	};
}

export const HEALTHY_SNAPSHOT = snapshot([assistant_ACCOUNT, CODEX_ACCOUNT, COPILOT_ACCOUNT]);
export const SINGLE_SNAPSHOT = snapshot([CODEX_ACCOUNT]);
export const EMPTY_SNAPSHOT = snapshot([]);
export const STALE_SNAPSHOT = snapshot([assistant_ACCOUNT], { status: "stale", fetchedAt: Date.now() - 9 * 60 * 1000 });

export const TOP_LIMITS: readonly UsageLimitView[] = selectTopUsageLimits(HEALTHY_SNAPSHOT, 3);


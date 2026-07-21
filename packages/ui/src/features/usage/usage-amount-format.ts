import type { UsageLimitView, UsageUnit } from "@fraym-ai/driver";

const COMPACT_NUMBER = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

const USAGE_AMOUNT_FORMATTERS: Partial<Record<UsageUnit, (value: number) => string>> = {
	percent: value => `${Math.round(value)}%`,
	usd: value => `$${value.toFixed(2)}`,
	minutes: value => `${Math.round(value)}m`,
	bytes: formatBytes,
};

export function formatUsageAmount(value: number | undefined, unit: UsageUnit): string | null {
	if (value === undefined) return null;
	return (USAGE_AMOUNT_FORMATTERS[unit] ?? formatCompactNumber)(value);
}

export function formatUsageDetail(limit: UsageLimitView): string | null {
	return formatUsedLimitDetail(limit) ?? formatRemainingDetail(limit);
}

function formatCompactNumber(value: number): string {
	return COMPACT_NUMBER.format(value);
}

function formatUsedLimitDetail(limit: UsageLimitView): string | null {
	if (limit.used === undefined || limit.limit === undefined || limit.unit === "percent") return null;
	const used = formatUsageAmount(limit.used, limit.unit);
	const total = formatUsageAmount(limit.limit, limit.unit);
	return used && total ? `${used} / ${total}` : null;
}

function formatRemainingDetail(limit: UsageLimitView): string | null {
	if (limit.remaining === undefined) return null;
	const remaining = formatUsageAmount(limit.remaining, limit.unit);
	return remaining ? `${remaining} left` : null;
}

function formatBytes(value: number): string {
	const absolute = Math.abs(value);
	if (absolute < 1024) return `${Math.round(value)}B`;
	const units = ["KB", "MB", "GB"] as const;
	let scaled = value / 1024;
	let unitIndex = 0;
	while (Math.abs(scaled) >= 1024 && unitIndex < units.length - 1) {
		scaled /= 1024;
		unitIndex += 1;
	}
	return `${scaled.toFixed(1)}${units[unitIndex]}`;
}

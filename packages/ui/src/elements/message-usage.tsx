// MessageUsage — the per-turn token readout shown at the end of an agent turn.
//
// Mirrors the Engine TUI footer (`assistant-message.ts` / `usage-row.ts`):
// `⤵ input  ⤴ output  cache: N  ⏱ ttft  ⚡ tok/s`, where input folds in cache-writes
// (billed as input) and cache (read) / ttft / throughput each show only when present
// and non-zero. Always-on + dim; the Thread gates it on the `showTokenUsage` display
// setting. Data rides the shared journal/transcript contract (`TurnUsage`).

import type { TurnUsage } from "@fraym-ai/driver";
import { cn } from "../lib/cn";

/** Compact K/M/B token count, matching Engine's `formatNumber` (e.g. "999", "2K", "1.5K", "52K"). */
export function formatTokenCount(n: number): string {
	if (n < 1_000) return n.toString();
	if (n < 10_000) return `${trim1(n / 1_000)}K`;
	if (n < 1_000_000) return `${Math.round(n / 1_000)}K`;
	if (n < 10_000_000) return `${trim1(n / 1_000_000)}M`;
	if (n < 1_000_000_000) return `${Math.round(n / 1_000_000)}M`;
	if (n < 10_000_000_000) return `${trim1(n / 1_000_000_000)}B`;
	return `${Math.round(n / 1_000_000_000)}B`;
}

function trim1(n: number): string {
	const s = n.toFixed(1);
	return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** Below this the rate is nonsense (cached/instant responses yield absurd tok/s). Mirrors
 *  the TUI's `MIN_DURATION_MS` in `usage-row.ts`. */
const MIN_DURATION_MS = 100;

export interface MessageUsageProps {
	readonly usage: TurnUsage;
	readonly className?: string;
}

export function MessageUsage({ usage, className }: MessageUsageProps) {
	const input = usage.input + usage.cacheWrite;
	const { ttftMs, durationMs } = usage;
	// Throughput excludes TTFT — generation time is duration minus time-to-first-token.
	const genMs = durationMs !== undefined && durationMs > MIN_DURATION_MS ? durationMs - (ttftMs ?? 0) : 0;
	const tokPerSec = genMs > MIN_DURATION_MS && usage.output > 0 ? (usage.output / genMs) * 1000 : undefined;
	return (
		<div
			data-slot="message-usage"
			className={cn(
				"flex select-none items-center gap-3 font-secondary text-fr-2xs text-fr-text-3 tabular-nums",
				className,
			)}
		>
			<span title="Input tokens (incl. cache writes)">⤵ {formatTokenCount(input)}</span>
			<span title="Output tokens">⤴ {formatTokenCount(usage.output)}</span>
			{usage.cacheRead > 0 && <span title="Cached prompt tokens">cache: {formatTokenCount(usage.cacheRead)}</span>}
			{ttftMs !== undefined && ttftMs > 0 && (
				<span title="Time to first token">⏱ {(ttftMs / 1000).toFixed(1)}s</span>
			)}
			{tokPerSec !== undefined && <span title="Generation throughput">⚡ {tokPerSec.toFixed(1)}/s</span>}
		</div>
	);
}

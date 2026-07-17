import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export interface TurnUsageLike {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  ttftMs?: number;
  durationMs?: number;
}

export interface MessageUsageProps extends HTMLAttributes<HTMLDivElement> {
  usage?: TurnUsageLike;
  inputTokens?: number;
  outputTokens?: number;
}

export function formatTokenCount(value: number): string {
  const magnitude = Math.abs(value);
  const units = [[1_000_000_000, "B"], [1_000_000, "M"], [1_000, "K"]] as const;
  for (const [threshold, suffix] of units) {
    if (magnitude >= threshold) {
      const digits = magnitude < threshold * 10 ? 1 : 0;
      return `${(value / threshold).toFixed(digits).replace(/\.0$/, "")}${suffix}`;
    }
  }
  return String(value);
}

export function MessageUsage({ className, usage, inputTokens, outputTokens, ...props }: MessageUsageProps) {
  const input = usage ? usage.input + (usage.cacheWrite ?? 0) : inputTokens;
  const output = usage?.output ?? outputTokens;
  if (input === undefined && output === undefined) return null;

  const cacheRead = usage?.cacheRead ?? 0;
  const ttftMs = usage?.ttftMs;
  const generationMs = usage?.durationMs === undefined ? 0 : usage.durationMs - (ttftMs ?? 0);
  const rate = output !== undefined && generationMs > 100 ? (output / generationMs) * 1000 : undefined;

  return (
    <div {...props} className={classNames("fraym-message-usage", className)} data-slot="message-usage">
      {input === undefined ? null : <span title="Input tokens, including cache writes">↵ {formatTokenCount(input)}</span>}
      {output === undefined ? null : <span title="Output tokens">↗ {formatTokenCount(output)}</span>}
      {cacheRead > 0 ? <span title="Cached prompt tokens">cache: {formatTokenCount(cacheRead)}</span> : null}
      {ttftMs !== undefined && ttftMs > 0 ? <span title="Time to first token">◷ {(ttftMs / 1000).toFixed(1)}s</span> : null}
      {rate === undefined ? null : <span title="Generation throughput">⚡ {rate.toFixed(1)}/s</span>}
    </div>
  );
}

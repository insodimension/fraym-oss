import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export interface MessageUsageProps extends HTMLAttributes<HTMLDivElement> {
  inputTokens?: number;
  outputTokens?: number;
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

export function MessageUsage({
  className,
  inputTokens,
  outputTokens,
  ...props
}: MessageUsageProps) {
  if (inputTokens === undefined && outputTokens === undefined) {
    return null;
  }

  return (
    <div {...props} className={classNames("fraym-message-usage", className)}>
      {inputTokens === undefined ? null : <span>{formatTokens(inputTokens)} in</span>}
      {outputTokens === undefined ? null : <span>{formatTokens(outputTokens)} out</span>}
    </div>
  );
}

import type { ComponentProps } from "react";
import { Shimmer } from "./Shimmer";
import { classNames } from "./utils";

export interface CompactionSplitProps extends ComponentProps<"div"> { readonly variant?: "compacting" | "done"; readonly auto?: boolean; readonly tokens?: number; readonly summary?: string }
export function CompactionSplit({ variant = "compacting", auto = false, tokens, summary, className, ...props }: CompactionSplitProps) {
  const done = variant === "done";
  const label = done ? typeof tokens === "number" && tokens > 0 ? `Compacted from ${tokens.toLocaleString()} tokens` : "Context compacted" : auto ? "Automatically compacting context" : "Compacting context";
  return <div className={classNames("fraym-context-split", className)} data-slot="compaction-split" {...props}><div className="fraym-context-split__row"><span className={classNames("fraym-context-split__line", done && "is-done")} />{done ? <span className="fraym-context-split__label">{label}</span> : <Shimmer className="fraym-context-split__label">{label}</Shimmer>}<span className={classNames("fraym-context-split__line", done && "is-done")} /></div>{done && summary ? <p className="fraym-context-split__summary">{summary}</p> : null}</div>;
}

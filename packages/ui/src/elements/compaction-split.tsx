import { cn } from "../lib/cn";
import { Shimmer } from "./shimmer";

export interface CompactionSplitProps extends React.ComponentProps<"div"> {
	readonly variant?: "compacting" | "done";
	readonly auto?: boolean;
	/** Pre-compaction token count — mirrors the TUI "Compacted from N tokens". */
	readonly tokens?: number;
	/** One-line summary of what was compacted (the "compact context"). */
	readonly summary?: string;
}

export function CompactionSplit({
	variant = "compacting",
	auto = false,
	tokens,
	summary,
	className,
	...props
}: CompactionSplitProps) {
	const done = variant === "done";
	const label = done
		? typeof tokens === "number" && tokens > 0
			? `Compacted from ${tokens.toLocaleString()} tokens`
			: "Context compacted"
		: auto
			? "Automatically compacting context"
			: "Compacting context";
	const line = cn("h-px flex-1", done ? "bg-fr-accent-line" : "bg-fr-border-soft");

	return (
		<div data-slot="compaction-split" className={cn("flex flex-col gap-1", className)} {...props}>
			<div className="flex items-center gap-4">
				<span className={line} />
				{done ? (
					<span className="shrink-0 whitespace-nowrap font-secondary text-fr-xs text-fr-text-3">{label}</span>
				) : (
					<Shimmer className="shrink-0 whitespace-nowrap text-fr-sm font-medium">{label}</Shimmer>
				)}
				<span className={line} />
			</div>
			{done && summary ? (
				<p className="mx-auto line-clamp-2 max-w-2xl px-8 text-center font-secondary text-fr-xs text-fr-text-3/70">
					{summary}
				</p>
			) : null}
		</div>
	);
}

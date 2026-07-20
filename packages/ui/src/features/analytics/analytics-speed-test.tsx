import type { AnalyticsBenchResult, AnalyticsModelStats } from "@fraym/driver";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { formatLatencyMs, formatTokensPerSecond, modelSlug } from "./analytics-format";

/**
 * "Test my models now" — Phase 6 of `docs/design/36-analytics-and-crowd-telemetry.md`,
 * wired to Engine's own `engine bench`. This sends a REAL, small, billed request to each
 * model — never automatic, never on mount, only on an explicit click. Results are
 * transient (this component's own state, not persisted) — a live spot-check beside
 * your historical measured average, not a replacement for it.
 */

const TEST_LIMIT = 5; // matches the model-performance card's own "top 5 by usage" default.

interface RunState {
	readonly status: "idle" | "running" | "done" | "error";
	readonly results: readonly AnalyticsBenchResult[];
	readonly error: string | null;
}

const IDLE: RunState = { status: "idle", results: [], error: null };

function ResultRow({ result }: { readonly result: AnalyticsBenchResult }) {
	const failed = result.failures >= result.runs;
	return (
		<div className="flex items-center justify-between gap-3 rounded-[8px] border border-fr-border-soft px-3 py-2 text-fr-xs">
			<span className="min-w-0 fr-overflow text-fr-text">{result.model}</span>
			{failed ? (
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-del" title={result.error}>
					Failed{result.error ? ` — ${result.error}` : ""}
				</span>
			) : (
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-2">
					TTFT {formatLatencyMs(result.ttftMs)} · {formatTokensPerSecond(result.tokensPerSecond)}
				</span>
			)}
		</div>
	);
}

export function AnalyticsSpeedTest({
	models,
	onRunBenchmark,
	className,
}: {
	readonly models: readonly AnalyticsModelStats[];
	readonly onRunBenchmark: (models: readonly string[], runs?: number) => Promise<readonly AnalyticsBenchResult[]>;
	readonly className?: string;
}) {
	const [state, setState] = useState<RunState>(IDLE);
	const targets = useMemo(() => models.slice(0, TEST_LIMIT), [models]);

	const run = useCallback(async () => {
		if (targets.length === 0) return;
		setState({ status: "running", results: [], error: null });
		try {
			const results = await onRunBenchmark(targets.map(modelSlug), 1);
			setState({ status: "done", results, error: null });
		} catch (cause) {
			setState({ status: "error", results: [], error: cause instanceof Error ? cause.message : String(cause) });
		}
	}, [onRunBenchmark, targets]);

	if (targets.length === 0) return null;

	return (
		<div className={cn("space-y-2", className)}>
			<div>
				<button
					type="button"
					onClick={run}
					disabled={state.status === "running"}
					className={cn(
						"inline-flex items-center gap-1.5 rounded-[8px] border border-fr-border-soft bg-fr-surface px-2.5 py-1.5 text-fr-xs font-semibold text-fr-text transition-colors",
						"enabled:hover:bg-fr-surface-2",
						state.status === "running" && "cursor-wait opacity-70",
					)}
				>
					<Icon name="bolt" size={13} />
					{state.status === "running" ? "Testing…" : "Test my models now"}
				</button>
				<p className="mt-1 text-fr-2xs text-fr-text-3">
					Sends one small real request to each of your top {targets.length} models — uses your credits, not a
					simulation.
				</p>
			</div>
			{state.status === "error" && (
				<div className="rounded-[8px] border border-fr-border-soft bg-fr-surface px-3 py-2 text-fr-xs text-fr-del">
					Speed test failed — {state.error}. One of your models may need credentials, or the test timed out; try
					again, or check Settings → Providers.
				</div>
			)}
			{state.status === "done" && (
				<div className="space-y-1.5">
					{state.results.map(result => (
						<ResultRow key={result.selector} result={result} />
					))}
				</div>
			)}
		</div>
	);
}

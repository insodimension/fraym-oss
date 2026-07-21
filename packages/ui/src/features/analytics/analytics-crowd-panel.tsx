import type { AnalyticsModelStats } from "@fraym-ai/driver";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import {
	buildCrowdContributions,
	type CrowdLeaderboardEntry,
	fetchCrowdLeaderboard,
	loadCrowdTelemetryConfig,
	MIN_REQUESTS_TO_CONTRIBUTE,
	setCrowdTelemetryConfig,
	setCrowdTelemetryEnabled,
	submitCrowdContributions,
} from "./analytics-crowd-telemetry";
import { formatLatencyMs, formatTokensPerSecond, modelSlug } from "./analytics-format";

/**
 * "Your model vs the crowd" — Phase 7 of `docs/design/36-analytics-and-crowd-telemetry.md`.
 * OFF by default. Turning this on submits YOUR device's own noised per-model
 * averages (local differential privacy — see `analytics-crowd-telemetry.ts`'s
 * header for exactly what that does and does not guarantee) and shows the
 * community median beside your measured value. Never prompts, paths, or
 * account identity — a provider/model slug + two noised numbers.
 */

function CrowdRow({
	model,
	entry,
}: {
	readonly model: AnalyticsModelStats;
	readonly entry: CrowdLeaderboardEntry | undefined;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-[8px] border border-fr-border-soft px-3 py-2 text-fr-xs">
			<span className="min-w-0 fr-overflow text-fr-text">{model.model}</span>
			{entry ? (
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-2">
					Crowd {formatLatencyMs(entry.medianTtftMs)} · {formatTokensPerSecond(entry.medianTokensPerSecond)} (
					{entry.contributors} contributor{entry.contributors === 1 ? "" : "s"})
				</span>
			) : (
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">No crowd data yet for this model</span>
			)}
		</div>
	);
}

export function AnalyticsCrowdPanel({
	models,
	className,
	receiverEndpoint,
}: {
	readonly models: readonly AnalyticsModelStats[];
	readonly className?: string;
	/** Host-supplied receiver URL. Omit it to keep crowd telemetry receiverless. */
	readonly receiverEndpoint?: string;
}) {
	const [enabled, setEnabled] = useState(() => loadCrowdTelemetryConfig().enabled);
	useEffect(() => {
		if (receiverEndpoint !== undefined) setCrowdTelemetryConfig({ endpoint: receiverEndpoint });
	}, [receiverEndpoint]);
	const [leaderboard, setLeaderboard] = useState<readonly CrowdLeaderboardEntry[]>([]);
	const [syncing, setSyncing] = useState(false);

	const eligible = useMemo(() => models.filter(model => model.requests >= MIN_REQUESTS_TO_CONTRIBUTE), [models]);

	useEffect(() => {
		if (!enabled || eligible.length === 0) return;
		let cancelled = false;
		setSyncing(true);
		void (async () => {
			const config = loadCrowdTelemetryConfig();
			const contributions = buildCrowdContributions(eligible, config.epsilon);
			await submitCrowdContributions(contributions, config);
			const fresh = await fetchCrowdLeaderboard(config);
			if (!cancelled) setLeaderboard(fresh);
		})().finally(() => {
			if (!cancelled) setSyncing(false);
		});
		return () => {
			cancelled = true;
		};
	}, [enabled, eligible]);

	const leaderboardByModel = useMemo(() => new Map(leaderboard.map(entry => [entry.modelId, entry])), [leaderboard]);

	const toggle = () => setEnabled(setCrowdTelemetryEnabled(!enabled).enabled);

	return (
		<section className="rounded-xl border border-fr-border-soft p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-fr-base font-semibold text-fr-text">Your model vs the crowd</h2>
				<button
					type="button"
					onClick={toggle}
					role="switch"
					aria-checked={enabled}
					className={cn(
						"inline-flex items-center gap-1.5 rounded-[8px] border border-fr-border-soft px-2.5 py-1.5 text-fr-xs font-semibold transition-colors",
						enabled ? "bg-fr-accent text-fr-accent-ink" : "bg-fr-surface text-fr-text hover:bg-fr-surface-2",
					)}
				>
					<Icon name="globe" size={13} />
					{enabled ? "Sharing on" : "Opt in"}
				</button>
			</div>
			<div className={cn("space-y-2", className)}>
				<p className="text-fr-2xs text-fr-text-3">
					Off by default. Turning this on shares your device's own <strong>noised</strong> per-model
					TTFT/throughput averages (local differential privacy — individual values are never sent, only a
					randomized version) so the community median shows up beside your measured stats. Never prompts, file
					paths, or account identity — just a provider/model name and two noised numbers.
				</p>
				{enabled && eligible.length === 0 && (
					<p className="text-fr-2xs text-fr-text-3">
						No model has {MIN_REQUESTS_TO_CONTRIBUTE}+ requests yet — nothing to share until one does.
					</p>
				)}
				{enabled && eligible.length > 0 && (
					<div className="space-y-1.5">
						{syncing && leaderboard.length === 0 ? (
							<p className="text-fr-2xs text-fr-text-3">Syncing…</p>
						) : (
							eligible.map(model => (
								<CrowdRow
									key={modelSlug(model)}
									model={model}
									entry={leaderboardByModel.get(modelSlug(model))}
								/>
							))
						)}
					</div>
				)}
			</div>
		</section>
	);
}

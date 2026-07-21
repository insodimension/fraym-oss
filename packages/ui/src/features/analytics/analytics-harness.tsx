import type { AnalyticsAgentTypeStats, AnalyticsHarnessStats, AnalyticsToolStats } from "@fraym-ai/driver";
import { useMemo } from "react";
import { cn } from "../../lib/cn";
import { compactNumber, currency, formatLatencyMs, formatRate, percent, rateTone } from "./analytics-format";

/**
 * Harness performance — Phase 2 of `docs/design/36-analytics-and-crowd-telemetry.md`.
 * The model-performance card answers "is the MODEL fast/cheap/good"; this answers
 * "is the HARNESS itself working well" — per-tool latency/reliability, how much a
 * turn fans out into tool calls, and where the work actually goes (main agent vs
 * task subagents vs the passive advisor). Same calm dark/violet language, no new
 * primitives invented beyond what `analytics-model-performance.tsx` already uses.
 */

const TOOL_TONE: Record<"none" | "warn" | "high", string> = {
	none: "text-fr-text-2",
	warn: "text-fr-warn font-semibold",
	high: "text-fr-del font-semibold",
};

const AGENT_TYPE_LABEL: Record<AnalyticsAgentTypeStats["agentType"], string> = {
	main: "Main agent",
	subagent: "Subagents",
	advisor: "Advisor",
};

function TurnShapeTile({ value, label }: { readonly value: string; readonly label: string }) {
	return (
		<div className="rounded-[8px] bg-fr-surface px-3 py-2">
			<div className="text-fr-base font-semibold text-fr-text">{value}</div>
			<div className="mt-0.5 text-fr-2xs text-fr-text-3">{label}</div>
		</div>
	);
}

function ToolRow({ tool }: { readonly tool: AnalyticsToolStats }) {
	const tone = rateTone(tool.errors, tool.calls);
	return (
		<div className="rounded-[8px] border border-fr-border-soft px-3 py-2.5">
			<div className="flex items-center justify-between gap-3">
				<span className="min-w-0 fr-overflow font-secondary text-fr-xs font-semibold text-fr-text">
					{tool.name}
				</span>
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">
					{compactNumber(tool.calls)} calls
				</span>
			</div>
			<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">Errors</span>
					<span className={cn("tabular-nums", TOOL_TONE[tone])}>{formatRate(tool.errors, tool.calls)}</span>
				</div>
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">Avg</span>
					<span className="tabular-nums text-fr-text-2">{formatLatencyMs(tool.avgLatencyMs)}</span>
				</div>
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">p50</span>
					<span className="tabular-nums text-fr-text-2">{formatLatencyMs(tool.p50LatencyMs)}</span>
				</div>
				<div className="flex items-center justify-between gap-2 font-secondary text-fr-2xs">
					<span className="uppercase tracking-wide text-fr-text-3">p95</span>
					<span className="tabular-nums text-fr-text-2">{formatLatencyMs(tool.p95LatencyMs)}</span>
				</div>
			</div>
		</div>
	);
}

function AgentTypeRow({
	stat,
	totalRequests,
}: {
	readonly stat: AnalyticsAgentTypeStats;
	readonly totalRequests: number;
}) {
	const share = totalRequests > 0 ? stat.requests / totalRequests : 0;
	const width = Math.max(stat.requests > 0 ? 4 : 0, Math.round(share * 100));
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-3 text-fr-sm">
				<span className="min-w-0 fr-overflow text-fr-text">{AGENT_TYPE_LABEL[stat.agentType]}</span>
				<span className="shrink-0 font-secondary text-fr-xs text-fr-text-3">
					{compactNumber(stat.requests)} requests · {currency(stat.totalCost)} · {percent(share)}
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-fr-surface">
				<div
					className="h-full rounded-full bg-fr-accent transition-[width] duration-700"
					style={{ width: `${width}%` }}
				/>
			</div>
		</div>
	);
}

export function AnalyticsHarnessPanel({
	harness,
	className,
}: {
	readonly harness: AnalyticsHarnessStats | undefined;
	readonly className?: string;
}) {
	const totalRequests = useMemo(
		() => harness?.byAgentType.reduce((sum, stat) => sum + stat.requests, 0) ?? 0,
		[harness],
	);

	if (!harness || harness.tools.length === 0) {
		return (
			<section className="rounded-xl border border-fr-border-soft p-4">
				<h2 className="mb-3 text-fr-base font-semibold text-fr-text">Harness performance</h2>
				<div
					className={cn("rounded-xl border border-dashed border-fr-border-soft px-4 py-10 text-center", className)}
				>
					<p className="text-fr-sm text-fr-text-2">No tool activity in this range yet</p>
					<p className="mt-1 text-fr-xs text-fr-text-3">
						Run a session and tool latency/error rates will appear here, broken down by tool.
					</p>
				</div>
			</section>
		);
	}

	const { turnShape } = harness;
	const topTools = [...harness.tools].slice(0, 8);

	return (
		<section className="rounded-xl border border-fr-border-soft p-4">
			<h2 className="mb-3 text-fr-base font-semibold text-fr-text">Harness performance</h2>
			<div className={cn("space-y-4", className)}>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					<TurnShapeTile value={compactNumber(turnShape.turns)} label="Turns" />
					<TurnShapeTile value={turnShape.avgToolCallsPerTurn.toFixed(1)} label="Avg tool calls / turn" />
					<TurnShapeTile value={turnShape.avgAssistantMessagesPerTurn.toFixed(1)} label="Avg messages / turn" />
					<TurnShapeTile value={compactNumber(turnShape.maxToolCallsInTurn)} label="Most tools in one turn" />
				</div>
				<div className="space-y-2">
					{topTools.map(tool => (
						<ToolRow key={tool.name} tool={tool} />
					))}
				</div>
				{harness.byAgentType.length > 0 && (
					<div className="space-y-3 border-t border-fr-border-soft pt-3">
						<div className="font-secondary text-fr-2xs uppercase tracking-wide text-fr-text-3">
							Where the work goes
						</div>
						{harness.byAgentType.map(stat => (
							<AgentTypeRow key={stat.agentType} stat={stat} totalRequests={totalRequests} />
						))}
					</div>
				)}
			</div>
		</section>
	);
}

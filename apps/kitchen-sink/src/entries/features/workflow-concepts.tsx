import {
	WORKFLOW_CONCEPT,
	type WorkflowAgent,
	type WorkflowAgentStatus,
	type WorkflowConcept,
	WORKFLOW_NOW_MS,
	type WorkflowPhase,
} from "@fraym/fixtures";
import { cn, Icon, type IconName, RollingNumber, Spinner } from "@fraym/ui";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Demo } from "../../showcase/demo";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW RENDER — three competing directions for the fan-out surface a
// multi-phase agent task produces (parallel() / pipeline() / agent()). These are
// THREAD TOOL CARDS (~720px reading column, bounded body), not full-page
// dashboards — same scale/idiom as SubagentBatchCard (rounded-[12px] border
// bg-fr-rail, slim aggregate header, dense rows, bounded body w/ "Show all").
// All three render the SAME shared fixture (WORKFLOW_CONCEPT): "5 clone readers
// + 3 web researchers" — 8 subagents across 3 phases (4 running · 2 done · 1
// failed · 1 queued).
//
//   A · Mission Control — compact swarm card: slim aggregate header + dense
//       one-line agent rows (beacon · persona · intent · tools/tokens/$ + micro
//       context bar), bounded scroll.
//   B · Assembly Line   — phase-grouped compact: vertical, collapsible phase
//       groups (sub-header + count/status) with indented agent rows.
//   C · Flight Board     — mini timeline card: thin per-agent bars over a shared
//       axis, a NOW scrubber, tiny legend — a mini-Gantt sized for a card.
//
// Tokens-only (--fr-*), @fraym/ui primitives, font-primary/secondary, no hex.
// ─────────────────────────────────────────────────────────────────────────────

// --- shared formatting / mapping --------------------------------------------

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(n);
}

function formatDuration(ms: number): string {
	if (ms <= 0) return "0s";
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rem = s % 60;
	if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
	return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Split a token count into a RollingNumber-friendly magnitude + unit suffix. */
function tokenParts(n: number): { readonly value: number; readonly decimals: number; readonly suffix: string } {
	if (n >= 1_000_000) return { value: n / 1_000_000, decimals: 1, suffix: "M" };
	if (n >= 1_000) return { value: Math.round(n / 1_000), decimals: 0, suffix: "K" };
	return { value: n, decimals: 0, suffix: "" };
}

/** "gpt-5.6-terra:high" -> "terra:high" — the last dash-segment reads as the tier. */
function shortModel(model: string): string {
	const dash = model.lastIndexOf("-");
	return dash >= 0 ? model.slice(dash + 1) : model;
}

function toolIcon(tool: string | undefined): IconName {
	switch (tool) {
		case "web_search":
			return "globe";
		case "read":
			return "file";
		case "search":
			return "search";
		case "edit":
			return "edit";
		default:
			return "clock";
	}
}

type StatusTone = "blue" | "add" | "del" | "mute";

const STATUS: Record<
	WorkflowAgentStatus,
	{ readonly label: string; readonly tone: StatusTone; readonly bar: string; readonly text: string }
> = {
	running: { label: "running", tone: "blue", bar: "bg-fr-blue", text: "text-fr-blue" },
	done: { label: "done", tone: "add", bar: "bg-fr-add", text: "text-fr-add" },
	failed: { label: "failed", tone: "del", bar: "bg-fr-del", text: "text-fr-del" },
	queued: { label: "queued", tone: "mute", bar: "bg-fr-text-3", text: "text-fr-text-3" },
};

interface Counts {
	readonly total: number;
	readonly done: number;
	readonly running: number;
	readonly failed: number;
	readonly queued: number;
	readonly cost: number;
	readonly tokens: number;
	readonly tools: number;
}

function countWorkflow(agents: readonly WorkflowAgent[]): Counts {
	return agents.reduce<Counts>(
		(acc, a) => ({
			total: acc.total + 1,
			done: acc.done + (a.status === "done" ? 1 : 0),
			running: acc.running + (a.status === "running" ? 1 : 0),
			failed: acc.failed + (a.status === "failed" ? 1 : 0),
			queued: acc.queued + (a.status === "queued" ? 1 : 0),
			cost: acc.cost + a.cost,
			tokens: acc.tokens + a.tokens,
			tools: acc.tools + a.toolCount,
		}),
		{ total: 0, done: 0, running: 0, failed: 0, queued: 0, cost: 0, tokens: 0, tools: 0 },
	);
}

type PhaseState = "done" | "active" | "queued";

function phaseState(agents: readonly WorkflowAgent[]): PhaseState {
	if (agents.some(a => a.status === "running")) return "active";
	if (agents.length > 0 && agents.every(a => a.status === "queued")) return "queued";
	return "done";
}

// --- shared card atoms -------------------------------------------------------

/** Status beacon: pulsing dot (running) · ✓ (done) · ✕ (failed) · ○ (queued). */
function Beacon({ status }: { readonly status: WorkflowAgentStatus }) {
	return (
		<span aria-hidden className="inline-flex size-3.5 flex-none items-center justify-center">
			{status === "running" && (
				<span className="relative inline-flex size-2">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-fr-blue opacity-60" />
					<span className="relative inline-flex size-2 rounded-full bg-fr-blue shadow-[0_0_0_2px_color-mix(in_srgb,var(--fr-blue),transparent_82%)]" />
				</span>
			)}
			{status === "done" && <Icon name="check" size={12} strokeWidth={2.6} className="text-fr-add" />}
			{status === "failed" && <Icon name="x" size={11} strokeWidth={2.6} className="text-fr-del" />}
			{status === "queued" && <span className="size-2 rounded-full border border-fr-text-3" />}
		</span>
	);
}

/** A tiny inline context-budget bar (the SubagentBatchCard gauge, card-scaled). */
function MicroBar({ used, total }: { readonly used: number; readonly total: number }) {
	if (!total || used <= 0) return <span aria-hidden className="w-8 flex-none" />;
	const p = Math.max(0, Math.min(1, used / total));
	const tone = p >= 0.85 ? "bg-fr-del" : p >= 0.65 ? "bg-fr-warn" : "bg-fr-accent";
	return (
		<span
			className="relative h-1 w-8 flex-none overflow-hidden rounded-full bg-fr-surface-3"
			title={`context ${Math.round(p * 100)}%`}
		>
			<span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${p * 100}%` }} />
		</span>
	);
}

/** Thread-width card frame — bounded, running-accented, matches SubagentBatchCard. */
function CardShell({ children }: { readonly children: ReactNode }) {
	return (
		<section
			data-slot="workflow-card"
			data-status="running"
			className="w-full min-w-0 max-w-[720px] overflow-hidden rounded-[12px] border border-fr-accent-line bg-fr-rail font-primary"
		>
			{children}
		</section>
	);
}

/** Slim aggregate header: title + right-aligned done/total · tokens · $cost · elapsed. */
function CardHeader({ wf, c, kicker }: { readonly wf: WorkflowConcept; readonly c: Counts; readonly kicker: string }) {
	const tok = tokenParts(c.tokens);
	return (
		<header className="flex flex-col gap-1 border-b border-fr-border px-3 py-2.5">
			<div className="flex min-w-0 items-center gap-2">
				<Icon name="workflow" size={14} className="shrink-0 text-fr-accent" />
				<h3 className="shrink-0 text-fr-sm font-semibold text-fr-text">Workflow</h3>
				<span className="min-w-0 flex-1 truncate font-secondary text-fr-xs text-fr-text-3">{wf.title}</span>
				<span className="flex shrink-0 items-center gap-1.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
					<span>
						<span className="text-fr-text-2">{c.done}</span>/{c.total}
					</span>
					<span aria-hidden>·</span>
					<RollingNumber value={tok.value} decimals={tok.decimals} suffix={tok.suffix} className="text-fr-text-3" />
					<span aria-hidden>·</span>
					<RollingNumber value={c.cost} decimals={2} prefix="$" className="text-fr-text-2" />
					<span aria-hidden>·</span>
					<span className="inline-flex items-center gap-0.5">
						<Icon name="clock" size={10} />
						{formatDuration(wf.elapsedMs)}
					</span>
				</span>
			</div>
			<p className="min-w-0 truncate font-secondary text-fr-2xs text-fr-text-3">{kicker}</p>
		</header>
	);
}

/** Bounded body: caps height with internal scroll, reveals a "Show all" toggle
 *  only when the content overflows (mirrors ToolBodySection / BASH_BODY_MAX_HEIGHT). */
function BoundedBody({ maxHeight, children }: { readonly maxHeight: number; readonly children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [expanded, setExpanded] = useState(false);
	const [overflowing, setOverflowing] = useState(false);
	useLayoutEffect(() => {
		const el = ref.current;
		if (el) setOverflowing(el.scrollHeight > maxHeight + 4);
	}, [maxHeight]);
	return (
		<>
			<div ref={ref} className="overflow-y-auto" style={{ maxHeight: expanded ? undefined : maxHeight }}>
				{children}
			</div>
			{overflowing && (
				<button
					type="button"
					onClick={() => setExpanded(e => !e)}
					className="flex w-full items-center justify-center gap-1 border-t border-fr-border py-1.5 font-secondary text-fr-2xs text-fr-text-3 transition-colors hover:text-fr-text-2"
				>
					<Icon name={expanded ? "caretD" : "caretR"} size={11} />
					{expanded ? "Show less" : "Show all"}
				</button>
			)}
		</>
	);
}

/** One dense agent row — the shared line for the swarm + phase-group cards.
 *  Live intent reads brighter (it's the thing you're watching); a failure tints
 *  the whole row so it's scannable at a glance, not just a small ✕. */
function AgentRow({ agent }: { readonly agent: WorkflowAgent }) {
	const running = agent.status === "running";
	const failed = agent.status === "failed";
	return (
		<div
			data-status={agent.status}
			className={cn(
				"flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1 text-fr-xs transition-colors",
				running && "bg-fr-bg",
				failed && "bg-[color-mix(in_srgb,var(--fr-del),transparent_92%)]",
				!running && !failed && "hover:bg-fr-surface/60",
				agent.status === "queued" && "opacity-70",
			)}
		>
			<Beacon status={agent.status} />
			<span className="w-[88px] shrink-0 truncate font-secondary text-fr-2xs text-fr-text-2">{agent.persona}</span>
			<span className="flex min-w-0 flex-1 items-center gap-1">
				<Icon
					name={toolIcon(agent.currentTool)}
					size={11}
					className={cn("shrink-0", running ? "text-fr-blue" : failed ? "text-fr-del" : "text-fr-text-3")}
				/>
				<span
					className={cn(
						"truncate text-fr-2xs",
						failed ? "text-fr-del" : running ? "text-fr-text-2" : "text-fr-text-3",
					)}
				>
					{agent.intent}
				</span>
			</span>
			<span className="flex shrink-0 items-center gap-1.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
				<span>{agent.toolCount}t</span>
				<span aria-hidden>·</span>
				<span>{formatTokens(agent.tokens)}</span>
				<span aria-hidden>·</span>
				<span className="text-fr-text-2">${agent.cost.toFixed(2)}</span>
				<MicroBar used={agent.contextTokens} total={agent.contextWindow} />
			</span>
		</div>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// A · MISSION CONTROL — compact swarm card
// ═════════════════════════════════════════════════════════════════════════════

function MissionControlCard() {
	const wf = WORKFLOW_CONCEPT;
	const c = countWorkflow(wf.agents);
	return (
		<CardShell>
			<CardHeader
				wf={wf}
				c={c}
				kicker={`${wf.subtitle} · ${shortModel(wf.model)} · ${c.running} running · ${c.failed} failed · ${c.queued} queued`}
			/>
			<BoundedBody maxHeight={200}>
				<div className="flex flex-col gap-0.5 p-1.5">
					{wf.agents.map(a => (
						<AgentRow key={a.id} agent={a} />
					))}
				</div>
			</BoundedBody>
		</CardShell>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// B · ASSEMBLY LINE — phase-grouped compact
// ═════════════════════════════════════════════════════════════════════════════

function PhaseGroup({ phase, agents }: { readonly phase: WorkflowPhase; readonly agents: readonly WorkflowAgent[] }) {
	const [open, setOpen] = useState(true);
	const state = phaseState(agents);
	const done = agents.filter(a => a.status === "done").length;
	return (
		<div className="min-w-0">
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				className="flex w-full min-w-0 items-center gap-1.5 rounded-[6px] px-2 py-1 transition-colors hover:bg-fr-surface/60"
			>
				<Icon name={open ? "caretD" : "caretR"} size={11} className="shrink-0 text-fr-text-3" />
				<span className={cn("fr-eyebrow", state === "active" ? "text-fr-accent" : "text-fr-text-2")}>
					{phase.label}
				</span>
				{state === "active" && <span className="size-1.5 shrink-0 animate-signal rounded-full bg-fr-accent" />}
				{state === "done" && <Icon name="check" size={11} strokeWidth={2.4} className="shrink-0 text-fr-add" />}
				<span className="ml-auto shrink-0 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
					{done}/{agents.length}
				</span>
			</button>
			{open && (
				<div className="flex flex-col gap-0.5 border-l border-fr-border-soft pb-1 pl-1.5 ml-3">
					{agents.map(a => (
						<AgentRow key={a.id} agent={a} />
					))}
				</div>
			)}
		</div>
	);
}

function AssemblyLineCard() {
	const wf = WORKFLOW_CONCEPT;
	const c = countWorkflow(wf.agents);
	const byId: Record<string, WorkflowAgent> = {};
	for (const a of wf.agents) byId[a.id] = a;
	return (
		<CardShell>
			<CardHeader wf={wf} c={c} kicker={`by phase · ${wf.phases.length} stages · ${shortModel(wf.model)}`} />
			<BoundedBody maxHeight={210}>
				<div className="flex flex-col gap-1 p-1.5">
					{wf.phases.map(phase => {
						const agents = phase.agentIds
							.map(id => byId[id])
							.filter((a): a is WorkflowAgent => Boolean(a));
						return <PhaseGroup key={phase.id} phase={phase} agents={agents} />;
					})}
				</div>
			</BoundedBody>
		</CardShell>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// C · FLIGHT BOARD — mini timeline card
// ═════════════════════════════════════════════════════════════════════════════

const AXIS_MAX_MS = 288_000;
const AXIS_TICKS = [0, 60_000, 120_000, 180_000, 240_000] as const;

function formatTick(ms: number): string {
	return ms === 0 ? "0" : `${ms / 60_000}m`;
}

function MiniLegend() {
	const items: readonly WorkflowAgentStatus[] = ["running", "done", "failed", "queued"];
	return (
		<div className="flex items-center gap-3">
			{items.map(st => (
				<span key={st} className="inline-flex items-center gap-1 font-secondary text-fr-2xs text-fr-text-3">
					<span
						className={cn(
							"size-1.5 rounded-full",
							st === "queued" ? "border border-fr-text-3" : STATUS[st].bar,
						)}
					/>
					{STATUS[st].label}
				</span>
			))}
		</div>
	);
}

function MiniGanttRow({ agent, nowPct }: { readonly agent: WorkflowAgent; readonly nowPct: number }) {
	if (agent.status === "queued") {
		return (
			<div className="relative flex h-6 items-center">
				<span
					aria-hidden
					className="absolute h-2.5 rounded-full border border-dashed border-fr-text-3/60"
					style={{ left: `${nowPct}%`, width: `${Math.max(10, 100 - nowPct)}%` }}
				/>
			</div>
		);
	}
	const s = STATUS[agent.status];
	const running = agent.status === "running";
	const start = agent.startedAtMs ?? 0;
	const end = agent.endedAtMs ?? WORKFLOW_NOW_MS;
	const left = (start / AXIS_MAX_MS) * 100;
	const width = Math.max(1.5, ((end - start) / AXIS_MAX_MS) * 100);
	return (
		<div className="relative flex h-6 items-center">
			<span
				className={cn("absolute h-2.5 rounded-full", s.bar, running ? "opacity-90" : "opacity-75")}
				style={{ left: `${left}%`, width: `${width}%` }}
			>
				{running && (
					<span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 translate-x-1/2 animate-signal rounded-full bg-fr-blue shadow-[0_0_0_2px_color-mix(in_srgb,var(--fr-blue),transparent_82%)]" />
				)}
			</span>
		</div>
	);
}

function FlightBoardCard() {
	const wf = WORKFLOW_CONCEPT;
	const c = countWorkflow(wf.agents);
	const nowPct = (WORKFLOW_NOW_MS / AXIS_MAX_MS) * 100;
	return (
		<CardShell>
			<CardHeader wf={wf} c={c} kicker={`timeline · ${shortModel(wf.model)} · started ${wf.startedLabel}`} />
			<div className="border-b border-fr-border px-3 py-1.5">
				<MiniLegend />
			</div>
			<BoundedBody maxHeight={260}>
				<div className="flex gap-2 p-2 pr-3">
					{/* label column */}
					<div className="flex w-[92px] flex-none flex-col">
						<div className="h-4" />
						{wf.agents.map(a => (
							<div key={a.id} className="flex h-6 items-center gap-1.5">
								<Beacon status={a.status} />
								<span className="truncate font-secondary text-fr-2xs text-fr-text-2">{a.persona}</span>
							</div>
						))}
					</div>
					{/* track column */}
					<div className="relative min-w-0 flex-1">
						{/* axis */}
						<div className="relative z-10 h-4">
							{AXIS_TICKS.map(t => (
								<span
									key={t}
									className="absolute top-0 -translate-x-1/2 font-secondary text-fr-2xs tabular-nums text-fr-text-3"
									style={{ left: `${(t / AXIS_MAX_MS) * 100}%` }}
								>
									{formatTick(t)}
								</span>
							))}
							<span
								className="absolute top-0 -translate-x-1/2 rounded bg-fr-accent px-1 text-fr-2xs font-medium leading-tight text-fr-accent-ink"
								style={{ left: `${nowPct}%` }}
							>
								NOW
							</span>
						</div>
						{/* gridlines behind rows */}
						<div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-4 z-0">
							{AXIS_TICKS.map(t => (
								<span
									key={t}
									className="absolute bottom-0 top-0 w-px bg-fr-border-soft"
									style={{ left: `${(t / AXIS_MAX_MS) * 100}%` }}
								/>
							))}
						</div>
						{/* rows */}
						<div className="relative z-10">
							{wf.agents.map(a => (
								<MiniGanttRow key={a.id} agent={a} nowPct={nowPct} />
							))}
						</div>
						{/* now scrubber */}
						<span
							aria-hidden
							className="pointer-events-none absolute bottom-0 top-4 z-20 w-px bg-fr-accent shadow-[0_0_6px_color-mix(in_srgb,var(--fr-accent),transparent_35%)]"
							style={{ left: `${nowPct}%` }}
						/>
					</div>
				</div>
			</BoundedBody>
		</CardShell>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// D · DOT MATRIX CONSOLE — the complete new design
// ═════════════════════════════════════════════════════════════════════════════
// The fan-out reads as a board of living LEDs. Each subagent is a cell whose
// dot-matrix loader (Spinner kind="dots" — Engine's "Working…" spinner) IS its
// status: the orbiting palette matrix while running, settling to ✓ (done) / ✗
// (failed) / dim dots (queued). A per-agent LED status strip crowns the header.

function spinnerState(status: WorkflowAgentStatus): "running" | "idle" | "success" | "error" {
	if (status === "running") return "running";
	if (status === "done") return "success";
	if (status === "failed") return "error";
	return "idle";
}

/** Header LED strip: one square pixel per agent, lit by status (running signals). */
function LedStrip({ agents }: { readonly agents: readonly WorkflowAgent[] }) {
	return (
		<div className="flex flex-wrap items-center gap-1">
			{agents.map(a => {
				const s = STATUS[a.status];
				return (
					<span
						key={a.id}
						title={`${a.persona} — ${s.label}`}
						className={cn(
							"size-1.5 rounded-[2px]",
							a.status === "queued" ? "border border-fr-text-3 bg-transparent" : s.bar,
							a.status === "running" && "animate-signal",
						)}
					/>
				);
			})}
		</div>
	);
}

/** One agent LED cell: a bezelled dot-matrix loader + persona · live intent · meta. */
function DotMatrixTile({ agent }: { readonly agent: WorkflowAgent }) {
	const running = agent.status === "running";
	const failed = agent.status === "failed";
	const done = agent.status === "done";
	const s = STATUS[agent.status];
	return (
		<div
			data-status={agent.status}
			className={cn(
				"flex min-w-0 items-center gap-2.5 rounded-[8px] border px-2.5 py-2 transition-colors",
				running && "border-fr-blue/40 bg-fr-bg",
				failed && "border-fr-del/40 bg-[color-mix(in_srgb,var(--fr-del),transparent_92%)]",
				done && "border-fr-border-soft bg-fr-surface/40",
				agent.status === "queued" && "border-fr-border-soft opacity-70",
			)}
		>
			<span
				className={cn(
					"grid size-9 flex-none place-items-center rounded-[7px] border bg-fr-bg",
					running ? "border-fr-blue/50" : failed ? "border-fr-del/50" : "border-fr-border",
				)}
			>
				<span className={cn(running ? "text-fr-blue" : "text-fr-text-3")}>
					<Spinner kind="dots" size="lg" state={spinnerState(agent.status)} />
				</span>
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex min-w-0 items-center gap-1.5">
					<span className="min-w-0 flex-1 truncate font-secondary text-fr-xs text-fr-text-2">{agent.persona}</span>
					<span className={cn("shrink-0 font-secondary text-fr-2xs tabular-nums", s.text)}>{s.label}</span>
				</span>
				<span className="flex min-w-0 items-center gap-1">
					<Icon
						name={toolIcon(agent.currentTool)}
						size={10}
						className={cn("shrink-0", running ? "text-fr-blue" : failed ? "text-fr-del" : "text-fr-text-3")}
					/>
					<span
						className={cn(
							"truncate text-fr-2xs",
							failed ? "text-fr-del" : running ? "text-fr-text-2" : "text-fr-text-3",
						)}
					>
						{agent.intent}
					</span>
				</span>
				<span className="flex items-center gap-1.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
					<span>{agent.toolCount}t</span>
					<span aria-hidden>·</span>
					<span>{formatTokens(agent.tokens)}</span>
					<span aria-hidden>·</span>
					<span className="text-fr-text-2">${agent.cost.toFixed(2)}</span>
					<MicroBar used={agent.contextTokens} total={agent.contextWindow} />
				</span>
			</span>
		</div>
	);
}

function DotMatrixConsoleCard() {
	const wf = WORKFLOW_CONCEPT;
	const c = countWorkflow(wf.agents);
	return (
		<CardShell>
			<CardHeader wf={wf} c={c} kicker={`dot-matrix console · ${c.total} agents · ${shortModel(wf.model)}`} />
			<div className="flex items-center justify-between gap-3 border-b border-fr-border px-3 py-2">
				<LedStrip agents={wf.agents} />
				<span className="flex shrink-0 items-center gap-2 font-secondary text-fr-2xs tabular-nums">
					<span className="text-fr-blue">{c.running} live</span>
					<span className="text-fr-add">{c.done} done</span>
					{c.failed > 0 && <span className="text-fr-del">{c.failed} failed</span>}
					{c.queued > 0 && <span className="text-fr-text-3">{c.queued} queued</span>}
				</span>
			</div>
			<BoundedBody maxHeight={232}>
				<div className="grid grid-cols-2 gap-1.5 p-2">
					{wf.agents.map(a => (
						<DotMatrixTile key={a.id} agent={a} />
					))}
				</div>
			</BoundedBody>
		</CardShell>
	);
}

// --- entries -----------------------------------------------------------------

export const workflowConceptsEntries: readonly ShowcaseEntry[] = [
	{
		id: "workflow-concept-dot-matrix",
		name: "Workflow — Dot Matrix Console (new)",
		Component: () => (
			<Demo
				importPath="design mock — not a component"
				summary="THE NEW DESIGN — a dot-matrix console. Each subagent is an LED cell whose dot-matrix loader (Spinner kind='dots', Engine's 'Working…' spinner) IS its status: the orbiting palette matrix while running, settling to ✓ (done) / ✗ (failed) / dim dots (queued). The header carries a per-agent LED status strip + live/done/failed tallies; a 2-col console grid of cells (persona · live intent · tools/tokens/$cost + context bar) below, bounded + Show all. The fan-out reads as a board of living LEDs."
				stage="stretch"
			>
				<DotMatrixConsoleCard />
			</Demo>
		),
	},
	{
		id: "workflow-concept-mission-control",
		name: "Workflow A — Mission Control",
		Component: () => (
			<Demo
				importPath="design mock — not a component"
				summary="THREAD TOOL CARD (~720px, bounded body). Compact swarm card: a slim aggregate header (done/total · tokens · $cost · elapsed) over dense one-line agent rows — beacon (signal=running · ✓=done · ✕=failed · ○=queued) · persona · live intent with its tool · right-aligned tools/tokens/$cost + a micro context bar. Bounded body with internal scroll + Show all. Whole-swarm health at a glance, sized for the chat thread."
				stage="stretch"
			>
				<MissionControlCard />
			</Demo>
		),
	},
	{
		id: "workflow-concept-assembly-line",
		name: "Workflow B — Assembly Line",
		Component: () => (
			<Demo
				importPath="design mock — not a component"
				summary="THREAD TOOL CARD (~720px, bounded body). Phase-grouped compact: the same aggregate header over VERTICAL, collapsible phase groups (Mapping clones / Reading sources / Validating precedents) — each a small sub-header with a count + status glyph (accent signal=active · ✓=done), then indented agent rows. Shows WHERE the work is and the bottleneck stage, at card scale."
				stage="stretch"
			>
				<AssemblyLineCard />
			</Demo>
		),
	},
	{
		id: "workflow-concept-flight-board",
		name: "Workflow C — Flight Board",
		Component: () => (
			<Demo
				importPath="design mock — not a component"
				summary="THREAD TOOL CARD (~720px, bounded body). Mini timeline: a tiny status legend, then thin per-agent bars over a shared time axis (0–4m), each positioned by start→now/end and colored by status, with a NOW scrubber crossing every row and a dashed queued ghost past NOW. A card-scale mini-Gantt — emphasizes parallelism, the dispatch waves and the straggler."
				stage="stretch"
			>
				<FlightBoardCard />
			</Demo>
		),
	},
];

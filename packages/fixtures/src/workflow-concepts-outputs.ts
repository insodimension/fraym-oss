// workflow-concepts fixtures — ONE fanned-out agent workflow, shared verbatim by
// the three kitchen-sink "workflow render" concept sketches (Mission Control /
// Assembly Line / Flight Board). A realistic mirror of a live run:
// "5 clone readers + 3 web researchers" surveying the agent-memory MCP landscape.
//
// Every timestamp is relative to the workflow start (t=0); `WORKFLOW_NOW_MS` is the
// live "now" the concepts scrub to. Running agents carry no `endedAtMs`; queued
// agents carry no `startedAtMs`. Costs/tokens/context are real-shaped values.

export type WorkflowAgentStatus = "running" | "done" | "failed" | "queued";

export interface WorkflowAgent {
	/** Stable id (also the dispatch key). */
	readonly id: string;
	/** Engine persona handle, e.g. "clones0" … "websynthesis". */
	readonly persona: string;
	/** Human-readable role label. */
	readonly role: string;
	readonly status: WorkflowAgentStatus;
	/** Owning phase id (see `WorkflowPhase`). */
	readonly phaseId: string;
	/** Current / last activity line. */
	readonly intent: string;
	/** Tool the agent is (or last was) running; omitted for queued agents. */
	readonly currentTool?: string;
	readonly toolCount: number;
	readonly tokens: number;
	readonly cost: number;
	/** Context budget consumed / window — drives the per-agent gauge. */
	readonly contextTokens: number;
	readonly contextWindow: number;
	/** Elapsed for running agents, total for terminal ones, 0 for queued. */
	readonly durationMs: number;
	/** Dispatch time relative to workflow start; omitted while queued. */
	readonly startedAtMs?: number;
	/** Completion time relative to workflow start; omitted while running/queued. */
	readonly endedAtMs?: number;
	readonly model: string;
}

export interface WorkflowPhase {
	readonly id: string;
	readonly label: string;
	readonly agentIds: readonly string[];
}

export interface WorkflowConcept {
	readonly title: string;
	readonly subtitle: string;
	readonly model: string;
	/** Relative label for when the workflow was dispatched. */
	readonly startedLabel: string;
	/** Wall-clock elapsed for the whole workflow (== `WORKFLOW_NOW_MS`). */
	readonly elapsedMs: number;
	readonly agents: readonly WorkflowAgent[];
	readonly phases: readonly WorkflowPhase[];
}

const MODEL = "gpt-5.6-terra:high";
const WINDOW = 200_000;

/** The live "now" the concepts scrub to (4m 10s into the run). */
export const WORKFLOW_NOW_MS = 250_000;

const AGENTS: readonly WorkflowAgent[] = [
	// ── Phase 1 · Mapping clones (both landed) ──────────────────────────────
	{
		id: "a-clones0",
		persona: "clones0",
		role: "Reference clone reader",
		status: "done",
		phaseId: "ph-map",
		intent: "Mapped Mem0 + Zep tier architectures",
		currentTool: "read",
		toolCount: 14,
		tokens: 128_000,
		cost: 0.09,
		contextTokens: 46_000,
		contextWindow: WINDOW,
		durationMs: 94_000,
		startedAtMs: 2_000,
		endedAtMs: 96_000,
		model: MODEL,
	},
	{
		id: "a-clones1",
		persona: "clones1",
		role: "Reference clone reader",
		status: "done",
		phaseId: "ph-map",
		intent: "Diffed Letta vs MemGPT recall paths",
		currentTool: "read",
		toolCount: 11,
		tokens: 104_000,
		cost: 0.08,
		contextTokens: 38_000,
		contextWindow: WINDOW,
		durationMs: 80_000,
		startedAtMs: 2_000,
		endedAtMs: 82_000,
		model: MODEL,
	},
	// ── Phase 2 · Reading sources (the active wave; one straggler, one failed) ─
	{
		id: "a-clones2",
		persona: "clones2",
		role: "Source reader",
		status: "running",
		phaseId: "ph-read",
		intent: "Reading memory-summary schema",
		currentTool: "read",
		toolCount: 12,
		tokens: 214_000,
		cost: 0.15,
		contextTokens: 118_000,
		contextWindow: WINDOW,
		durationMs: 165_000,
		startedAtMs: 85_000,
		model: MODEL,
	},
	{
		id: "a-clones3",
		persona: "clones3",
		role: "Source reader",
		status: "running",
		phaseId: "ph-read",
		intent: "Extracting eviction + decay heuristics",
		currentTool: "read",
		toolCount: 9,
		tokens: 168_000,
		cost: 0.12,
		contextTokens: 84_000,
		contextWindow: WINDOW,
		durationMs: 160_000,
		startedAtMs: 90_000,
		model: MODEL,
	},
	{
		id: "a-clones4",
		persona: "clones4",
		role: "Source reader",
		status: "failed",
		phaseId: "ph-read",
		intent: "Context overflow on vendor spec PDF",
		currentTool: "read",
		toolCount: 7,
		tokens: 226_000,
		cost: 0.16,
		contextTokens: 156_000,
		contextWindow: WINDOW,
		durationMs: 64_000,
		startedAtMs: 88_000,
		endedAtMs: 152_000,
		model: MODEL,
	},
	// ── Phase 3 · Validating precedents (two live, one queued behind them) ────
	{
		id: "a-webprecedents",
		persona: "webprecedents",
		role: "Precedent researcher",
		status: "running",
		phaseId: "ph-validate",
		intent: "Validating platform precedents",
		currentTool: "web_search",
		toolCount: 18,
		tokens: 152_000,
		cost: 0.11,
		contextTokens: 62_000,
		contextWindow: WINDOW,
		durationMs: 90_000,
		startedAtMs: 160_000,
		model: MODEL,
	},
	{
		id: "a-webincumbents",
		persona: "webincumbents",
		role: "Incumbent researcher",
		status: "running",
		phaseId: "ph-validate",
		intent: "Surveying incumbent MCP servers",
		currentTool: "web_search",
		toolCount: 15,
		tokens: 138_000,
		cost: 0.1,
		contextTokens: 54_000,
		contextWindow: WINDOW,
		durationMs: 82_000,
		startedAtMs: 168_000,
		model: MODEL,
	},
	{
		id: "a-websynthesis",
		persona: "websynthesis",
		role: "Synthesis writer",
		status: "queued",
		phaseId: "ph-validate",
		intent: "Awaiting research handoff",
		toolCount: 0,
		tokens: 0,
		cost: 0,
		contextTokens: 0,
		contextWindow: WINDOW,
		durationMs: 0,
		model: MODEL,
	},
];

const PHASES: readonly WorkflowPhase[] = [
	{ id: "ph-map", label: "Mapping clones", agentIds: ["a-clones0", "a-clones1"] },
	{ id: "ph-read", label: "Reading sources", agentIds: ["a-clones2", "a-clones3", "a-clones4"] },
	{
		id: "ph-validate",
		label: "Validating precedents",
		agentIds: ["a-webprecedents", "a-webincumbents", "a-websynthesis"],
	},
];

export const WORKFLOW_CONCEPT: WorkflowConcept = {
	title: "Survey agent-memory MCP landscape",
	subtitle: "5 clone readers + 3 web researchers",
	model: MODEL,
	startedLabel: "4m ago",
	elapsedMs: WORKFLOW_NOW_MS,
	agents: AGENTS,
	phases: PHASES,
};

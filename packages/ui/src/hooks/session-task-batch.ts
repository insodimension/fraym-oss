// Derive a `SubagentBatch` from a `task`/`agent` tool call's own data.
//
// The real engine never emits `subagentBatch*` events — it sends Engine's
// `TaskToolDetails` (`progress[]` / `results[]`) inside `call.output.details`
// (the reducer stores `toolUpdated.partialResult` as `call.output`, so live
// progress is present mid-run and the final results at `toolFinished`). The
// mock/kitchen-sink driver, by contrast, feeds `session.subagentBatches`
// directly. This module bridges the real-engine shape into the same
// `SubagentBatch` the swarm card already renders, so the inline card and the
// Tasks dock panel light up from data the engine already sends — no engine or
// driver changes.
//
// Pure (no React). `call.input`/`call.output` are `unknown`, so every read is
// defensive. Source-of-truth shapes: Engine `task/types.ts`
// (`TaskParams`/`TaskToolDetails`/`AgentProgress`/`SingleResult`).

import type {
	SubagentBatch,
	SubagentBatchStatus,
	SubagentRetry,
	SubagentReview,
	SubagentReviewFinding,
	SubagentRun,
	SubagentStatus,
} from "@fraym-ai/driver";
import type { ActiveToolCall, ToolCallStatus } from "./session-types";

// --- defensive readers ------------------------------------------------------

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
	return typeof value === "object" && value !== null;
}

function str(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function firstStr(...values: unknown[]): string | undefined {
	for (const value of values) {
		const text = str(value);
		if (text !== undefined) return text;
	}
	return undefined;
}

function firstNum(...values: unknown[]): number | undefined {
	for (const value of values) {
		const number = num(value);
		if (number !== undefined) return number;
	}
	return undefined;
}

function arr(value: unknown): readonly unknown[] {
	return Array.isArray(value) ? value : [];
}

/** Normalized check for the parallel-subagent dispatch tool (`task` or `agent`). */
export function isTaskTool(toolName: string): boolean {
	const name = toolName.trim().toLowerCase();
	return name === "task" || name === "agent";
}

// --- TaskToolDetails / TaskParams extraction --------------------------------

/**
 * Pull the `TaskToolDetails` out of a `task` call's output. The engine wraps it
 * as `{ content, details }` (AgentToolResult); tolerate it being the bare
 * details object too (anything carrying `progress`/`results`).
 */
function readDetails(output: unknown): Rec | undefined {
	if (!isRecord(output)) return undefined;
	if (isRecord(output.details)) return output.details;
	if (Array.isArray(output.progress) || Array.isArray(output.results)) return output;
	return undefined;
}

// --- status mapping ---------------------------------------------------------

function progressStatus(value: unknown): SubagentStatus {
	return value === "running" || value === "completed" || value === "failed" || value === "aborted" ? value : "pending";
}

/** Terminal status from a `SingleResult`: aborted > error/non-zero exit > completed. */
function resultStatus(result: Rec): SubagentStatus {
	if (bool(result.aborted)) return "aborted";
	if (str(result.error)) return "failed";
	const code = num(result.exitCode);
	if (code !== undefined && code !== 0) return "failed";
	return "completed";
}

// --- per-field merge helpers ------------------------------------------------

function costFromUsage(usage: unknown): number | undefined {
	if (!isRecord(usage)) return undefined;
	const cost = usage.cost;
	if (isRecord(cost)) return num(cost.total);
	return num(cost) ?? num(usage.costUsd) ?? num(usage.totalCost);
}

function readRetry(progress: Rec): SubagentRetry | undefined {
	const state = progress.retryState;
	if (isRecord(state)) {
		return {
			attempt: num(state.attempt) ?? 0,
			maxAttempts: num(state.maxAttempts) ?? 0,
			message: str(state.errorMessage),
		};
	}
	const failure = progress.retryFailure;
	if (isRecord(failure)) {
		const attempt = num(failure.attempt) ?? 0;
		return { attempt, maxAttempts: attempt, message: str(failure.errorMessage) };
	}
	return undefined;
}

function retryFailureMessage(result: Rec): string | undefined {
	const failure = result.retryFailure;
	return isRecord(failure) ? str(failure.errorMessage) : undefined;
}

function priorityOf(value: unknown): SubagentReviewFinding["priority"] | undefined {
	return value === "P0" || value === "P1" || value === "P2" || value === "P3" ? value : undefined;
}

/** Read `report_finding` entries (Engine `ReportFindingDetails`) from a record's `extractedToolData`. */
function readFindings(record: Rec): SubagentReviewFinding[] {
	const data = isRecord(record.extractedToolData) ? record.extractedToolData.report_finding : undefined;
	const out: SubagentReviewFinding[] = [];
	for (const item of arr(data)) {
		if (!isRecord(item)) continue;
		const priority = priorityOf(item.priority);
		const title = str(item.title);
		if (!priority || !title) continue;
		out.push({
			priority,
			title,
			filePath: str(item.file_path),
			lineStart: num(item.line_start),
			lineEnd: num(item.line_end),
			body: str(item.body),
			confidence: num(item.confidence),
		});
	}
	return out;
}

function reviewSource(progress: Rec, result: Rec): Rec | undefined {
	if (isRecord(result.extractedToolData)) return result;
	if (isRecord(progress.extractedToolData)) return progress;
	return undefined;
}

function readReviewVerdict(source: Rec): Pick<SubagentReview, "verdict" | "confidence" | "explanation"> {
	let verdict: SubagentReview["verdict"];
	let confidence: number | undefined;
	let explanation: string | undefined;
	const yielded = isRecord(source.extractedToolData) ? source.extractedToolData.yield : undefined;
	for (const item of arr(yielded)) {
		const data = isRecord(item) ? item.data : undefined;
		if (!isRecord(data)) continue;
		const verdictValue = data.overall_correctness;
		if (verdictValue !== "correct" && verdictValue !== "incorrect") continue;
		verdict = verdictValue;
		confidence = num(data.confidence);
		explanation = str(data.explanation);
	}
	return { verdict, confidence, explanation };
}

/**
 * Reviewer-agent verdict + findings from `extractedToolData`: `yield` carries the
 * `SubmitReviewDetails` verdict (`{ data: { overall_correctness, ... } }`, last
 * wins); `report_finding` the findings. Mirrors Engine `renderAgentResult`. Reads
 * the terminal result first, falling back to live progress.
 */
function readReview(progress: Rec, result: Rec): SubagentReview | undefined {
	const source = reviewSource(progress, result);
	if (!source) return undefined;
	const findings = readFindings(source);
	const { verdict, confidence, explanation } = readReviewVerdict(source);
	if (!verdict && findings.length === 0) return undefined;
	return { verdict, confidence, explanation, findings };
}

/** Nested subagents this run spawned via its own `task` dispatch. */
function readChildren(progress: Rec, result: Rec): readonly SubagentRun[] | undefined {
	// Live: the in-flight nested `task` details captured while this agent runs.
	const inflight = progress.inflightTaskDetails;
	if (isRecord(inflight)) {
		const runs = mergeRuns(arr(inflight.progress), arr(inflight.results));
		if (runs.length > 0) return runs;
	}
	// Terminal: finalized nested `task` data lands in `extractedToolData.task`.
	const extracted = readExtractedTask(result) ?? readExtractedTask(progress);
	if (extracted) {
		const runs = mergeRuns(extracted.progress, extracted.results);
		if (runs.length > 0) return runs;
	}
	return undefined;
}

function readExtractedTask(record: Rec): { progress: unknown[]; results: unknown[] } | undefined {
	const data = isRecord(record.extractedToolData) ? record.extractedToolData.task : undefined;
	const entries = arr(data);
	if (entries.length === 0) return undefined;
	const progress: unknown[] = [];
	const results: unknown[] = [];
	for (const entry of entries) {
		if (!isRecord(entry)) continue;
		progress.push(...arr(entry.progress));
		results.push(...arr(entry.results));
	}
	return progress.length > 0 || results.length > 0 ? { progress, results } : undefined;
}

// --- run construction -------------------------------------------------------

/**
 * Unify a live `AgentProgress` (`progress`) and its terminal `SingleResult`
 * (`result`) into one `SubagentRun`. The result is authoritative for terminal
 * fields (status / exitCode / error / final tokens & duration); progress fills
 * live-only fields the result lacks (`toolCount`, `cost`, `currentTool`,
 * `contextWindow`).
 */
function mergedRunStatus(progress: Rec, result: Rec | undefined): SubagentStatus {
	return result ? resultStatus(result) : progressStatus(progress.status);
}

function mergedRunIndex(progress: Rec, result: Rec): number {
	return firstNum(result.index, progress.index) ?? 0;
}

function mergedRunId(progress: Rec, result: Rec, index: number): string {
	return firstStr(result.id, progress.id) ?? `agent-${index}`;
}

function mergedRunDescription(progress: Rec, result: Rec): string | undefined {
	return firstStr(result.description, progress.description);
}

function mergedRunCost(progress: Rec, result: Rec): number {
	return num(progress.cost) ?? costFromUsage(result.usage) ?? 0;
}

function runningField(status: SubagentStatus, value: unknown): string | undefined {
	return status === "running" ? str(value) : undefined;
}

function liveRunFields(status: SubagentStatus, progress: Rec) {
	return {
		lastIntent: runningField(status, progress.lastIntent),
		currentTool: runningField(status, progress.currentTool),
	};
}

function runMetrics(progress: Rec, result: Rec) {
	return {
		toolCount: num(progress.toolCount) ?? 0,
		tokens: firstNum(result.tokens, progress.tokens) ?? 0,
		contextTokens: firstNum(result.contextTokens, progress.contextTokens),
		contextWindow: firstNum(result.contextWindow, progress.contextWindow),
		cost: mergedRunCost(progress, result),
		durationMs: firstNum(result.durationMs, progress.durationMs) ?? 0,
	};
}

function terminalRunFields(result: Rec) {
	return {
		exitCode: num(result.exitCode),
		error: firstStr(result.error, retryFailureMessage(result)),
		output: str(result.output),
		truncated: result.truncated === true ? true : undefined,
		abortReason: str(result.abortReason),
	};
}

function buildRun(progress: Rec | undefined, result: Rec | undefined): SubagentRun {
	const base = progress ?? {};
	const term = result ?? {};
	const status = mergedRunStatus(base, result);
	const index = mergedRunIndex(base, term);
	return {
		index,
		id: mergedRunId(base, term, index),
		agent: firstStr(term.agent, base.agent) ?? "agent",
		status,
		description: mergedRunDescription(base, term),
		task: firstStr(term.task, base.task) ?? "",
		...liveRunFields(status, base),
		...runMetrics(base, term),
		resolvedModel: firstStr(term.resolvedModel, base.resolvedModel),
		retry: readRetry(base),
		...terminalRunFields(term),
		assignment: firstStr(term.assignment, base.assignment),
		review: readReview(base, term),
		children: readChildren(base, term),
	};
}

function keyOf(record: Rec, fallbackIndex: number): string {
	return str(record.id) ?? `index:${num(record.index) ?? fallbackIndex}`;
}

/** Merge `progress[]` + `results[]` by id (results overlay progress), sorted by index. */
function mergeRuns(progressRaw: readonly unknown[], resultsRaw: readonly unknown[]): SubagentRun[] {
	const byKey = new Map<string, { progress?: Rec; result?: Rec }>();
	let i = 0;
	for (const item of progressRaw) {
		if (!isRecord(item)) continue;
		const key = keyOf(item, i++);
		byKey.set(key, { ...byKey.get(key), progress: item });
	}
	for (const item of resultsRaw) {
		if (!isRecord(item)) continue;
		const key = keyOf(item, i++);
		byKey.set(key, { ...byKey.get(key), result: item });
	}
	return [...byKey.values()]
		.map(({ progress, result }) => buildRun(progress, result))
		.sort((a, b) => a.index - b.index);
}

// --- batch construction -----------------------------------------------------

function deriveBatchStatus(callStatus: ToolCallStatus, runs: readonly SubagentRun[]): SubagentBatchStatus {
	if (callStatus === "error") return "failed";
	if (callStatus === "success") {
		if (runs.length > 0 && runs.every(run => run.status === "aborted")) return "aborted";
		if (runs.some(run => run.status === "failed" || run.status === "aborted")) return "failed";
		// A background dispatch returns immediately with every run still pending — the
		// agents run detached. That is in-flight, not "completed".
		if (runs.length > 0 && runs.every(run => run.status === "pending")) return "dispatching";
		if (runs.some(run => run.status === "pending" || run.status === "running")) return "running";
		return "completed";
	}
	return runs.some(run => run.status === "running") ? "running" : "dispatching";
}

/** Pre-dispatch placeholder batch from `TaskParams.tasks` (no details yet). */
function dispatchingBatchFromInput(callId: string, params: Rec): SubagentBatch | null {
	const tasks = arr(params.tasks);
	if (tasks.length === 0) return null;
	const agent = str(params.agent) ?? "agent";
	const runs: SubagentRun[] = tasks.map((task, index) => {
		const rec = isRecord(task) ? task : {};
		return {
			index,
			id: str(rec.id) ?? `task-${index}`,
			agent,
			status: "pending" as const,
			description: str(rec.description) ?? str(rec.id),
			task: str(rec.assignment) ?? str(rec.description) ?? "",
			toolCount: 0,
			tokens: 0,
			cost: 0,
			durationMs: 0,
		};
	});
	return { callId, agent, context: str(params.context), isolated: bool(params.isolated), status: "dispatching", runs };
}

/**
 * Build the `SubagentBatch` for a `task`/`agent` tool call from its own
 * `input` (`TaskParams`) and `output.details` (`TaskToolDetails`). Returns
 * `null` for non-task tools or a task call carrying no dispatchable data.
 */
export function taskCallToBatch(call: ActiveToolCall): SubagentBatch | null {
	if (!isTaskTool(call.toolName)) return null;
	const params = isRecord(call.input) ? call.input : {};
	const details = readDetails(call.output);
	if (!details) return dispatchingBatchFromInput(call.callId, params);
	const runs = mergeRuns(arr(details.progress), arr(details.results));
	if (runs.length === 0) return dispatchingBatchFromInput(call.callId, params);
	return {
		callId: call.callId,
		agent: str(params.agent) ?? runs[0]?.agent ?? "agent",
		context: str(params.context),
		isolated: bool(params.isolated),
		status: deriveBatchStatus(call.status, runs),
		runs,
		totalDurationMs: num(details.totalDurationMs),
	};
}

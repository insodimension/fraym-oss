import type { SubagentBatch, SubagentRun } from "@fraym-ai/driver";
import type { SessionState, SessionStateAction } from "./session-types";

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;
type SubagentReducer = (state: SessionState, event: SessionStateAction) => SessionState;
type RunReplacement = { readonly run: SubagentRun; readonly found: boolean };
type TreeReplacement = { readonly runs: readonly SubagentRun[]; readonly found: boolean };

function upsertBatch(batches: readonly SubagentBatch[], batch: SubagentBatch): readonly SubagentBatch[] {
	return batches.some(b => b.callId === batch.callId)
		? batches.map(b => (b.callId === batch.callId ? batch : b))
		: [...batches, batch];
}

function mergeRunChildren(existing: SubagentRun, run: SubagentRun): SubagentRun {
	return run.children === undefined && existing.children ? { ...run, children: existing.children } : run;
}

function nestedRunReplacement(existing: SubagentRun, run: SubagentRun): TreeReplacement | undefined {
	const children = existing.children;
	if (!children || children.length === 0) return undefined;
	const replacement = replaceRunInTree(children, run);
	return replacement.found ? replacement : undefined;
}

function replaceChildRun(existing: SubagentRun, run: SubagentRun): RunReplacement {
	if (existing.id === run.id) return { run: mergeRunChildren(existing, run), found: true };
	const children = nestedRunReplacement(existing, run);
	if (!children) return { run: existing, found: false };
	return { run: { ...existing, children: children.runs }, found: true };
}

/**
 * Replace the run with `run.id` anywhere in the tree (top-level or a nested
 * `children` descendant), preserving the existing subtree when the update omits
 * one. Returns the new list and whether a match was found.
 */
function replaceRunInTree(runs: readonly SubagentRun[], run: SubagentRun): TreeReplacement {
	let found = false;
	const nextRuns: SubagentRun[] = [];

	for (const existing of runs) {
		const replacement = replaceChildRun(existing, run);
		if (replacement.found) found = true;
		nextRuns.push(replacement.run);
	}

	return { runs: nextRuns, found };
}

function upsertRun(batches: readonly SubagentBatch[], callId: string, run: SubagentRun): readonly SubagentBatch[] {
	return batches.map(batch => updateBatchRun(batch, callId, run));
}

function updateBatchRun(batch: SubagentBatch, callId: string, run: SubagentRun): SubagentBatch {
	if (batch.callId !== callId) return batch;
	const { runs: replaced, found } = replaceRunInTree(batch.runs, run);
	const runs = found ? replaced : [...batch.runs, run];
	return { ...batch, runs, status: nextBatchStatus(batch.status) };
}

function nextBatchStatus(status: SubagentBatch["status"]): SubagentBatch["status"] {
	return status === "dispatching" ? "running" : status;
}

function finishSubagentBatch(state: SessionState, event: SessionEventOf<"subagentBatchFinished">): SessionState {
	return {
		...state,
		subagentBatches: state.subagentBatches.map(batch => finishBatch(batch, event)),
	};
}

function finishBatch(batch: SubagentBatch, event: SessionEventOf<"subagentBatchFinished">): SubagentBatch {
	if (batch.callId !== event.callId) return batch;
	return {
		...batch,
		status: event.status,
		totalDurationMs: finishedDuration(batch, event),
		tokens: finishedTokens(batch, event),
		cost: finishedCost(batch, event),
	};
}

function finishedDuration(batch: SubagentBatch, event: SessionEventOf<"subagentBatchFinished">): number | undefined {
	return event.totalDurationMs ?? batch.totalDurationMs;
}

function finishedTokens(batch: SubagentBatch, event: SessionEventOf<"subagentBatchFinished">): number | undefined {
	return event.tokens ?? batch.tokens;
}

function finishedCost(batch: SubagentBatch, event: SessionEventOf<"subagentBatchFinished">): number | undefined {
	return event.cost ?? batch.cost;
}

const SUBAGENT_REDUCERS: Record<string, SubagentReducer | undefined> = {
	subagentBatchStarted: (state, event) => ({
		...state,
		subagentBatches: upsertBatch(state.subagentBatches, (event as SessionEventOf<"subagentBatchStarted">).batch),
	}),
	subagentRunUpdated: (state, event) => ({
		...state,
		subagentBatches: upsertRun(
			state.subagentBatches,
			(event as SessionEventOf<"subagentRunUpdated">).callId,
			(event as SessionEventOf<"subagentRunUpdated">).run,
		),
	}),
	subagentBatchFinished: (state, event) =>
		finishSubagentBatch(state, event as SessionEventOf<"subagentBatchFinished">),
};

export function reduceSubagentEvent(state: SessionState, event: SessionStateAction): SessionState | undefined {
	const reducer = SUBAGENT_REDUCERS[event.type];
	return reducer?.(state, event);
}

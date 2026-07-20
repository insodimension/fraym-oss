import type { DiffViewerLine, DiffViewerLineKind } from "./diff-types";

export interface SplitPair {
	readonly left: DiffViewerLine | null;
	readonly right: DiffViewerLine | null;
}

interface SplitPairState {
	readonly lines: readonly DiffViewerLine[];
	readonly pairs: SplitPair[];
	index: number;
}

type SplitPairHandler = (state: SplitPairState) => void;

function collectSplitRun(state: SplitPairState, kind: DiffViewerLineKind): DiffViewerLine[] {
	const collected: DiffViewerLine[] = [];
	while (state.index < state.lines.length && state.lines[state.index]!.kind === kind) {
		collected.push(state.lines[state.index]!);
		state.index++;
	}
	return collected;
}

function appendNormalSplitPair(state: SplitPairState): void {
	const line = state.lines[state.index]!;
	state.pairs.push({ left: line, right: line });
	state.index++;
}

function appendAddOnlySplitPair(state: SplitPairState): void {
	const line = state.lines[state.index]!;
	state.pairs.push({ left: null, right: line });
	state.index++;
}

function appendPairedChangeRuns(
	state: SplitPairState,
	dels: readonly DiffViewerLine[],
	adds: readonly DiffViewerLine[],
): void {
	const len = Math.max(dels.length, adds.length);
	for (let index = 0; index < len; index++) {
		state.pairs.push({ left: dels[index] ?? null, right: adds[index] ?? null });
	}
}

function appendDeleteSplitPairs(state: SplitPairState): void {
	const dels = collectSplitRun(state, "del");
	const adds = collectSplitRun(state, "add");
	appendPairedChangeRuns(state, dels, adds);
}

const SPLIT_PAIR_HANDLERS: Record<DiffViewerLineKind, SplitPairHandler> = {
	normal: appendNormalSplitPair,
	del: appendDeleteSplitPairs,
	add: appendAddOnlySplitPair,
};

export function pairForSplit(lines: readonly DiffViewerLine[]): SplitPair[] {
	const state: SplitPairState = { lines, pairs: [], index: 0 };
	while (state.index < lines.length) {
		SPLIT_PAIR_HANDLERS[lines[state.index]!.kind](state);
	}
	return state.pairs;
}

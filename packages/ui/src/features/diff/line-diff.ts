import type { DiffViewerFile, DiffViewerLine } from "./diff-types";

interface LineDiffState {
	readonly oldLines: readonly string[];
	readonly newLines: readonly string[];
	readonly lcs: number[][];
	readonly lines: DiffViewerLine[];
	additions: number;
	deletions: number;
	oldIndex: number;
	newIndex: number;
	oldNo: number;
	newNo: number;
}

function splitDiffText(text: string): string[] {
	return text.length ? text.split("\n") : [];
}

function createLcsTable(a: readonly string[], b: readonly string[]): number[][] {
	const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
		}
	}
	return lcs;
}

function createLineDiffState(oldText: string, newText: string): LineDiffState {
	const oldLines = splitDiffText(oldText);
	const newLines = splitDiffText(newText);
	return {
		oldLines,
		newLines,
		lcs: createLcsTable(oldLines, newLines),
		lines: [],
		additions: 0,
		deletions: 0,
		oldIndex: 0,
		newIndex: 0,
		oldNo: 1,
		newNo: 1,
	};
}

function appendSameLine(state: LineDiffState): void {
	state.lines.push({
		kind: "normal",
		content: state.oldLines[state.oldIndex]!,
		oldNo: state.oldNo++,
		newNo: state.newNo++,
	});
	state.oldIndex++;
	state.newIndex++;
}

function appendDeletedLine(state: LineDiffState): void {
	state.deletions++;
	state.lines.push({ kind: "del", content: state.oldLines[state.oldIndex]!, oldNo: state.oldNo++ });
	state.oldIndex++;
}

function appendAddedLine(state: LineDiffState): void {
	state.additions++;
	state.lines.push({ kind: "add", content: state.newLines[state.newIndex]!, newNo: state.newNo++ });
	state.newIndex++;
}

function shouldDeleteNextLine(state: LineDiffState): boolean {
	const { oldIndex, newIndex, lcs } = state;
	return lcs[oldIndex + 1]![newIndex]! >= lcs[oldIndex]![newIndex + 1]!;
}

function appendNextChangedLine(state: LineDiffState): void {
	if (shouldDeleteNextLine(state)) {
		appendDeletedLine(state);
		return;
	}
	appendAddedLine(state);
}

function appendNextComparedLine(state: LineDiffState): void {
	if (state.oldLines[state.oldIndex] === state.newLines[state.newIndex]) {
		appendSameLine(state);
		return;
	}
	appendNextChangedLine(state);
}

function appendRemainingDeletes(state: LineDiffState): void {
	while (state.oldIndex < state.oldLines.length) appendDeletedLine(state);
}

function appendRemainingAdds(state: LineDiffState): void {
	while (state.newIndex < state.newLines.length) appendAddedLine(state);
}

/** Compute a line-level diff from old/new text using a longest-common-subsequence. */
export function computeLineDiff(oldText: string, newText: string): DiffViewerFile {
	const state = createLineDiffState(oldText, newText);
	while (state.oldIndex < state.oldLines.length && state.newIndex < state.newLines.length) {
		appendNextComparedLine(state);
	}
	appendRemainingDeletes(state);
	appendRemainingAdds(state);
	return { lines: state.lines, additions: state.additions, deletions: state.deletions };
}

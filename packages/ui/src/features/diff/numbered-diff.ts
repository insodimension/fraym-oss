import type { DiffViewerFile, DiffViewerLine } from "./diff-types";

// Engine edit/apply_patch tools emit details.diff as numbered lines:
// <marker><lineNum>|<content>, where marker is "+", "-", or space.
const NUMBERED_LINE_RE = /^([+\- ])(\d+)[|│](.*)$/s;
const NUMBERED_HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

interface NumberedDiffState {
	readonly lines: DiffViewerLine[];
	additions: number;
	deletions: number;
	oldCounter?: number;
	newCounter?: number;
}

interface ParsedNumberedLine {
	readonly marker: "+" | "-" | " ";
	readonly num: number;
	readonly content: string;
}

type NumberedLineHandler = (state: NumberedDiffState, parsed: ParsedNumberedLine) => void;

function createNumberedDiffState(): NumberedDiffState {
	return { lines: [], additions: 0, deletions: 0 };
}

function applyNumberedHunk(state: NumberedDiffState, raw: string): boolean {
	const hunk = raw.match(NUMBERED_HUNK_RE);
	if (!hunk) return false;
	state.newCounter = Number(hunk[1]);
	return true;
}

function parseNumberedBodyLine(raw: string): ParsedNumberedLine | null {
	const match = raw.match(NUMBERED_LINE_RE);
	if (!match) return null;
	return { marker: match[1] as "+" | "-" | " ", num: Number(match[2]!), content: match[3]! };
}

function appendPlainNumberedLine(state: NumberedDiffState, raw: string): void {
	if (raw.length > 0) state.lines.push({ kind: "normal", content: raw });
}

function appendNumberedElision(state: NumberedDiffState, parsed: ParsedNumberedLine): boolean {
	if (parsed.content !== "...") return false;
	state.lines.push({ kind: "normal", content: "..." });
	return true;
}

function appendNumberedAdd(state: NumberedDiffState, parsed: ParsedNumberedLine): void {
	state.additions++;
	state.newCounter = parsed.num + 1;
	state.lines.push({ kind: "add", content: parsed.content, newNo: parsed.num });
}

function appendNumberedDelete(state: NumberedDiffState, parsed: ParsedNumberedLine): void {
	state.deletions++;
	state.oldCounter = parsed.num + 1;
	state.lines.push({ kind: "del", content: parsed.content, oldNo: parsed.num });
}

function syncNumberedContextCounter(state: NumberedDiffState, num: number): void {
	const oldCounter = state.oldCounter ?? num;
	const newCounter = state.newCounter ?? num;
	state.newCounter = newCounter + Math.max(0, num - oldCounter);
}

function appendNumberedContext(state: NumberedDiffState, parsed: ParsedNumberedLine): void {
	syncNumberedContextCounter(state, parsed.num);
	const newNo = state.newCounter ?? parsed.num;
	state.lines.push({ kind: "normal", content: parsed.content, oldNo: parsed.num, newNo });
	state.oldCounter = parsed.num + 1;
	state.newCounter = newNo + 1;
}

const NUMBERED_LINE_HANDLERS: Record<ParsedNumberedLine["marker"], NumberedLineHandler> = {
	"+": appendNumberedAdd,
	"-": appendNumberedDelete,
	" ": appendNumberedContext,
};

function appendParsedNumberedLine(state: NumberedDiffState, parsed: ParsedNumberedLine): void {
	if (appendNumberedElision(state, parsed)) return;
	NUMBERED_LINE_HANDLERS[parsed.marker](state, parsed);
}

function appendNumberedRawLine(state: NumberedDiffState, raw: string): void {
	if (applyNumberedHunk(state, raw)) return;
	const parsed = parseNumberedBodyLine(raw);
	if (parsed) {
		appendParsedNumberedLine(state, parsed);
		return;
	}
	appendPlainNumberedLine(state, raw);
}

/** Parse an Engine numbered diff into a single DiffViewerFile. */
export function parseNumberedDiff(diff: string): DiffViewerFile {
	const state = createNumberedDiffState();
	const raw = diff.split("\n");
	if (raw.at(-1) === "") raw.pop();
	for (const line of raw) {
		appendNumberedRawLine(state, line);
	}
	return { lines: state.lines, additions: state.additions, deletions: state.deletions };
}

function diffLineIsChange(line: DiffViewerLine): boolean {
	return line.kind === "add" || line.kind === "del";
}

function diffLineStartsHunk(isChange: boolean, inHunk: boolean): boolean {
	return isChange && !inHunk;
}

/** Count contiguous change runs in a parsed diff. */
export function countDiffHunks(file: DiffViewerFile): number {
	let hunks = 0;
	let inHunk = false;
	for (const line of file.lines) {
		const isChange = diffLineIsChange(line);
		if (diffLineStartsHunk(isChange, inHunk)) hunks++;
		inHunk = isChange;
	}
	return hunks;
}

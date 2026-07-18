// ANSI to ToolBodyTerm segments. Parses SGR color escapes (`\x1b[...m`) in
// command output into the interleaved `[kind, text, ...]` lines ToolBodyTerm
// renders. Non-color escapes and carriage returns are stripped.

import type { TermSegmentKind } from "../../tool-card";

/** A ToolBodyTerm line: interleaved `[kind, text, kind, text, ...]`. */
export type TermLine = readonly string[];

const ESC = "\u001b";

// SGR foreground code to term segment kind. Normal and bright colors share a
// kind; cyan folds into blue; dim and black/gray map to dim.
const SGR_FG: Record<number, TermSegmentKind> = {
	30: "dim",
	90: "dim",
	31: "fail",
	91: "fail",
	32: "pass",
	92: "pass",
	33: "warn",
	93: "warn",
	34: "info",
	94: "info",
	36: "info",
	96: "info",
	35: "magenta",
	95: "magenta",
	37: "plain",
	97: "plain",
};

const SGR_DIRECT: Record<number, TermSegmentKind> = {
	...SGR_FG,
	0: "plain",
	2: "dim",
	39: "plain",
};

/** Map a 256-color index to a basic kind, best-effort for the standard 16. */
function from256(n: number): TermSegmentKind {
	const basic = [30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97][n];
	return basic === undefined ? "plain" : (SGR_FG[basic] ?? "plain");
}

function sgrCode(value: string): number {
	return value === "" ? 0 : Number(value);
}

function sgrCodes(params: string): number[] {
	return params.split(";").map(sgrCode);
}

function applyExtendedSgr(
	codes: readonly number[],
	index: number,
	current: TermSegmentKind,
): { readonly kind: TermSegmentKind; readonly index: number } {
	const mode = codes[index + 1];
	if (mode === 5) return { kind: from256(codes[index + 2] ?? 0), index: index + 2 };
	if (mode === 2) return { kind: "plain", index: index + 4 };
	return { kind: current, index };
}

function applySgrCode(
	codes: readonly number[],
	index: number,
	current: TermSegmentKind,
): { readonly kind: TermSegmentKind; readonly index: number } {
	const code = codes[index];
	if (code === undefined) return { kind: current, index };
	if (code === 38) return applyExtendedSgr(codes, index, current);
	// 48 = extended BACKGROUND color: consume its `5;n` / `2;r;g;b` params (so they
	// aren't re-read as foreground codes) while leaving the text kind untouched.
	if (code === 48) return { kind: current, index: applyExtendedSgr(codes, index, current).index };
	return { kind: SGR_DIRECT[code] ?? current, index };
}

/** Apply one SGR escape's parameters to the current kind. */
function applySgr(params: string, current: TermSegmentKind): TermSegmentKind {
	if (params === "") return "plain";
	const codes = sgrCodes(params);
	let kind = current;
	for (let index = 0; index < codes.length; index++) {
		const next = applySgrCode(codes, index, kind);
		kind = next.kind;
		index = next.index;
	}
	return kind;
}

type ParseLineState = {
	kind: TermSegmentKind;
	readonly segments: string[];
	buffer: string;
};

function flush(state: ParseLineState): void {
	if (!state.buffer) return;
	state.segments.push(state.kind, state.buffer);
	state.buffer = "";
}

function csiEnd(rawLine: string, start: number): number {
	let index = start;
	while (index < rawLine.length && /[0-9;?]/.test(rawLine[index]!)) index++;
	return index;
}

function parseCsi(rawLine: string, index: number, state: ParseLineState): number {
	const end = csiEnd(rawLine, index + 2);
	if (rawLine[end] === "m") {
		flush(state);
		state.kind = applySgr(rawLine.slice(index + 2, end), state.kind);
	}
	return end + 1;
}

function isCsiStart(rawLine: string, index: number): boolean {
	return rawLine[index] === ESC && rawLine[index + 1] === "[";
}

function isOscStart(rawLine: string, index: number): boolean {
	return rawLine[index] === ESC && rawLine[index + 1] === "]";
}

function isOscTerminator(rawLine: string, index: number): boolean {
	return rawLine[index] === "\u0007" || (rawLine[index] === ESC && rawLine[index + 1] === "\\");
}

function oscEnd(rawLine: string, start: number): number {
	let end = start;
	while (end < rawLine.length && !isOscTerminator(rawLine, end)) {
		end++;
	}
	return end;
}

function skipOsc(rawLine: string, index: number): number {
	const end = oscEnd(rawLine, index + 2);
	return rawLine[end] === ESC ? end + 2 : end + 1;
}

function advanceAnsiLine(rawLine: string, index: number, state: ParseLineState): number {
	const ch = rawLine[index];
	if (isCsiStart(rawLine, index)) return parseCsi(rawLine, index, state);
	if (isOscStart(rawLine, index)) return skipOsc(rawLine, index);
	if (ch !== "\r") state.buffer += ch;
	return index + 1;
}

function parseAnsiLine(
	rawLine: string,
	kind: TermSegmentKind,
): { readonly line: TermLine; readonly kind: TermSegmentKind } {
	const state: ParseLineState = { kind, segments: [], buffer: "" };
	let index = 0;
	while (index < rawLine.length) {
		index = advanceAnsiLine(rawLine, index, state);
	}
	flush(state);
	return { line: state.segments.length > 0 ? state.segments : ["plain", ""], kind: state.kind };
}

/**
 * Parse a possibly ANSI-colored output string into ToolBodyTerm lines.
 * SGR color state carries across line breaks; non-SGR CSI sequences, OSC
 * sequences, and carriage returns are stripped.
 */
export function parseAnsi(text: string): TermLine[] {
	const lines: TermLine[] = [];
	let kind: TermSegmentKind = "plain";

	for (const rawLine of text.split("\n")) {
		const parsed = parseAnsiLine(rawLine, kind);
		lines.push(parsed.line);
		kind = parsed.kind;
	}
	return lines;
}

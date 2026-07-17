export type TermSegmentKind = "prompt" | "pass" | "fail" | "plain" | "warn" | "info" | "magenta" | "dim";
export interface TermSegment { readonly text: string; readonly kind: TermSegmentKind }
export type TermLine = readonly TermSegment[];
const ansi = /\x1b\[([0-9;]*)m/g;
export function parseAnsi(text: string): TermLine[] { return text.split(/\r?\n/).map((line) => { const segments: TermSegment[] = []; let kind: TermSegmentKind = "plain"; let cursor = 0; for (const match of line.matchAll(ansi)) { if (match.index! > cursor) segments.push({ text: line.slice(cursor, match.index), kind }); const code = match[1]?.split(";").at(-1); kind = code === "31" ? "fail" : code === "32" ? "pass" : code === "33" ? "warn" : code === "34" || code === "36" ? "info" : code === "35" ? "magenta" : code === "2" || code === "90" ? "dim" : "plain"; cursor = match.index! + match[0].length; } if (cursor < line.length || !segments.length) segments.push({ text: line.slice(cursor), kind }); return segments; }); }

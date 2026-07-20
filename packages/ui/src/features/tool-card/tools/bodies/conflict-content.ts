// Merge-conflict content model — pure parsing shared by the `read` renderer's
// conflict body (inline, syntax-highlighted) and its "Open ↗" diff target.
//
// A `conflict://N` read (and any file read whose body still carries git markers)
// returns the raw marker block:
//
//     <<<<<<< HEAD
//     …ours…
//     ||||||| base            (diff3 only)
//     …base…
//     =======
//     …theirs…
//     >>>>>>> feature/x
//
// Marker detection is strict and column-0, mirroring Engine's conflict-detect scan
// (`engine/.../tools/conflict-detect.ts`): exact 7-char runs so indented or
// marker-shaped prose is never mistaken for a conflict.

import type { DiffViewerFile, DiffViewerLine } from "../../../diff/diff-viewer";

export type ConflictSide = "ours" | "base" | "theirs";
export type ConflictMarkerKind = "ours" | "base" | "sep" | "theirs";
export type ConflictLineRole = "normal" | ConflictSide | `marker-${ConflictMarkerKind}`;

export interface ConflictLine {
	readonly role: ConflictLineRole;
	readonly content: string;
	/** 1-indexed line number for the gutter (original file line when known). */
	readonly no: number;
}

const OURS_RE = /^<{7}(?: .*)?$/;
const BASE_RE = /^\|{7}(?: .*)?$/;
const SEP_RE = /^={7}$/;
const THEIRS_RE = /^>{7}(?: .*)?$/;

/**
 * True when `text` contains at least one fully-formed conflict block:
 * a `<<<<<<<` opener, a `=======` separator, and a `>>>>>>>` closer, in order.
 * Requiring all three avoids mis-firing on docs that merely contain a marker run.
 */
export function hasConflictMarkers(text: string | undefined): boolean {
	if (!text) return false;
	let ours = false;
	let sep = false;
	for (const line of text.split("\n")) {
		if (!ours) {
			if (OURS_RE.test(line)) ours = true;
		} else if (!sep) {
			if (SEP_RE.test(line)) sep = true;
		} else if (THEIRS_RE.test(line)) {
			return true;
		}
	}
	return false;
}

/**
 * Split conflict content into role-tagged lines. Markers carry their own role;
 * body lines inherit the side opened by the nearest preceding marker. Lines
 * outside any block are `normal`. `startLine` offsets the gutter so anchors line
 * up with the original file.
 */
export function parseConflictLines(text: string, startLine = 1): readonly ConflictLine[] {
	const out: ConflictLine[] = [];
	const lines = text.split("\n");
	let side: ConflictSide | null = null;
	let inConflict = false;
	for (const [i, content] of lines.entries()) {
		const no = startLine + i;
		if (OURS_RE.test(content)) {
			out.push({ role: "marker-ours", content, no });
			inConflict = true;
			side = "ours";
		} else if (inConflict && BASE_RE.test(content)) {
			out.push({ role: "marker-base", content, no });
			side = "base";
		} else if (inConflict && SEP_RE.test(content)) {
			out.push({ role: "marker-sep", content, no });
			side = "theirs";
		} else if (inConflict && THEIRS_RE.test(content)) {
			out.push({ role: "marker-theirs", content, no });
			inConflict = false;
			side = null;
		} else {
			out.push({ role: side ?? "normal", content, no });
		}
	}
	return out;
}

/**
 * Project conflict content onto an ours→theirs `DiffViewerFile` for the dock's
 * Diff view: ours bodies become deletions, theirs bodies additions, surrounding
 * code stays as context. Markers and the diff3 base section are conflict metadata
 * and are dropped. Linear (no LCS) so whole-file merges never blow up the diff.
 *
 * Returns `null` when `text` carries no conflict block.
 */
export function buildConflictDiffFile(text: string, path: string): DiffViewerFile | null {
	if (!hasConflictMarkers(text)) return null;
	const parsed = parseConflictLines(text);
	const lines: DiffViewerLine[] = [];
	let oldNo = 0;
	let newNo = 0;
	let additions = 0;
	let deletions = 0;
	for (const line of parsed) {
		if (line.role === "normal") {
			oldNo += 1;
			newNo += 1;
			lines.push({ kind: "normal", content: line.content, oldNo, newNo });
		} else if (line.role === "ours") {
			oldNo += 1;
			deletions += 1;
			lines.push({ kind: "del", content: line.content, oldNo });
		} else if (line.role === "theirs") {
			newNo += 1;
			additions += 1;
			lines.push({ kind: "add", content: line.content, newNo });
		}
		// base + every marker line are conflict metadata — omitted from the side-by-side.
	}
	return { oldPath: path, newPath: path, lines, additions, deletions };
}

import type { DiffViewerFile, DiffViewerLine } from "./diff-types";

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

interface MutablePatchFile {
	oldPath?: string;
	newPath?: string;
	isNew?: boolean;
	isDeleted?: boolean;
	lines: DiffViewerLine[];
	additions: number;
	deletions: number;
}

interface UnifiedPatchState {
	readonly files: MutablePatchFile[];
	current: MutablePatchFile | null;
	oldNo: number;
	newNo: number;
}

type UnifiedPatchLineHandler = (state: UnifiedPatchState, raw: string) => boolean;
type UnifiedBodyLineHandler = (state: UnifiedPatchState, file: MutablePatchFile, raw: string) => void;

function createPatchFile(state: UnifiedPatchState, init?: Partial<MutablePatchFile>): MutablePatchFile {
	const file: MutablePatchFile = { lines: [], additions: 0, deletions: 0, ...init };
	state.files.push(file);
	state.current = file;
	return file;
}

function readGitFileHeader(raw: string): Pick<MutablePatchFile, "oldPath" | "newPath"> {
	const match = raw.match(/a\/(\S+) b\/(\S+)/);
	return { oldPath: match?.[1], newPath: match?.[2] };
}

function normalizePatchPath(raw: string, prefix: "a" | "b"): string {
	return raw
		.slice(4)
		.replace(new RegExp(`^${prefix}/`), "")
		.trim();
}

function ensurePatchHeaderFile(state: UnifiedPatchState): MutablePatchFile {
	if (!state.current || state.current.lines.length > 0) return createPatchFile(state);
	return state.current;
}

function applyOldPatchHeader(state: UnifiedPatchState, raw: string): void {
	const path = normalizePatchPath(raw, "a");
	const file = ensurePatchHeaderFile(state);
	file.oldPath = path === "/dev/null" ? undefined : path;
	if (path === "/dev/null") file.isNew = true;
}

function applyNewPatchHeader(state: UnifiedPatchState, raw: string): void {
	const path = normalizePatchPath(raw, "b");
	const file = state.current ?? createPatchFile(state);
	file.newPath = path === "/dev/null" ? undefined : path;
	if (path === "/dev/null") file.isDeleted = true;
}

function applyPatchHunkHeader(state: UnifiedPatchState, raw: string): boolean {
	const hunk = raw.match(HUNK_RE);
	if (!hunk) return false;
	if (!state.current) createPatchFile(state);
	state.oldNo = Number(hunk[1]);
	state.newNo = Number(hunk[3]);
	return true;
}

function appendUnifiedAddLine(state: UnifiedPatchState, file: MutablePatchFile, raw: string): void {
	file.additions++;
	file.lines.push({ kind: "add", content: raw.slice(1), newNo: state.newNo++ });
}

function appendUnifiedDeleteLine(state: UnifiedPatchState, file: MutablePatchFile, raw: string): void {
	file.deletions++;
	file.lines.push({ kind: "del", content: raw.slice(1), oldNo: state.oldNo++ });
}

function appendUnifiedNormalLine(state: UnifiedPatchState, file: MutablePatchFile, raw: string): void {
	file.lines.push({ kind: "normal", content: raw.slice(1), oldNo: state.oldNo++, newNo: state.newNo++ });
}

const UNIFIED_BODY_LINE_HANDLERS: Record<string, UnifiedBodyLineHandler | undefined> = {
	"+": appendUnifiedAddLine,
	"-": appendUnifiedDeleteLine,
	" ": appendUnifiedNormalLine,
	"": appendUnifiedNormalLine,
};

const UNIFIED_PATCH_HANDLERS: readonly UnifiedPatchLineHandler[] = [
	(state, raw) => {
		if (!raw.startsWith("diff --git")) return false;
		createPatchFile(state, readGitFileHeader(raw));
		return true;
	},
	(state, raw) => {
		if (!raw.startsWith("--- ")) return false;
		applyOldPatchHeader(state, raw);
		return true;
	},
	(state, raw) => {
		if (!raw.startsWith("+++ ")) return false;
		applyNewPatchHeader(state, raw);
		return true;
	},
	applyPatchHunkHeader,
	(_state, raw) => raw.startsWith("\\"),
];

function appendUnifiedPatchLine(state: UnifiedPatchState, raw: string): void {
	const file = state.current;
	if (!file) return;
	const marker = raw[0];
	const handler = UNIFIED_BODY_LINE_HANDLERS[marker === undefined ? "" : marker];
	if (handler) handler(state, file, raw);
}

function applyUnifiedPatchRawLine(state: UnifiedPatchState, raw: string): void {
	if (UNIFIED_PATCH_HANDLERS.some(handler => handler(state, raw))) return;
	appendUnifiedPatchLine(state, raw);
}

/** Parse a unified diff string into files. Tolerant of missing git headers. */
export function parseUnifiedPatch(patch: string): DiffViewerFile[] {
	const state: UnifiedPatchState = { files: [], current: null, oldNo: 0, newNo: 0 };

	const rawLines = patch.split("\n");
	if (rawLines.at(-1) === "") rawLines.pop();
	for (const raw of rawLines) {
		applyUnifiedPatchRawLine(state, raw);
	}
	return state.files;
}

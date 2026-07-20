// Parser for the `ast_edit` tool's USER-FACING `details.displayContent` (never the
// model-facing hashline text in `content[].text`). Mirrors the TUI structure
// (engine .../tools/ast-edit.ts → grouped-file-output + formatCodeFrameLine with -/+ markers):
//
//   # dir/                       directory header (trailing slash)
//   ## file.ext#hash (N replacements)   file header in a dir (optional `#hash` + ` (N replacements)`)
//   # file.ext#hash (N replacements)    root-level file (project root `.`, single `#`)
//   -<n>│<before>                removed line (the matched node's first line, before)
//   +<n>│<after>                 added line (the rewrite, after) — same line number as its `-`
//
// A change is a before/after PAIR (`-` then `+`) with the same line number. SELF-CONTAINED:
// `ast_edit` does NOT reuse `renderEdit`'s `parseNumberedDiff` (that reads `details.diff`,
// which ast_edit never emits) nor the churning search parser. See docs/design/tools/ast-edit.md §1.

/** Box-drawings light vertical — the gutter separator the TUI emits. */
const BAR = "\u2502"; // │

export interface AstEditChangeLine {
	/** 1-based source line number (undefined for unnumbered lines). */
	readonly line?: number;
	/** Content to the right of the gutter `│`. */
	readonly text: string;
	/** `del` = before (`-`), `add` = after (`+`). */
	readonly kind: "add" | "del";
}

export interface AstEditFileGroup {
	/** Directory the file lives in (no trailing slash); undefined for root-level / single-file. */
	readonly dir?: string;
	/** File name (basename for grouped output). Empty when a single-file edit emitted no header. */
	readonly file: string;
	/** Trailing `#<hash>` content-hash from the file header, when present. */
	readonly hash?: string;
	/** ` (N replacements)` annotation from the file header, when present. */
	readonly replacements?: number;
	readonly lines: readonly AstEditChangeLine[];
}

interface MutableGroup {
	dir?: string;
	file: string;
	hash?: string;
	replacements?: number;
	lines: AstEditChangeLine[];
}

/** Peel ` (N replacements)` and `#<hash>` off a file-header name → name + hash + count. */
function splitFileHeader(raw: string): { name: string; hash?: string; replacements?: number } {
	let rest = raw.trimEnd();
	let replacements: number | undefined;
	const repMatch = rest.match(/\((\d+)\s+replacements?\)\s*$/);
	if (repMatch && repMatch.index !== undefined) {
		replacements = Number(repMatch[1]);
		rest = rest.slice(0, repMatch.index).trimEnd();
	}
	let hash: string | undefined;
	const hashMatch = rest.match(/#([0-9a-f]+)$/);
	if (hashMatch && hashMatch.index !== undefined) {
		hash = hashMatch[1];
		rest = rest.slice(0, hashMatch.index).trimEnd();
	}
	return { name: rest, hash, replacements };
}

/** Parse a `-<n>│…` / `+<n>│…` change row; returns null for non-change lines (trailers, blanks). */
function parseChangeLine(raw: string): AstEditChangeLine | null {
	const bar = raw.indexOf(BAR);
	if (bar === -1) return null;
	const gutter = raw.slice(0, bar).trim();
	const kind = gutter.startsWith("-") ? "del" : gutter.startsWith("+") ? "add" : null;
	if (!kind) return null;
	const numText = gutter.slice(1);
	const line = /^\d+$/.test(numText) ? Number(numText) : undefined;
	return { line, text: raw.slice(bar + 1), kind };
}

function startFile(
	groups: MutableGroup[],
	dir: string | undefined,
	name: string,
	hash?: string,
	replacements?: number,
): MutableGroup {
	const group: MutableGroup = { dir, file: name, hash, replacements, lines: [] };
	groups.push(group);
	return group;
}

/**
 * Parse `displayContent` into directory→file groups of before/after change rows. Walks every
 * line; non-change trailers (e.g. "Limit reached…", "Parse issues:") are ignored.
 */
export function parseAstEditDisplay(displayContent: string): AstEditFileGroup[] {
	const groups: MutableGroup[] = [];
	let currentDir: string | undefined;
	let current: MutableGroup | undefined;

	for (const raw of displayContent.split("\n")) {
		if (raw.trim() === "") continue; // section separator
		if (raw.startsWith("## ")) {
			const { name, hash, replacements } = splitFileHeader(raw.slice(3));
			current = startFile(groups, currentDir, name, hash, replacements);
			continue;
		}
		if (raw.startsWith("# ")) {
			const body = raw.slice(2).trimEnd();
			if (body.endsWith("/")) {
				const dir = body.slice(0, -1);
				currentDir = dir === "." || dir === "" ? undefined : dir;
				continue;
			}
			const { name, hash, replacements } = splitFileHeader(body);
			current = startFile(groups, undefined, name, hash, replacements);
			continue;
		}
		const change = parseChangeLine(raw);
		if (!change) continue; // trailer / non-change line
		current = current ?? startFile(groups, undefined, ""); // single-file edit: no header
		current.lines.push(change);
	}

	return groups;
}

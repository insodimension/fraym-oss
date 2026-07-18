// Parser for the `ast_grep` tool's USER-FACING `details.displayContent` (never the
// model-facing hashline text in `content[].text`). Mirrors the TUI structure
// (engine .../tools/ast-grep.ts → grouped-file-output + formatCodeFrameLine + meta lines):
//
//   # dir/             directory header (trailing slash)
//   ## file.ext#hash   file header inside a directory (optional `#<hash>` suffix)
//   # file.ext#hash    root-level file (project root `.`, single `#`, no slash)
//   *<n>│<content>     MATCH line (`*` marker, right-aligned line number) — the match node's first line
//    <n>│<content>     continuation line of a multi-line match node (no marker)
//     meta: $A=…, $B=… captured metavariables for the preceding match (no gutter)
//
// SELF-CONTAINED on purpose: `ast_grep` does NOT reuse the `search` parser
// (`parseSearchDisplay`) — that module is owned/churned by another lane and currently
// caps output. This parser walks every line and adds native `meta:` capture handling.
// See docs/design/tools/ast-grep.md §1.

/** Box-drawings light vertical — the gutter separator the TUI emits. */
const BAR = "\u2502"; // │

export interface AstGrepLine {
	/** 1-based source line number (undefined for meta rows / unnumbered lines). */
	readonly line?: number | undefined;
	/** Content to the right of the gutter `│` (or the serialized captures for a meta row). */
	readonly text: string;
	/** True for the match node's first line (`*` marker); false for continuation lines. */
	readonly isMatch: boolean;
	/** True for a `meta: …` capture row attached to the preceding match. */
	readonly meta?: boolean | undefined;
}

export interface AstGrepFileGroup {
	/** Directory the file lives in (no trailing slash); undefined for root-level / single-file. */
	readonly dir?: string | undefined;
	/** File name (basename for grouped output). Empty when a single-file search emitted no header. */
	readonly file: string;
	/** Trailing `#<hash>` content-hash from the file header, when present. */
	readonly hash?: string | undefined;
	readonly lines: readonly AstGrepLine[];
}

interface MutableGroup {
	dir?: string | undefined;
	file: string;
	hash?: string | undefined;
	lines: AstGrepLine[];
}

/** Peel a trailing ` (suffix)` annotation and a `#<hash>` off a file-header name. */
function splitHeaderName(raw: string): { name: string; hash?: string | undefined } {
	const noSuffix = raw.replace(/\s+\([^)]*\)\s*$/, "").trimEnd();
	const hashMatch = noSuffix.match(/#([0-9a-f]+)$/);
	if (hashMatch && hashMatch.index !== undefined) {
		return { name: noSuffix.slice(0, hashMatch.index).trimEnd(), hash: hashMatch[1] };
	}
	return { name: noSuffix };
}

/** Parse one code-frame row (`*<n>│…` / ` <n>│…`) into an {@link AstGrepLine}. */
function parseGutterLine(raw: string): AstGrepLine {
	const bar = raw.indexOf(BAR);
	if (bar === -1) {
		// Defensive: a body line with no gutter — render it as plain continuation.
		return { text: raw, isMatch: false };
	}
	const gutter = raw.slice(0, bar).trim();
	const text = raw.slice(bar + 1);
	const isMatch = gutter.startsWith("*");
	const numText = isMatch ? gutter.slice(1) : gutter;
	const line = /^\d+$/.test(numText) ? Number(numText) : undefined;
	return { line, text, isMatch };
}

function startFile(groups: MutableGroup[], dir: string | undefined, name: string, hash?: string): MutableGroup {
	const group: MutableGroup = { dir, file: name, hash, lines: [] };
	groups.push(group);
	return group;
}

interface HeaderParseResult {
	readonly currentDir: string | undefined;
	readonly current: MutableGroup | undefined;
}

function parseHeaderLine(
	raw: string,
	groups: MutableGroup[],
	currentDir: string | undefined,
): HeaderParseResult | null {
	if (raw.startsWith("## ")) {
		const { name, hash } = splitHeaderName(raw.slice(3));
		return { currentDir, current: startFile(groups, currentDir, name, hash) };
	}
	if (!raw.startsWith("# ")) return null;
	const body = raw.slice(2).trimEnd();
	if (body.endsWith("/")) {
		const dir = body.slice(0, -1);
		return { currentDir: dir === "." || dir === "" ? undefined : dir, current: undefined };
	}
	const { name, hash } = splitHeaderName(body);
	return { currentDir, current: startFile(groups, undefined, name, hash) };
}

function appendAstGrepBodyLine(groups: MutableGroup[], current: MutableGroup | undefined, raw: string): MutableGroup {
	const target = current ?? startFile(groups, undefined, "");
	const trimmed = raw.trimStart();
	if (trimmed.startsWith("meta:")) {
		target.lines.push({ text: trimmed.slice("meta:".length).trim(), isMatch: false, meta: true });
	} else {
		target.lines.push(parseGutterLine(raw));
	}
	return target;
}

/**
 * Parse `displayContent` into directory→file groups. Each group carries its
 * directory (from the nearest preceding `# dir/` header), file name + optional
 * content hash, and ordered match / continuation / meta lines.
 */
export function parseAstGrepDisplay(displayContent: string): AstGrepFileGroup[] {
	const groups: MutableGroup[] = [];
	let currentDir: string | undefined;
	let current: MutableGroup | undefined;

	for (const raw of displayContent.split("\n")) {
		if (raw.trim() === "") continue; // section separator
		const header = parseHeaderLine(raw, groups, currentDir);
		if (header) {
			currentDir = header.currentDir;
			current = header.current;
			continue;
		}
		current = appendAstGrepBodyLine(groups, current, raw);
	}

	return groups;
}

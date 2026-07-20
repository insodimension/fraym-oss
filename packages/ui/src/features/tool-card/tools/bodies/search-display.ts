// Parser for the `search` tool's USER-FACING `details.displayContent` (never the
// model-facing hashline text in `content[].text`). Mirrors the TUI structure
// (engine .../tools/search.ts → grouped-file-output + formatCodeFrameLine):
//
//   # dir/             directory header (trailing slash)
//   ## file.ext#hash   file header inside a directory (optional `#<hash>` suffix)
//   # file.ext#hash    root-level file (project root `.`, single `#`, no slash)
//   *<n>│<content>     MATCH line (`*` marker, right-aligned line number)
//    <n>│<content>     context line (no marker)
//      │...            gap row — non-contiguous line numbers within a file
//
// Sections are separated by blank lines, but the `#`/`##` headers fully delineate
// files, so the parser walks linearly. See docs/design/tools/search.md §1.

/** Box-drawings light vertical — the gutter separator the TUI emits. */
const BAR = "\u2502"; // │

export interface SearchLine {
	/** 1-based source line number (undefined for gap rows or unnumbered lines). */
	readonly line?: number;
	/** Content to the right of the gutter `│`. */
	readonly text: string;
	/** True for match lines (`*` marker); false for context lines. */
	readonly isMatch: boolean;
	/** True for a `│...` elision row between non-contiguous windows. */
	readonly gap?: boolean;
}

export interface SearchFileGroup {
	/** Directory the file lives in (no trailing slash); undefined for root-level / single-file. */
	readonly dir?: string;
	/** File name (basename for grouped output). Empty when a single-file search emitted no header. */
	readonly file: string;
	/** Trailing `#<hash>` content-hash from the file header, when present. */
	readonly hash?: string;
	readonly lines: readonly SearchLine[];
}

interface MutableGroup {
	dir?: string;
	file: string;
	hash?: string;
	lines: SearchLine[];
}

interface HeaderParseResult {
	readonly currentDir?: string;
	readonly current?: MutableGroup;
	readonly handled: boolean;
}

/** Peel a trailing ` (suffix)` annotation and a `#<hash>` off a file-header name. */
function splitHeaderName(raw: string): { name: string; hash?: string } {
	const noSuffix = raw.replace(/\s+\([^)]*\)\s*$/, "").trimEnd();
	const hashMatch = noSuffix.match(/#([0-9a-f]+)$/);
	if (hashMatch && hashMatch.index !== undefined) {
		return { name: noSuffix.slice(0, hashMatch.index).trimEnd(), hash: hashMatch[1] };
	}
	return { name: noSuffix };
}

/** Parse one code-frame row (`*<n>│…` / ` <n>│…` / `   │...`) into a {@link SearchLine}. */
function parseGutterLine(raw: string): SearchLine {
	const bar = raw.indexOf(BAR);
	if (bar === -1) {
		// Defensive: a body line with no gutter — render it as plain context.
		return { text: raw, isMatch: false };
	}
	const gutter = raw.slice(0, bar).trim();
	const text = raw.slice(bar + 1);
	if (gutter === "") {
		// Empty gutter → a `│...` elision row (only gaps produce an empty gutter).
		return { text, isMatch: false, gap: true };
	}
	const isMatch = gutter.startsWith("*");
	const numText = isMatch ? gutter.slice(1) : gutter;
	const line = /^\d+$/.test(numText) ? Number(numText) : undefined;
	return { line, text, isMatch };
}

function startSearchFile(groups: MutableGroup[], dir: string | undefined, name: string, hash?: string): MutableGroup {
	const group = { dir, file: name, hash, lines: [] };
	groups.push(group);
	return group;
}

function parseSearchHeader(raw: string, groups: MutableGroup[], currentDir: string | undefined): HeaderParseResult {
	if (raw.startsWith("## ")) {
		const { name, hash } = splitHeaderName(raw.slice(3));
		return { current: startSearchFile(groups, currentDir, name, hash), currentDir, handled: true };
	}
	if (!raw.startsWith("# ")) return { currentDir, handled: false };

	const body = raw.slice(2).trimEnd();
	if (body.endsWith("/")) {
		const dir = body.slice(0, -1);
		return { currentDir: dir === "." || dir === "" ? undefined : dir, handled: true };
	}
	const { name, hash } = splitHeaderName(body);
	return { current: startSearchFile(groups, undefined, name, hash), currentDir, handled: true };
}

/**
 * Parse `displayContent` into directory→file groups. Each group carries its
 * directory (from the nearest preceding `# dir/` header), file name + optional
 * content hash, and ordered match/context/gap lines.
 */
export function parseSearchDisplay(displayContent: string): SearchFileGroup[] {
	const groups: MutableGroup[] = [];
	let currentDir: string | undefined;
	let current: MutableGroup | undefined;

	for (const raw of displayContent.split("\n")) {
		if (raw.trim() === "") continue; // section separator
		const header = parseSearchHeader(raw, groups, currentDir);
		if (header.handled) {
			currentDir = header.currentDir;
			current = header.current;
			continue;
		}
		current = current ?? startSearchFile(groups, undefined, "", undefined); // single-file search: no header
		current.lines.push(parseGutterLine(raw));
	}

	return groups;
}

// Conflict read body — renders a git merge-conflict block with Shiki syntax
// highlighting on the code AND side-aware region coloring (ours = del/red,
// theirs = add/green, base = muted, markers = labelled), matching the dock's
// ours→theirs Diff view so the inline card and the "Open ↗" diff read the same.
//
// Syntax highlighting is gated by line count: a whole-file merge (thousands of
// lines) falls back to plain text so a history remount never stalls the main
// thread — the region tints alone still read as a "proper" conflict.

import { useShikiLineHtml } from "../../../../elements/code-block";
import { cn } from "../../../../lib/cn";
import { type ConflictLine, type ConflictLineRole, parseConflictLines } from "./conflict-content";

export interface ConflictBodyProps {
	readonly text: string;
	/** Shiki language id (resolved from the conflict's real file path). */
	readonly language: string;
	/** Original file line of the first rendered line, for the gutter. */
	readonly startLine?: number;
}

// Above this, skip Shiki grammar tokenization (see file header).
const MAX_SHIKI_LINES = 600;

const ROLE_ROW_BG: Record<ConflictLineRole, string> = {
	normal: "",
	ours: "bg-fr-del-bg",
	base: "bg-fr-surface-2",
	theirs: "bg-fr-add-bg",
	"marker-ours": "bg-fr-del-bg",
	"marker-base": "bg-fr-surface-2",
	"marker-sep": "bg-fr-surface-2",
	"marker-theirs": "bg-fr-add-bg",
};

// Code-text color for the plain (non-Shiki) fallback; Shiki spans carry their own.
const ROLE_CODE_TEXT: Partial<Record<ConflictLineRole, string>> = {
	ours: "text-[var(--fr-diff-del-code)]",
	theirs: "text-[var(--fr-diff-add-code)]",
};

// Marker rows are always rendered with our own emphasis, never Shiki.
const ROLE_MARKER_TEXT: Partial<Record<ConflictLineRole, string>> = {
	"marker-ours": "text-[var(--fr-diff-del-code)]",
	"marker-base": "text-fr-text-3",
	"marker-sep": "text-fr-text-3",
	"marker-theirs": "text-[var(--fr-diff-add-code)]",
};

function ConflictRow({ line, html }: { readonly line: ConflictLine; readonly html?: string }) {
	const marker = line.role.startsWith("marker-");
	return (
		<span className={cn("block", ROLE_ROW_BG[line.role])}>
			<span className="mr-3 inline-block w-[46px] select-none border-r border-fr-border-soft pr-2.5 text-right text-fr-text-3">
				{line.no}
			</span>
			{marker ? (
				<span className={cn("font-medium", ROLE_MARKER_TEXT[line.role])}>{line.content || " "}</span>
			) : html != null ? (
				<span dangerouslySetInnerHTML={{ __html: html }} />
			) : (
				<span className={cn(ROLE_CODE_TEXT[line.role])}>{line.content || " "}</span>
			)}
		</span>
	);
}

export function ConflictBody({ text, language, startLine = 1 }: ConflictBodyProps) {
	const parsed = parseConflictLines(text, startLine);
	const shikiLang = parsed.length <= MAX_SHIKI_LINES ? language : "text";
	const lineHtml = useShikiLineHtml(
		parsed.map(line => line.content),
		shikiLang,
	);
	return (
		<pre className="fr-shiki-code m-0 overflow-auto whitespace-pre bg-transparent p-0 font-secondary text-fr-xs leading-[1.65] text-fr-text">
			<code>
				{parsed.map((line, i) => (
					<ConflictRow key={i} line={line} html={lineHtml?.[i]} />
				))}
			</code>
		</pre>
	);
}

// AstGrepResultsBody — the `ast_grep` results body at TUI parity (mirrors engine
// .../tools/ast-grep.ts → astGrepToolRenderer). Renders the parsed `details.displayContent`
// (see ast-grep-display.ts) as a directory-grouped, line-numbered structural-match list
// inside the shared `ToolBodyCard` frame (consistent with read/write/edit/bash/find): dim
// `dir/` group headers, per-file headers (📄 path #hash + match count), MATCH lines
// emphasized vs continuation dimmed, and `↳ meta` capture rows. Dumb + prop-driven.
// Self-contained (no coupling to the search lane). See docs/design/tools/ast-grep.md.

import { Fragment } from "react";
import { Icon } from "../../../../icons";
import { cn } from "../../../../lib/cn";
import { ToolBodyCard, ToolBodySection } from "../../tool-body-card";
import type { AstGrepFileGroup, AstGrepLine } from "./ast-grep-display";

/** Per-card output height cap (px) — matches the read/write/bash/find caps; the list scrolls within. */
const ASTGREP_BODY_MAX_HEIGHT = 240;

export interface AstGrepResultsBodyProps {
	readonly groups: readonly AstGrepFileGroup[];
	/** Dim footer notes (limit reached / N parse errors / scope). */
	readonly footerNotes?: readonly string[] | undefined;
	readonly className?: string | undefined;
}

/** One frame row: a captured-metavariable line, or a code line (match emphasized / continuation dim). */
function MatchRow({ ln }: { readonly ln: AstGrepLine }) {
	if (ln.meta) {
		return (
			<div className="flex gap-2 text-fr-iris">
				<span className="w-10 shrink-0 select-none text-right text-fr-text-3" aria-hidden>
					↳
				</span>
				<span className="min-w-0 break-all">{ln.text}</span>
			</div>
		);
	}
	return (
		<div className={cn("flex gap-2", ln.isMatch ? "text-fr-text" : "text-fr-text-3")}>
			<span
				className={cn(
					"w-10 shrink-0 select-none text-right tabular-nums",
					ln.isMatch ? "text-fr-blue" : "text-fr-text-3",
				)}
			>
				{ln.line ?? ""}
			</span>
			<span className="min-w-0 whitespace-pre-wrap break-all">{ln.text}</span>
		</div>
	);
}

function FileBlock({ group }: { readonly group: AstGrepFileGroup }) {
	const matchCount = group.lines.reduce((n, ln) => n + (ln.isMatch ? 1 : 0), 0);
	return (
		<div className="min-w-0">
			<div className="flex items-center gap-2 text-fr-text-2">
				<Icon name="file" size={12} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
				<span className="fr-overflow" style={{ color: "var(--fr-code-path)" }}>
					{group.file || "(results)"}
				</span>
				{group.hash ? <span className="shrink-0 text-fr-text-3">#{group.hash}</span> : null}
				{matchCount > 0 ? <span className="ml-auto shrink-0 text-fr-text-3">{matchCount}</span> : null}
			</div>
			<div className="mt-0.5 grid gap-0.5 border-l border-fr-border-soft pl-2">
				{group.lines.map((ln, i) => (
					<MatchRow key={`${ln.meta ? "meta" : (ln.line ?? "x")}-${ln.isMatch ? "m" : "c"}-${i}`} ln={ln} />
				))}
			</div>
		</div>
	);
}

function AstGrepFooter({ footerNotes }: Pick<AstGrepResultsBodyProps, "footerNotes">) {
	if (!footerNotes || footerNotes.length === 0) return null;
	return (
		<span className="font-secondary text-fr-xs text-fr-text-3">
			{footerNotes.map(note => `⚠ ${note}`).join(" · ")}
		</span>
	);
}

export function AstGrepResultsBody({ groups, footerNotes, className }: AstGrepResultsBodyProps) {
	if (groups.length === 0) {
		return <AstGrepEmptyBody />;
	}
	let lastDir: string | undefined;
	return (
		<ToolBodyCard className={className}>
			<ToolBodySection
				maxHeight={ASTGREP_BODY_MAX_HEIGHT}
				padContent
				footer={<AstGrepFooter footerNotes={footerNotes} />}
			>
				<div className="grid gap-2 font-secondary text-fr-xs">
					{groups.map((group, i) => {
						const dirChanged = group.dir !== undefined && group.dir !== lastDir;
						lastDir = group.dir;
						return (
							<Fragment key={`${group.dir ?? ""}/${group.file}#${group.hash ?? ""}-${i}`}>
								{dirChanged ? <div className="text-fr-text-3">{group.dir}/</div> : null}
								<FileBlock group={group} />
							</Fragment>
						);
					})}
				</div>
			</ToolBodySection>
		</ToolBodyCard>
	);
}

/** Resolved-but-empty state (0 matches), optionally with a "mis-scoped?" hint when parse errors exist. */
export function AstGrepEmptyBody({ parseHint }: { readonly parseHint?: boolean }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			No structural matches found.
			{parseHint ? (
				<div className="mt-1">⚠ Query may be mis-scoped; narrow `paths` before concluding absence.</div>
			) : null}
		</div>
	);
}

/** Pending/running state — ast_grep is a single native AST query (no incremental body). */
export function AstGrepPendingBody({ paths }: { readonly paths?: readonly string[] }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			Matching{paths && paths.length > 0 ? ` ${paths.join(", ")}` : ""}…
		</div>
	);
}

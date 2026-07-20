// AstEditDiffBody — the `ast_edit` results body at TUI parity (mirrors engine
// .../tools/ast-edit.ts → astEditToolRenderer). Renders the parsed `details.displayContent`
// (see ast-edit-display.ts) as a directory-grouped before/after diff inside the shared
// `ToolBodyCard` frame (consistent with read/write/edit/bash/find/search/ast_grep): dim
// `dir/` group headers, per-file headers (📄 path #hash + `N replacements`), and `-`/`+`
// change rows (del red / add green). Dumb + prop-driven. Self-contained. See
// docs/design/tools/ast-edit.md.

import { Fragment } from "react";
import { Icon } from "../../../../icons";
import { cn } from "../../../../lib/cn";
import type { DiffViewerFile, DiffViewerLine } from "../../../diff/diff-types";
import { ToolBodyCard, ToolBodySection } from "../../tool-body-card";
import type { AstEditChangeLine, AstEditFileGroup } from "./ast-edit-display";

/** Per-card output height cap (px) — matches the other content-tool caps; the diff scrolls within. */
const ASTEDIT_BODY_MAX_HEIGHT = 240;

function groupToDiffFile(group: AstEditFileGroup): DiffViewerFile {
	const path = group.dir ? `${group.dir}/${group.file}` : group.file;
	const lines: DiffViewerLine[] = group.lines.map(ln => ({
		kind: ln.kind,
		content: ln.text,
		oldNo: ln.kind === "del" ? ln.line : undefined,
		newNo: ln.kind === "add" ? ln.line : undefined,
	}));
	return {
		oldPath: path || undefined,
		newPath: path || undefined,
		lines,
		additions: lines.reduce((n, l) => n + (l.kind === "add" ? 1 : 0), 0),
		deletions: lines.reduce((n, l) => n + (l.kind === "del" ? 1 : 0), 0),
	};
}

/** Map the parsed ast_edit groups to DiffViewer files so the dock can show a real diff. */
function groupsToDiffFiles(groups: readonly AstEditFileGroup[]): DiffViewerFile[] {
	return groups.map(groupToDiffFile);
}

export interface AstEditDiffBodyProps {
	readonly groups: readonly AstEditFileGroup[];
	/** Dim footer notes (limit reached / N parse errors). */
	readonly footerNotes?: readonly string[];
	/** Fallback file label for a single-file edit with no header (e.g. the input path). */
	readonly fallbackFile?: string;
	readonly className?: string;
}

/** One change row: right-aligned line number + `-`/`+` marker + content, del red / add green. */
function ChangeRow({ ln }: { readonly ln: AstEditChangeLine }) {
	const isDel = ln.kind === "del";
	return (
		<div className={cn("flex gap-2", isDel ? "bg-fr-del-bg text-fr-del" : "bg-fr-add-bg text-fr-add")}>
			<span className="w-10 shrink-0 select-none text-right tabular-nums opacity-70">{ln.line ?? ""}</span>
			<span className="min-w-0 whitespace-pre-wrap break-all">
				<span className="select-none">{isDel ? "− " : "+ "}</span>
				{ln.text}
			</span>
		</div>
	);
}

function FileBlock({ group, fallbackFile }: { readonly group: AstEditFileGroup; readonly fallbackFile?: string }) {
	const replacements = group.replacements ?? group.lines.reduce((n, ln) => n + (ln.kind === "del" ? 1 : 0), 0);
	const label = group.file || fallbackFile || "(changes)";
	return (
		<div className="min-w-0">
			<div className="flex items-center gap-2 text-fr-text-2">
				<Icon name="diff" size={12} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
				<span className="fr-overflow" style={{ color: "var(--fr-code-path)" }}>
					{label}
				</span>
				{group.hash ? <span className="shrink-0 text-fr-text-3">#{group.hash}</span> : null}
				{replacements > 0 ? (
					<span className="ml-auto shrink-0 text-fr-text-3">
						{replacements} {replacements === 1 ? "replacement" : "replacements"}
					</span>
				) : null}
			</div>
			<div className="mt-0.5 grid gap-px overflow-hidden rounded-[4px] border-l border-fr-border-soft pl-2">
				{group.lines.map((ln, i) => (
					<ChangeRow key={`${ln.kind}-${ln.line ?? "x"}-${i}`} ln={ln} />
				))}
			</div>
		</div>
	);
}

function AstEditFooter({ footerNotes }: Pick<AstEditDiffBodyProps, "footerNotes">) {
	if (!footerNotes || footerNotes.length === 0) return null;
	return (
		<span className="font-secondary text-fr-xs text-fr-text-3">
			{footerNotes.map(note => `⚠ ${note}`).join(" · ")}
		</span>
	);
}

export function AstEditDiffBody({ groups, footerNotes, fallbackFile, className }: AstEditDiffBodyProps) {
	if (groups.length === 0) {
		return <AstEditEmptyBody />;
	}
	const diffFiles = groupsToDiffFiles(groups);
	let lastDir: string | undefined;
	return (
		<ToolBodyCard className={className}>
			<ToolBodySection
				maxHeight={ASTEDIT_BODY_MAX_HEIGHT}
				padContent
				openTarget={{ kind: "diff", files: diffFiles }}
				footer={<AstEditFooter footerNotes={footerNotes} />}
			>
				<div className="grid gap-2 font-secondary text-fr-xs">
					{groups.map((group, i) => {
						const dirChanged = group.dir !== undefined && group.dir !== lastDir;
						lastDir = group.dir;
						return (
							<Fragment key={`${group.dir ?? ""}/${group.file}#${group.hash ?? ""}-${i}`}>
								{dirChanged ? <div className="text-fr-text-3">{group.dir}/</div> : null}
								<FileBlock group={group} fallbackFile={fallbackFile} />
							</Fragment>
						);
					})}
				</div>
			</ToolBodySection>
		</ToolBodyCard>
	);
}

/** Resolved-but-empty state (0 replacements), optionally with a "mis-scoped?" hint when parse errors exist. */
export function AstEditEmptyBody({ parseHint }: { readonly parseHint?: boolean }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			No replacements made.
			{parseHint ? (
				<div className="mt-1">⚠ Some files failed to parse; narrow `paths` or check the pattern.</div>
			) : null}
		</div>
	);
}

/** Pending/running state — ast_edit is a single native rewrite pass (no incremental body). */
export function AstEditPendingBody({ paths }: { readonly paths?: readonly string[] }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			Rewriting{paths && paths.length > 0 ? ` ${paths.join(", ")}` : ""}…
		</div>
	);
}

import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";
import { DiffViewer } from "../diff";
import { FileRow, type FileRowBadge } from "../file-tree";
import type { ScmArea, ScmChangeEntry, ScmChangeKind, ScmFileDiff } from "./scm-types";

// Git status → shared FileRow badge (letter + fr-token tone). Same decoration the
// file tree uses, so tree rows and change rows read identically.
const KIND_BADGE: Record<ScmChangeKind, FileRowBadge> = {
	modified: { letter: "M", tone: "text-fr-warn", title: "Modified" },
	added: { letter: "A", tone: "text-fr-add", title: "Added" },
	deleted: { letter: "D", tone: "text-fr-del", title: "Deleted" },
	renamed: { letter: "R", tone: "text-fr-blue", title: "Renamed" },
	untracked: { letter: "U", tone: "text-fr-add", title: "Untracked" },
	conflicted: { letter: "!", tone: "text-fr-del", title: "Conflicted" },
};

function RowAction({
	icon,
	title,
	tone,
	onClick,
}: {
	readonly icon: "plus" | "minus" | "refresh" | "trash";
	readonly title: string;
	readonly tone?: "danger";
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			title={title}
			aria-label={title}
			onClick={event => {
				event.stopPropagation();
				onClick();
			}}
			className={cn(
				"flex size-[22px] shrink-0 items-center justify-center rounded-[6px] text-fr-text-3 opacity-0 transition-colors duration-[120ms] hover:bg-fr-surface-2 hover:text-fr-text focus-visible:opacity-100 group-hover/row:opacity-100 [&_svg]:size-[13px]",
				tone === "danger" && "hover:text-fr-del",
			)}
		>
			<Icon name={icon} size={13} strokeWidth={1.9} />
		</button>
	);
}

export interface ScmChangeRowProps {
	readonly entry: ScmChangeEntry;
	readonly area: ScmArea;
	readonly expanded: boolean;
	readonly onToggle: () => void;
	/** Stage (unstaged rows) or unstage (staged rows). */
	readonly onPrimary?: () => void;
	/** Discard working-tree changes (unstaged rows only). */
	readonly onDiscard?: () => void;
	/** The file's diff, shown inline when the row is expanded. */
	readonly diff?: ScmFileDiff;
	/** Active-row highlight (split/select mode). */
	readonly selected?: boolean;
	/** Show the expand caret (inline mode). Off in select mode. */
	readonly showCaret?: boolean;
}

/** One changed file: the shared FileRow (status glyph · name · dimmed path · hover
 *  actions) that optionally expands to reveal the file's unified diff inline. */
export function ScmChangeRow({
	entry,
	area,
	expanded,
	onToggle,
	onPrimary,
	onDiscard,
	diff,
	selected = false,
	showCaret = true,
}: ScmChangeRowProps) {
	const staged = area === "staged";
	return (
		<div
			data-slot="scm-change-row"
			className="flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_24px]"
		>
			<FileRow
				path={entry.path}
				showDir
				selected={selected}
				badge={KIND_BADGE[entry.kind]}
				deleted={entry.kind === "deleted"}
				onClick={onToggle}
				leading={
					showCaret ? (
						<Icon
							name={expanded ? "caretD" : "caretR"}
							size={13}
							strokeWidth={2}
							className="shrink-0 text-fr-text-3"
						/>
					) : undefined
				}
				actions={
					<>
						{onDiscard && !staged && (
							<RowAction icon="trash" title="Discard changes" tone="danger" onClick={onDiscard} />
						)}
						{onPrimary && (
							<RowAction
								icon={staged ? "minus" : "plus"}
								title={staged ? "Unstage changes" : "Stage changes"}
								onClick={onPrimary}
							/>
						)}
					</>
				}
			/>
			{expanded && (
				<div className="mt-1 mb-1.5 ml-[18px] overflow-hidden rounded-[8px] border border-fr-border-soft">
					{diff ? (
						<DiffViewer
							files={diff.files}
							patch={diff.patch}
							oldText={diff.oldText}
							newText={diff.newText}
							path={entry.path}
							viewMode="unified"
							showToolbar={false}
							showLineNumbers
							disableOpen
							maxHeight={340}
						/>
					) : (
						<div className="px-3 py-4 text-center font-secondary text-fr-xs text-fr-text-3">
							{entry.kind === "untracked" ? "New file — no diff to show." : "No diff available."}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

"use client";

// IdeWorkspace — the single IDE surface (one dock tab). A VS Code-style activity
// rail toggles the left panel between Folder (file tree) and Git (changes); the
// shared right pane shows the file preview or the selected change's diff. One
// surface, no duplicate docks. fr-tokens only.

import { useEffect, useRef, useState } from "react";
import { FileTypeIcon } from "../../elements/file-type-icon";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { useBelowWidth } from "../../lib/use-below-width";
import { DiffViewer, type DiffViewerFile } from "../diff";
import { type FileTreeGitStatusEntry, FraymFileTree } from "../file-tree";
import { FileView, type FileViewKind, resolveFileKind } from "../file-view";
import type {
	ScmArea,
	ScmBranch,
	ScmChangeEntry,
	ScmCheckpoint,
	ScmFileDiff,
	ScmNotice,
	ScmSnapshot,
} from "../source-control";
import { ScmChangesPanel } from "../source-control";
import { SplitPane } from "../split-pane";

/** Below this width the rail + panel + preview can't share the row: the panel
 *  goes solo (full width) and picking a file/change flips to the preview. */
const NARROW_IDE_WIDTH = 560;

export interface IdeFile {
	readonly content?: string;
	readonly src?: string;
	readonly bytes?: Uint8Array;
	readonly mime?: string;
	readonly kind?: FileViewKind;
}

type IdeMode = "folder" | "git";
interface ChangeSelection {
	readonly area: ScmArea;
	readonly entry: ScmChangeEntry;
}

export interface IdeWorkspaceProps {
	// Folder mode
	readonly paths: readonly string[];
	readonly gitStatus?: readonly FileTreeGitStatusEntry[];
	readonly files?: Record<string, IdeFile>;
	readonly defaultSelectedPath?: string;
	/** Fired when a file is opened (folder mode) — lets a connected host fetch it. */
	readonly onOpenFile?: (path: string) => void;
	/** Fired when a change is opened (git mode) — lets a connected host fetch its diff. */
	readonly onOpenChange?: (entry: ScmChangeEntry, area: ScmArea) => void;
	// Git mode
	readonly scm: ScmSnapshot;
	readonly getDiff?: (entry: ScmChangeEntry, area: ScmArea) => ScmFileDiff | undefined;
	readonly commitMessage?: string;
	readonly onCommitMessageChange?: (value: string) => void;
	readonly onStage?: (entry: ScmChangeEntry) => void;
	readonly onUnstage?: (entry: ScmChangeEntry) => void;
	readonly onStageAll?: () => void;
	readonly onUnstageAll?: () => void;
	readonly onDiscard?: (entry: ScmChangeEntry) => void;
	readonly onCommit?: (message: string) => void;
	readonly onRefresh?: () => void;
	readonly onCommitAndPush?: () => void;
	readonly onPull?: () => void;
	readonly onPush?: () => void;
	readonly onCreatePr?: () => void;
	readonly onCreateBranch?: (name: string) => void;
	readonly branches?: readonly ScmBranch[];
	readonly onCheckout?: (name: string) => void;
	readonly notice?: ScmNotice | null;
	readonly onDismissNotice?: () => void;
	readonly committing?: boolean;
	readonly checkpoints?: readonly ScmCheckpoint[];
	/** An ad-hoc diff pushed from a tool card's "Open" affordance — shown in the
	 *  right pane over the compact SCM panel until another file/change is picked. */
	readonly externalDiff?: { readonly files: readonly DiffViewerFile[]; readonly nonce: number };
	readonly onRestoreCheckpoint?: (ref: string) => void;
	readonly defaultMode?: IdeMode;
	readonly className?: string;
}

function RailButton({
	icon,
	label,
	active,
	badge,
	onClick,
}: {
	readonly icon: IconName;
	readonly label: string;
	readonly active: boolean;
	readonly badge?: number;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"relative flex size-9 items-center justify-center rounded-[8px] transition-[color,background-color,transform] duration-[var(--fr-motion-fast)] active:scale-[0.92]",
				active ? "text-fr-text" : "text-fr-text-3 hover:bg-fr-surface hover:text-fr-text-2",
			)}
		>
			{active && (
				<span data-slot="ide-rail-bar" className="absolute left-[-6px] h-4 w-[2px] rounded-full bg-fr-accent" />
			)}
			<Icon name={icon} size={16} strokeWidth={2} />
			{badge != null && badge > 0 && (
				<span className="absolute right-0.5 top-0.5 min-w-[14px] rounded-full bg-fr-accent px-1 text-center font-secondary text-[9px] leading-[14px] text-fr-accent-ink">
					{badge}
				</span>
			)}
		</button>
	);
}

function PaneHeader({
	leading,
	icon,
	path,
	stat,
}: {
	readonly leading?: React.ReactNode;
	readonly icon?: React.ReactNode;
	readonly path?: string;
	readonly stat?: React.ReactNode;
}) {
	const name = path ? (path.split(/[\\/]/).pop() ?? path) : null;
	const dir = path && name ? path.slice(0, path.length - name.length).replace(/\/$/, "") : "";
	return (
		<div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-fr-border-soft bg-fr-rail pr-3 pl-1.5">
			{leading}
			{leading && <span className="h-4 w-px shrink-0 bg-fr-border-soft" />}
			<div className="flex min-w-0 flex-1 items-center gap-1.5">
				{icon}
				{name ? (
					<span className="fr-overflow font-secondary text-fr-sm text-fr-text">{name}</span>
				) : (
					<span className="font-secondary text-fr-2xs text-fr-text-3">No file open</span>
				)}
				{dir && <span className="fr-overflow font-secondary text-fr-2xs text-fr-text-3">{dir}</span>}
			</div>
			{stat}
		</div>
	);
}

function EmptyRight({ label }: { readonly label: string }) {
	return (
		<div className="flex h-full items-center justify-center px-6 text-center font-secondary text-fr-sm text-fr-text-3">
			{label}
		</div>
	);
}

export function IdeWorkspace(props: IdeWorkspaceProps) {
	const { paths, gitStatus, files, defaultSelectedPath, scm, getDiff, defaultMode = "folder", className } = props;
	const [mode, setMode] = useState<IdeMode>(defaultMode);
	const [filePath, setFilePath] = useState<string | undefined>(defaultSelectedPath);
	const [change, setChange] = useState<ChangeSelection | null>(null);
	const [collapsed, setCollapsed] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	// Narrow posture (dock resized thin / phone sheet): panel and preview
	// ALTERNATE instead of squeezing the preview into a sliver.
	const narrow = useBelowWidth(rootRef, NARROW_IDE_WIDTH);
	const [showExternalDiff, setShowExternalDiff] = useState(false);
	const externalNonce = useRef<number | undefined>(undefined);
	const externalDiff = props.externalDiff;
	useEffect(() => {
		if (!defaultSelectedPath) return;
		setFilePath(defaultSelectedPath);
		setChange(null);
		setShowExternalDiff(false);
		setMode("folder");
	}, [defaultSelectedPath]);
	useEffect(() => {
		if (externalDiff && externalDiff.nonce !== externalNonce.current) {
			externalNonce.current = externalDiff.nonce;
			setShowExternalDiff(true);
			setMode("git");
		}
	}, [externalDiff]);

	const entry = filePath ? files?.[filePath] : undefined;
	const changeDiff = change ? getDiff?.(change.entry, change.area) : undefined;
	// A binary / image / PDF change has no meaningful text diff — show the file
	// preview (the image itself), exactly like Folder mode, not raw bytes.
	const changeKind = change ? resolveFileKind(change.entry.path) : undefined;
	const changeIsMedia =
		!!change &&
		change.entry.kind !== "deleted" &&
		(changeKind === "image" || changeKind === "pdf" || changeKind === "binary");
	const changeFile = change ? files?.[change.entry.path] : undefined;

	const left =
		mode === "folder" ? (
			<FraymFileTree
				paths={paths}
				gitStatus={gitStatus}
				selectedPath={filePath}
				onSelect={next => {
					setShowExternalDiff(false);
					setFilePath(next);
					if (narrow) setCollapsed(true);
					props.onOpenFile?.(next);
				}}
			/>
		) : (
			<ScmChangesPanel
				snapshot={scm}
				selectedPath={change?.entry.path}
				selectedArea={change?.area}
				onSelectChange={(changeEntry, area) => {
					setShowExternalDiff(false);
					setChange({ area, entry: changeEntry });
					if (narrow) setCollapsed(true);
					props.onOpenChange?.(changeEntry, area);
				}}
				commitMessage={props.commitMessage}
				onCommitMessageChange={props.onCommitMessageChange}
				onStage={props.onStage}
				onUnstage={props.onUnstage}
				onStageAll={props.onStageAll}
				onUnstageAll={props.onUnstageAll}
				onDiscard={props.onDiscard}
				onCommit={props.onCommit}
				onRefresh={props.onRefresh}
				onCommitAndPush={props.onCommitAndPush}
				onPull={props.onPull}
				onPush={props.onPush}
				onCreatePr={props.onCreatePr}
				onCreateBranch={props.onCreateBranch}
				branches={props.branches}
				onCheckout={props.onCheckout}
				notice={props.notice}
				onDismissNotice={props.onDismissNotice}
				committing={props.committing}
				checkpoints={props.checkpoints}
				onRestoreCheckpoint={props.onRestoreCheckpoint}
			/>
		);

	const collapseToggle = (
		<button
			type="button"
			onClick={() => setCollapsed(value => !value)}
			title={collapsed ? "Show panel" : "Hide panel"}
			aria-label={collapsed ? "Show panel" : "Hide panel"}
			className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-fr-text-3 transition-[color,background-color,transform] duration-[var(--fr-motion-fast)] hover:bg-fr-surface hover:text-fr-text active:scale-90"
		>
			<Icon name="panel" size={14} strokeWidth={1.8} />
		</button>
	);

	const rightBody =
		showExternalDiff && externalDiff ? (
			<div className="min-h-0 flex-1 overflow-auto p-2">
				<DiffViewer files={externalDiff.files} viewMode="unified" showToolbar showLineNumbers disableOpen />
			</div>
		) : mode === "folder" ? (
			filePath ? (
				<FileView
					path={filePath}
					kind={entry?.kind}
					mime={entry?.mime}
					content={entry?.content}
					src={entry?.src}
					bytes={entry?.bytes}
					className="min-h-0 flex-1"
				/>
			) : (
				<EmptyRight label="Select a file to preview." />
			)
		) : change ? (
			changeIsMedia ? (
				<FileView
					path={change.entry.path}
					kind={changeKind}
					mime={changeFile?.mime}
					content={changeFile?.content}
					src={changeFile?.src}
					bytes={changeFile?.bytes}
					className="min-h-0 flex-1"
				/>
			) : (
				<div className="min-h-0 flex-1 overflow-auto p-2">
					{changeDiff ? (
						<DiffViewer
							files={changeDiff.files}
							patch={changeDiff.patch}
							oldText={changeDiff.oldText}
							newText={changeDiff.newText}
							path={change.entry.path}
							viewMode="unified"
							showToolbar
							showLineNumbers
							disableOpen
						/>
					) : (
						<EmptyRight
							label={change.entry.kind === "untracked" ? "New file — no diff." : "No diff available."}
						/>
					)}
				</div>
			)
		) : (
			<EmptyRight label="Select a change to view its diff." />
		);

	const headerIcon =
		mode === "folder" ? (
			filePath ? (
				<FileTypeIcon path={filePath} size={14} className="shrink-0" />
			) : undefined
		) : change ? (
			changeIsMedia ? (
				<FileTypeIcon path={change.entry.path} size={14} className="shrink-0" />
			) : (
				<Icon name="diff" size={13} strokeWidth={1.8} className="text-fr-text-2" />
			)
		) : undefined;
	const headerStat =
		mode === "git" && change ? (
			<span className="shrink-0 font-secondary text-fr-2xs tabular-nums">
				<span className="text-fr-add">+{change.entry.additions}</span>{" "}
				<span className="text-fr-del">−{change.entry.deletions}</span>
			</span>
		) : undefined;

	const right = (
		<div className="flex h-full min-h-0 flex-col">
			<PaneHeader
				leading={collapseToggle}
				icon={headerIcon}
				path={mode === "folder" ? filePath : change?.entry.path}
				stat={headerStat}
			/>
			<div data-slot="ide-right-body" className="flex min-h-0 flex-1 flex-col">
				{rightBody}
			</div>
		</div>
	);

	const openPanel = (next: IdeMode) => {
		setMode(next);
		// Rail click always REVEALS the panel — switching to a hidden panel
		// (collapsed, or narrow posture showing the preview) is a silent no-op
		// otherwise.
		setCollapsed(false);
	};

	return (
		<div
			ref={rootRef}
			data-slot="ide-workspace"
			className={cn(
				"flex h-full min-h-0 overflow-hidden rounded-lg border border-fr-border-soft bg-fr-bg",
				// The dock chrome band: the panel/preview header rows share the
				// workspace top bar's 52px height so both bars sit on one line.
				"[&_[data-slot=file-tree-search]]:h-[52px] [&_[data-slot=scm-panel-header]]:h-[52px]",
				className,
			)}
		>
			<div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-fr-border-soft bg-fr-rail pt-2 pb-2">
				<RailButton icon="folder" label="Explorer" active={mode === "folder"} onClick={() => openPanel("folder")} />
				<RailButton
					icon="git-branch"
					label="Source Control"
					active={mode === "git"}
					badge={scm.totals.files}
					onClick={() => openPanel("git")}
				/>
			</div>
			<SplitPane
				bare
				collapsedLeft={collapsed}
				overlayLeft={narrow && !collapsed}
				onOverlayDismiss={() => setCollapsed(true)}
				className="flex-1"
				initialLeftWidth={mode === "git" ? 300 : 248}
				minLeftWidth={220}
				left={
					<div data-slot="ide-panel" key={mode} className="flex h-full min-h-0 flex-col">
						{left}
					</div>
				}
				right={right}
			/>
		</div>
	);
}

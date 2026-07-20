"use client";

// ScmChangesPanel — the Source Control LEFT panel: branch + git-actions menu,
// commit box, and Merge / Staged / Changes sections (select mode). It's the "Git"
// side panel of the IDE surface (the DiffViewer renders in the shared right pane).
// Reused by IdeWorkspace. fr-tokens only.

import { type ReactNode, useState } from "react";
import { Button } from "../../elements";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";
import { StackedPane } from "../split-pane";
import { GitActionsMenu } from "./git-actions-menu";
import { ScmChangeRow } from "./scm-change-row";
import type { ScmArea, ScmBranch, ScmChangeEntry, ScmCheckpoint, ScmNotice, ScmSnapshot } from "./scm-types";

function Section({
	label,
	count,
	action,
	children,
}: {
	readonly label: string;
	readonly count: number;
	readonly action?: ReactNode;
	readonly children: ReactNode;
}) {
	if (count === 0) return null;
	return (
		<section className="flex flex-col">
			<div className="group/section flex items-center gap-2 px-1 py-1">
				<span className="fr-eyebrow flex-1 text-fr-text-3">
					{label} <span className="text-fr-text-2">{count}</span>
				</span>
				{action}
			</div>
			<div className="flex flex-col">{children}</div>
		</section>
	);
}

function SectionAction({
	icon,
	title,
	onClick,
}: {
	readonly icon: "plus" | "minus";
	readonly title: string;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			title={title}
			aria-label={title}
			onClick={onClick}
			className="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-fr-text-3 opacity-0 transition-colors hover:bg-fr-surface-2 hover:text-fr-text group-hover/section:opacity-100 [&_svg]:size-[13px]"
		>
			<Icon name={icon} size={13} strokeWidth={2} />
		</button>
	);
}

/** Compact relative age for a checkpoint row ("2m ago"). */
function timeAgo(iso: string): string {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return "";
	const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

function CheckpointRow({
	checkpoint,
	confirming,
	onConfirmToggle,
	onRestore,
}: {
	readonly checkpoint: ScmCheckpoint;
	readonly confirming: boolean;
	readonly onConfirmToggle: () => void;
	readonly onRestore: () => void;
}) {
	const { files } = checkpoint.totals;
	const filesPart = files > 0 ? `${files} ${files === 1 ? "file" : "files"}` : "no changes";
	const ago = timeAgo(checkpoint.createdAt);
	return (
		<div className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 hover:bg-fr-surface">
			<Icon name="clock" size={13} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
			<div className="min-w-0 flex-1">
				<div className="fr-overflow font-secondary text-fr-xs text-fr-text">{checkpoint.label}</div>
				<div className="fr-overflow font-secondary text-fr-2xs text-fr-text-3">
					{ago ? `${filesPart} · ${ago}` : filesPart}
				</div>
			</div>
			{confirming ? (
				<span className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={onRestore}
						title="Confirm — revert the working tree to this checkpoint"
						className="rounded-[5px] px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-del hover:bg-fr-surface-2"
					>
						Revert
					</button>
					<button
						type="button"
						onClick={onConfirmToggle}
						aria-label="Cancel"
						title="Cancel"
						className="flex size-5 items-center justify-center rounded-[5px] text-fr-text-3 hover:text-fr-text"
					>
						<Icon name="x" size={11} strokeWidth={2} />
					</button>
				</span>
			) : (
				<button
					type="button"
					onClick={onConfirmToggle}
					title="Restore files to this checkpoint"
					className="shrink-0 rounded-[5px] px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-text-3 hover:bg-fr-surface-2 hover:text-fr-text"
				>
					Restore
				</button>
			)}
		</div>
	);
}

export interface ScmChangesPanelProps {
	readonly snapshot: ScmSnapshot;
	readonly selectedPath?: string;
	readonly selectedArea?: ScmArea;
	readonly onSelectChange?: (entry: ScmChangeEntry, area: ScmArea) => void;
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
	readonly onRestoreCheckpoint?: (ref: string) => void;
	readonly className?: string;
}

export function ScmChangesPanel({
	snapshot,
	selectedPath,
	selectedArea,
	onSelectChange,
	commitMessage = "",
	onCommitMessageChange,
	onStage,
	onUnstage,
	onStageAll,
	onUnstageAll,
	onDiscard,
	onCommit,
	onRefresh,
	onCommitAndPush,
	onPull,
	onPush,
	onCreatePr,
	onCreateBranch,
	branches,
	onCheckout,
	notice,
	onDismissNotice,
	committing,
	checkpoints = [],
	onRestoreCheckpoint,
	className,
}: ScmChangesPanelProps) {
	const { branch, totals } = snapshot;
	const conflicts = snapshot.conflicts ?? [];
	const isClean = conflicts.length === 0 && snapshot.staged.length === 0 && snapshot.unstaged.length === 0;
	const canCommit = snapshot.staged.length > 0 && commitMessage.trim().length > 0;
	const [confirmingRef, setConfirmingRef] = useState<string | null>(null);

	const renderRows = (
		area: ScmArea,
		entries: readonly ScmChangeEntry[],
		primary?: (entry: ScmChangeEntry) => void,
		discard?: (entry: ScmChangeEntry) => void,
	) =>
		entries.map(entry => (
			<ScmChangeRow
				key={`${area}:${entry.path}`}
				entry={entry}
				area={area}
				expanded={false}
				showCaret={false}
				selected={selectedArea === area && selectedPath === entry.path}
				onToggle={() => onSelectChange?.(entry, area)}
				onPrimary={primary ? () => primary(entry) : undefined}
				onDiscard={discard ? () => discard(entry) : undefined}
			/>
		));

	return (
		<div className={cn("flex h-full min-h-0 flex-col bg-fr-rail", className)}>
			<div
				data-slot="scm-panel-header"
				className="flex h-9 shrink-0 items-center gap-2 border-b border-fr-border-soft px-2.5"
			>
				<GitActionsMenu
					branch={branch.current}
					ahead={branch.ahead}
					behind={branch.behind}
					onCommitAndPush={onCommitAndPush}
					onCommit={() => onCommit?.(commitMessage.trim())}
					onPull={onPull}
					onPush={onPush}
					onCreatePr={onCreatePr}
					onCreateBranch={onCreateBranch}
					branches={branches}
					onCheckout={onCheckout}
				/>
				<span className="flex-1" />
				{(totals.additions > 0 || totals.deletions > 0) && (
					<span className="font-secondary text-fr-2xs tabular-nums">
						<span className="text-fr-add">+{totals.additions}</span>{" "}
						<span className="text-fr-del">−{totals.deletions}</span>
					</span>
				)}
				{onRefresh && (
					<button
						type="button"
						title="Refresh"
						aria-label="Refresh"
						onClick={onRefresh}
						className="flex size-6 items-center justify-center rounded-[6px] text-fr-text-3 hover:bg-fr-surface hover:text-fr-text"
					>
						<Icon name="refresh" size={13} strokeWidth={1.9} />
					</button>
				)}
			</div>
			{notice && (
				<div
					className={cn(
						"flex shrink-0 items-start gap-2 border-b border-fr-border-soft px-2.5 py-2 font-secondary text-fr-2xs",
						notice.tone === "error" ? "text-fr-del" : "text-fr-add",
					)}
				>
					<Icon
						name={notice.tone === "error" ? "shield" : "check"}
						size={13}
						strokeWidth={1.9}
						className="mt-px shrink-0"
					/>
					<span className="min-w-0 flex-1 break-words">
						{notice.text}
						{notice.href && (
							<a
								href={notice.href}
								target="_blank"
								rel="noreferrer"
								className="ml-1 underline hover:text-fr-text"
							>
								{notice.href}
							</a>
						)}
					</span>
					{onDismissNotice && (
						<button
							type="button"
							onClick={onDismissNotice}
							aria-label="Dismiss"
							className="shrink-0 text-fr-text-3 hover:text-fr-text"
						>
							<Icon name="x" size={12} strokeWidth={2} />
						</button>
					)}
				</div>
			)}
			<div className="flex shrink-0 flex-col gap-2 border-b border-fr-border-soft px-2.5 py-2.5">
				<textarea
					value={commitMessage}
					onChange={event => onCommitMessageChange?.(event.target.value)}
					placeholder={snapshot.staged.length > 0 ? `Message (${snapshot.staged.length} staged)` : "Message"}
					rows={2}
					className="w-full resize-none rounded-[8px] border border-fr-border-soft bg-fr-surface px-2.5 py-2 font-primary text-fr-sm text-fr-text placeholder:text-fr-text-3 focus-visible:border-fr-accent-line focus-visible:outline-none"
				/>
				<Button
					variant="default"
					size="sm"
					disabled={!canCommit}
					loading={committing}
					loadingText="Committing…"
					onClick={() => onCommit?.(commitMessage.trim())}
					className="w-full transition-transform active:scale-[0.98]"
				>
					<Icon name="check" size={13} strokeWidth={2} />
					Commit
				</Button>
			</div>
			<StackedPane
				resizeLabel="Resize checkpoints"
				top={
					<div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
						{isClean ? (
							<div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
								<Icon name="check" size={20} strokeWidth={1.8} className="text-fr-add" />
								<p className="font-secondary text-fr-sm text-fr-text-2">No changes</p>
							</div>
						) : (
							<div className="flex flex-col gap-3">
								<Section label="Merge Changes" count={conflicts.length}>
									{renderRows("unstaged", conflicts, onStage)}
								</Section>
								<Section
									label="Staged Changes"
									count={snapshot.staged.length}
									action={
										onUnstageAll && snapshot.staged.length > 0 ? (
											<SectionAction icon="minus" title="Unstage all" onClick={onUnstageAll} />
										) : undefined
									}
								>
									{renderRows("staged", snapshot.staged, onUnstage)}
								</Section>
								<Section
									label="Changes"
									count={snapshot.unstaged.length}
									action={
										onStageAll && snapshot.unstaged.length > 0 ? (
											<SectionAction icon="plus" title="Stage all" onClick={onStageAll} />
										) : undefined
									}
								>
									{renderRows("unstaged", snapshot.unstaged, onStage, onDiscard)}
								</Section>
							</div>
						)}
					</div>
				}
				bottom={
					checkpoints.length > 0 ? (
						<div data-slot="scm-checkpoints" className="flex h-full min-h-0 flex-col overflow-hidden bg-fr-rail">
							<div className="flex shrink-0 items-center gap-1.5 px-2.5 pt-2 pb-1">
								<Icon name="history" size={12} strokeWidth={1.9} className="text-fr-text-3" />
								<span className="fr-eyebrow flex-1 text-fr-text-3">
									Checkpoints <span className="text-fr-text-2">{checkpoints.length}</span>
								</span>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
								{checkpoints.map(checkpoint => (
									<CheckpointRow
										key={checkpoint.ref}
										checkpoint={checkpoint}
										confirming={confirmingRef === checkpoint.ref}
										onConfirmToggle={() =>
											setConfirmingRef(current => (current === checkpoint.ref ? null : checkpoint.ref))
										}
										onRestore={() => {
											setConfirmingRef(null);
											onRestoreCheckpoint?.(checkpoint.ref);
										}}
									/>
								))}
							</div>
						</div>
					) : null
				}
			/>
		</div>
	);
}

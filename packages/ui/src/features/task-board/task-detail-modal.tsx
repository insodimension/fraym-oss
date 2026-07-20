"use client";

// TaskDetailModal — the full-task popup opened from a board card or a list row.
//
// Fetches the resolved task document for the markdown body while rendering
// header/meta instantly from the list summary, so the panel never flashes empty.
// With a writable source, status, priority, and body edits update in place.

import { type ReactElement, useEffect, useState } from "react";
import { Button, Modal, Select, Skeleton, StreamingMarkdown, Textarea } from "../../elements";
import { Icon } from "../../icons";
import {
	AssigneeChip,
	MetaChip,
	PRIORITY_OPTIONS,
	PriorityPill,
	StatusBadge,
	statusOptions,
	TagChips,
} from "./task-board-shared";
import type { TaskHandoffInput, TaskSessionActions } from "./task-handoff";
import type { TaskFieldPatch, TaskRow, TaskStore, TaskStoreNote } from "./use-task-board";

export interface TaskDetailModalProps {
	readonly store: TaskStore;
	readonly noteId: string;
	/** List summary for instant header/meta chrome while the full note resolves. */
	readonly summary?: TaskRow;
	/** Enable inline status/priority edits (mirrors the board's updateNote gate). */
	readonly writable: boolean;
	readonly onUpdate: (noteId: string, fields: TaskFieldPatch) => void;
	readonly onClose: () => void;
	/** Optional host hook for opening a dependency. */
	readonly onOpenNote?: (noteId: string) => void;
	/** Host-wired session ops — when present, the modal offers "add to current" / "new session". */
	readonly sessionActions?: TaskSessionActions;
}

/** One labelled meta cell in the detail grid. */
function MetaField({ label, children }: { readonly label: string; readonly children: ReactElement }): ReactElement {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="fr-eyebrow text-fr-text-3">{label}</span>
			<div className="flex min-w-0 items-center">{children}</div>
		</div>
	);
}

const DASH = <span className="text-fr-sm text-fr-text-3">—</span>;

export function TaskDetailModal({
	store,
	noteId,
	summary,
	writable,
	onUpdate,
	onClose,
	onOpenNote,
	sessionActions,
}: TaskDetailModalProps): ReactElement {
	const [note, setNote] = useState<TaskStoreNote | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Local optimistic overrides so an inline edit reflects before the refetch.
	const [overrides, setOverrides] = useState<{ status?: string; priority?: number | null }>({});
	// Body editor (the "edit right here" door): the same StreamingMarkdown renders
	// the description; Edit swaps in a textarea and writes back via updateNote.
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		setLoading(true);
		setError(null);
		setOverrides({});
		setEditing(false);
		setSaveError(null);
		store.getNote(noteId).then(
			result => {
				if (!alive) return;
				setNote(result);
				setLoading(false);
			},
			(err: unknown) => {
				if (!alive) return;
				setError(err instanceof Error ? err.message : String(err));
				setLoading(false);
			},
		);
		return () => {
			alive = false;
		};
	}, [store, noteId]);

	const base = note?.task ?? summary?.task;
	const title = note?.title ?? summary?.title ?? "Task";
	const tags = note?.tags ?? summary?.tags ?? [];
	const depends = base?.depends ?? [];
	const status = overrides.status ?? base?.status ?? "todo";
	const priority = overrides.priority !== undefined ? (overrides.priority ?? undefined) : base?.priority;
	const body = note?.markdown ?? "";
	const canEditBody = writable && Boolean(store.updateNote);
	const handoffTask: TaskHandoffInput = {
		id: noteId,
		title,
		status,
		section: base?.section,
		project: note?.scope?.id ?? summary?.scope?.id,
		snippet: note?.snippet ?? summary?.snippet,
	};
	// Already being worked by ANOTHER session → jump to it instead of launching a duplicate.
	const claimedSessionId = base?.session;
	const claimedElsewhere = Boolean(
		claimedSessionId && sessionActions && claimedSessionId !== sessionActions.currentSessionId,
	);

	const changeStatus = (value: string) => {
		setOverrides(prev => ({ ...prev, status: value }));
		onUpdate(noteId, { status: value });
	};
	const changePriority = (value: string) => {
		const next = value === "" ? null : Number(value);
		setOverrides(prev => ({ ...prev, priority: next }));
		onUpdate(noteId, { priority: next });
	};
	const startEdit = () => {
		setDraft(body);
		setSaveError(null);
		setEditing(true);
	};
	const cancelEdit = () => {
		setEditing(false);
		setSaveError(null);
	};
	const saveBody = () => {
		if (!store.updateNote) return;
		setSaving(true);
		setSaveError(null);
		store.updateNote({ noteId, markdown: draft }).then(
			updated => {
				setNote(updated);
				setSaving(false);
				setEditing(false);
			},
			(err: unknown) => {
				setSaveError(err instanceof Error ? err.message : String(err));
				setSaving(false);
			},
		);
	};

	return (
		<Modal
			onClose={onClose}
			data-slot="task-detail-modal"
			aria-label={title}
			className="flex max-h-[min(85vh,760px)] w-[min(720px,calc(100vw-24px))] flex-col border-fr-border-soft bg-fr-surface/90 backdrop-blur-xl"
		>
			<header className="flex items-start gap-3 border-fr-border-soft border-b px-5 py-4">
				<div className="min-w-0 flex-1">
					<div className="mb-1.5 flex flex-wrap items-center gap-2">
						<span className="fr-eyebrow text-fr-text-3">Task</span>
						<span aria-hidden className="size-1 rounded-full bg-fr-border" />
						<StatusBadge status={status} />
						{base?.milestone ? <MetaChip icon="bolt">{base.milestone}</MetaChip> : null}
					</div>
					<h2 className="text-fr-lg font-semibold leading-snug text-fr-text">{title}</h2>
				</div>
				<Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
					<Icon name="x" size={16} />
				</Button>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				<div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
					<MetaField label="Status">
						{writable ? (
							<Select
								size="sm"
								aria-label="Status"
								value={status}
								options={statusOptions(status)}
								onChange={event => changeStatus(event.target.value)}
							/>
						) : (
							<StatusBadge status={status} />
						)}
					</MetaField>
					<MetaField label="Priority">
						{writable ? (
							<Select
								size="sm"
								aria-label="Priority"
								value={priority === undefined ? "" : String(priority)}
								options={PRIORITY_OPTIONS}
								onChange={event => changePriority(event.target.value)}
							/>
						) : (
							<PriorityPill priority={priority} />
						)}
					</MetaField>
					<MetaField label="Assignee">{base?.assignee ? <AssigneeChip name={base.assignee} /> : DASH}</MetaField>
					<MetaField label="Due">{base?.due ? <MetaChip icon="clock">{base.due}</MetaChip> : DASH}</MetaField>
					<MetaField label="Section">
						{base?.section ? <span className="fr-overflow text-fr-sm text-fr-text-2">{base.section}</span> : DASH}
					</MetaField>
					<MetaField label="Milestone">
						{base?.milestone ? <MetaChip icon="bolt">{base.milestone}</MetaChip> : DASH}
					</MetaField>
				</div>

				{tags.length > 0 ? (
					<div className="mt-4 flex flex-col gap-1.5">
						<span className="fr-eyebrow text-fr-text-3">Tags</span>
						<TagChips tags={tags} />
					</div>
				) : null}

				{depends.length > 0 ? (
					<div className="mt-4 flex flex-col gap-1.5">
						<span className="fr-eyebrow text-fr-text-3">Depends on</span>
						<div className="flex flex-wrap gap-1.5">
							{depends.map(dep =>
								onOpenNote ? (
									<button key={dep} type="button" onClick={() => onOpenNote(dep)} className="max-w-full">
										<MetaChip
											icon="link"
											className="transition-colors hover:border-fr-accent-line hover:text-fr-accent"
										>
											{dep}
										</MetaChip>
									</button>
								) : (
									<MetaChip key={dep} icon="link">
										{dep}
									</MetaChip>
								),
							)}
						</div>
					</div>
				) : null}

				<div className="mt-5 border-fr-border-soft border-t pt-4">
					<div className="mb-2 flex items-center justify-between gap-2">
						<span className="fr-eyebrow text-fr-text-3">Description</span>
						{canEditBody ? (
							editing ? (
								<div className="flex items-center gap-1.5">
									<Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
										Cancel
									</Button>
									<Button
										variant="default"
										size="sm"
										onClick={saveBody}
										loading={saving}
										loadingText="Saving…"
									>
										Save
									</Button>
								</div>
							) : (
								<Button variant="ghost" size="sm" onClick={startEdit} disabled={loading && !note}>
									<Icon name="edit" size={13} />
									Edit
								</Button>
							)
						) : null}
					</div>
					{editing ? (
						<>
							<Textarea
								autoFocus
								value={draft}
								onChange={event => setDraft(event.target.value)}
								resize="vertical"
								placeholder="Describe the task in markdown — lists, links, and images all render."
								className="min-h-[220px] leading-relaxed"
							/>
							{saveError ? <p className="mt-1.5 text-fr-2xs text-fr-del">{saveError}</p> : null}
						</>
					) : loading && !note ? (
						<div className="flex flex-col gap-2" aria-busy aria-label="Loading task">
							<Skeleton className="h-4 w-3/4" rounded="sm" />
							<Skeleton className="h-4 w-full" rounded="sm" />
							<Skeleton className="h-4 w-5/6" rounded="sm" />
						</div>
					) : error ? (
						<p className="text-fr-sm text-fr-del">{error}</p>
					) : body.trim().length > 0 ? (
						<StreamingMarkdown text={body} />
					) : (
						<p className="text-fr-sm text-fr-text-3 italic">No description.</p>
					)}
				</div>
			</div>
			{sessionActions ? (
				<footer className="flex shrink-0 items-center justify-between gap-3 border-fr-border-soft border-t px-5 py-3">
					<span className="fr-eyebrow text-fr-text-3">
						{claimedElsewhere ? "Already running" : "Run this task"}
					</span>
					<div className="flex items-center gap-2">
						{claimedElsewhere && claimedSessionId ? (
							<Button
								variant="default"
								size="sm"
								onClick={() => {
									sessionActions.goToSession(claimedSessionId);
									onClose();
								}}
							>
								<Icon name="arrowR" size={13} />
								Go to session
							</Button>
						) : (
							<>
								<Button
									variant="ghost"
									size="sm"
									disabled={sessionActions.busy}
									onClick={() => {
										sessionActions.handoff([handoffTask], { kind: "current", mode: "queue" });
										onClose();
									}}
								>
									<Icon name="arrowR" size={13} />
									In this session
								</Button>
								<Button
									variant="default"
									size="sm"
									loading={sessionActions.busy}
									loadingText="Starting…"
									onClick={() => {
										sessionActions.handoff([handoffTask], { kind: "new" });
										onClose();
									}}
								>
									<Icon name="plus" size={13} />
									In a new session
								</Button>
							</>
						)}
					</div>
				</footer>
			) : null}
		</Modal>
	);
}

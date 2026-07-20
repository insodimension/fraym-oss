"use client";

// useTaskBoard — driver loading + write actions for the TaskBoard feature.
//
// One hook owns the surface: it fetches every `type:"task"` note for a project,
// keeps only the rows that actually carry lifted `task` frontmatter, and exposes
// capability-gated write actions (drag/inline-edit → updateNote, create →
// createNote). Every read is guarded against stale responses with a sequence
// token pattern, and writes bump a refresh tick to re-read.

import { useCallback, useEffect, useRef, useState } from "react";

export interface TaskStoreFields {
	readonly status: string;
	readonly priority?: number;
	readonly section?: string;
	readonly assignee?: string;
	readonly due?: string;
	readonly session?: string;
	readonly depends?: readonly string[];
	readonly milestone?: string;
	readonly order?: number;
	readonly parent?: string;
}

export interface TaskStoreScope {
	readonly type: string;
	readonly id: string;
	readonly label?: string;
}

export interface TaskStoreSummary {
	readonly id: string;
	readonly title: string;
	readonly snippet?: string;
	readonly tags: readonly string[];
	readonly updatedAt: number;
	readonly scope?: TaskStoreScope;
	readonly task?: TaskStoreFields;
}

export interface TaskStoreNote extends TaskStoreSummary {
	readonly markdown?: string;
}

export interface TaskStoreQuery {
	readonly type?: string;
	readonly project?: string;
	readonly session?: string;
	readonly folder?: string;
	readonly scope?: { readonly type: string; readonly id: string };
	readonly limit?: number;
	readonly offset?: number;
}

export interface TaskStore {
	listNotes(query: TaskStoreQuery): Promise<{ readonly notes: readonly TaskStoreSummary[]; readonly total: number }>;
	getNote(noteId: string): Promise<TaskStoreNote>;
	getVaultOverview(): Promise<{
		readonly scopes?: readonly { readonly type: string; readonly id: string; readonly label?: string; readonly count: number }[];
		readonly projects: readonly { readonly name: string; readonly count: number }[];
	}>;
	updateNote?: (input: {
		readonly noteId: string;
		readonly markdown?: string;
		readonly fields?: TaskFieldPatch;
	}) => Promise<TaskStoreNote>;
	createNote?: (input: {
		readonly title: string;
		readonly type: string;
		readonly markdown: string;
		readonly folder: string;
		readonly fields: TaskFieldPatch;
	}) => Promise<TaskStoreNote>;
}

/** A task row carries lifted board fields. */
export type TaskRow = TaskStoreSummary & { readonly task: TaskStoreFields };

/** A field patch for one task. */
export type TaskFieldPatch = Record<string, string | number | boolean | readonly string[] | null>;

export interface TaskBoardModel {
	/** Task rows for the project, in the driver's returned order. */
	readonly tasks: readonly TaskRow[];
	readonly loading: boolean;
	readonly error: string | null;
	/** Re-run the read (also fired automatically after a write lands). */
	readonly refresh: () => void;
	/** Driver can patch tasks — gates drag + inline-edit affordances. */
	readonly writable: boolean;
	/** Driver can author tasks — gates the "+ Add task" affordance. */
	readonly creatable: boolean;
	/** A write is in flight. */
	readonly mutating: boolean;
	/** Patch a task's frontmatter, then refetch. No-op when not `writable`. */
	readonly updateTask: (noteId: string, fields: TaskFieldPatch) => void;
	/** Author a new task under the project, then refetch. No-op when not `creatable`. */
	readonly createTask: (title: string, status: string) => void;
}

/** Page size per listNotes call, and a hard valve on how many pages one load
 *  will chase (PAGE × MAX_PAGES notes) so a misbehaving driver can't loop us. */
const PAGE = 500;
const MAX_PAGES = 20;

/** Fetch EVERY page of a query (the driver caps single reads, and boards larger
 *  than one page would otherwise silently truncate). Dedupes by note id, so a
 *  driver that ignores `offset` degrades to one page instead of spinning. */
async function listAllNotes(store: TaskStore, base: TaskStoreQuery): Promise<readonly TaskStoreSummary[]> {
	const seen = new Map<string, TaskStoreSummary>();
	let offset = 0;
	for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
		const page = await store.listNotes({ ...base, limit: PAGE, offset });
		const before = seen.size;
		for (const note of page.notes) seen.set(note.id, note);
		const exhausted = seen.size >= page.total || page.notes.length < PAGE || seen.size === before;
		if (exhausted) break;
		offset += page.notes.length;
	}
	return [...seen.values()];
}

export function useTaskBoard(
	store: TaskStore,
	projectId: string,
	options?: { readonly scope?: { readonly type: string; readonly id: string } },
): TaskBoardModel {
	const [tasks, setTasks] = useState<readonly TaskRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [mutating, setMutating] = useState(false);
	const [refreshTick, setRefreshTick] = useState(0);
	const loadSeq = useRef(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshTick deliberately re-runs the read after a write lands
	useEffect(() => {
		const seq = ++loadSeq.current;
		setLoading(true);
		setError(null);
		// A session scope queries by the `session` membership field (owned cards + synced
		// todos), NOT a session scope/room; other scopes keep the scope filter.
		const scope = options?.scope;
		const query: TaskStoreQuery =
			scope?.type === "session"
				? { session: scope.id, type: "task" }
				: scope
					? { scope, type: "task" }
					: projectId
						? { project: projectId, type: "task" }
						: { type: "task" };
		listAllNotes(store, query).then(
			notes => {
				if (seq !== loadSeq.current) return;
				// Defensive: keep only notes whose `task` frontmatter was lifted.
				setTasks(notes.filter((note): note is TaskRow => note.task !== undefined));
				setLoading(false);
			},
			(cause: unknown) => {
				if (seq !== loadSeq.current) return;
				setTasks([]);
				setError(cause instanceof Error ? cause.message : String(cause));
				setLoading(false);
			},
		);
	}, [store, projectId, options?.scope?.type, options?.scope?.id, refreshTick]);

	const refresh = useCallback(() => setRefreshTick(tick => tick + 1), []);

	// Shared write lifecycle: mark in-flight + clear stale error, then on settle
	// drop the flag and refetch on success / surface the message on failure.
	const runMutation = useCallback((op: Promise<unknown>) => {
		setMutating(true);
		setError(null);
		op.then(
			() => {
				setMutating(false);
				setRefreshTick(tick => tick + 1);
			},
			(cause: unknown) => {
				setMutating(false);
				setError(cause instanceof Error ? cause.message : String(cause));
			},
		);
	}, []);

	const updateTask = useCallback(
		(noteId: string, fields: TaskFieldPatch) => {
			if (!store.updateNote) return;
			runMutation(store.updateNote({ noteId, fields }));
		},
		[store, runMutation],
	);

	const createTask = useCallback(
		(title: string, status: string) => {
			const trimmed = title.trim();
			if (!store.createNote || trimmed.length === 0) return;
			runMutation(
				store.createNote({
					title: trimmed,
					type: "task",
					markdown: "",
					folder: `projects/${projectId}/tasks`,
					fields: { status },
				}),
			);
		},
		[store, projectId, runMutation],
	);

	return {
		tasks,
		loading,
		error,
		refresh,
		writable: store.updateNote !== undefined && !options?.scope,
		creatable: store.createNote !== undefined && projectId.length > 0 && !options?.scope,
		mutating,
		updateTask,
		createTask,
	};
}

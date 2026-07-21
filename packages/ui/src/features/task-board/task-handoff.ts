// task-handoff — the shared "hand a board task to a session" core: the brief
// text (single + group) and the action contract. Every entry point (the drag
// dropzone, the task-detail modal's session buttons, the multi-select context
// menu) routes through this, so a handed-off task always reaches the agent as
// the SAME agent-legible brief: read it with the board tool, then drive it.

import type { SessionDriver, SessionRef, WorkspaceRef } from "@fraym-ai/driver";
import type { ReactNode } from "react";
import type { TaskStore } from "./use-task-board";

/** Card-level facts a hand-off needs; a drag payload and a board row both satisfy it. */
export interface TaskHandoffInput {
	readonly id: string;
	readonly title: string;
	readonly status?: string;
	readonly section?: string;
	readonly project?: string;
	/** First lines of the body (the card snippet) — a teaser; the agent op:gets the rest. */
	readonly snippet?: string;
}

/** Where a hand-off goes, and — for the current session — whether it's a goal or a queued prompt. */
export type TaskHandoffTarget =
	| { readonly kind: "current"; readonly mode: "goal" | "queue" }
	| { readonly kind: "new" } // one shared new session for the whole group
	| { readonly kind: "new-each" }; // one new session per task

/** Host-wired session operations the board surfaces. Absent when no session +
 *  workspace are in scope (the board then renders without these affordances). */
export interface TaskSessionActions {
	readonly handoff: (tasks: readonly TaskHandoffInput[], target: TaskHandoffTarget) => void;
	/** A hand-off (usually session creation) is in flight — gates the controls. */
	readonly busy?: boolean;
	/** Bring the session already working a task to the front — the claimed-task "Go to session". */
	readonly goToSession: (sessionId: string) => void;
	/** The session the board is currently viewing, so the modal hides "Go to session" when you're already in it. */
	readonly currentSessionId?: string;
	/** Edit-and-confirm dialog for a "current session" hand-off (goal or queue) — render it once
	 *  near `sessionActions`'s consumer. Reviews/edits the brief and (queue mode) attaches images
	 *  before anything is sent, so the agent never reaches an inconsistent half-sent state. */
	readonly dialog?: ReactNode;
}

/** Single-task brief: title + snippet + read-it / track-it via the board tool. */
export function taskBrief(task: TaskHandoffInput): string {
	const ref = task.project ? `task \`${task.id}\` in project \`${task.project}\`` : `task \`${task.id}\``;
	const meta = [
		task.status && `status: ${task.status}`,
		task.section && `section: ${task.section}`,
		task.project && `project: ${task.project}`,
	]
		.filter(Boolean)
		.join(" · ");
	const lines = ["Work on this board task:", "", `**${task.title}**`];
	if (meta) lines.push("", meta);
	const snippet = task.snippet?.trim();
	if (snippet) lines.push("", snippet);
	lines.push(
		"",
		`This task already exists on the board (${ref}) and is now assigned to this session — do NOT create a new task; drive THIS one.`,
		`Read it in full first with the board tool — \`op:get\` ${ref} — for the complete description, acceptance criteria, and any subtasks (this card may be an epic).`,
		"It's been moved to `doing`; when you finish, mark it `done` with `op:update` (run `op:start` yourself if it isn't already `doing`).",
		"If it's an epic: own it whole — move every one of its subtasks to `todo` now (claims them for this session), then carry each through `doing` → `done` as you actually finish that piece (never batch-flip them all at once), and only close the epic itself once every subtask is `done`.",
	);
	return lines.join("\n");
}

/** Group brief: several tasks handed to ONE session (a queued prompt). */
export function taskGroupBrief(tasks: readonly TaskHandoffInput[]): string {
	const first = tasks[0];
	if (tasks.length <= 1) return first ? taskBrief(first) : "Work on the selected board tasks.";
	const items = tasks
		.map(
			(t, i) =>
				`${i + 1}. **${t.title}** — \`op:get\` task \`${t.id}\`${t.project ? ` (project \`${t.project}\`)` : ""}`,
		)
		.join("\n");
	return [
		`Work on these ${tasks.length} board tasks (they already exist and are now assigned to this session — do NOT create new ones):`,
		"",
		items,
		"",
		"For each: read it with the board tool (`op:get`), then `op:update` it to `done` when finished (`op:start` it to `doing` if it isn't already) — keeping the board live as you go.",
		"Any of these that's an epic: own it whole — move every one of its subtasks to `todo` now, then carry each through `doing` → `done` as you actually finish that piece (never batch-flip them all at once), and only close the epic itself once every subtask is `done`.",
	].join("\n");
}

/** Claim board tasks for a session: mark each `doing` and stamp the working
 *  session, so the card moves + shows ownership the instant it's handed off
 *  (and a later drag can see it's already taken). No-op on a read-only driver. */
export async function claimTasksForSession(
	store: TaskStore | null | undefined,
	tasks: readonly TaskHandoffInput[],
	sessionId: string | undefined,
): Promise<void> {
	const driver = store;
	if (!driver?.updateNote || !sessionId || tasks.length === 0) return;
	await Promise.all(
		tasks.map(task => driver.updateNote?.({ noteId: task.id, fields: { status: "doing", session: sessionId } })),
	);
}

/** Orchestrate a "new session(s)" hand-off: create the session, claim the task(s) onto it,
 *  navigate to it, and send the synthetic brief. The brief is FIRE-AND-FORGET — navigation
 *  must NOT await the prompt round-trip, or a slow/stuck engine reply would strand the
 *  launcher on "Starting…" forever and never open the session (the reported bug). */
export async function dispatchTaskHandoff(
	deps: {
		readonly driver: SessionDriver;
		readonly store: TaskStore | null | undefined;
		readonly workspace: WorkspaceRef;
		readonly openSession?: (ref: SessionRef) => void;
	},
	tasks: readonly TaskHandoffInput[],
	target: { readonly kind: "new" } | { readonly kind: "new-each" },
): Promise<void> {
	const { driver, store, workspace, openSession } = deps;
	let last: SessionRef | null = null;
	if (target.kind === "new") {
		const snap = await driver.createSession(workspace);
		await claimTasksForSession(store, tasks, snap.ref.sessionId);
		last = snap.ref;
		void driver.sendUserMessage(snap.ref, { text: taskGroupBrief(tasks) }).catch(() => undefined);
	} else {
		for (const task of tasks) {
			const snap = await driver.createSession(workspace);
			await claimTasksForSession(store, [task], snap.ref.sessionId);
			void driver.sendUserMessage(snap.ref, { text: taskBrief(task) }).catch(() => undefined);
			last = snap.ref;
		}
	}
	if (last) openSession?.(last);
}

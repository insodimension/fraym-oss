// task-drag — the cross-surface payload for dragging a board card OUT of the
// Kanban and onto a session pane (where it becomes a goal or a queued prompt).
//
// The card's own column-reorder DnD is internal React state; this rides ALONGSIDE
// it on a dedicated mime so a drop landing on a session pane carries enough to
// brief the agent (title + status + a body snippet) without a driver round-trip.
// Mirrors the session-rail's session-drag helper shape.

export const FRAYM_TASK_DRAG_TYPE = "application/x-fraym-task";

/** A board task in flight — card-level metadata, never the full note body. */
export interface TaskDragData {
	readonly id: string;
	readonly title: string;
	readonly status: string;
	readonly section?: string;
	/** First lines of the note body (the card snippet), for a richer prompt. */
	readonly snippet?: string;
	/** The note's project scope id — lets the receiving agent target the right board. */
	readonly project?: string;
}

/** Stamp a task onto a drag's dataTransfer (plus a `text/plain` title fallback). */
export function writeTaskDragData(dataTransfer: DataTransfer, data: TaskDragData): void {
	dataTransfer.setData(FRAYM_TASK_DRAG_TYPE, JSON.stringify(data));
	dataTransfer.setData("text/plain", data.title);
}

/** A task drag is in progress — readable during dragover (where getData is blocked). */
export function hasTaskDragData(dataTransfer: DataTransfer): boolean {
	return Array.from(dataTransfer.types).includes(FRAYM_TASK_DRAG_TYPE);
}

/** Recover the task from a drop's dataTransfer, or null when it isn't a task drag. */
export function readTaskDragData(dataTransfer: DataTransfer): TaskDragData | null {
	const raw = dataTransfer.getData(FRAYM_TASK_DRAG_TYPE);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<TaskDragData>;
		if (typeof parsed.id !== "string" || typeof parsed.title !== "string" || typeof parsed.status !== "string") {
			return null;
		}
		return {
			id: parsed.id,
			title: parsed.title,
			status: parsed.status,
			section: typeof parsed.section === "string" ? parsed.section : undefined,
			snippet: typeof parsed.snippet === "string" ? parsed.snippet : undefined,
			project: typeof parsed.project === "string" ? parsed.project : undefined,
		};
	} catch {
		return null;
	}
}

/** Set a compact drag-preview chip (status dot · title · project) as the cursor
 *  image for a board-card drag, replacing the browser's default full-card ghost.
 *  `statusDotClass` is the caller's status→color token so the dot matches the
 *  column. The node is mounted off-screen, snapshotted synchronously by
 *  `setDragImage`, then removed next tick. */
export function setTaskDragImage(dataTransfer: DataTransfer, data: TaskDragData, statusDotClass?: string): void {
	if (typeof document === "undefined") return;
	const chip = document.createElement("div");
	chip.className =
		"pointer-events-none absolute top-[-1000px] left-0 z-[9999] flex max-w-[260px] items-center gap-2 rounded-full border border-fr-border bg-fr-surface px-3 py-1.5 font-secondary text-fr-text text-fr-xs shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]";
	const dot = document.createElement("span");
	dot.className = `size-2 shrink-0 rounded-full ${statusDotClass ?? "bg-fr-text-3"}`;
	const title = document.createElement("span");
	title.className = "fr-overflow font-medium";
	title.textContent = data.title;
	chip.append(dot, title);
	if (data.project) {
		const project = document.createElement("span");
		project.className = "shrink-0 text-fr-text-3";
		project.textContent = data.project;
		chip.append(project);
	}
	document.body.appendChild(chip);
	dataTransfer.setDragImage(chip, 16, 16);
	setTimeout(() => chip.remove(), 0);
}

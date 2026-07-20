"use client";

// TaskBoard — two lenses over one project's task rows: a Kanban board
// (drag a card between status columns) and an Asana-style list (sortable rows
// grouped by section, inline status/priority edits). Driver-backed and
// presentational: pass any task source.
//
// The chrome follows the design system's flat tonal language: transparent
// column lanes (a quiet dot + label + count header), cards as `surface`-tier
// tiles with hairline borders that step up one tier on hover, and a per-status
// signal token on each column's dot. Clicking a card or row opens the
// detail modal; the optional `onOpenNote` prop lets a host mirror selection.
//
// Writes are capability-gated: drag handles, inline selects, and the
// "+ Add task" affordance appear only when the source implements updateNote /
// createNote. With neither, the board is read-only.

import type { TaskStore } from "./use-task-board";
import {
	type DragEvent,
	Fragment,
	memo,
	type ReactElement,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";
import { SelectorMenu, type SelectorMenuCategory } from "../../components";
import { Badge, Button, DotGridBackdrop, Input, Select, Skeleton } from "../../elements";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import {
	AssigneeChip,
	MetaChip,
	PRIORITY_OPTIONS,
	PriorityPill,
	STATUS_DOT,
	STATUS_LABELS,
	StatusBadge,
	statusOptions,
	TASK_BOARD_STATUSES,
	TagChips,
	type TaskStatus,
} from "./task-board-shared";
import { TaskContextMenu } from "./task-context-menu";
import { TaskDetailModal } from "./task-detail-modal";
import { setTaskDragImage, writeTaskDragData } from "./task-drag";
import type { TaskSessionActions } from "./task-handoff";
import { type TaskFieldPatch, type TaskRow, useTaskBoard } from "./use-task-board";

export { TASK_BOARD_STATUSES, type TaskStatus } from "./task-board-shared";

export interface TaskBoardProps {
	readonly store: TaskStore;
	readonly projectId: string;
	/** Initial lens; defaults to "board". */
	readonly defaultView?: "board" | "list";
	/** Fired alongside the built-in detail modal when a card or row opens. */
	readonly onOpenNote?: (noteId: string) => void;
	/** Optional control rendered in the header's right cluster. */
	readonly toolbar?: ReactNode;
	/** Optional control rendered at the START of the header (before the lens
	 *  toggle) — e.g. NestedTaskBoard's scope dropdown, so scope, lens, count and
	 *  filter share one toolbar instead of stacking. */
	readonly leading?: ReactNode;
	/** Optional scope override. When set, the board reads `type:task` notes for
	 *  this scope (e.g. a session sub-board) and is read-only. Default (omitted)
	 *  = the project board, fully editable. */
	readonly scope?: { readonly type: string; readonly id: string };
	/** Host-wired session ops — surfaced as the detail modal's session buttons and
	 *  the multi-select context menu. Absent → those affordances don't render. */
	readonly sessionActions?: TaskSessionActions;
	readonly className?: string;
}

type ViewMode = "board" | "list";
type SortKey = "title" | "priority" | "due" | "updated";
type SortDir = "asc" | "desc";

/** Cards rendered per column before a "Show N more" step — keeps the DOM (and
 *  every drag-hover reconciliation) bounded no matter how large a column grows. */
const COLUMN_PAGE = 50;

/** Card ordering: by `task.order` ascending (missing → end), then newest first. */
function compareCards(a: TaskRow, b: TaskRow): number {
	const ao = a.task.order;
	const bo = b.task.order;
	if (ao !== undefined && bo !== undefined) {
		if (ao !== bo) return ao - bo;
	} else if (ao !== undefined) {
		return -1;
	} else if (bo !== undefined) {
		return 1;
	}
	return b.updatedAt - a.updatedAt;
}

/** Drop rank: midpoint between the neighbor orders at the insertion index
 *  (`firstOrder - 100` at the head, `lastOrder + 100` at the tail). No
 *  rebalancing pass — a refetch corrects any collision (acceptable v1). */
function dropOrder(cards: readonly TaskRow[], index: number): number {
	const prev = cards[index - 1]?.task.order;
	const next = cards[index]?.task.order;
	if (prev !== undefined && next !== undefined) return (prev + next) / 2;
	if (prev !== undefined) return prev + 100;
	if (next !== undefined) return next - 100;
	return 100;
}

function listComparator(key: SortKey, dir: SortDir): (a: TaskRow, b: TaskRow) => number {
	const signed = (delta: number) => (dir === "asc" ? delta : -delta);
	return (a, b) => {
		switch (key) {
			case "title":
				return signed(a.title.localeCompare(b.title));
			case "updated":
				return signed(a.updatedAt - b.updatedAt);
			case "priority": {
				const av = a.task.priority;
				const bv = b.task.priority;
				if (av === undefined && bv === undefined) return 0;
				if (av === undefined) return 1; // missing always last
				if (bv === undefined) return -1;
				return signed(av - bv);
			}
			default: {
				const av = a.task.due;
				const bv = b.task.due;
				if (!av && !bv) return 0;
				if (!av) return 1;
				if (!bv) return -1;
				return signed(av.localeCompare(bv));
			}
		}
	};
}

interface SectionGroup {
	readonly section: string;
	readonly rows: readonly TaskRow[];
}

/** Group rows by `task.section` — named sections alpha, "No section" bucket last. */
function groupBySection(rows: readonly TaskRow[]): readonly SectionGroup[] {
	const map = new Map<string, TaskRow[]>();
	for (const row of rows) {
		const key = row.task.section?.trim() || "";
		const bucket = map.get(key);
		if (bucket) bucket.push(row);
		else map.set(key, [row]);
	}
	const named = [...map.keys()].filter(key => key !== "").sort((a, b) => a.localeCompare(b));
	const ordered = map.has("") ? [...named, ""] : named;
	return ordered.map(key => ({ section: key === "" ? "No section" : key, rows: map.get(key) ?? [] }));
}

// ── shared chrome ───────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }: { readonly view: ViewMode; readonly onChange: (view: ViewMode) => void }) {
	return (
		<div
			role="tablist"
			aria-label="Task view"
			className="inline-flex items-center gap-0.5 rounded-[8px] border border-fr-border-soft bg-fr-surface p-0.5"
		>
			{(["board", "list"] as const).map(value => (
				<button
					key={value}
					type="button"
					role="tab"
					aria-selected={view === value}
					onClick={() => onChange(value)}
					className={cn(
						"inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-fr-xs font-medium transition-colors",
						view === value ? "bg-fr-accent-dim text-fr-accent" : "text-fr-text-3 hover:text-fr-text",
					)}
				>
					<Icon name={value === "board" ? "grid" : "list"} size={12} strokeWidth={1.9} />
					{value === "board" ? "Board" : "List"}
				</button>
			))}
		</div>
	);
}

/** A minimal inline create field: a button that reveals a text input.
 *  Enter submits; Escape or blur cancels (no half-typed double-submit). */
function InlineAddTask({
	label,
	onSubmit,
	compact = false,
}: {
	readonly label: string;
	readonly onSubmit: (title: string) => void;
	readonly compact?: boolean;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");

	if (!open) {
		return (
			<Button
				variant="ghost"
				size="sm"
				className={cn(compact && "justify-start text-fr-text-3")}
				onClick={() => setOpen(true)}
			>
				<Icon name="plus" size={12} strokeWidth={2} />
				{label}
			</Button>
		);
	}

	const submit = () => {
		const trimmed = title.trim();
		setTitle("");
		setOpen(false);
		if (trimmed.length > 0) onSubmit(trimmed);
	};
	const cancel = () => {
		setTitle("");
		setOpen(false);
	};

	return (
		<Input
			autoFocus
			size="sm"
			value={title}
			placeholder="Task title…"
			aria-label="New task title"
			className={cn("font-primary", compact ? "w-full" : "w-44")}
			onChange={event => setTitle(event.target.value)}
			onBlur={cancel}
			onKeyDown={event => {
				if (event.key === "Enter") {
					event.preventDefault();
					submit();
				} else if (event.key === "Escape") {
					event.preventDefault();
					cancel();
				}
			}}
		/>
	);
}

function TaskBoardPlaceholder({
	icon,
	title,
	description,
	action,
}: {
	readonly icon: IconName;
	readonly title: string;
	readonly description: string;
	readonly action?: ReactElement;
}): ReactElement {
	return (
		<div
			data-slot="task-board-empty"
			className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center"
		>
			<div className="mb-3 flex size-10 items-center justify-center rounded-[10px] border border-fr-border-soft bg-fr-surface text-fr-text-3">
				<Icon name={icon} size={19} strokeWidth={1.7} />
			</div>
			<div className="text-fr-base font-semibold text-fr-text">{title}</div>
			<div className="mt-1 max-w-[280px] text-fr-sm leading-5 text-fr-text-3">{description}</div>
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}

function TaskBoardSkeleton(): ReactElement {
	return (
		<div
			data-slot="task-board-loading"
			aria-busy
			aria-label="Loading tasks"
			className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3"
		>
			{[0, 1, 2, 3].map(column => (
				<div key={column} className="flex w-[280px] shrink-0 flex-col gap-2 px-1 py-2">
					<Skeleton className="h-4 w-24" rounded="sm" />
					<Skeleton className="h-[60px] w-full" />
					<Skeleton className="h-[60px] w-full" />
				</div>
			))}
		</div>
	);
}

// ── board lens ────────────────────────────────────────────────────────────

function DropIndicator(): ReactElement {
	return (
		<div aria-hidden data-slot="task-drop-indicator" className="relative my-px h-0.5 rounded-full bg-fr-accent">
			<span className="-translate-y-1/2 absolute top-1/2 left-0 size-1.5 rounded-full bg-fr-accent" />
		</div>
	);
}

// ── epics (parent ▸ subtask nesting) ─────────────────────────────────────────
//
// A task with a `parent` is a subtask; the referenced task is its epic. The link
// is shown calmly — no per-epic color: a subtask carries a quiet mono eyebrow
// ("↳ EPIC-NAME · n/total"), and the epic carries an "Epic" eyebrow + a single
// accent progress bar and sits one surface tier up. Hovering a member dims the
// rest so the family stays scannable across columns.

interface CardEpic {
	/** The epic's note id — the group key. */
	readonly groupId: string;
	/** Short epic label (its section, else its title sans "(EPIC)"). */
	readonly label: string;
	/** This card IS the epic (not a subtask). */
	readonly isEpic: boolean;
	/** Subtask position among its siblings (1-based). */
	readonly position?: { readonly n: number; readonly total: number };
	/** Epic completion across its subtasks. */
	readonly progress?: { readonly done: number; readonly total: number };
}

/** Epic completion: a hairline track, a single-accent fill, and "done/total". */
function EpicProgress({ done, total }: { readonly done: number; readonly total: number }): ReactElement {
	const pct = total > 0 ? Math.round((done / total) * 100) : 0;
	return (
		<div className="flex items-center gap-2">
			<div className="h-1 flex-1 overflow-hidden rounded-full bg-fr-surface-3">
				<div
					className="h-full rounded-full bg-fr-accent transition-[width] duration-300"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3 tabular-nums">
				{done}/{total}
			</span>
		</div>
	);
}

// Memoized: drag-hover and epic-hover churn root state on every crossing, and
// without memo that re-rendered EVERY card on the board. All callbacks arrive
// referentially stable (id-passing), so only cards whose flags actually flip
// (indicatorBefore / dragging / dimmed / selected) re-render.
const BoardCard = memo(function BoardCard({
	row,
	nextId,
	draggable,
	dragging,
	indicatorBefore,
	epic,
	dimmed,
	onOpen,
	onDragStart,
	onDragEnd,
	onHover,
	onCommit,
	onEpicHover,
	selected,
}: {
	readonly row: TaskRow;
	readonly nextId: string | null;
	readonly draggable: boolean;
	readonly dragging: boolean;
	readonly indicatorBefore: boolean;
	readonly epic?: CardEpic;
	readonly dimmed: boolean;
	readonly onOpen: (noteId: string) => void;
	readonly onDragStart: (noteId: string) => void;
	readonly onDragEnd: () => void;
	readonly onHover: (beforeId: string | null) => void;
	readonly onCommit: (beforeId: string | null) => void;
	readonly onEpicHover: (groupId: string | null) => void;
	readonly selected?: boolean;
}): ReactElement {
	const { task } = row;
	// Top half of the hovered card → insert before it; bottom half → after it
	// (before the next card, or at the column tail when it is the last card).
	const positionFor = (event: DragEvent<HTMLElement>): string | null => {
		const rect = event.currentTarget.getBoundingClientRect();
		return event.clientY > rect.top + rect.height / 2 ? nextId : row.id;
	};
	const hasMeta =
		task.priority !== undefined ||
		epic !== undefined ||
		Boolean(task.section) ||
		row.tags.length > 0 ||
		Boolean(task.milestone) ||
		Boolean(task.assignee);
	return (
		<Fragment>
			{indicatorBefore ? <DropIndicator /> : null}
			<article
				data-slot="task-card"
				data-task-id={row.id}
				data-task-status={task.status}
				data-epic={epic ? epic.groupId : undefined}
				draggable={draggable || undefined}
				onMouseEnter={epic ? () => onEpicHover(epic.groupId) : undefined}
				onMouseLeave={epic ? () => onEpicHover(null) : undefined}
				onDragStart={
					draggable
						? event => {
								event.dataTransfer.effectAllowed = "copyMove";
								const drag = {
									id: row.id,
									title: row.title,
									status: task.status,
									section: task.section,
									snippet: row.snippet,
									project: row.scope?.id,
								};
								writeTaskDragData(event.dataTransfer, drag);
								setTaskDragImage(event.dataTransfer, drag, STATUS_DOT[task.status as TaskStatus]);
								onDragStart(row.id);
							}
						: undefined
				}
				onDragEnd={draggable ? onDragEnd : undefined}
				onDragOver={
					draggable
						? event => {
								event.preventDefault();
								event.stopPropagation();
								event.dataTransfer.dropEffect = "move";
								onHover(positionFor(event));
							}
						: undefined
				}
				onDrop={
					draggable
						? event => {
								event.preventDefault();
								event.stopPropagation();
								onCommit(positionFor(event));
							}
						: undefined
				}
				className={cn(
					"group relative rounded-[10px] border transition-colors duration-150",
					epic?.isEpic
						? "border-fr-border-soft bg-fr-surface-2 hover:border-fr-border hover:bg-fr-surface-3"
						: "border-fr-border-soft bg-fr-surface hover:border-fr-border hover:bg-fr-surface-2",
					dragging && "opacity-40",
					!dragging && dimmed && "opacity-45",
					selected && "border-fr-accent-line ring-1 ring-fr-accent",
				)}
			>
				<button
					type="button"
					onClick={() => onOpen(row.id)}
					className={cn(
						"flex w-full flex-col gap-1.5 rounded-[10px] px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line",
						draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
					)}
				>
					<span className="line-clamp-2 text-fr-sm font-medium leading-snug text-fr-text">{row.title}</span>
					{hasMeta ? (
						<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
							{task.priority !== undefined ? <PriorityPill priority={task.priority} /> : null}
							{epic?.isEpic ? (
								<span className="flex shrink-0 items-center gap-1 font-secondary text-fr-2xs font-medium text-fr-text-2">
									<Icon name="layers" size={10} strokeWidth={2} className="shrink-0" />
									Epic
								</span>
							) : epic ? (
								<span className="flex min-w-0 items-center gap-1 font-secondary text-fr-2xs text-fr-text-3">
									<span aria-hidden className="shrink-0">
										↳
									</span>
									<span className="max-w-[9rem] fr-overflow">{epic.label}</span>
									{epic.position ? (
										<span className="shrink-0 tabular-nums">
											{epic.position.n}/{epic.position.total}
										</span>
									) : null}
								</span>
							) : task.section ? (
								<span className="max-w-[10rem] fr-overflow font-secondary text-fr-2xs text-fr-text-3">
									{task.section}
								</span>
							) : (
								<TagChips tags={row.tags} max={2} />
							)}
							{task.milestone ? (
								<span className="flex min-w-0 items-center gap-1 font-secondary text-fr-2xs text-fr-text-3">
									<Icon name="bolt" size={10} strokeWidth={2} className="shrink-0" />
									<span className="max-w-[6rem] fr-overflow">{task.milestone}</span>
								</span>
							) : null}
							{task.assignee ? <AssigneeChip name={task.assignee} /> : null}
						</div>
					) : null}
					{epic?.isEpic && epic.progress ? (
						<EpicProgress done={epic.progress.done} total={epic.progress.total} />
					) : null}
				</button>
			</article>
		</Fragment>
	);
});

// Memoized like BoardCard — hover/drag state changes skip the untouched columns.
const BoardColumn = memo(function BoardColumn({
	status,
	rows,
	writable,
	creatable,
	isDropColumn,
	dropBeforeId,
	draggingId,
	epicByCard,
	hoverEpic,
	onOpen,
	onCreate,
	onHover,
	onCommit,
	onCardDragStart,
	onCardDragEnd,
	onEpicHover,
	selectedIds,
}: {
	readonly status: TaskStatus;
	readonly rows: readonly TaskRow[];
	readonly writable: boolean;
	readonly creatable: boolean;
	readonly isDropColumn: boolean;
	readonly dropBeforeId: string | null;
	readonly draggingId: string | null;
	readonly epicByCard: ReadonlyMap<string, CardEpic>;
	readonly hoverEpic: string | null;
	readonly onOpen: (noteId: string) => void;
	readonly onCreate: (status: TaskStatus, title: string) => void;
	readonly onHover: (status: TaskStatus, beforeId: string | null) => void;
	readonly onCommit: (status: TaskStatus, beforeId: string | null) => void;
	readonly onCardDragStart: (noteId: string) => void;
	readonly onCardDragEnd: () => void;
	readonly onEpicHover: (groupId: string | null) => void;
	readonly selectedIds: ReadonlySet<string>;
}): ReactElement {
	// Progressive rendering: only the first `visible` cards mount; the rest sit
	// behind a "Show N more" step. Column identity is stable (keyed by status),
	// so an expansion survives filter changes.
	const [visible, setVisible] = useState(COLUMN_PAGE);
	const shown = rows.length > visible ? rows.slice(0, visible) : rows;
	const hidden = rows.length - shown.length;
	// Per-status stable wrappers so memoized cards keep referential equality
	// across the root's drag/hover re-renders.
	const hoverHere = useCallback((beforeId: string | null) => onHover(status, beforeId), [onHover, status]);
	const commitHere = useCallback((beforeId: string | null) => onCommit(status, beforeId), [onCommit, status]);
	const createHere = useCallback((title: string) => onCreate(status, title), [onCreate, status]);
	return (
		<section
			data-slot="task-column"
			data-status={status}
			onDragOver={
				writable
					? event => {
							event.preventDefault();
							onHover(status, null);
						}
					: undefined
			}
			onDrop={
				writable
					? event => {
							event.preventDefault();
							onCommit(status, null);
						}
					: undefined
			}
			className={cn(
				"flex h-full min-h-0 w-[280px] shrink-0 flex-col overflow-hidden rounded-[10px] transition-colors",
				isDropColumn && "bg-fr-accent-dim/40",
			)}
		>
			<div className="flex shrink-0 items-center gap-2 px-2.5 py-2">
				<span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
				<span className="text-fr-xs font-medium text-fr-text-2">{STATUS_LABELS[status]}</span>
				<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3 tabular-nums">{rows.length}</span>
			</div>
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-2">
				{rows.length === 0 && isDropColumn ? (
					<div
						aria-hidden
						className="flex items-center justify-center rounded-[8px] border border-fr-accent-line border-dashed bg-fr-accent-dim/30 px-2 py-5 font-secondary text-fr-2xs text-fr-accent"
					>
						Drop here
					</div>
				) : null}
				{rows.length === 0 && !isDropColumn && !creatable ? (
					<p className="px-1 py-4 text-center text-fr-2xs text-fr-text-3">No tasks</p>
				) : null}
				{shown.map((row, index) => {
					const epic = epicByCard.get(row.id);
					const dimmed = hoverEpic !== null && (!epic || epic.groupId !== hoverEpic);
					return (
						<BoardCard
							key={row.id}
							row={row}
							nextId={rows[index + 1]?.id ?? null}
							draggable={writable}
							dragging={draggingId === row.id}
							indicatorBefore={isDropColumn && dropBeforeId === row.id}
							epic={epic}
							dimmed={dimmed}
							onOpen={onOpen}
							onDragStart={onCardDragStart}
							onDragEnd={onCardDragEnd}
							onHover={hoverHere}
							onCommit={commitHere}
							onEpicHover={onEpicHover}
							selected={selectedIds.has(row.id)}
						/>
					);
				})}
				{isDropColumn && dropBeforeId === null && rows.length > 0 ? <DropIndicator /> : null}
				{hidden > 0 ? (
					<Button
						variant="ghost"
						size="sm"
						className="justify-start text-fr-text-3"
						onClick={() => setVisible(count => count + COLUMN_PAGE)}
					>
						Show {hidden} more
					</Button>
				) : null}
				{creatable ? <InlineAddTask compact label="Add task" onSubmit={createHere} /> : null}
			</div>
		</section>
	);
});

// ── list lens ─────────────────────────────────────────────────────────────

function SortHeader({
	label,
	sortKey,
	active,
	dir,
	onSort,
	className,
}: {
	readonly label: string;
	readonly sortKey?: SortKey;
	readonly active: SortKey;
	readonly dir: SortDir;
	readonly onSort: (key: SortKey) => void;
	readonly className?: string;
}): ReactElement {
	const isActive = sortKey !== undefined && active === sortKey;
	return (
		<th
			scope="col"
			aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : undefined}
			className={cn(
				"whitespace-nowrap px-3 py-2 text-left font-primary text-fr-2xs font-medium uppercase tracking-fr-label text-fr-text-3",
				className,
			)}
		>
			{sortKey ? (
				<button
					type="button"
					onClick={() => onSort(sortKey)}
					className={cn(
						"inline-flex items-center gap-1 transition-colors hover:text-fr-text-2",
						isActive && "text-fr-text-2",
					)}
				>
					{label}
					{isActive ? (
						<Icon name="caretD" size={11} className={cn("transition-transform", dir === "asc" && "rotate-180")} />
					) : null}
				</button>
			) : (
				label
			)}
		</th>
	);
}

function ListRow({
	row,
	writable,
	onOpen,
	onUpdate,
}: {
	readonly row: TaskRow;
	readonly writable: boolean;
	readonly onOpen: (noteId: string) => void;
	readonly onUpdate: (noteId: string, fields: TaskFieldPatch) => void;
}): ReactElement {
	const { task } = row;
	return (
		<tr
			data-slot="task-row"
			className="border-fr-border-soft border-b transition-colors last:border-0 hover:bg-fr-surface-2/40"
		>
			<td className="px-3 py-1.5">
				<button
					type="button"
					onClick={() => onOpen(row.id)}
					className="line-clamp-1 max-w-[280px] text-left text-fr-sm text-fr-text transition-colors hover:text-fr-accent"
				>
					{row.title}
				</button>
			</td>
			<td className="px-3 py-1.5">
				{writable ? (
					<Select
						size="sm"
						variant="ghost"
						aria-label="Status"
						value={task.status}
						options={statusOptions(task.status)}
						onChange={event => onUpdate(row.id, { status: event.target.value })}
					/>
				) : (
					<StatusBadge status={task.status} />
				)}
			</td>
			<td className="px-3 py-1.5">
				{writable ? (
					<Select
						size="sm"
						variant="ghost"
						aria-label="Priority"
						value={task.priority === undefined ? "" : String(task.priority)}
						options={PRIORITY_OPTIONS}
						onChange={event =>
							onUpdate(row.id, { priority: event.target.value === "" ? null : Number(event.target.value) })
						}
					/>
				) : (
					<PriorityPill priority={task.priority} />
				)}
			</td>
			<td className="px-3 py-1.5">
				{task.assignee ? <AssigneeChip name={task.assignee} /> : <span className="text-fr-text-3">—</span>}
			</td>
			<td className="px-3 py-1.5">
				{task.milestone ? (
					<MetaChip icon="bolt">{task.milestone}</MetaChip>
				) : (
					<span className="text-fr-text-3">—</span>
				)}
			</td>
			<td className="px-3 py-1.5 font-secondary text-fr-xs text-fr-text-2">
				{task.due ?? <span className="text-fr-text-3">—</span>}
			</td>
		</tr>
	);
}

function ListView({
	sections,
	writable,
	sort,
	dir,
	onSort,
	onOpen,
	onUpdate,
}: {
	readonly sections: readonly SectionGroup[];
	readonly writable: boolean;
	readonly sort: SortKey;
	readonly dir: SortDir;
	readonly onSort: (key: SortKey) => void;
	readonly onOpen: (noteId: string) => void;
	readonly onUpdate: (noteId: string, fields: TaskFieldPatch) => void;
}): ReactElement {
	return (
		<div data-slot="task-board-list" className="min-h-0 flex-1 overflow-auto">
			<table className="w-full min-w-[680px] border-collapse">
				<thead className="sticky top-0 z-[1] bg-fr-surface">
					<tr className="border-fr-border border-b">
						<SortHeader
							label="Title"
							sortKey="title"
							active={sort}
							dir={dir}
							onSort={onSort}
							className="w-[40%]"
						/>
						<SortHeader label="Status" active={sort} dir={dir} onSort={onSort} />
						<SortHeader label="Priority" sortKey="priority" active={sort} dir={dir} onSort={onSort} />
						<SortHeader label="Assignee" active={sort} dir={dir} onSort={onSort} />
						<SortHeader label="Milestone" active={sort} dir={dir} onSort={onSort} />
						<SortHeader label="Due" sortKey="due" active={sort} dir={dir} onSort={onSort} />
					</tr>
				</thead>
				<tbody>
					{sections.map(group => (
						<Fragment key={group.section}>
							<tr>
								<td
									colSpan={6}
									className="border-fr-border-soft border-b bg-fr-surface-2 px-3 py-1.5 font-primary text-fr-2xs font-semibold uppercase tracking-fr-label text-fr-text-3"
								>
									{group.section}
									<span className="ml-2 font-normal text-fr-text-3/70">{group.rows.length}</span>
								</td>
							</tr>
							{group.rows.map(row => (
								<ListRow key={row.id} row={row} writable={writable} onOpen={onOpen} onUpdate={onUpdate} />
							))}
						</Fragment>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ── filters ─────────────────────────────────────────────────────────────────

type FacetKey = "priority" | "milestone" | "assignee" | "tag";

interface FilterState {
	readonly priority: string; // "all" | "0".."3"
	readonly milestone: string; // "all" | slug
	readonly assignee: string; // "all" | name
	readonly tag: string; // "all" | tag
}

const EMPTY_FILTERS: FilterState = { priority: "all", milestone: "all", assignee: "all", tag: "all" };

const FACET_KEYS: readonly FacetKey[] = ["priority", "milestone", "assignee", "tag"];

const FACET_LABELS: Record<FacetKey, string> = {
	priority: "Priority",
	milestone: "Milestone",
	assignee: "Assignee",
	tag: "Tag",
};

const FACET_GLYPH: Record<FacetKey, IconName> = {
	priority: "spark",
	milestone: "bolt",
	assignee: "user",
	tag: "layers",
};

interface FilterOptions {
	readonly priorities: readonly number[];
	readonly milestones: readonly string[];
	readonly assignees: readonly string[];
	readonly tags: readonly string[];
}

/** One selectable filter value, scoped to its facet. The leading "all" item of
 *  each facet clears it. */
interface FilterItem {
	readonly facet: FacetKey;
	readonly value: string;
	readonly label: string;
}

function activeFilterCount(f: FilterState): number {
	return FACET_KEYS.filter(key => f[key] !== "all").length;
}

/** Does a task row clear every active filter? */
function matchesFilters(row: TaskRow, f: FilterState): boolean {
	if (f.milestone !== "all" && row.task.milestone !== f.milestone) return false;
	if (f.assignee !== "all" && row.task.assignee !== f.assignee) return false;
	if (f.priority !== "all" && String(row.task.priority ?? "") !== f.priority) return false;
	if (f.tag !== "all" && !row.tags.includes(f.tag)) return false;
	return true;
}

/** Facets → SelectorMenu categories; each facet's values become its flyout, led
 *  by an "Any …" reset. Facets absent from the data are dropped. */
function buildFilterCategories(options: FilterOptions): SelectorMenuCategory<FilterItem>[] {
	const categories: SelectorMenuCategory<FilterItem>[] = [];
	if (options.priorities.length > 0) {
		categories.push({
			id: "priority",
			label: "Priority",
			items: [
				{ facet: "priority", value: "all", label: "Any priority" },
				...options.priorities.map(p => ({ facet: "priority" as const, value: String(p), label: `P${p}` })),
			],
		});
	}
	if (options.milestones.length > 0) {
		categories.push({
			id: "milestone",
			label: "Milestone",
			items: [
				{ facet: "milestone", value: "all", label: "All milestones" },
				...options.milestones.map(m => ({ facet: "milestone" as const, value: m, label: m })),
			],
		});
	}
	if (options.assignees.length > 0) {
		categories.push({
			id: "assignee",
			label: "Assignee",
			items: [
				{ facet: "assignee", value: "all", label: "Anyone" },
				...options.assignees.map(a => ({ facet: "assignee" as const, value: a, label: a })),
			],
		});
	}
	if (options.tags.length > 0) {
		categories.push({
			id: "tag",
			label: "Tag",
			items: [
				{ facet: "tag", value: "all", label: "Any tag" },
				...options.tags.map(t => ({ facet: "tag" as const, value: t, label: `#${t}` })),
			],
		});
	}
	return categories;
}

function FilterChip({
	label,
	value,
	onClear,
}: {
	readonly label: string;
	readonly value: string;
	readonly onClear: () => void;
}): ReactElement {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-fr-border-soft bg-fr-surface-2 py-0.5 pr-1 pl-2 font-secondary text-fr-2xs">
			<span className="text-fr-text-3">{label}</span>
			<span className="max-w-[120px] fr-overflow text-fr-text">{value}</span>
			<button
				type="button"
				aria-label={`Clear ${label} filter`}
				onClick={onClear}
				className="flex size-3.5 items-center justify-center rounded-full text-fr-text-3 transition-colors hover:bg-fr-surface-3 hover:text-fr-text"
			>
				<Icon name="x" size={9} strokeWidth={2.6} />
			</button>
		</span>
	);
}

/** A filter value row in the SelectorMenu flyout / search results — mirrors the
 *  ModelPicker's row (label + trailing check when this facet value is active). */
function FilterOptionRow({
	item,
	active,
	onPick,
}: {
	readonly item: FilterItem;
	readonly active: boolean;
	readonly onPick: () => void;
}): ReactElement {
	return (
		<div
			data-slot="filter-option"
			data-active={active || undefined}
			className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-fr-surface-2"
			onClick={onPick}
		>
			<span className="min-w-0 flex-1 fr-overflow text-fr-base font-medium text-fr-text">{item.label}</span>
			<Icon
				name="check"
				size={15}
				strokeWidth={2.4}
				className="shrink-0 text-fr-accent"
				style={{ opacity: active ? 1 : 0 }}
			/>
		</div>
	);
}

/** Header filter affordance: a Filter button that opens the shared SelectorMenu
 *  (the same two-pane picker as ModelPicker) over basic facets — priority,
 *  milestone, assignee, tag — with a row of removable chips for what's active.
 *  Applies to both lenses. */
function TaskFilters({
	filters,
	options,
	onChange,
}: {
	readonly filters: FilterState;
	readonly options: FilterOptions;
	readonly onChange: (next: FilterState) => void;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<DOMRect | null>(null);
	const [query, setQuery] = useState("");
	const count = activeFilterCount(filters);
	const categories = useMemo(() => buildFilterCategories(options), [options]);
	const setFacet = (facet: FacetKey, value: string) => onChange({ ...filters, [facet]: value });
	const labelFor = (facet: FacetKey, value: string) =>
		categories.find(category => category.id === facet)?.items.find(item => item.value === value)?.label ?? value;

	return (
		<>
			<Button
				variant={count > 0 ? "outline" : "ghost"}
				size="sm"
				aria-label="Filter tasks"
				aria-expanded={open}
				disabled={categories.length === 0}
				onClick={event => {
					setAnchor(event.currentTarget.getBoundingClientRect());
					setQuery("");
					setOpen(prev => !prev);
				}}
			>
				<Icon name="sliders" size={13} strokeWidth={1.9} />
				Filter
				{count > 0 ? (
					<Badge variant="soft" tone="accent" className="ml-0.5 px-1.5">
						{count}
					</Badge>
				) : null}
			</Button>
			{count > 0 ? (
				<div className="flex flex-wrap items-center gap-1.5">
					{FACET_KEYS.map(facet =>
						filters[facet] !== "all" ? (
							<FilterChip
								key={facet}
								label={FACET_LABELS[facet]}
								value={labelFor(facet, filters[facet])}
								onClear={() => setFacet(facet, "all")}
							/>
						) : null,
					)}
					<button
						type="button"
						onClick={() => onChange(EMPTY_FILTERS)}
						className="font-secondary text-fr-2xs text-fr-text-3 underline-offset-2 transition-colors hover:text-fr-text hover:underline"
					>
						Clear all
					</button>
				</div>
			) : null}
			{open ? (
				<SelectorMenu<FilterItem>
					categories={categories}
					selectedId=""
					getItemId={item => `${item.facet}:${item.value}`}
					query={query}
					onQueryChange={setQuery}
					searchPlaceholder="Search filters…"
					renderItem={(item, _selected, onPick) => (
						<FilterOptionRow item={item} active={filters[item.facet] === item.value} onPick={onPick} />
					)}
					renderCategoryIcon={category => (
						<span className="flex size-[20px] shrink-0 items-center justify-center text-fr-text-3">
							<Icon name={FACET_GLYPH[category.id as FacetKey] ?? "sliders"} size={16} strokeWidth={2} />
						</span>
					)}
					renderCategoryLabel={category => (
						<span className="flex items-center gap-1.5">
							{category.label}
							{filters[category.id as FacetKey] !== "all" ? (
								<span className="size-[5px] rounded-full bg-fr-accent" />
							) : null}
						</span>
					)}
					renderFlyoutHeader={category => <div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">{category.label}</div>}
					footer={
						<div className="mt-1 flex items-center justify-between border-fr-border-soft border-t px-2.5 pt-2 pb-1">
							<span className="font-secondary text-fr-2xs text-fr-text-3">{count} active</span>
							<button
								type="button"
								disabled={count === 0}
								onClick={() => onChange(EMPTY_FILTERS)}
								className="font-secondary text-fr-2xs text-fr-text-2 transition-colors hover:text-fr-text disabled:opacity-40"
							>
								Clear all
							</button>
						</div>
					}
					anchorRect={anchor}
					place="below"
					onPick={item => {
						setFacet(item.facet, item.value);
						setQuery("");
					}}
					onClose={() => setOpen(false)}
					panelWidth={264}
				/>
			) : null}
		</>
	);
}

// ── root ────────────────────────────────────────────────────────────────────

export function TaskBoard({
	store,
	projectId,
	defaultView = "board",
	onOpenNote,
	className,
	toolbar,
	leading,
	scope,
	sessionActions,
}: TaskBoardProps): ReactElement {
	const model = useTaskBoard(store, projectId, scope ? { scope } : undefined);
	const [view, setView] = useState<ViewMode>(defaultView);
	const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
	const [listSort, setListSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "updated", dir: "desc" });
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [dropTarget, setDropTarget] = useState<{ status: TaskStatus; beforeId: string | null } | null>(null);
	const [detailId, setDetailId] = useState<string | null>(null);
	const [hoverEpic, setHoverEpic] = useState<string | null>(null);
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());
	const [menu, setMenu] = useState<{ readonly x: number; readonly y: number; readonly ids: readonly string[] } | null>(
		null,
	);

	const { tasks, updateTask, createTask } = model;

	const filterOptions = useMemo<FilterOptions>(() => {
		const priorities = new Set<number>();
		const milestones = new Set<string>();
		const assignees = new Set<string>();
		const tags = new Set<string>();
		for (const row of tasks) {
			if (row.task.priority !== undefined) priorities.add(row.task.priority);
			if (row.task.milestone) milestones.add(row.task.milestone);
			if (row.task.assignee) assignees.add(row.task.assignee);
			for (const tag of row.tags) tags.add(tag);
		}
		return {
			priorities: [...priorities].sort((a, b) => a - b),
			milestones: [...milestones].sort((a, b) => a.localeCompare(b)),
			assignees: [...assignees].sort((a, b) => a.localeCompare(b)),
			tags: [...tags].sort((a, b) => a.localeCompare(b)),
		};
	}, [tasks]);

	// Epic model from the FULL task set (so a subtask's position + the epic's
	// progress stay stable under board filters): children grouped by `parent`.
	const epicByCard = useMemo(() => {
		const byId = new Map(tasks.map(task => [task.id, task]));
		const childrenByParent = new Map<string, TaskRow[]>();
		for (const task of tasks) {
			const parentId = task.task.parent;
			if (parentId && parentId !== task.id) {
				const bucket = childrenByParent.get(parentId);
				if (bucket) bucket.push(task);
				else childrenByParent.set(parentId, [task]);
			}
		}
		const map = new Map<string, CardEpic>();
		for (const [epicId, kids] of childrenByParent) {
			const epicRow = byId.get(epicId);
			const label = epicRow?.task.section?.trim() || epicRow?.title.replace(/\s*\(epic\)\s*$/i, "").trim() || "Epic";
			const sorted = [...kids].sort(compareCards);
			const total = sorted.length;
			const done = sorted.filter(kid => kid.task.status === "done").length;
			if (epicRow) {
				map.set(epicId, { groupId: epicId, label, isEpic: true, progress: { done, total } });
			}
			sorted.forEach((kid, index) => {
				map.set(kid.id, { groupId: epicId, label, isEpic: false, position: { n: index + 1, total } });
			});
		}
		return map;
	}, [tasks]);

	const filtered = useMemo(() => tasks.filter(row => matchesFilters(row, filters)), [tasks, filters]);

	const grouped = useMemo(() => {
		const map = new Map<TaskStatus, TaskRow[]>();
		for (const status of TASK_BOARD_STATUSES) map.set(status, []);
		for (const task of filtered) {
			// Unknown / archived statuses are intentionally hidden from the board.
			map.get(task.task.status as TaskStatus)?.push(task);
		}
		for (const status of TASK_BOARD_STATUSES) map.get(status)?.sort(compareCards);
		return map;
	}, [filtered]);

	const sections = useMemo(() => {
		const sorted = [...filtered].sort(listComparator(listSort.key, listSort.dir));
		return groupBySection(sorted);
	}, [filtered, listSort]);

	const onSort = useCallback((key: SortKey) => {
		setListSort(prev =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: key === "title" ? "asc" : "desc" },
		);
	}, []);

	// A card/row click opens the detail modal and calls the optional host callback.
	const openNote = useCallback(
		(noteId: string) => {
			setDetailId(noteId);
			onOpenNote?.(noteId);
		},
		[onOpenNote],
	);

	const dropOnto = useCallback(
		(status: TaskStatus, beforeId: string | null) => {
			const dragged = draggingId;
			setDropTarget(null);
			setDraggingId(null);
			if (!dragged) return;
			const column = (grouped.get(status) ?? []).filter(card => card.id !== dragged);
			const rawIndex = beforeId ? column.findIndex(card => card.id === beforeId) : column.length;
			const index = rawIndex < 0 ? column.length : rawIndex;
			updateTask(dragged, { status, order: dropOrder(column, index) });
		},
		[draggingId, grouped, updateTask],
	);

	// Referentially-stable column handlers — required for the BoardColumn/BoardCard
	// memo layer to actually skip work during drag-hover and epic-hover churn.
	const handleColumnHover = useCallback(
		(status: TaskStatus, beforeId: string | null) =>
			setDropTarget(prev =>
				prev && prev.status === status && prev.beforeId === beforeId ? prev : { status, beforeId },
			),
		[],
	);
	const handleColumnCreate = useCallback(
		(status: TaskStatus, title: string) => createTask(title, status),
		[createTask],
	);
	const handleCardDragStart = useCallback((noteId: string) => {
		setHoverEpic(null);
		setDraggingId(noteId);
	}, []);
	const handleCardDragEnd = useCallback(() => {
		setDraggingId(null);
		setDropTarget(null);
	}, []);

	let body: ReactElement;
	if (model.loading && tasks.length === 0) {
		body = <TaskBoardSkeleton />;
	} else if (model.error && tasks.length === 0) {
		body = (
			<TaskBoardPlaceholder
				icon="archive"
				title="Couldn't load tasks"
				description={model.error}
				action={
					<Button variant="outline" size="sm" onClick={model.refresh}>
						<Icon name="refresh" size={13} />
						Retry
					</Button>
				}
			/>
		);
	} else if (tasks.length === 0) {
		body = (
			<DotGridBackdrop glow={false} className="flex min-h-0 flex-1 flex-col">
				<TaskBoardPlaceholder
					icon="list"
					title="No tasks yet"
					description={
						model.creatable
							? "Create the first task to start tracking work on this project."
							: "Tasks for this project appear here once they're created."
					}
				/>
			</DotGridBackdrop>
		);
	} else if (filtered.length === 0) {
		body = (
			<DotGridBackdrop glow={false} className="flex min-h-0 flex-1 flex-col">
				<TaskBoardPlaceholder
					icon="search"
					title="No matching tasks"
					description="No tasks match the current filters — clear them to see everything."
					action={
						<Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
							<Icon name="x" size={13} />
							Clear filters
						</Button>
					}
				/>
			</DotGridBackdrop>
		);
	} else if (view === "board") {
		body = (
			<div
				data-slot="task-board-columns"
				className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-3 py-2"
				onClickCapture={event => {
					const el = event.target instanceof HTMLElement ? event.target.closest("[data-task-id]") : null;
					const id = el?.getAttribute("data-task-id");
					if ((event.metaKey || event.ctrlKey) && id) {
						// Modifier-click toggles selection instead of opening the card.
						event.preventDefault();
						event.stopPropagation();
						setSelected(prev => {
							const next = new Set(prev);
							if (next.has(id)) next.delete(id);
							else next.add(id);
							return next;
						});
						return;
					}
					// A plain click anywhere drops the selection (rings clear).
					setSelected(prev => (prev.size > 0 ? new Set<string>() : prev));
				}}
				onContextMenu={event => {
					if (!sessionActions) return;
					const el = event.target instanceof HTMLElement ? event.target.closest("[data-task-id]") : null;
					const id = el?.getAttribute("data-task-id");
					if (!id) return;
					event.preventDefault();
					const ids = selected.has(id) ? [...selected] : [id];
					if (!selected.has(id)) setSelected(new Set([id]));
					setMenu({ x: event.clientX, y: event.clientY, ids });
				}}
			>
				{TASK_BOARD_STATUSES.map(status => (
					<BoardColumn
						key={status}
						status={status}
						rows={grouped.get(status) ?? []}
						writable={model.writable}
						creatable={model.creatable}
						isDropColumn={dropTarget?.status === status}
						dropBeforeId={dropTarget?.status === status ? dropTarget.beforeId : null}
						draggingId={draggingId}
						epicByCard={epicByCard}
						hoverEpic={hoverEpic}
						onOpen={openNote}
						onCreate={handleColumnCreate}
						onHover={handleColumnHover}
						onCommit={dropOnto}
						onCardDragStart={handleCardDragStart}
						onCardDragEnd={handleCardDragEnd}
						onEpicHover={setHoverEpic}
						selectedIds={selected}
					/>
				))}
			</div>
		);
	} else {
		body = (
			<div className="flex min-h-0 flex-1 flex-col p-3">
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-fr-border-soft bg-fr-surface">
					<ListView
						sections={sections}
						writable={model.writable}
						sort={listSort.key}
						dir={listSort.dir}
						onSort={onSort}
						onOpen={openNote}
						onUpdate={updateTask}
					/>
				</div>
			</div>
		);
	}

	return (
		<div data-slot="task-board" className={cn("flex h-full min-h-0 flex-col bg-fr-bg text-fr-text", className)}>
			<header
				data-slot="task-board-header"
				className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-fr-border-soft border-b bg-fr-bg px-3 py-2.5"
			>
				{leading ? (
					<div className="-my-0.5 flex items-center border-fr-border-soft border-r pr-3">{leading}</div>
				) : null}
				<ViewToggle view={view} onChange={setView} />
				<span className="font-secondary text-fr-2xs text-fr-text-3">
					{filtered.length === tasks.length
						? `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`
						: `${filtered.length} of ${tasks.length}`}
				</span>
				<TaskFilters filters={filters} options={filterOptions} onChange={setFilters} />
				<div className="ml-auto flex items-center gap-2">
					{view === "list" && model.creatable ? (
						<InlineAddTask label="Add task" onSubmit={title => createTask(title, "backlog")} />
					) : null}
					<Button variant="ghost" size="icon" aria-label="Refresh tasks" onClick={model.refresh}>
						<Icon name="refresh" size={14} />
					</Button>
					{toolbar ? (
						<div className="ml-1 flex items-center border-fr-border-soft border-l pl-2">{toolbar}</div>
					) : null}
				</div>
			</header>
			{body}
			{detailId ? (
				<TaskDetailModal
					store={store}
					noteId={detailId}
					summary={tasks.find(task => task.id === detailId)}
					writable={model.writable}
					onUpdate={updateTask}
					onClose={() => setDetailId(null)}
					onOpenNote={onOpenNote}
					sessionActions={sessionActions}
				/>
			) : null}
			{menu && sessionActions ? (
				<TaskContextMenu
					x={menu.x}
					y={menu.y}
					count={menu.ids.length}
					busy={sessionActions.busy}
					onPick={action => {
						const picks = tasks
							.filter(task => menu.ids.includes(task.id))
							.map(task => ({
								id: task.id,
								title: task.title,
								status: task.task.status,
								section: task.task.section,
								project: task.scope?.id,
								snippet: task.snippet,
							}));
						sessionActions.handoff(
							picks,
							action === "current" ? { kind: "current", mode: "queue" } : { kind: action },
						);
						setSelected(new Set<string>());
					}}
					onClose={() => setMenu(null)}
				/>
			) : null}
		</div>
	);
}

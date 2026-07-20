"use client";

// NestedTaskBoard — the task board with a model-picker-style SCOPE switcher.
//
// One dropdown (the shared SelectorMenu) chooses what the board shows: the
// session you opened from (default), the whole project, all projects, or — via
// flyouts — any recent session board or another project. The board itself is the
// same TaskBoard, scoped accordingly. "Recent sessions" are the ones that
// materialized a board on disk (ran `todo`), most-recent first; true live-session
// detection would need the SessionDriver and is a follow-up.

import { type TaskStore } from "./use-task-board";
import { useEffect, useMemo, useRef, useState } from "react";
import { SelectorMenu, type SelectorMenuCategory } from "../../components";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { TaskBoard } from "./task-board-core";
import type { TaskSessionActions } from "./task-handoff";

interface SessionBoard {
	readonly id: string;
	readonly label: string;
	readonly count: number;
	readonly updatedAt: number;
}

interface SessionBoardsState {
	readonly sessions: readonly SessionBoard[];
	readonly loaded: boolean;
}

/** A project's session sub-boards (`projects/<id>/sessions`), recent-first. */
function useSessionBoards(store: TaskStore, projectId: string): SessionBoardsState {
	const [state, setState] = useState<SessionBoardsState>({ sessions: [], loaded: false });
	const seq = useRef(0);
	useEffect(() => {
		const s = ++seq.current;
		if (!projectId) {
			setState({ sessions: [], loaded: true });
			return;
		}
		setState(prev => ({ sessions: prev.sessions, loaded: false }));
		store.listNotes({ folder: `projects/${projectId}/sessions`, type: "task", limit: 500 }).then(
			page => {
				if (s !== seq.current) return;
				const groups = new Map<string, SessionBoard>();
				for (const note of page.notes) {
					if (note.scope?.type !== "session") continue;
					const id = note.scope.id;
					const prev = groups.get(id);
					groups.set(id, {
						id,
						label: note.scope.label ?? id,
						count: (prev?.count ?? 0) + 1,
						updatedAt: Math.max(prev?.updatedAt ?? 0, note.updatedAt),
					});
				}
				setState({ sessions: [...groups.values()].sort((a, b) => b.updatedAt - a.updatedAt), loaded: true });
			},
			() => {
				if (s === seq.current) setState({ sessions: [], loaded: true });
			},
		);
	}, [store, projectId]);
	return state;
}

interface ProjectScope {
	readonly id: string;
	readonly label: string;
	readonly count: number;
}

/** Projects available from the configured task source. */
function useProjects(store: TaskStore): readonly ProjectScope[] {
	const [projects, setProjects] = useState<readonly ProjectScope[]>([]);
	const seq = useRef(0);
	useEffect(() => {
		const s = ++seq.current;
		store.getVaultOverview().then(
			overview => {
				if (s !== seq.current) return;
				const fromScopes = (overview.scopes ?? [])
					.filter(scope => scope.type === "project")
					.map(scope => ({ id: scope.id, label: scope.label ?? scope.id, count: scope.count }));
				setProjects(
					fromScopes.length > 0
						? fromScopes
						: overview.projects.map(project => ({ id: project.name, label: project.name, count: project.count })),
				);
			},
			() => {
				if (s === seq.current) setProjects([]);
			},
		);
	}, [store]);
	return projects;
}

type Selection =
	| { readonly kind: "session"; readonly projectId: string; readonly id: string; readonly label: string }
	| { readonly kind: "project"; readonly projectId: string; readonly label: string }
	| { readonly kind: "global" };

function selectionKey(sel: Selection): string {
	if (sel.kind === "global") return "global";
	if (sel.kind === "session") return `session:${sel.id}`;
	return `project:${sel.projectId}`;
}

/** A scope option — pinned quick rows and flyout items share this shape. */
interface ScopeItem {
	readonly key: string;
	readonly label: string;
	readonly icon: IconName;
	readonly hint?: string;
	readonly select: Selection;
}

/** One scope row — used both pinned (beforeCategories) and inside a flyout. */
function ScopeRow({
	item,
	selected,
	onPick,
}: {
	readonly item: ScopeItem;
	readonly selected: boolean;
	readonly onPick: () => void;
}) {
	return (
		<div
			data-slot="scope-row"
			data-selected={selected || undefined}
			className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-fr-surface-2"
			onClick={onPick}
		>
			<span className="flex size-[18px] shrink-0 items-center justify-center text-fr-text-3">
				<Icon name={item.icon} size={15} strokeWidth={1.9} />
			</span>
			<span className="min-w-0 flex-1 fr-overflow text-fr-base text-fr-text">{item.label}</span>
			{item.hint ? (
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3 tabular-nums">{item.hint}</span>
			) : null}
			<Icon
				name="check"
				size={15}
				strokeWidth={2.4}
				className="shrink-0 text-fr-accent"
				style={{ opacity: selected ? 1 : 0 }}
			/>
		</div>
	);
}

export interface NestedTaskBoardProps {
	readonly store: TaskStore;
	readonly projectId: string;
	/** The session the board was opened from — the default scope when present. */
	readonly currentSessionId?: string;
	readonly onOpenNote?: (noteId: string) => void;
	readonly sessionActions?: TaskSessionActions;
	readonly className?: string;
}

export function NestedTaskBoard({
	store,
	projectId,
	currentSessionId,
	onOpenNote,
	className,
	sessionActions,
}: NestedTaskBoardProps) {
	const [sel, setSel] = useState<Selection>(() =>
		currentSessionId
			? { kind: "session", projectId, id: currentSessionId, label: "This session" }
			: { kind: "project", projectId, label: "Project" },
	);
	const autoDefault = useRef(true);
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<DOMRect | null>(null);
	const [query, setQuery] = useState("");

	const activeProjectId = sel.kind === "global" ? "" : sel.projectId;
	const { sessions, loaded } = useSessionBoards(store, activeProjectId);
	const projects = useProjects(store);

	// If we auto-defaulted to the opened session but it never materialized a board,
	// fall back to the project once sessions resolve — never an empty board on open.
	useEffect(() => {
		if (!autoDefault.current || !loaded) return;
		if (sel.kind === "session" && sel.id === currentSessionId && !sessions.some(s => s.id === currentSessionId)) {
			setSel({ kind: "project", projectId, label: "Project" });
		}
	}, [loaded, sessions, currentSessionId, projectId, sel]);

	const pick = (next: Selection) => {
		autoDefault.current = false;
		setSel(next);
		setOpen(false);
		setQuery("");
	};

	const projectLabel = useMemo(
		() => projects.find(p => p.id === projectId)?.label ?? projectId,
		[projects, projectId],
	);

	// Pinned quick rows: this session (when opened from one), the project, global.
	const pinned: ScopeItem[] = [];
	if (currentSessionId) {
		pinned.push({
			key: `session:${currentSessionId}`,
			label: "This session",
			icon: "branch",
			select: { kind: "session", projectId, id: currentSessionId, label: "This session" },
		});
	}
	pinned.push({
		key: `project:${projectId}`,
		label: projectLabel,
		icon: "grid",
		select: { kind: "project", projectId, label: projectLabel },
	});
	pinned.push({ key: "global", label: "All projects", icon: "globe", select: { kind: "global" } });

	const categories: SelectorMenuCategory<ScopeItem>[] = [];
	const sessionItems = sessions
		.filter(s => s.id !== currentSessionId)
		.map<ScopeItem>(s => ({
			key: `session:${s.id}`,
			label: s.label,
			icon: "branch",
			hint: String(s.count),
			select: { kind: "session", projectId: activeProjectId || projectId, id: s.id, label: s.label },
		}));
	if (sessionItems.length > 0) categories.push({ id: "sessions", label: "Recent sessions", items: sessionItems });
	const projectItems = projects.map<ScopeItem>(p => ({
		key: `project:${p.id}`,
		label: p.label,
		icon: "grid",
		hint: String(p.count),
		select: { kind: "project", projectId: p.id, label: p.label },
	}));
	if (projectItems.length > 0) categories.push({ id: "projects", label: "Projects", items: projectItems });

	const selKey = selectionKey(sel);
	const triggerLabel =
		sel.kind === "global"
			? "All projects"
			: sel.kind === "project" && sel.projectId === projectId
				? projectLabel
				: sel.label;
	const triggerIcon: IconName = sel.kind === "global" ? "globe" : sel.kind === "session" ? "branch" : "grid";

	return (
		<div className={cn("flex h-full min-h-0 flex-col", className)}>
			<div className="min-h-0 flex-1">
				<TaskBoard
					store={store}
					projectId={activeProjectId}
					onOpenNote={onOpenNote}
					className="h-full"
					scope={sel.kind === "session" ? { type: "session", id: sel.id } : undefined}
					sessionActions={sessionActions}
					leading={
						<button
							type="button"
							aria-haspopup="menu"
							aria-expanded={open}
							onClick={event => {
								setAnchor(event.currentTarget.getBoundingClientRect());
								setQuery("");
								setOpen(prev => !prev);
							}}
							className="inline-flex min-w-0 items-center gap-1.5 rounded-[8px] border border-fr-border bg-fr-surface px-2.5 py-1 text-fr-xs text-fr-text transition-colors hover:border-fr-text-3"
						>
							<Icon name={triggerIcon} size={13} strokeWidth={1.9} className="shrink-0 text-fr-text-3" />
							<span className="max-w-[12rem] fr-overflow">{triggerLabel}</span>
							<Icon name="caretD" size={13} strokeWidth={2} className="shrink-0 text-fr-text-3" />
						</button>
					}
				/>
			</div>
			{open ? (
				<SelectorMenu<ScopeItem>
					categories={categories}
					selectedId={selKey}
					getItemId={item => item.key}
					query={query}
					onQueryChange={setQuery}
					searchPlaceholder="Search sessions or projects…"
					renderItem={(item, selected, onItemPick) => (
						<ScopeRow item={item} selected={selected} onPick={onItemPick} />
					)}
					renderCategoryIcon={category => (
						<span className="flex size-[20px] shrink-0 items-center justify-center text-fr-text-3">
							<Icon name={category.id === "sessions" ? "branch" : "grid"} size={16} strokeWidth={2} />
						</span>
					)}
					renderFlyoutHeader={category => <div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">{category.label}</div>}
					beforeCategories={
						<>
							{pinned.map(item => (
								<ScopeRow
									key={item.key}
									item={item}
									selected={item.key === selKey}
									onPick={() => pick(item.select)}
								/>
							))}
							<div className="mx-2 my-[5px] h-px bg-fr-border-soft" />
						</>
					}
					anchorRect={anchor}
					place="below"
					onPick={item => pick(item.select)}
					onClose={() => setOpen(false)}
					panelWidth={280}
				/>
			) : null}
		</div>
	);
}

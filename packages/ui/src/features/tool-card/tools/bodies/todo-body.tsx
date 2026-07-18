// Todo checklist body — a faithful mirror of Engine's `todoToolRenderer`
// (`tools/todo.ts`): a flat checkbox list per phase, colored by status, with
// strikethrough on completed/abandoned, a note-count marker, and `§ notes`
// blocks for in-progress tasks. Shared by the `todo`/`todo_write` tool card
// (inline in the thread) and the dock Tasks Work-plan panel (`DockTasksView`),
// so both surfaces render one consistent checklist. (`TaskBreakdown` is a
// separate richer card-per-phase surface, no longer used by the dock.)

import type { TaskPhase, TaskStatus } from "@fraym/driver";
import { Icon } from "../../../../icons";
import { cn } from "../../../../lib/cn";

const ROMAN: readonly (readonly [number, string])[] = [
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

/** 1 → "I", 2 → "II", … — display-only phase numbering (mirrors the TUI). */
function romanNumeral(n: number): string {
	let out = "";
	let value = n;
	for (const [val, sym] of ROMAN) {
		while (value >= val) {
			out += sym;
			value -= val;
		}
	}
	return out || String(n);
}

function Checkbox({ status }: { readonly status: TaskStatus }) {
	if (status === "completed") {
		return (
			<span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-[4px] bg-fr-add-bg text-fr-add">
				<Icon name="check" size={10} strokeWidth={2.6} />
			</span>
		);
	}
	if (status === "abandoned") {
		return (
			<span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-[4px] bg-fr-del-bg text-fr-del">
				<Icon name="x" size={10} strokeWidth={2.6} />
			</span>
		);
	}
	if (status === "in_progress") {
		return <span className="mt-px size-3.5 shrink-0 rounded-[4px] border-[1.5px] border-fr-accent" />;
	}
	return <span className="mt-px size-3.5 shrink-0 rounded-[4px] border border-fr-border-soft" />;
}

const TEXT_TONE: Record<TaskStatus, string> = {
	completed: "text-fr-text-3",
	in_progress: "text-fr-text",
	abandoned: "text-fr-text-3",
	pending: "text-fr-text-2",
};

function TodoRow({ task }: { readonly task: TaskPhase["tasks"][number] }) {
	const strike = task.status === "completed" || task.status === "abandoned";
	const noteCount = task.notes?.length ?? 0;
	return (
		<div className="flex items-start gap-2">
			<Checkbox status={task.status} />
			<span className={cn("min-w-0 flex-1", TEXT_TONE[task.status], strike && "line-through decoration-fr-text-3")}>
				{task.content}
			</span>
			{noteCount > 0 && (
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3 italic">{`+${noteCount}`}</span>
			)}
		</div>
	);
}

/** In-progress tasks surface their notes inline (TUI `renderNoteAttachments`). */
function TodoNotes({ phases }: { readonly phases: readonly TaskPhase[] }) {
	const withNotes = phases
		.flatMap(phase => phase.tasks)
		.filter(task => task.status === "in_progress" && (task.notes?.length ?? 0) > 0);
	if (withNotes.length === 0) return null;
	return (
		<div className="mt-1 flex flex-col gap-1.5">
			{withNotes.map(task => (
				<div
					key={task.content}
					className="ml-[22px] border-l border-fr-border-soft pl-2.5 text-fr-2xs text-fr-text-3"
				>
					<div className="italic">{`§ notes — ${task.content}`}</div>
					{(task.notes ?? []).map((note, i) => (
						<div key={`${task.content}:${i}`} className="whitespace-pre-wrap">
							{note}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

export function TodoChecklistBody({ phases }: { readonly phases: readonly TaskPhase[] }) {
	const multi = phases.length > 1;
	return (
		<div className="flex flex-col gap-2.5 font-secondary text-fr-xs leading-relaxed">
			{phases.map((phase, index) => (
				<div key={phase.name} className="flex flex-col gap-1">
					{multi && (
						<div className="font-primary text-fr-2xs font-semibold uppercase tracking-fr-label text-fr-accent">
							{`${romanNumeral(index + 1)}. ${phase.name}`}
						</div>
					)}
					{phase.tasks.map((task, i) => (
						<TodoRow key={`${phase.name}:${i}`} task={task} />
					))}
				</div>
			))}
			<TodoNotes phases={phases} />
		</div>
	);
}

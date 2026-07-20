import type { TaskItem, TaskPhase } from "@fraym/driver";
import { Badge } from "../../elements/badge";
import { Button } from "../../elements/button";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { Meter, StatusDot } from "../density-ui";
import { currentTask, type FraymSurfaceConfig, resolveDensity, taskCounts, taskStatusTone } from "../surface-kit";

export interface PinnedTodoCardProps {
	readonly phases: readonly TaskPhase[];
	readonly title?: string;
	readonly settings?: FraymSurfaceConfig;
	readonly onOpen?: () => void;
	readonly className?: string;
}

interface TodoCardState {
	readonly counts: ReturnType<typeof taskCounts>;
	readonly countTone: "accent" | "add" | "mute";
	readonly activeLabel: string;
	readonly tasks: readonly TaskItem[];
}

function visibleTasks(phases: readonly TaskPhase[]): readonly TaskItem[] {
	const selected: TaskItem[] = [];

	for (const status of ["in_progress", "pending"] as const) {
		for (const phase of phases) {
			for (const task of phase.tasks) {
				if (task.status !== status) continue;
				selected.push(task);
				if (selected.length === 3) return selected;
			}
		}
	}

	return selected;
}

function todoCardState(phases: readonly TaskPhase[]): TodoCardState {
	const counts = taskCounts(phases);
	const active = currentTask(phases);
	const countTone = counts.active > 0 ? "accent" : counts.completed === counts.total ? "add" : "mute";
	const activeLabel = active?.content ?? (counts.total > 0 ? "No task currently running" : "No tasks");
	return { counts, countTone, activeLabel, tasks: visibleTasks(phases) };
}

function OpenTodoButton({ onOpen }: Pick<PinnedTodoCardProps, "onOpen">) {
	if (!onOpen) return null;
	return (
		<Button size="sm" variant="ghost" onClick={onOpen}>
			Open
		</Button>
	);
}

function CountBadge({ state }: { readonly state: TodoCardState }) {
	return (
		<Badge tone={state.countTone}>
			{state.counts.completed}/{state.counts.total}
		</Badge>
	);
}

function VisibleTaskRows({ tasks }: { readonly tasks: readonly TaskItem[] }) {
	if (tasks.length === 0) return null;
	return (
		<div className="grid gap-1.5">
			{tasks.map((task, index) => (
				<div key={`${task.status}:${index}:${task.content}`} className="flex min-w-0 items-center gap-2 text-fr-sm">
					<StatusDot tone={taskStatusTone(task.status)} breathe={task.status === "in_progress"} />
					<span className="min-w-0 fr-overflow text-fr-text-2">{task.content}</span>
				</div>
			))}
		</div>
	);
}

function CompactPinnedTodo({
	title,
	state,
	density,
	onOpen,
	className,
}: {
	readonly title: string;
	readonly state: TodoCardState;
	readonly density: NonNullable<FraymSurfaceConfig["density"]>;
	readonly onOpen?: () => void;
	readonly className?: string;
}) {
	return (
		<section
			data-slot="pinned-todo-card"
			data-density={density}
			className={cn(
				"flex min-w-0 items-center gap-2 border-y border-fr-border-soft bg-fr-bg px-2 py-1 text-fr-xs",
				className,
			)}
		>
			<Icon name="list" size={12} className="shrink-0 text-fr-accent" />
			<h3 className="min-w-0 fr-overflow font-display text-fr-xs font-semibold text-fr-text">{title}</h3>
			<CountBadge state={state} />
			<span className="min-w-0 flex-1 fr-overflow text-fr-xs text-fr-text-3">{state.activeLabel}</span>
			<OpenTodoButton onOpen={onOpen} />
		</section>
	);
}

function SpaciousPinnedTodo({
	title,
	state,
	density,
	d,
	onOpen,
	className,
}: {
	readonly title: string;
	readonly state: TodoCardState;
	readonly density: NonNullable<FraymSurfaceConfig["density"]>;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly onOpen?: () => void;
	readonly className?: string;
}) {
	return (
		<section
			data-slot="pinned-todo-card"
			data-density={density}
			className={cn("grid gap-3", d.card, d.pad, className)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<span
					className={cn(
						"flex shrink-0 items-center justify-center bg-fr-accent-dim text-fr-accent",
						d.tile,
						d.tileRadius,
					)}
				>
					<Icon name="list" size={d.icon} />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className={cn("fr-overflow font-display font-semibold text-fr-text", d.title)}>{title}</h3>
					<p className="mt-0.5 fr-overflow text-fr-xs text-fr-text-3">{state.activeLabel}</p>
				</div>
				<CountBadge state={state} />
			</div>
			<Meter
				value={state.counts.completed}
				total={state.counts.total}
				tone={state.counts.completed === state.counts.total ? "add" : "accent"}
			/>
			<VisibleTaskRows tasks={state.tasks} />
			<OpenTodoButton onOpen={onOpen} />
		</section>
	);
}

function ComfortablePinnedTodo({
	title,
	state,
	density,
	d,
	onOpen,
	className,
}: {
	readonly title: string;
	readonly state: TodoCardState;
	readonly density: NonNullable<FraymSurfaceConfig["density"]>;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly onOpen?: () => void;
	readonly className?: string;
}) {
	return (
		<section data-slot="pinned-todo-card" data-density={density} className={cn(d.card, "px-3 py-2.5", className)}>
			<div className="flex min-w-0 items-center gap-2">
				<span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-fr-accent-dim text-fr-accent">
					<Icon name="list" size={13} />
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-2">
						<h3 className="fr-overflow font-display text-fr-base font-semibold text-fr-text">{title}</h3>
						<CountBadge state={state} />
					</div>
					<p className="fr-overflow text-fr-sm text-fr-text-3">{state.activeLabel}</p>
				</div>
				<OpenTodoButton onOpen={onOpen} />
			</div>
		</section>
	);
}

export function PinnedTodoCard({ phases, title = "Active work", settings, onOpen, className }: PinnedTodoCardProps) {
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);
	const state = todoCardState(phases);

	if (settings?.visible === false || settings?.placement === "hidden") return null;
	if (d.isCompact)
		return <CompactPinnedTodo title={title} state={state} density={density} onOpen={onOpen} className={className} />;
	if (d.isSpacious) {
		return (
			<SpaciousPinnedTodo
				title={title}
				state={state}
				density={density}
				d={d}
				onOpen={onOpen}
				className={className}
			/>
		);
	}
	return (
		<ComfortablePinnedTodo
			title={title}
			state={state}
			density={density}
			d={d}
			onOpen={onOpen}
			className={className}
		/>
	);
}

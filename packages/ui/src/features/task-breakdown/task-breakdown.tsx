import type { TaskPhase } from "@fraym/driver";
import { Badge } from "../../elements/badge";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { Meter, ModeEyebrow, StatusDot } from "../density-ui";
import { type FraymSurfaceConfig, resolveDensity, taskStatusIcon, taskStatusTone, toneClass } from "../surface-kit";

export interface TaskBreakdownProps {
	readonly phases: readonly TaskPhase[];
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

type TaskItem = TaskPhase["tasks"][number];
type DensityModel = ReturnType<typeof resolveDensity>;

function phaseProgress(phase: TaskPhase) {
	const total = phase.tasks.length;
	const completed = phase.tasks.filter(task => task.status === "completed").length;
	const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
	return { total, completed, pct };
}

export function TaskBreakdown({ phases, settings, className }: TaskBreakdownProps) {
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);

	if (settings?.visible === false || settings?.placement === "hidden") return null;
	if (d.isCompact) return <CompactTaskBreakdown phases={phases} density={density} className={className} />;
	if (d.isSpacious) return <SpaciousTaskBreakdown phases={phases} density={density} d={d} className={className} />;
	return <ComfortableTaskBreakdown phases={phases} density={density} d={d} className={className} />;
}

function CompactTaskBreakdown({
	phases,
	density,
	className,
}: {
	readonly phases: readonly TaskPhase[];
	readonly density: string;
	readonly className?: string;
}) {
	return (
		<div data-slot="task-breakdown" data-density={density} className={cn("flex flex-col gap-2.5", className)}>
			{phases.map(phase => (
				<CompactPhase key={phase.name} phase={phase} />
			))}
		</div>
	);
}

function CompactPhase({ phase }: { readonly phase: TaskPhase }) {
	const { completed, total } = phaseProgress(phase);
	return (
		<section className="flex flex-col gap-1">
			<ModeEyebrow trailing={`${completed}/${total}`}>{phase.name}</ModeEyebrow>
			<div className="flex flex-col">
				{phase.tasks.map((task, index) => (
					<CompactTaskRow key={`${phase.name}:${index}`} task={task} />
				))}
			</div>
		</section>
	);
}

function CompactTaskRow({ task }: { readonly task: TaskItem }) {
	return (
		<div className="flex min-w-0 items-center gap-2 py-[3px] text-fr-xs">
			<StatusDot tone={taskStatusTone(task.status)} breathe={task.status === "in_progress"} />
			<span
				className={cn(
					"min-w-0 fr-overflow",
					task.status === "completed" ? "text-fr-text-3 line-through" : "text-fr-text-2",
				)}
			>
				{task.content}
			</span>
			{task.notes && task.notes.length > 0 && (
				<span className="ml-auto shrink-0 font-secondary text-fr-2xs text-fr-text-3">{task.notes.length}n</span>
			)}
		</div>
	);
}

function SpaciousTaskBreakdown({
	phases,
	density,
	d,
	className,
}: {
	readonly phases: readonly TaskPhase[];
	readonly density: string;
	readonly d: DensityModel;
	readonly className?: string;
}) {
	return (
		<div data-slot="task-breakdown" data-density={density} className={cn("grid gap-3", className)}>
			{phases.map(phase => (
				<SpaciousPhase key={phase.name} phase={phase} d={d} />
			))}
		</div>
	);
}

function SpaciousPhase({ phase, d }: { readonly phase: TaskPhase; readonly d: DensityModel }) {
	const { completed, total, pct } = phaseProgress(phase);
	return (
		<section className={cn("overflow-hidden", d.card)}>
			<SpaciousPhaseHeader phase={phase} completed={completed} total={total} pct={pct} d={d} />
			<div className="divide-y divide-fr-border-soft">
				{phase.tasks.map((task, index) => (
					<SpaciousTaskRow key={`${phase.name}:${index}`} task={task} d={d} />
				))}
			</div>
		</section>
	);
}

function SpaciousPhaseHeader({
	phase,
	completed,
	total,
	pct,
	d,
}: {
	readonly phase: TaskPhase;
	readonly completed: number;
	readonly total: number;
	readonly pct: number;
	readonly d: DensityModel;
}) {
	return (
		<div className={cn("flex flex-col gap-3 border-b border-fr-border-soft", d.pad)}>
			<div className="flex items-center gap-3">
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
					<h3 className={cn("font-display font-semibold text-fr-text", d.title)}>{phase.name}</h3>
					<p className="mt-0.5 text-fr-xs text-fr-text-3">
						{completed} of {total} complete
					</p>
				</div>
				<span className="shrink-0 font-secondary text-fr-sm text-fr-text-2">{pct}%</span>
			</div>
			<Meter value={completed} total={total} tone={completed === total ? "add" : "accent"} />
		</div>
	);
}

function SpaciousTaskRow({ task, d }: { readonly task: TaskItem; readonly d: DensityModel }) {
	const tone = taskStatusTone(task.status);
	return (
		<div className={cn("flex items-start gap-3", d.row)}>
			<span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[8px]", toneClass(tone, true))}>
				<Icon name={taskStatusIcon(task.status)} size={14} />
			</span>
			<div className="min-w-0 flex-1">
				<p
					className={cn("text-fr-base leading-5", task.status === "completed" ? "text-fr-text-3" : "text-fr-text")}
				>
					{task.content}
				</p>
				{task.notes && task.notes.length > 0 && (
					<p className="mt-1 font-secondary text-fr-2xs text-fr-text-3">{task.notes.join(" | ")}</p>
				)}
			</div>
			<Badge tone={tone === "default" ? "mute" : tone}>{task.status.replace("_", " ")}</Badge>
		</div>
	);
}

function ComfortableTaskBreakdown({
	phases,
	density,
	d,
	className,
}: {
	readonly phases: readonly TaskPhase[];
	readonly density: string;
	readonly d: DensityModel;
	readonly className?: string;
}) {
	return (
		<div data-slot="task-breakdown" data-density={density} className={cn("grid gap-2", className)}>
			{phases.map(phase => (
				<ComfortablePhase key={phase.name} phase={phase} d={d} />
			))}
		</div>
	);
}

function ComfortablePhase({ phase, d }: { readonly phase: TaskPhase; readonly d: DensityModel }) {
	const { completed, total } = phaseProgress(phase);
	return (
		<section className={d.card}>
			<div className={cn("flex items-center gap-2 border-b border-fr-border-soft", d.row)}>
				<Icon name="list" size={14} className="text-fr-accent" />
				<h3 className={cn("font-display font-semibold text-fr-text", d.title)}>{phase.name}</h3>
				<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">
					{completed}/{total}
				</span>
			</div>
			<div className="divide-y divide-fr-border-soft">
				{phase.tasks.map((task, index) => (
					<ComfortableTaskRow key={`${phase.name}:${index}`} task={task} d={d} />
				))}
			</div>
		</section>
	);
}

function ComfortableTaskRow({ task, d }: { readonly task: TaskItem; readonly d: DensityModel }) {
	const tone = taskStatusTone(task.status);
	return (
		<div className={cn("grid gap-1", d.row)}>
			<div className="flex min-w-0 items-start gap-2">
				<span
					className={cn(
						"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
						toneClass(tone, true),
					)}
				>
					<Icon name={taskStatusIcon(task.status)} size={12} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-fr-base text-fr-text">{task.content}</p>
					{task.notes && task.notes.length > 0 && (
						<p className="mt-0.5 font-secondary text-fr-2xs text-fr-text-3">{task.notes.join(" | ")}</p>
					)}
				</div>
				<Badge tone={tone === "default" ? "mute" : tone}>{task.status.replace("_", " ")}</Badge>
			</div>
		</div>
	);
}

import type { TaskPhase } from "@fraym/driver";
import { Badge } from "../../elements/badge";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { Meter, StatusDot } from "../density-ui";
import { type FraymSurfaceConfig, resolveDensity, taskStatusIcon, taskStatusTone, toneClass } from "../surface-kit";

export interface WorkPlanBodyProps {
	readonly phases: readonly TaskPhase[];
	readonly settings?: FraymSurfaceConfig;
	readonly showCompleted?: boolean;
	readonly className?: string;
}

type WorkPlanTask = TaskPhase["tasks"][number];
type DensityModel = ReturnType<typeof resolveDensity>;

type VisibleWorkPhase = {
	readonly completed: number;
	readonly phase: TaskPhase;
	readonly phaseIndex: number;
	readonly tasks: readonly WorkPlanTask[];
	readonly total: number;
};

export function WorkPlanBody({ phases, settings, showCompleted = true, className }: WorkPlanBodyProps) {
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);

	if (settings?.visible === false || settings?.placement === "hidden") return null;

	const visiblePhases = getVisibleWorkPhases(phases, showCompleted);
	if (d.isCompact) return <CompactWorkPlan phases={visiblePhases} density={density} className={className} />;
	if (d.isSpacious) return <SpaciousWorkPlan phases={visiblePhases} density={density} d={d} className={className} />;
	return <ComfortableWorkPlan phases={visiblePhases} density={density} d={d} className={className} />;
}

function getVisibleWorkPhases(phases: readonly TaskPhase[], showCompleted: boolean): readonly VisibleWorkPhase[] {
	return phases
		.map((phase, phaseIndex) => {
			const tasks = showCompleted ? phase.tasks : phase.tasks.filter(task => task.status !== "completed");
			const completed = phase.tasks.filter(task => task.status === "completed").length;
			return { completed, phase, phaseIndex, tasks, total: phase.tasks.length };
		})
		.filter(entry => entry.tasks.length > 0);
}

function CompactWorkPlan({
	phases,
	density,
	className,
}: {
	readonly phases: readonly VisibleWorkPhase[];
	readonly density: string;
	readonly className?: string;
}) {
	return (
		<div data-slot="work-plan-body" data-density={density} className={cn("flex flex-col gap-2", className)}>
			{phases.map(entry => (
				<CompactWorkPhase key={`${entry.phaseIndex}:${entry.phase.name}`} entry={entry} />
			))}
		</div>
	);
}

function CompactWorkPhase({ entry }: { readonly entry: VisibleWorkPhase }) {
	return (
		<section className="flex flex-col gap-0.5">
			<div className="flex items-center gap-2 text-fr-xs">
				<span className="font-secondary text-fr-2xs text-fr-accent">
					{String(entry.phaseIndex + 1).padStart(2, "0")}
				</span>
				<span className="min-w-0 fr-overflow font-semibold text-fr-text">{entry.phase.name}</span>
				<span className="ml-auto shrink-0 font-secondary text-fr-2xs text-fr-text-3">
					{entry.completed}/{entry.total}
				</span>
			</div>
			<div className="flex flex-col">
				{entry.tasks.map((task, taskIndex) => (
					<CompactWorkTask key={`${entry.phase.name}:${taskIndex}`} task={task} />
				))}
			</div>
		</section>
	);
}

function CompactWorkTask({ task }: { readonly task: WorkPlanTask }) {
	return (
		<div className="flex min-w-0 items-center gap-2 py-[3px] pl-5 text-fr-xs">
			<StatusDot tone={taskStatusTone(task.status)} breathe={task.status === "in_progress"} />
			<span
				className={cn(
					"min-w-0 fr-overflow",
					task.status === "completed" ? "text-fr-text-3 line-through" : "text-fr-text-2",
				)}
			>
				{task.content}
			</span>
		</div>
	);
}

function SpaciousWorkPlan({
	phases,
	density,
	d,
	className,
}: {
	readonly phases: readonly VisibleWorkPhase[];
	readonly density: string;
	readonly d: DensityModel;
	readonly className?: string;
}) {
	return (
		<div data-slot="work-plan-body" data-density={density} className={cn("grid gap-3", className)}>
			{phases.map(entry => (
				<SpaciousWorkPhase key={`${entry.phaseIndex}:${entry.phase.name}`} entry={entry} d={d} />
			))}
		</div>
	);
}

function SpaciousWorkPhase({ entry, d }: { readonly entry: VisibleWorkPhase; readonly d: DensityModel }) {
	return (
		<section className={cn(d.card, d.pad, "grid gap-3")}>
			<div className="flex items-center gap-3">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-fr-accent-dim font-secondary text-fr-sm font-semibold text-fr-accent">
					{String(entry.phaseIndex + 1).padStart(2, "0")}
				</span>
				<span className={cn("min-w-0 flex-1 fr-overflow font-semibold text-fr-text", d.title)}>
					{entry.phase.name}
				</span>
				<span className="shrink-0 font-secondary text-fr-xs text-fr-text-3">
					{entry.completed}/{entry.total}
				</span>
			</div>
			<Meter value={entry.completed} total={entry.total} tone={entry.completed === entry.total ? "add" : "accent"} />
			<div className="grid gap-1.5">
				{entry.tasks.map((task, taskIndex) => (
					<SpaciousWorkTask key={`${entry.phase.name}:${taskIndex}`} task={task} />
				))}
			</div>
		</section>
	);
}

function SpaciousWorkTask({ task }: { readonly task: WorkPlanTask }) {
	const tone = taskStatusTone(task.status);
	return (
		<div className="flex items-start gap-3">
			<span
				className={cn(
					"mt-px flex size-6 shrink-0 items-center justify-center rounded-[7px]",
					toneClass(tone, true),
				)}
			>
				<Icon name={taskStatusIcon(task.status)} size={13} />
			</span>
			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"text-fr-base leading-5",
						task.status === "completed" ? "text-fr-text-3 line-through" : "text-fr-text",
					)}
				>
					{task.content}
				</p>
				{task.notes && task.notes.length > 0 && (
					<p className="mt-0.5 font-secondary text-fr-2xs text-fr-text-3">{task.notes.join(" | ")}</p>
				)}
			</div>
			<Badge className="mt-0.5 self-start" tone={tone === "default" ? "mute" : tone}>
				{task.status.replace("_", " ")}
			</Badge>
		</div>
	);
}

function ComfortableWorkPlan({
	phases,
	density,
	d,
	className,
}: {
	readonly phases: readonly VisibleWorkPhase[];
	readonly density: string;
	readonly d: DensityModel;
	readonly className?: string;
}) {
	return (
		<div data-slot="work-plan-body" data-density={density} className={cn("grid gap-2", className)}>
			{phases.map(entry => (
				<ComfortableWorkPhase key={`${entry.phaseIndex}:${entry.phase.name}`} entry={entry} d={d} />
			))}
		</div>
	);
}

function ComfortableWorkPhase({ entry, d }: { readonly entry: VisibleWorkPhase; readonly d: DensityModel }) {
	return (
		<section className="grid gap-1">
			<div className="flex items-center gap-2 text-fr-text">
				<span className="font-secondary text-fr-xs text-fr-accent">
					{String(entry.phaseIndex + 1).padStart(2, "0")}
				</span>
				<span className={cn("font-semibold", d.title)}>{entry.phase.name}</span>
				<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">
					{entry.completed}/{entry.total}
				</span>
			</div>
			<div className="grid gap-1">
				{entry.tasks.map((task, taskIndex) => (
					<ComfortableWorkTask key={`${entry.phase.name}:${taskIndex}`} task={task} />
				))}
			</div>
		</section>
	);
}

function ComfortableWorkTask({ task }: { readonly task: WorkPlanTask }) {
	const tone = taskStatusTone(task.status);
	return (
		<div className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-2">
			<span className={cn("mt-0.5 flex size-4 items-center justify-center rounded-[5px]", toneClass(tone, true))}>
				<Icon name={taskStatusIcon(task.status)} size={10} />
			</span>
			<div className="min-w-0">
				<p
					className={cn(
						"text-fr-sm leading-5",
						task.status === "completed" ? "text-fr-text-3 line-through" : "text-fr-text-2",
					)}
				>
					{task.content}
				</p>
				{task.notes && task.notes.length > 0 && (
					<p className="font-secondary text-fr-2xs text-fr-text-3">{task.notes.join(" | ")}</p>
				)}
			</div>
			<Badge className="mt-0.5 self-start" tone={tone === "default" ? "mute" : tone}>
				{task.status.replace("_", " ")}
			</Badge>
		</div>
	);
}

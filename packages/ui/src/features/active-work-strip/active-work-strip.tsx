import type { TaskPhase } from "@fraym/driver";
import { Badge } from "../../elements/badge";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { Meter, StatusDot } from "../density-ui";
import {
	currentTask,
	type FraymDensity,
	type FraymSurfaceConfig,
	resolveDensity,
	type ToolTimelineStatus,
	taskCounts,
} from "../surface-kit";

export interface ActiveWorkTool {
	readonly id: string;
	readonly label: string;
	readonly status?: ToolTimelineStatus;
	readonly icon?: IconName;
}

export interface ActiveWorkStripProps {
	readonly phases?: readonly TaskPhase[];
	readonly tools?: readonly ActiveWorkTool[];
	readonly statusLabel?: string;
	readonly settings?: FraymSurfaceConfig;
	readonly onOpenTasks?: () => void;
	readonly className?: string;
}

type CountTone = "accent" | "add" | "mute";
type ResolvedDensity = ReturnType<typeof resolveDensity>;
type TaskCounts = ReturnType<typeof taskCounts>;

interface ActiveWorkViewState {
	readonly density: FraymDensity;
	readonly placement: FraymSurfaceConfig["placement"] | "bottom";
	readonly d: ResolvedDensity;
	readonly counts: TaskCounts;
	readonly hasPlan: boolean;
	readonly activeLabel: string;
	readonly countTone: CountTone;
	readonly tools: readonly ActiveWorkTool[];
	readonly statusLabel: string;
	readonly onOpenTasks?: () => void;
	readonly className?: string;
}

function toolTone(status?: ToolTimelineStatus): "accent" | "add" | "del" {
	if (status === "failed") return "del";
	if (status === "success") return "add";
	return "accent";
}

function activeWorkLabel(phases: readonly TaskPhase[], counts: TaskCounts): string {
	const active = currentTask(phases);
	return active?.content ?? (counts.total > 0 ? "No task currently running" : "No tasks");
}

function activeWorkCountTone(counts: TaskCounts): CountTone {
	if (counts.active > 0) return "accent";
	if (counts.completed === counts.total) return "add";
	return "mute";
}

function resolveActiveWorkState({
	phases,
	tools,
	statusLabel,
	settings,
	onOpenTasks,
	className,
}: Required<Pick<ActiveWorkStripProps, "phases" | "tools" | "statusLabel">> &
	Pick<ActiveWorkStripProps, "settings" | "onOpenTasks" | "className">): ActiveWorkViewState {
	const density = settings?.density ?? "comfortable";
	const counts = taskCounts(phases);
	return {
		density,
		placement: settings?.placement ?? "bottom",
		d: resolveDensity(density),
		counts,
		hasPlan: phases.length > 0,
		activeLabel: activeWorkLabel(phases, counts),
		countTone: activeWorkCountTone(counts),
		tools,
		statusLabel,
		onOpenTasks,
		className,
	};
}

function CompactPlanArea({ state }: { readonly state: ActiveWorkViewState }) {
	if (!state.hasPlan) {
		return (
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<StatusDot tone="accent" breathe />
				<span className="shrink-0 font-medium text-fr-text">{state.statusLabel}</span>
				<span className="min-w-0 flex-1 fr-overflow">{state.activeLabel}</span>
			</div>
		);
	}
	return (
		<button
			type="button"
			data-slot="active-work-plan"
			className={cn(
				"flex min-w-0 flex-1 items-center gap-2 text-left",
				state.onOpenTasks && "transition-colors hover:text-fr-accent",
			)}
			onClick={state.onOpenTasks}
		>
			<StatusDot tone="accent" breathe />
			<span className="shrink-0 font-medium text-fr-text">{state.statusLabel}</span>
			<span className="min-w-0 flex-1 fr-overflow">{state.activeLabel}</span>
		</button>
	);
}

function CompactToolList({ tools }: { readonly tools: readonly ActiveWorkTool[] }) {
	if (tools.length === 0) return null;
	return (
		<div data-slot="active-work-tools" className="flex shrink-0 items-center gap-1">
			{tools.map(tool => (
				<span
					key={tool.id}
					data-status={tool.status ?? "queued"}
					title={tool.label}
					aria-label={tool.label}
					className="inline-flex size-6 items-center justify-center rounded-[6px] border border-fr-border-soft bg-fr-surface text-fr-blue"
				>
					<Icon name={tool.icon ?? "termBox"} size={12} />
				</span>
			))}
		</div>
	);
}

function CompactActiveWorkStrip({ state }: { readonly state: ActiveWorkViewState }) {
	return (
		<div
			data-slot="active-work-strip"
			data-density={state.density}
			data-placement={state.placement}
			className={cn(
				"flex min-w-0 items-center gap-2 border-y border-fr-border-soft bg-fr-bg px-2 py-1 text-fr-xs text-fr-text-2",
				state.className,
			)}
		>
			<CompactPlanArea state={state} />
			<CompactToolList tools={state.tools} />
		</div>
	);
}

function SpaciousPlanArea({ state }: { readonly state: ActiveWorkViewState }) {
	if (!state.hasPlan) {
		return (
			<div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-fr-border-soft bg-fr-surface p-3 text-fr-base text-fr-text-2">
				<StatusDot tone="accent" breathe size={9} />
				<span className="fr-overflow font-medium text-fr-text">{state.statusLabel}</span>
			</div>
		);
	}
	return (
		<button
			type="button"
			data-slot="active-work-plan"
			className={cn(
				"flex min-w-[220px] flex-1 flex-col gap-3 rounded-[14px] border border-fr-border-soft bg-fr-surface p-3 text-left",
				state.onOpenTasks && "transition-colors hover:border-fr-accent-line hover:bg-fr-surface-2",
			)}
			onClick={state.onOpenTasks}
		>
			<span className="flex min-w-0 items-center gap-3">
				<span
					className={cn(
						"flex shrink-0 items-center justify-center bg-fr-accent-dim text-fr-accent",
						state.d.tile,
						state.d.tileRadius,
					)}
				>
					<Icon name="list" size={state.d.icon} />
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex min-w-0 items-center gap-2">
						<span className={cn("fr-overflow font-display font-semibold text-fr-text", state.d.title)}>
							{state.statusLabel}
						</span>
						<Badge tone={state.countTone}>
							{state.counts.completed}/{state.counts.total}
						</Badge>
					</span>
					<span className="block fr-overflow text-fr-sm text-fr-text-3">{state.activeLabel}</span>
				</span>
			</span>
			<Meter
				value={state.counts.completed}
				total={state.counts.total}
				tone={state.counts.completed === state.counts.total ? "add" : "accent"}
			/>
		</button>
	);
}

function SpaciousToolList({ tools }: { readonly tools: readonly ActiveWorkTool[] }) {
	if (tools.length === 0) return null;
	return (
		<div data-slot="active-work-tools" className="flex flex-1 flex-wrap items-center gap-2">
			{tools.map(tool => (
				<span
					key={tool.id}
					data-status={tool.status ?? "queued"}
					className="inline-flex min-h-11 max-w-[260px] shrink-0 items-center gap-2 rounded-[12px] border border-fr-border-soft bg-fr-surface px-3 text-fr-sm text-fr-text-2"
				>
					<Icon name={tool.icon ?? "termBox"} size={15} className="shrink-0 text-fr-blue" />
					<span className="min-w-0 fr-overflow">{tool.label}</span>
					<StatusDot tone={toolTone(tool.status)} breathe={tool.status === "running"} />
				</span>
			))}
		</div>
	);
}

function SpaciousActiveWorkStrip({ state }: { readonly state: ActiveWorkViewState }) {
	return (
		<div
			data-slot="active-work-strip"
			data-density={state.density}
			data-placement={state.placement}
			className={cn(
				"flex min-w-0 flex-wrap items-stretch gap-3 rounded-[16px] border border-fr-border bg-fr-bg p-3",
				"shadow-[0_14px_40px_rgba(0,0,0,0.2)] max-[640px]:items-stretch",
				state.className,
			)}
		>
			<SpaciousPlanArea state={state} />
			<SpaciousToolList tools={state.tools} />
		</div>
	);
}

function ComfortablePlanArea({ state }: { readonly state: ActiveWorkViewState }) {
	if (!state.hasPlan) {
		return (
			<div className="flex min-h-9 min-w-0 flex-1 items-center gap-2 px-1 text-fr-sm text-fr-text-2">
				<span className="flex size-2 rounded-full bg-fr-accent shadow-[0_0_0_3px_var(--fr-accent-dim)]" />
				<span className="fr-overflow font-medium text-fr-text">{state.statusLabel}</span>
			</div>
		);
	}
	return (
		<button
			type="button"
			data-slot="active-work-plan"
			className={cn(
				"flex min-h-11 min-w-[160px] flex-1 items-center gap-2 rounded-[9px] border border-fr-border-soft bg-fr-surface px-2.5 py-2 text-left",
				state.onOpenTasks && "transition-colors hover:border-fr-accent-line hover:bg-fr-surface-2",
			)}
			onClick={state.onOpenTasks}
		>
			<span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-fr-accent-dim text-fr-accent">
				<Icon name="list" size={13} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="flex min-w-0 items-center gap-2">
					<span className="fr-overflow text-fr-sm font-semibold text-fr-text">{state.statusLabel}</span>
					<Badge tone={state.countTone}>
						{state.counts.completed}/{state.counts.total}
					</Badge>
				</span>
				<span className="block fr-overflow text-fr-sm text-fr-text-3">{state.activeLabel}</span>
			</span>
		</button>
	);
}

function ComfortableToolList({ tools }: { readonly tools: readonly ActiveWorkTool[] }) {
	if (tools.length === 0) return null;
	return (
		<div data-slot="active-work-tools" className="-mx-0.5 flex flex-1 flex-wrap items-center gap-1.5 p-0.5">
			{tools.map(tool => (
				<span
					key={tool.id}
					data-status={tool.status ?? "queued"}
					className="inline-flex h-8 max-w-[230px] shrink-0 items-center gap-1.5 rounded-[9px] border border-fr-border-soft bg-fr-surface px-2.5 text-fr-sm text-fr-text-2"
				>
					<Icon name={tool.icon ?? "termBox"} size={13} className="shrink-0 text-fr-blue" />
					<span className="min-w-0 fr-overflow">{tool.label}</span>
					<Badge className="shrink-0" tone={toolTone(tool.status)}>
						{tool.status ?? "queued"}
					</Badge>
				</span>
			))}
		</div>
	);
}

function ComfortableActiveWorkStrip({ state }: { readonly state: ActiveWorkViewState }) {
	return (
		<div
			data-slot="active-work-strip"
			data-density={state.density}
			data-placement={state.placement}
			className={cn(
				"flex min-w-0 flex-wrap items-center gap-2 rounded-[12px] border border-fr-border-soft bg-fr-bg px-2 py-2",
				"shadow-[0_10px_32px_rgba(0,0,0,0.18)] max-[640px]:items-stretch",
				state.className,
			)}
		>
			<ComfortablePlanArea state={state} />
			<ComfortableToolList tools={state.tools} />
		</div>
	);
}

export function ActiveWorkStrip({
	phases = [],
	tools = [],
	statusLabel = "Working",
	settings,
	onOpenTasks,
	className,
}: ActiveWorkStripProps) {
	if (settings?.visible === false || settings?.placement === "hidden") return null;
	const state = resolveActiveWorkState({ phases, tools, statusLabel, settings, onOpenTasks, className });
	if (state.d.isCompact) return <CompactActiveWorkStrip state={state} />;
	if (state.d.isSpacious) return <SpaciousActiveWorkStrip state={state} />;
	return <ComfortableActiveWorkStrip state={state} />;
}

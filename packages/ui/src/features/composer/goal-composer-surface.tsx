import type { Goal, GoalStatus } from "@fraym/driver";
import { memo, type ReactNode, useEffect, useState } from "react";
import { Modal } from "../../elements/popover";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";

export interface GoalComposerSurfaceProps {
	readonly goal?: Goal | null;
	readonly disabled?: boolean;
	readonly onEditGoal?: (objective: string) => void;
	readonly onPauseGoal?: () => void;
	readonly onResumeGoal?: () => void;
	readonly onClearGoal?: () => void;
}

interface ActiveGoalComposerSurfaceProps extends Omit<GoalComposerSurfaceProps, "goal"> {
	readonly goal: Goal;
}

function compactNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
	return value.toLocaleString();
}

function fullNumber(value: number): string {
	return value.toLocaleString();
}

function formatDuration(seconds: number): string {
	const safe = Math.max(0, Math.floor(seconds));
	if (safe >= 3600) {
		const hours = Math.floor(safe / 3600);
		const minutes = Math.floor((safe % 3600) / 60);
		return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	}
	if (safe >= 60) {
		const minutes = Math.floor(safe / 60);
		const rest = safe % 60;
		return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
	}
	return `${safe}s`;
}

function useLiveGoalSeconds(goal: Goal): number {
	const [elapsed, setElapsed] = useState(goal.timeUsedSeconds);
	useEffect(() => {
		setElapsed(goal.timeUsedSeconds);
		if (goal.status !== "active" && goal.status !== "budget-limited") return;
		const started = Date.now();
		const id = window.setInterval(() => {
			setElapsed(goal.timeUsedSeconds + Math.floor((Date.now() - started) / 1000));
		}, 1000);
		return () => window.clearInterval(id);
	}, [goal.status, goal.timeUsedSeconds]);
	return elapsed;
}

function statusLabel(status: GoalStatus): string {
	switch (status) {
		case "paused":
			return "Goal paused";
		case "budget-limited":
			return "Budget limited";
		case "complete":
			return "Goal complete";
		case "dropped":
			return "Goal cleared";
		case "active":
			return "Pursuing goal";
	}
}

function statusTone(status: GoalStatus): string {
	switch (status) {
		case "budget-limited":
			return "text-fr-warn";
		case "complete":
			return "text-fr-add";
		case "dropped":
			return "text-fr-text-3";
		case "paused":
			return "text-fr-blue";
		case "active":
			return "text-fr-text";
	}
}

function progressTone(status: GoalStatus): string {
	if (status === "budget-limited") return "bg-fr-warn";
	if (status === "complete") return "bg-fr-add";
	if (status === "paused" || status === "dropped") return "bg-fr-text-3";
	return "bg-fr-accent";
}

function GoalMetric({ goal }: { readonly goal: Goal }) {
	if (goal.tokenBudget === undefined) {
		return <span className="shrink-0 text-fr-text-3">{compactNumber(goal.tokensUsed)} tokens</span>;
	}
	const remaining = Math.max(0, goal.tokenBudget - goal.tokensUsed);
	return (
		<span className="shrink-0 text-fr-text-3" title={`${fullNumber(remaining)} tokens left`}>
			{compactNumber(goal.tokensUsed)} / {compactNumber(goal.tokenBudget)}
		</span>
	);
}

function GoalProgress({ goal }: { readonly goal: Goal }) {
	if (goal.tokenBudget === undefined) return null;
	const percent = Math.min(100, Math.max(0, (goal.tokensUsed / goal.tokenBudget) * 100));
	return (
		<div className="absolute inset-x-3 bottom-0 h-px overflow-hidden bg-fr-surface-3">
			<div
				className={cn("h-full transition-[width] duration-500", progressTone(goal.status))}
				style={{ width: `${percent}%` }}
			/>
		</div>
	);
}

function SurfaceButton({
	label,
	disabled,
	onClick,
	children,
}: {
	readonly label: string;
	readonly disabled?: boolean;
	readonly onClick?: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled || !onClick}
			onClick={onClick}
			className="flex size-6 shrink-0 items-center justify-center rounded-full text-fr-text-3 transition-colors hover:bg-fr-surface-3 hover:text-fr-text disabled:cursor-default disabled:opacity-35"
		>
			{children}
		</button>
	);
}

function GoalEditDialog({
	goal,
	onCancel,
	onSave,
}: {
	readonly goal: Goal;
	readonly onCancel: () => void;
	readonly onSave: (objective: string) => void;
}) {
	const [value, setValue] = useState(goal.objective);
	const trimmed = value.trim();
	return (
		<Modal onClose={onCancel} aria-label="Edit goal" className="w-[min(420px,calc(100vw-32px))]">
			<div className="p-5">
				<div className="mb-4 flex items-start gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-fr-surface-2 text-fr-accent">
						<Icon name="pin" size={17} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-fr-base font-semibold text-fr-text">Edit goal</div>
						<div className="mt-1 font-secondary text-fr-xs text-fr-text-3">
							Update the objective the agent is pursuing.
						</div>
					</div>
					<button
						type="button"
						className="text-fr-text-3 hover:text-fr-text"
						onClick={onCancel}
						aria-label="Close"
					>
						<Icon name="x" size={15} />
					</button>
				</div>
				<textarea
					value={value}
					onChange={event => setValue(event.target.value)}
					className="min-h-[190px] w-full resize-none rounded-[12px] border border-fr-accent-line bg-fr-bg px-3 py-3 text-fr-sm leading-relaxed text-fr-text outline-none placeholder:text-fr-text-3 focus:border-fr-accent"
					autoFocus
				/>
				<div className="mt-3 flex justify-end gap-2">
					<button
						type="button"
						className="rounded-[9px] bg-fr-surface-2 px-4 py-2 text-fr-sm text-fr-text hover:bg-fr-surface-3"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={!trimmed || trimmed === goal.objective.trim()}
						className="rounded-[9px] bg-fr-accent px-4 py-2 text-fr-sm text-fr-accent-ink hover:bg-fr-accent-2 disabled:cursor-default disabled:bg-fr-surface-3 disabled:text-fr-text-3"
						onClick={() => trimmed && onSave(trimmed)}
					>
						Save
					</button>
				</div>
			</div>
		</Modal>
	);
}

function ActiveGoalComposerSurface({
	goal,
	disabled,
	onEditGoal,
	onPauseGoal,
	onResumeGoal,
	onClearGoal,
}: ActiveGoalComposerSurfaceProps) {
	const [editing, setEditing] = useState(false);
	const elapsed = useLiveGoalSeconds(goal);
	const canResume = goal.status === "paused";
	return (
		<>
			<div
				data-slot="goal-composer-surface"
				className="relative z-10 mx-5 -mb-px flex min-h-9 items-center gap-2 rounded-t-[14px] border border-fr-border bg-fr-surface/95 px-3 py-2 shadow-[0_10px_26px_-22px_rgba(0,0,0,0.75)] backdrop-blur"
			>
				<Icon name="pin" size={14} className={cn("shrink-0", statusTone(goal.status))} />
				<span className={cn("shrink-0 text-fr-sm font-medium", statusTone(goal.status))}>
					{statusLabel(goal.status)}
				</span>
				<span className="min-w-0 flex-1 fr-overflow text-fr-sm text-fr-text-3">{goal.objective}</span>
				<span className="shrink-0 text-fr-text-3">•</span>
				<span className="shrink-0 font-secondary text-fr-xs text-fr-text-2">{formatDuration(elapsed)}</span>
				<GoalMetric goal={goal} />
				<div className="ml-1 flex shrink-0 items-center gap-0.5">
					<SurfaceButton label="Edit goal" disabled={disabled} onClick={() => setEditing(true)}>
						<Icon name="edit" size={13} />
					</SurfaceButton>
					<SurfaceButton
						label={canResume ? "Resume goal" : "Pause goal"}
						disabled={disabled}
						onClick={canResume ? onResumeGoal : onPauseGoal}
					>
						<Icon name={canResume ? "play" : "pause"} size={canResume ? 12 : 13} />
					</SurfaceButton>
					<SurfaceButton label="Clear goal" disabled={disabled} onClick={onClearGoal}>
						<Icon name="trash" size={13} />
					</SurfaceButton>
				</div>
				<GoalProgress goal={goal} />
			</div>
			{editing && (
				<GoalEditDialog
					goal={goal}
					onCancel={() => setEditing(false)}
					onSave={objective => {
						setEditing(false);
						onEditGoal?.(objective);
					}}
				/>
			)}
		</>
	);
}

export const GoalComposerSurface = memo(function GoalComposerSurface({ goal, ...props }: GoalComposerSurfaceProps) {
	if (!goal || goal.status === "complete" || goal.status === "dropped") return null;
	return <ActiveGoalComposerSurface goal={goal} {...props} />;
});

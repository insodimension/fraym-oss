// `goal` tool renderer — the scrollback/history card for goal-mode tool calls.
//
// The live goal affordance is `GoalComposerSurface`, pinned above the composer.
// This renderer records the individual `goal` tool call in history, matching the
// TUI details: op (`create` displayed as `set`), status badge, objective, tokens,
// elapsed time, no-active-goal warning, and completion report.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";

type GoalOperation = "create" | "get" | "complete" | "resume" | "drop";
type GoalState = "active" | "paused" | "budget-limited" | "complete" | "dropped";

interface GoalRecord {
	readonly id: string;
	readonly objective: string;
	readonly status: GoalState;
	readonly tokenBudget?: number;
	readonly tokensUsed: number;
	readonly timeUsedSeconds: number;
}

interface GoalDetails {
	readonly op: GoalOperation;
	readonly goal: GoalRecord | null;
	readonly remainingTokens: number | null;
	readonly completionBudgetReport: string | null;
}

function readObject(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function readNumberField(value: unknown, key: string): number | undefined {
	const field = readField(value, key);
	return typeof field === "number" && Number.isFinite(field) ? field : undefined;
}

function readGoalOperation(value: unknown): GoalOperation | undefined {
	return value === "create" || value === "get" || value === "complete" || value === "resume" || value === "drop"
		? value
		: undefined;
}

function readGoalState(value: unknown): GoalState | undefined {
	return value === "active" ||
		value === "paused" ||
		value === "budget-limited" ||
		value === "complete" ||
		value === "dropped"
		? value
		: undefined;
}

function readGoal(value: unknown): GoalRecord | null | undefined {
	if (value === null) return null;
	const status = readGoalState(readField(value, "status"));
	const objective = readStringField(value, "objective")?.trim();
	const tokensUsed = readNumberField(value, "tokensUsed");
	if (!status || !objective || tokensUsed === undefined) return undefined;
	return {
		id: readStringField(value, "id") ?? "goal",
		objective,
		status,
		tokenBudget: readNumberField(value, "tokenBudget"),
		tokensUsed,
		timeUsedSeconds: readNumberField(value, "timeUsedSeconds") ?? 0,
	};
}

function readInputOp(input: unknown): GoalOperation | undefined {
	return readGoalOperation(readField(input, "op"));
}

function readInputObjective(input: unknown): string | undefined {
	return readStringField(input, "objective")?.trim();
}

function readInputBudget(input: unknown): number | undefined {
	return readNumberField(input, "token_budget");
}

function readGoalDetails(output: unknown): GoalDetails | undefined {
	const details = readObject(readField(output, "details")) ?? readObject(output);
	if (!details) return undefined;
	const op = readGoalOperation(details.op);
	if (!op) return undefined;
	const goal = readGoal(details.goal);
	if (goal === undefined) return undefined;
	const remainingTokens = readField(details, "remainingTokens");
	const report = readStringField(details, "completionBudgetReport")?.trim();
	return {
		op,
		goal,
		remainingTokens: typeof remainingTokens === "number" && Number.isFinite(remainingTokens) ? remainingTokens : null,
		completionBudgetReport: report || null,
	};
}

function describeOp(op: GoalOperation | undefined): string {
	switch (op) {
		case "create":
			return "set";
		case "get":
			return "check";
		case "complete":
			return "complete";
		case "resume":
			return "resume";
		case "drop":
			return "drop";
		default:
			return "?";
	}
}

function pendingVerb(op: GoalOperation | undefined): string {
	switch (op) {
		case "create":
			return "Setting goal…";
		case "get":
			return "Checking goal…";
		case "complete":
			return "Completing goal…";
		case "resume":
			return "Resuming goal…";
		case "drop":
			return "Dropping goal…";
		default:
			return "Updating goal…";
	}
}

function formatNumber(value: number): string {
	return value.toLocaleString();
}

function compactNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
	return formatNumber(value);
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

function statusTone(status: GoalState | undefined): "accent" | "add" | "warn" | "mute" {
	switch (status) {
		case "complete":
			return "add";
		case "budget-limited":
			return "warn";
		case "paused":
		case "dropped":
			return "mute";
		case "active":
			return "accent";
		default:
			return "mute";
	}
}

function progressTone(status: GoalState): string {
	if (status === "complete") return "bg-fr-add";
	if (status === "budget-limited") return "bg-fr-warn";
	if (status === "paused" || status === "dropped") return "bg-fr-text-3";
	return "bg-fr-accent";
}

function tokenStat(goal: GoalRecord | null | undefined): string {
	if (!goal) return "no goal";
	if (goal.tokenBudget !== undefined) return `${compactNumber(goal.tokensUsed)} / ${compactNumber(goal.tokenBudget)}`;
	return `${compactNumber(goal.tokensUsed)} used`;
}

function GoalShell({ children }: { readonly children: ReactNode }) {
	return (
		<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
			{children}
		</ToolBodySection>
	);
}

function GoalPendingBody({ call }: { readonly call: ActiveToolCall }) {
	const op = readInputOp(call.input);
	const objective = readInputObjective(call.input);
	const budget = readInputBudget(call.input);
	return (
		<GoalShell>
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-primary text-fr-sm text-fr-text">{pendingVerb(op)}</span>
				<Badge variant="code" tone="accent">
					{describeOp(op)}
				</Badge>
				{budget !== undefined ? (
					<Badge variant="code" tone="blue">
						budget {formatNumber(budget)}
					</Badge>
				) : null}
			</div>
			{objective ? <div className="mt-1.5 font-primary text-fr-sm text-fr-text-3 italic">“{objective}”</div> : null}
		</GoalShell>
	);
}

function GoalNoGoalBody({ op }: { readonly op: GoalOperation | undefined }) {
	return (
		<GoalShell>
			<div className="flex items-center gap-2 font-primary text-fr-sm text-fr-warn">
				<span>No active goal.</span>
				<Badge variant="code" tone="warn">
					{describeOp(op)}
				</Badge>
			</div>
		</GoalShell>
	);
}

function GoalErrorBody({ text }: { readonly text: string }) {
	return (
		<GoalShell>
			<ToolBodyTerm lines={[["fail", text]]} />
		</GoalShell>
	);
}

function GoalSuccessBody({ details }: { readonly details: GoalDetails }) {
	const goal = details.goal;
	if (!goal) return <GoalNoGoalBody op={details.op} />;
	const bounded = goal.tokenBudget !== undefined;
	const remaining = bounded ? Math.max(0, details.remainingTokens ?? goal.tokenBudget - goal.tokensUsed) : null;
	const percent = bounded ? Math.min(100, Math.max(0, (goal.tokensUsed / goal.tokenBudget) * 100)) : 0;
	const tokenLine = bounded
		? `${formatNumber(goal.tokensUsed)} / ${formatNumber(goal.tokenBudget)} tokens (${formatNumber(remaining ?? 0)} left)`
		: `${formatNumber(goal.tokensUsed)} tokens`;
	return (
		<GoalShell>
			<div className="font-primary text-fr-sm text-fr-text-2 italic leading-relaxed">“{goal.objective}”</div>
			<div className="mt-2 grid gap-1.5">
				<div className="flex items-center justify-between gap-3 text-fr-text-3">
					<span>{tokenLine}</span>
					<Badge variant="code" tone={statusTone(goal.status)}>
						{goal.status}
					</Badge>
				</div>
				{bounded ? (
					<div className="h-1.5 overflow-hidden rounded-full bg-fr-surface-3">
						<div
							className={`h-full rounded-full ${progressTone(goal.status)}`}
							style={{ width: `${percent}%` }}
						/>
					</div>
				) : null}
				{goal.timeUsedSeconds > 0 ? (
					<div className="text-fr-text-3">{formatDuration(goal.timeUsedSeconds)} elapsed</div>
				) : null}
			</div>
			{details.completionBudgetReport ? (
				<div className="mt-2 border-l border-fr-border-soft pl-2 font-primary text-fr-xs text-fr-text-3 italic leading-relaxed">
					{details.completionBudgetReport}
				</div>
			) : null}
		</GoalShell>
	);
}

export const renderGoal: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readGoalDetails(call.output);
	const op = details?.op ?? readInputOp(call.input);
	const errorText = readResultContentText(call.output) ?? "Goal tool failed";
	const noGoal = call.status === "success" && details?.goal === null;
	let status: ToolStatus = "success";
	if (call.status === "running") status = "pending";
	if (call.status === "error") status = "error";
	if (noGoal) status = "warn";

	const badges: ReactNode[] = [
		<Badge key="op" variant="code" tone="accent">
			{describeOp(op)}
		</Badge>,
	];
	if (details?.goal) {
		badges.push(
			<Badge key="status" variant="code" tone={statusTone(details.goal.status)}>
				{details.goal.status}
			</Badge>,
		);
	}

	return {
		label: "Goal",
		kind: "goal",
		status,
		badges,
		stat: call.status === "running" ? "pending" : call.status === "error" ? "failed" : tokenStat(details?.goal),
		body:
			call.status === "running" ? (
				<GoalPendingBody call={call} />
			) : call.status === "error" ? (
				<GoalErrorBody text={errorText} />
			) : details ? (
				<GoalSuccessBody details={details} />
			) : (
				<GoalNoGoalBody op={op} />
			),
	};
};

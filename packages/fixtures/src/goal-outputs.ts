// Goal tool fixtures — goal-mode state outputs.
// Used by the kitchen-sink goal entry to build synthetic ActiveToolCalls.
//
// The Engine goal tool returns AgentToolResult details shaped as:
// `{ op, goal, remainingTokens, completionBudgetReport }`, where `goal`
// is the active/returned goal record or null.

export type GoalOperation = "create" | "get" | "complete" | "resume" | "drop";
export type GoalStatus = "active" | "paused" | "budget-limited" | "complete" | "dropped";

export type GoalVariation =
	| "create-active-budgeted"
	| "create-active-unbounded"
	| "get-active"
	| "get-paused"
	| "get-budget-limited"
	| "get-no-goal"
	| "resume-active"
	| "complete-with-report"
	| "drop-dropped"
	| "create-failed";

export const GOAL_VARIATIONS: readonly GoalVariation[] = [
	"create-active-budgeted",
	"create-active-unbounded",
	"get-active",
	"get-paused",
	"get-budget-limited",
	"get-no-goal",
	"resume-active",
	"complete-with-report",
	"drop-dropped",
	"create-failed",
];

interface GoalFixtureGoal {
	readonly id: string;
	readonly objective: string;
	readonly status: GoalStatus;
	readonly tokenBudget?: number;
	readonly tokensUsed: number;
	readonly timeUsedSeconds: number;
	readonly createdAt: number;
	readonly updatedAt: number;
}

interface GoalFixtureCase {
	readonly input: Record<string, unknown>;
	readonly details?: Record<string, unknown>;
	readonly outputText?: string;
}

const BASE_TIME = 1_780_840_000_000;

function goal(overrides: {
	readonly id: string;
	readonly objective: string;
	readonly status: GoalStatus;
	readonly tokenBudget?: number;
	readonly tokensUsed: number;
	readonly timeUsedSeconds?: number;
}): GoalFixtureGoal {
	return {
		id: overrides.id,
		objective: overrides.objective,
		status: overrides.status,
		tokenBudget: overrides.tokenBudget,
		tokensUsed: overrides.tokensUsed,
		timeUsedSeconds: overrides.timeUsedSeconds ?? 0,
		createdAt: BASE_TIME,
		updatedAt: BASE_TIME + Math.max(1, overrides.timeUsedSeconds ?? 0) * 1000,
	};
}

function details(
	op: GoalOperation,
	currentGoal: GoalFixtureGoal | null,
	completionBudgetReport?: string,
): Record<string, unknown> {
	return {
		op,
		goal: currentGoal,
		remainingTokens:
			currentGoal?.tokenBudget === undefined ? null : Math.max(0, currentGoal.tokenBudget - currentGoal.tokensUsed),
		completionBudgetReport: completionBudgetReport ?? null,
	};
}

function textFor(currentGoal: GoalFixtureGoal | null, completionBudgetReport?: string): string {
	if (!currentGoal) return "No active goal.";
	let text = `Goal: ${currentGoal.objective}\nStatus: ${currentGoal.status}\nTokens: ${currentGoal.tokensUsed} used`;
	if (currentGoal.tokenBudget !== undefined) text += ` / ${currentGoal.tokenBudget} budget`;
	if (currentGoal.tokenBudget !== undefined) {
		text += `\nRemaining tokens: ${Math.max(0, currentGoal.tokenBudget - currentGoal.tokensUsed)}`;
	}
	if (completionBudgetReport) text += `\n\n${completionBudgetReport}`;
	return text;
}

const ACTIVE_BUDGETED = goal({
	id: "goal-demo-active-budgeted",
	objective: "Ship the goal-mode renderer with TUI parity, fixtures, and Demo Dock replay",
	status: "active",
	tokenBudget: 50_000,
	tokensUsed: 12_400,
	timeUsedSeconds: 942,
});

const ACTIVE_UNBOUNDED = goal({
	id: "goal-demo-active-unbounded",
	objective: "Audit the docs tree and summarize drift before editing",
	status: "active",
	tokensUsed: 8_150,
	timeUsedSeconds: 318,
});

const PAUSED = goal({
	id: "goal-demo-paused",
	objective: "Resume the migration after the user confirms the rollout window",
	status: "paused",
	tokenBudget: 30_000,
	tokensUsed: 10_250,
	timeUsedSeconds: 600,
});

const BUDGET_LIMITED = goal({
	id: "goal-demo-budget-limited",
	objective: "Complete the regression sweep without exceeding the constrained budget",
	status: "budget-limited",
	tokenBudget: 15_000,
	tokensUsed: 15_750,
	timeUsedSeconds: 1_260,
});

const RESUMED = goal({
	id: "goal-demo-resumed",
	objective: "Finish the deferred schema cleanup after resuming goal mode",
	status: "active",
	tokenBudget: 35_000,
	tokensUsed: 14_100,
	timeUsedSeconds: 840,
});

const COMPLETED_REPORT =
	"Goal achieved. Report final budget usage to the user: tokens used: 27400 of 40000; time used: 1845 seconds.";
const COMPLETE = goal({
	id: "goal-demo-complete",
	objective: "Verify every goal renderer state and update the tracking table",
	status: "complete",
	tokenBudget: 40_000,
	tokensUsed: 27_400,
	timeUsedSeconds: 1_845,
});

const DROPPED = goal({
	id: "goal-demo-dropped",
	objective: "Discard the stale prototype once the production renderer ships",
	status: "dropped",
	tokenBudget: 20_000,
	tokensUsed: 7_800,
	timeUsedSeconds: 420,
});

const CASES: Record<GoalVariation, GoalFixtureCase> = {
	"create-active-budgeted": {
		input: { op: "create", objective: ACTIVE_BUDGETED.objective, token_budget: ACTIVE_BUDGETED.tokenBudget },
		details: details("create", ACTIVE_BUDGETED),
		outputText: textFor(ACTIVE_BUDGETED),
	},
	"create-active-unbounded": {
		input: { op: "create", objective: ACTIVE_UNBOUNDED.objective },
		details: details("create", ACTIVE_UNBOUNDED),
		outputText: textFor(ACTIVE_UNBOUNDED),
	},
	"get-active": {
		input: { op: "get" },
		details: details("get", ACTIVE_BUDGETED),
		outputText: textFor(ACTIVE_BUDGETED),
	},
	"get-paused": {
		input: { op: "get" },
		details: details("get", PAUSED),
		outputText: textFor(PAUSED),
	},
	"get-budget-limited": {
		input: { op: "get" },
		details: details("get", BUDGET_LIMITED),
		outputText: textFor(BUDGET_LIMITED),
	},
	"get-no-goal": {
		input: { op: "get" },
		details: details("get", null),
		outputText: textFor(null),
	},
	"resume-active": {
		input: { op: "resume" },
		details: details("resume", RESUMED),
		outputText: textFor(RESUMED),
	},
	"complete-with-report": {
		input: { op: "complete" },
		details: details("complete", COMPLETE, COMPLETED_REPORT),
		outputText: textFor(COMPLETE, COMPLETED_REPORT),
	},
	"drop-dropped": {
		input: { op: "drop" },
		details: details("drop", DROPPED),
		outputText: textFor(DROPPED),
	},
	"create-failed": {
		input: { op: "create", objective: "Start a duplicate goal", token_budget: 10_000 },
		details: undefined,
		outputText: "Error: cannot create a new goal because this session already has a goal",
	},
};

export const GOAL_INPUT: Record<GoalVariation, Record<string, unknown>> = Object.fromEntries(
	GOAL_VARIATIONS.map(variation => [variation, CASES[variation].input]),
) as Record<GoalVariation, Record<string, unknown>>;

export const GOAL_DETAILS: Record<GoalVariation, Record<string, unknown> | undefined> = Object.fromEntries(
	GOAL_VARIATIONS.map(variation => [variation, CASES[variation].details]),
) as Record<GoalVariation, Record<string, unknown> | undefined>;

export const GOAL_OUTPUT_TEXT: Record<GoalVariation, string | undefined> = Object.fromEntries(
	GOAL_VARIATIONS.map(variation => [variation, CASES[variation].outputText]),
) as Record<GoalVariation, string | undefined>;

export const GOAL_ERROR_OUTPUT_TEXT = "Error: Goal mode is not active.";

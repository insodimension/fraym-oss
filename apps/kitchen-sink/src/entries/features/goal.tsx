import {
	createGoalDemoDriver,
	GOAL_DEMO_SESSION_REF,
	GOAL_DETAILS,
	GOAL_ERROR_OUTPUT_TEXT,
	GOAL_INPUT,
	GOAL_OUTPUT_TEXT,
	GOAL_VARIATIONS,
	type GoalVariation,
	optionalToolResult,
	pendingToolCall,
} from "@fraym/fixtures";
import { type ActiveToolCall, Composer, GoalComposerSurface } from "@fraym/ui";
import type { ComponentProps } from "react";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	type ToolPreviewView,
	ToolVariationGrid,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

type GoalPreviewState = "success" | "running" | "error";
type GoalPreviewGoal = ComponentProps<typeof GoalComposerSurface>["goal"];

const STATES: readonly GoalPreviewState[] = ["success", "running", "error"];
const VIEWS: readonly ToolPreviewView[] = ["collapsed", "comfortable", "compact", "spacious"];

const INPUT_MAP = GOAL_INPUT as Record<GoalVariation, Record<string, unknown>>;
const DETAILS_MAP = GOAL_DETAILS as Record<GoalVariation, Record<string, unknown> | undefined>;
const OUTPUT_MAP = GOAL_OUTPUT_TEXT as Record<GoalVariation, string | undefined>;

function buildGoalCall(variation: GoalVariation, state: GoalPreviewState): ActiveToolCall {
	const callId = `goal-${variation}-${state}`;
	const input = INPUT_MAP[variation] ?? { op: "get" };
	if (state === "running") return pendingToolCall(callId, "goal", input);
	if (state === "error" || variation === "create-failed") {
		return {
			callId,
			toolName: "goal",
			input,
			status: "error",
			output: optionalToolResult(OUTPUT_MAP[variation] ?? GOAL_ERROR_OUTPUT_TEXT, DETAILS_MAP[variation], true),
		};
	}
	return {
		callId,
		toolName: "goal",
		input,
		status: "success",
		output: optionalToolResult(OUTPUT_MAP[variation], DETAILS_MAP[variation], false),
	};
}

function previewGoal(variation: GoalVariation): GoalPreviewGoal {
	return (DETAILS_MAP[variation]?.goal as GoalPreviewGoal | undefined) ?? null;
}

const GOAL_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: GOAL_VARIATIONS, default: "create-active-budgeted" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function GoalEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, GOAL_VARIATIONS, "create-active-budgeted");
	const state = selectControlValue(values.state, STATES, "success");
	const view = toolPreviewView(values.view);
	const mainCall = buildGoalCall(variation, state);
	const goal = previewGoal(variation);

	return (
		<Demo
			summary="`goal` has two production surfaces: a Codex-like strip pinned above the composer for the live goal, plus a history card for individual goal tool calls. All fixture data comes from @fraym/fixtures; this entry only assembles synthetic ActiveToolCalls."
			importPath="@fraym/ui · GoalComposerSurface + DEFAULT_TOOL_RENDERERS.goal"
			controls={panel}
			stage="stretch"
		>
			<Composer
				value=""
				onChange={() => undefined}
				onSubmit={() => undefined}
				placeholder="Ask for follow-up changes"
				topSlot={
					<GoalComposerSurface
						goal={goal}
						onEditGoal={() => undefined}
						onPauseGoal={() => undefined}
						onResumeGoal={() => undefined}
						onClearGoal={() => undefined}
					/>
				}
				className="px-0 pb-4 pt-0"
			/>
			<ToolMainPreview keySeed={`${view}-${state}-${variation}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all goal variations"
				view={view}
				items={GOAL_VARIATIONS}
				active={variation}
				buildCall={item => buildGoalCall(item, item === "create-failed" ? "error" : "success")}
			/>
		</Demo>
	);
}

const goalDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS, Composer, GoalComposerSurface } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// goal has TWO production surfaces:",
			"//  1. GoalComposerSurface — the live-goal strip pinned above the Composer.",
			"//  2. DEFAULT_TOOL_RENDERERS.goal — a history card per goal tool call.",
			"<Composer topSlot={<GoalComposerSurface goal={goal} onEditGoal={...} />} />",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The goal tool call the card renders:",
			"// {",
			'//   toolName: "goal",',
			"//   input:  { op, objective?, token_budget? },",
			"//   output: { content, details: { op, goal, remainingTokens, completionBudgetReport } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"// goal record = { id, objective, status, tokenBudget?, tokensUsed, timeUsedSeconds, createdAt, updatedAt }",
			"// status is one of active / paused / budget-limited / complete / dropped.",
			"//",
			"// Head: the op + goal status. Body: the objective, a tokens-used / budget gauge",
			"// (remainingTokens), and the completion budget report when the goal completes.",
		].join("\n"),
	),
	examples: [
		{
			label: "Create a budgeted goal",
			code: JSON.stringify(
				'{ op: "create", objective: "Ship the goal-mode renderer with TUI parity", token_budget: 50000 }',
			),
		},
		{
			label: "Get the active goal",
			code: JSON.stringify('{ op: "get" }'),
		},
		{
			label: "Complete (with budget report)",
			code: JSON.stringify('{ op: "complete" }  // output.details.completionBudgetReport summarizes tokens + time'),
		},
		{
			label: "Create when one exists (error)",
			code: JSON.stringify(
				'// status: "error" -> "Error: cannot create a new goal because this session already has a goal"',
			),
		},
	],
	api: [
		{
			name: "op",
			type: '"create" | "get" | "complete" | "resume" | "drop"',
			required: true,
			description: "The goal operation to perform.",
		},
		{
			name: "objective",
			type: "string",
			description: "The goal text; required for op create.",
		},
		{
			name: "token_budget",
			type: "number",
			description: "Optional token budget for op create; drives the remaining-tokens gauge.",
		},
		{
			name: "output.details.goal",
			type: "GoalRecord | null",
			description:
				"The active/returned goal: id, objective, status, tokenBudget, tokensUsed, timeUsedSeconds. Null when there is no goal.",
		},
		{
			name: "output.details.remainingTokens",
			type: "number | null",
			description: "tokenBudget minus tokensUsed; null when the goal is unbounded.",
		},
		{
			name: "output.details.completionBudgetReport",
			type: "string | null",
			description: "Final budget summary (tokens + time) reported on completion.",
		},
	],
};

export const goalEntries: readonly ShowcaseEntry[] = [
	{
		id: "goal-tool",
		name: "Goal",
		Component: GoalEntry,
		config: GOAL_CONFIG,
		docs: goalDocs,
		demo: {
			createDriver: createGoalDemoDriver,
			sessionRef: GOAL_DEMO_SESSION_REF,
			title: "goal · live conversation",
		},
	},
];

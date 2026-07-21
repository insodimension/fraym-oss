// Goal demo script — a `goal`-focused conversation expressed as
// pure session-driver events. Replayed through @fraym-ai/driver/mock so the
// goal tool renders inside a real thread via the same renderer/sketch path.
//
// Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptStep } from "@fraym-ai/driver/mock";

import { GOAL_DETAILS, GOAL_INPUT, GOAL_OUTPUT_TEXT, type GoalVariation } from "./goal-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-goal",
	path: "/",
	displayName: "Fraym Goal Demo",
};

const REF: SessionRef = { workspaceId: "fraym-goal", sessionId: "demo-goal" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Goal mode demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 27_400, contextWindow: 200_000, percent: 0.137 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

function step(event: Record<string, unknown>, delayMs = 0): ScriptStep {
	return { event: event as never, delayMs };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function say(text: string): Record<string, unknown> {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, input: unknown): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName: "goal", input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function goalChanged(variation: GoalVariation | null): Record<string, unknown> {
	const details = variation ? GOAL_DETAILS[variation] : undefined;
	return { type: "goalChanged", goal: details?.goal ?? null };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function userMessage(id: string, text: string): ScriptStep {
	return step({
		type: "queuedMessageStarted",
		message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW },
	});
}

function goalOutput(variation: keyof typeof GOAL_OUTPUT_TEXT): unknown {
	return toolResult(GOAL_OUTPUT_TEXT[variation] ?? "No active goal.", GOAL_DETAILS[variation]);
}

function goalPhase(
	message: string,
	callId: string,
	variation: GoalVariation,
	opts: { think?: number; run?: number; goalState?: GoalVariation | null } = {},
): ScriptStep[] {
	const steps = [
		step(verb(message), 240),
		step(toolStart(callId, GOAL_INPUT[variation]), opts.think ?? 280),
		step(toolDone(callId, goalOutput(variation), true), opts.run ?? 360),
	];
	if ("goalState" in opts) steps.push(step(goalChanged(opts.goalState ?? null), 40));
	return steps;
}

const INTRO: ScriptStep[] = [
	step(say("I'll put this session into goal mode, monitor the budget, and then complete the goal once verified.")),
	...goalPhase("Creating a bounded goal…", "goal-demo-create", "create-active-budgeted", {
		goalState: "create-active-budgeted",
	}),
	step(say("Goal mode is active with a 50k-token budget.")),
	...goalPhase("Checking budget pressure…", "goal-demo-budget", "get-budget-limited", {
		goalState: "get-budget-limited",
	}),
	step(say("The goal is budget-limited, so I need to finish or ask for a budget change.")),
	...goalPhase("Completing the verified goal…", "goal-demo-complete", "complete-with-report", { goalState: null }),
	step(say("Goal completed. The budget report is attached to the tool result.")),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	userMessage("msg-2", "is there still an active goal?"),
	step(say("I'll check the goal state.")),
	...goalPhase("Checking active goal…", "goal-demo-get-empty", "get-no-goal", { goalState: null }),
	step(say("There is no active goal now.")),
	step(completed()),
];

export const goalDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

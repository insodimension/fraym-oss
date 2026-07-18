// Calc demo script — a `calc`-focused conversation expressed as
// pure session-driver events. Replayed through @fraym/driver/mock so the
// calculator tool renders inside a real thread via the production renderer
// (`renderCalc`). Walks two expressions: simple arithmetic and string concat.
//
// Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";

import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-calc",
	path: "/",
	displayName: "Fraym Calc Demo",
};

const REF: SessionRef = { workspaceId: "fraym-calc", sessionId: "demo-calc" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Calculator demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 2_100, contextWindow: 200_000, percent: 0.0105 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers -------------------------------------------------

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
	return { type: "toolStarted", callId, toolName: "calc", input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
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

function calcPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 320),
		step(toolDone(callId, output, true), opts.run ?? 360),
	];
}

// --- demo script ------------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(say("Let me calculate some expressions for you.")),
	...calcPhase("Computing 42 × 2…", "calc-demo-1", { expression: "42 * 2" }, toolResult("42 * 2 = 84")),
	step(say("The answer is 84.")),
	...calcPhase(
		"Concatenating strings…",
		"calc-demo-2",
		{ expression: '"hello" + " world"' },
		toolResult('"hello" + " world" = hello world'),
	),
	step(say('String concatenation joins "hello" and " world" into "hello world".')),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	userMessage("msg-2", "what's the square root of 144 divided by 3?"),
	step(say("Let me compute that.")),
	...calcPhase(
		"Computing Math.sqrt(144) / 3…",
		"calc-demo-3",
		{ expression: "Math.sqrt(144) / 3" },
		toolResult("Math.sqrt(144) / 3 = 4"),
	),
	step(say("The square root of 144 divided by 3 equals 4.")),
	step(completed()),
];

export const calcDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

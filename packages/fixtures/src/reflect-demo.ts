import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";
import { REFLECT_DETAILS, REFLECT_INPUT, REFLECT_OUTPUT_TEXT } from "./reflect-outputs";
import { optionalToolResult, toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-reflect",
	path: "/",
	displayName: "Reflect Demo",
};
const REF: SessionRef = { workspaceId: "fraym-reflect", sessionId: "demo-reflect" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "reflect · memory answers",
	status: "idle",
	updatedAt: NOW,
	config: undefined,
};

function step(event: Record<string, unknown>, delayMs = 0): ScriptStep {
	return { event: event as never, delayMs };
}

function say(text: string): Record<string, unknown> {
	return { type: "assistantDelta", text };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function toolStart(callId: string, input: unknown): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName: "reflect", input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function reflectPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	success = true,
	think = 420,
): ScriptStep[] {
	return [step(verb(message)), step(toolStart(callId, input), think), step(toolDone(callId, output, success), 260)];
}

const INTRO: ScriptStep[] = [
	step(say("I'll reflect on prior project memory before answering.")),
	...reflectPhase(
		"Reflecting on tool-card decisions…",
		"reflect-1",
		REFLECT_INPUT.answer,
		toolResult(REFLECT_OUTPUT_TEXT.answer ?? "", REFLECT_DETAILS.answer),
	),
	step(
		say(
			"Memory says tool renderers should stay pure and return ToolView objects; shared chrome belongs to the card shell.",
		),
	),
	...reflectPhase(
		"Reflecting on legacy memory migration…",
		"reflect-2",
		REFLECT_INPUT.error,
		optionalToolResult(REFLECT_OUTPUT_TEXT.error, REFLECT_DETAILS.error, true),
		false,
		360,
	),
	step(
		say(
			"That second lookup failed because the memory index is unavailable; the first answer is still grounded in the reflected sources.",
		),
	),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	step(
		say(
			"The reflect demo has one answered memory lookup and one error card. Use REFLECT_VARIATIONS.pending for the running state fixture.",
		),
	),
	step(completed()),
];

export const reflectDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptStep } from "@fraym-ai/driver/mock";
import { RETAIN_DETAILS, RETAIN_INPUT, RETAIN_OUTPUT_TEXT } from "./retain-outputs";
import { optionalToolResult, toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-retain",
	path: "/workspaces/fraym-retain",
	displayName: "Retain Demo",
};
const REF: SessionRef = { workspaceId: "fraym-retain", sessionId: "demo-retain" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "retain · store memories",
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
	return { type: "toolStarted", callId, toolName: "retain", input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function retainPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number; run?: number; success?: boolean } = {},
): ScriptStep[] {
	return [
		step(verb(message)),
		step(toolStart(callId, input), opts.think ?? 360),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 260),
	];
}

const WITH_ITEMS_OUTPUT = toolResult(
	RETAIN_OUTPUT_TEXT["with-items"] ?? "3 memories queued.",
	RETAIN_DETAILS["with-items"],
);

const EMPTY_OUTPUT = toolResult(RETAIN_OUTPUT_TEXT.empty ?? "0 memories stored.", RETAIN_DETAILS.empty);

const ERROR_OUTPUT = optionalToolResult(
	RETAIN_OUTPUT_TEXT.error ?? "Error: Memory backend is unavailable.",
	RETAIN_DETAILS.error,
	true,
);

const INTRO: ScriptStep[] = [
	step(say("I'll store the durable lessons from this renderer pass.")),
	...retainPhase("Storing memories…", "retain-1", RETAIN_INPUT["with-items"], WITH_ITEMS_OUTPUT, { think: 420 }),
	step(say("Queued 3 memories, including the renderer count contract and concise output wording.")),
	...retainPhase("Checking empty retain input…", "retain-2", RETAIN_INPUT.empty, EMPTY_OUTPUT, { think: 280 }),
	step(say("Empty input is handled as 0 stored memories.")),
	...retainPhase("Testing retain failure path…", "retain-3", RETAIN_INPUT.error, ERROR_OUTPUT, {
		think: 320,
		success: false,
	}),
	step(say("The memory backend failure is surfaced without pretending the item was stored.")),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	step(say("Retain demo complete: success, empty input, and failure states are all visible in the thread.")),
	step(completed()),
];

export const retainDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	speed: 1,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptStep } from "@fraym-ai/driver/mock";
import { createScriptedDriver } from "@fraym-ai/driver/mock";
import { LIST_DETAILS, LIST_INPUT, LIST_OUTPUT, SEND_DETAILS, SEND_INPUT, SEND_OUTPUT } from "./irc-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-irc", path: "/work/irc", displayName: "IRC Demo" };
export const REF: SessionRef = { workspaceId: "fraym-irc", sessionId: "demo-irc" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "irc · agent-to-agent messaging",
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

function toolStart(callId: string, input: unknown): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName: "irc", input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function ircPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number } = {},
): ScriptStep[] {
	return [step(verb(message)), step(toolStart(callId, input), opts.think ?? 300), step(toolDone(callId, output), 200)];
}

const INTRO: ScriptStep[] = [
	step(say("Let me check which agents are available.")),
	...ircPhase(
		"Listing live agents…",
		"irc-1",
		LIST_INPUT,
		toolResult(LIST_OUTPUT, LIST_DETAILS as unknown as Record<string, unknown>),
		{ think: 400 },
	),
	step(say("There are 3 agents online: Alex, Jo, and Parker. Let me ask Jo to review the pipeline results.")),
	...ircPhase(
		"Sending message to Jo…",
		"irc-2",
		SEND_INPUT,
		toolResult(SEND_OUTPUT, SEND_DETAILS as unknown as Record<string, unknown>),
		{ think: 600 },
	),
	step(say("Jo replied: Pipeline looks good — 48/50 tests passed. The 2 failures are known flaky ones.")),
	step(completed()),
];

const DEMO_SCRIPT: DemoScript = { snapshot: SNAPSHOT, intro: INTRO };

export function createIrcDemoDriver() {
	return createScriptedDriver(DEMO_SCRIPT);
}

export const IRC_DEMO_SESSION_REF = REF;

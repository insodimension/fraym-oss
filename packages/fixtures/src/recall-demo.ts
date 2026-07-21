import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptStep } from "@fraym-ai/driver/mock";
import { RECALL_DETAILS, RECALL_INPUT, RECALL_OUTPUT_TEXT } from "./recall-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-recall",
	path: "/",
	displayName: "Fraym Recall Demo",
};

const REF: SessionRef = { workspaceId: "fraym-recall", sessionId: "demo-recall" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Recall demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 4_800, contextWindow: 200_000, percent: 0.024 },
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
	return { type: "toolStarted", callId, toolName: "recall", input };
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

function recallOutput(variation: "found-results" | "no-results"): unknown {
	return toolResult(RECALL_OUTPUT_TEXT[variation] ?? "Found 0 relevant memories.", RECALL_DETAILS[variation]);
}

function recallPhase(
	message: string,
	callId: string,
	variation: "found-results" | "no-results",
	opts: { think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 220),
		step(toolStart(callId, RECALL_INPUT[variation]), opts.think ?? 360),
		step(toolDone(callId, recallOutput(variation)), opts.run ?? 360),
	];
}

const INTRO: ScriptStep[] = [
	step(say("I’ll recall relevant workspace memories before planning the renderer.")),
	...recallPhase("Recalling memories for tool renderer parity…", "recall-demo-1", "found-results", { think: 520 }),
	step(
		say("I found 3 relevant notes: keep tool renderers UI-free, cover all card states, and follow the TUI as truth."),
	),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	userMessage("msg-2", "do we have anything about deprecated swarm card flags?"),
	step(say("I’ll check memory for that exact topic.")),
	...recallPhase("Recalling memories for deprecated swarm card flags…", "recall-demo-2", "no-results", { think: 420 }),
	step(say("No matching memories were found for that topic.")),
	step(completed()),
];

export const recallDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

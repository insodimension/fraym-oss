import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptStep } from "@fraym-ai/driver/mock";
import { REWIND_DETAILS, REWIND_INPUT, REWIND_OUTPUT_TEXT } from "./rewind-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-rewind", path: "/", displayName: "Rewind Demo" };
const REF: SessionRef = { workspaceId: "fraym-rewind", sessionId: "demo-rewind" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "rewind · restore after checkpoint",
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

function toolStart(toolName: string, callId: string, input: unknown): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName, input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

const CHECKPOINT_INPUT = { report: "Capture a stable state before trying the risky migration." };
const CHECKPOINT_OUTPUT = "Checkpoint created. Stable state captured for rewind.";
const CHECKPOINT_DETAILS = {
	report: CHECKPOINT_INPUT.report,
	checkpointId: "checkpoint-rewind-demo",
	created: true,
};

const INTRO: ScriptStep[] = [
	step(say("I'll checkpoint the session before making a risky change, then rewind back to it.")),
	step(verb("Creating checkpoint…")),
	step(toolStart("checkpoint", "checkpoint-1", CHECKPOINT_INPUT), 350),
	step(toolDone("checkpoint-1", toolResult(CHECKPOINT_OUTPUT, CHECKPOINT_DETAILS)), 300),
	step(say("Checkpoint captured. Now I'll request a rewind to that stable point.")),
	step(verb("Rewinding to checkpoint…")),
	step(toolStart("rewind", "rewind-1", REWIND_INPUT.success), 350),
	step(
		toolDone(
			"rewind-1",
			toolResult(REWIND_OUTPUT_TEXT.success ?? "", REWIND_DETAILS.success as unknown as Record<string, unknown>),
		),
		300,
	),
	step(say("Rewind completed after the checkpoint; the report was captured with the rewind request.")),
	step(completed()),
];

export const rewindDemoScript: DemoScript = { snapshot: SNAPSHOT, intro: INTRO };

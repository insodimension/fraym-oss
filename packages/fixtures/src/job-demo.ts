import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";
import { createScriptedDriver } from "@fraym/driver/mock";
import { LIST_DETAILS, LIST_OUTPUT, POLL_DETAILS, POLL_OUTPUT } from "./job-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-job", path: "/work/job", displayName: "Job Demo" };
export const REF: SessionRef = { workspaceId: "fraym-job", sessionId: "demo-job" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "job · manage async background jobs",
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
	return { type: "toolStarted", callId, toolName: "job", input };
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

const LIST_INPUT = { list: true };

const INTRO: ScriptStep[] = [
	step(say("Let me check the status of your background jobs.")),
	step(verb("Listing background jobs…")),
	step(toolStart("job-1", LIST_INPUT), 400),
	step(toolDone("job-1", toolResult(LIST_OUTPUT, LIST_DETAILS as unknown as Record<string, unknown>)), 300),
	step(say("There are 4 jobs. One is still running (training a model), one failed, and 2 completed.")),
	step(verb("Polling running job…")),
	step(toolStart("job-2", { poll: ["job-running-1"] }), 300),
	step(toolDone("job-2", toolResult(POLL_OUTPUT, POLL_DETAILS as unknown as Record<string, unknown>)), 300),
	step(say("The model training job completed and 1 other job finished. All settled.")),
	step(completed()),
];

const DEMO_SCRIPT: DemoScript = { snapshot: SNAPSHOT, intro: INTRO };

export function createJobDemoDriver() {
	return createScriptedDriver(DEMO_SCRIPT);
}

export const JOB_DEMO_SESSION_REF = REF;

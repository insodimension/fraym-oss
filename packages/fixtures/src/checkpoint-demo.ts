// Checkpoint demo script — checkpoint followed by rewind during an investigation.
// Pure session-driver events replayed through @fraym/driver/mock.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";
import { createScriptedDriver } from "@fraym/driver/mock";
import { CHECKPOINT_DETAILS, CHECKPOINT_INPUT, CHECKPOINT_OUTPUT_TEXT } from "./checkpoint-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-checkpoint", path: "/", displayName: "Checkpoint Demo" };
const REF: SessionRef = { workspaceId: "fraym-checkpoint", sessionId: "demo-checkpoint" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "checkpoint · investigation rewind",
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

function toolStart(callId: string, toolName: string, input: unknown): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName, input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function toolPhase(
	message: string,
	callId: string,
	toolName: string,
	input: unknown,
	output: unknown,
	opts: { think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 220),
		step(toolStart(callId, toolName, input), opts.think ?? 320),
		step(toolDone(callId, output), opts.run ?? 360),
	];
}

const REWIND_REPORT =
	"Rewound to the checkpoint after confirming the renderer regression came from the investigation path.";

const INTRO: ScriptStep[] = [
	step(say("I'll checkpoint before digging into this regression.")),
	...toolPhase(
		"Creating checkpoint…",
		"checkpoint-1",
		"checkpoint",
		CHECKPOINT_INPUT.success,
		toolResult(
			CHECKPOINT_OUTPUT_TEXT.success ?? "Checkpoint created.",
			CHECKPOINT_DETAILS.success as Record<string, unknown>,
		),
		{ think: 420 },
	),
	step(say("Checkpoint is set. Now I'll inspect the suspicious path without committing to the changes.")),
	step(
		say("The investigation points at the experimental renderer path, so I'm rewinding back to the safe checkpoint."),
		360,
	),
	...toolPhase(
		"Rewinding to checkpoint…",
		"rewind-1",
		"rewind",
		{ report: REWIND_REPORT },
		toolResult("Rewound to checkpoint.", { rewound: true, report: REWIND_REPORT }),
		{ think: 520 },
	),
	step(say("Back at the checkpoint. The investigation notes are preserved in the rewind report.")),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	step(say("The demo flow creates a checkpoint during investigation, then rewinds after the investigation branch.")),
	step(completed()),
];

export const checkpointDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	speed: 1,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

export const CHECKPOINT_DEMO_SESSION_REF = REF;

export function createCheckpointDemoDriver() {
	return createScriptedDriver(checkpointDemoScript);
}

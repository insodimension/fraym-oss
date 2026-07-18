// Checkpoint tool fixtures — checkpoint creation states.
// Mirrors the resolve fixture shape: concrete cases first, derived maps below.

import { optionalToolResult, pendingToolCall, toolResult } from "./tool-call-utils";

export type CheckpointVariation = "pending" | "success";

interface CheckpointCase {
	readonly input: Record<string, unknown>;
	readonly details?: Record<string, unknown>;
	readonly outputText?: string | undefined;
	readonly call: unknown;
}

const CHECKPOINT_GOAL = "Investigate the renderer regression before editing";
const CHECKPOINT_STARTED_AT = "2026-06-08T12:06:00.000Z";
const CHECKPOINT_SUCCESS_TEXT = `Checkpoint created.\nGoal: ${CHECKPOINT_GOAL}`;

const CASES: Record<CheckpointVariation, CheckpointCase> = {
	pending: {
		input: { goal: CHECKPOINT_GOAL },
		outputText: undefined,
		call: pendingToolCall("checkpoint-pending", "checkpoint", { goal: CHECKPOINT_GOAL }),
	},
	success: {
		input: { goal: CHECKPOINT_GOAL },
		details: { goal: CHECKPOINT_GOAL, startedAt: CHECKPOINT_STARTED_AT },
		outputText: CHECKPOINT_SUCCESS_TEXT,
		call: {
			...pendingToolCall("checkpoint-success", "checkpoint", { goal: CHECKPOINT_GOAL }),
			status: "success" as const,
			output:
				optionalToolResult(CHECKPOINT_SUCCESS_TEXT, { goal: CHECKPOINT_GOAL, startedAt: CHECKPOINT_STARTED_AT }) ??
				toolResult(CHECKPOINT_SUCCESS_TEXT, { goal: CHECKPOINT_GOAL, startedAt: CHECKPOINT_STARTED_AT }),
		},
	},
};

export const CHECKPOINT_VARIATIONS: readonly CheckpointVariation[] = ["pending", "success"];

export const CHECKPOINT_INPUT: Record<CheckpointVariation, Record<string, unknown>> = Object.fromEntries(
	CHECKPOINT_VARIATIONS.map(variation => [variation, CASES[variation].input]),
) as Record<CheckpointVariation, Record<string, unknown>>;

export const CHECKPOINT_DETAILS: Record<CheckpointVariation, Record<string, unknown> | undefined> = Object.fromEntries(
	CHECKPOINT_VARIATIONS.map(variation => [variation, CASES[variation].details]),
) as Record<CheckpointVariation, Record<string, unknown> | undefined>;

export const CHECKPOINT_OUTPUT_TEXT: Record<CheckpointVariation, string | undefined> = Object.fromEntries(
	CHECKPOINT_VARIATIONS.map(variation => [variation, CASES[variation].outputText]),
) as Record<CheckpointVariation, string | undefined>;

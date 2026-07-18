// Retain tool fixtures — memory retention inputs and result details.
// Retain accepts `{ items: [{ content, context? }] }` and returns details shaped as `{ count? }`.

import { optionalToolResult, pendingToolCall, toolResult } from "./tool-call-utils";

export type RetainVariation = "with-items" | "empty" | "error" | "pending";

interface RetainCase {
	readonly id: RetainVariation;
	readonly input: Record<string, unknown>;
	readonly details?: Record<string, unknown> | undefined;
	readonly outputText?: string | undefined;
	readonly preview: unknown;
}

const RETAIN_CASES = [
	{
		id: "with-items",
		input: {
			items: [
				{
					content: "Retain renderer shows each stored memory as a bullet in the tool body.",
					context: "tool-card parity",
				},
				{
					content: "Memory cards use the count from details when the backend reports one.",
					context: "renderer contract",
				},
				{ content: "Keep retain output text short: either stored or queued.", context: "fixture guidance" },
			],
		},
		details: { count: 3 },
		outputText: "3 memories queued.",
		preview: toolResult("3 memories queued.", { count: 3 }),
	},
	{
		id: "empty",
		input: { items: [] },
		details: { count: 0 },
		outputText: "0 memories stored.",
		preview: toolResult("0 memories stored.", { count: 0 }),
	},
	{
		id: "error",
		input: { items: [{ content: "Persist this lesson after the run completes.", context: "hindsight" }] },
		details: { count: 0 },
		outputText: "Error: Memory backend is unavailable.",
		preview: optionalToolResult("Error: Memory backend is unavailable.", { count: 0 }, true),
	},
	{
		id: "pending",
		input: {
			items: [
				{ content: "Stash the user's preferred renderer density.", context: "preferences" },
				{ content: "Remember that retain pending state says storing memories.", context: "tool-card parity" },
			],
		},
		details: undefined,
		outputText: undefined,
		preview: pendingToolCall("retain-pending", "retain", {
			items: [
				{ content: "Stash the user's preferred renderer density.", context: "preferences" },
				{ content: "Remember that retain pending state says storing memories.", context: "tool-card parity" },
			],
		}),
	},
] as const satisfies readonly RetainCase[];

export const RETAIN_VARIATIONS: readonly RetainVariation[] = RETAIN_CASES.map(retainCase => retainCase.id);

export const RETAIN_INPUT: Record<RetainVariation, Record<string, unknown>> = Object.fromEntries(
	RETAIN_CASES.map(retainCase => [retainCase.id, retainCase.input]),
) as unknown as Record<RetainVariation, Record<string, unknown>>;

export const RETAIN_DETAILS: Record<RetainVariation, Record<string, unknown> | undefined> = Object.fromEntries(
	RETAIN_CASES.map(retainCase => [retainCase.id, retainCase.details]),
) as Record<RetainVariation, Record<string, unknown> | undefined>;

export const RETAIN_OUTPUT_TEXT: Record<RetainVariation, string | undefined> = Object.fromEntries(
	RETAIN_CASES.map(retainCase => [retainCase.id, retainCase.outputText]),
) as Record<RetainVariation, string | undefined>;

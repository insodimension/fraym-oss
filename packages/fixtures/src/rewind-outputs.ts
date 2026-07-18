// Rewind tool fixtures — session rewind requests after checkpoints.
// Used by the kitchen-sink rewind entry to build synthetic ActiveToolCalls.
//
// Rewind takes `{ report: string }` and returns details shaped as
// `{ report: string, rewound: boolean }`.

import { optionalToolResult, pendingToolCall, toolResult } from "./tool-call-utils";

export type RewindVariation = "success" | "error" | "running";

export const REWIND_VARIATIONS: readonly RewindVariation[] = ["success", "error", "running"];

interface RewindFixtureCase {
	readonly input: { readonly report: string };
	readonly details?: { readonly report: string; readonly rewound: boolean };
	readonly outputText?: string | undefined;
	readonly result?: unknown;
	readonly pendingCall?: unknown;
}

const SUCCESS_REPORT = "Checkpoint verified; rewind to the last stable state before retrying the refactor.";
const ERROR_REPORT = "Rewind requested before any checkpoint was created.";
const RUNNING_REPORT = "Capture the current report and rewind once checkpoint recovery is ready.";

const SUCCESS_OUTPUT = "Rewind requested.\nReport captured: restored to the last checkpoint.";
const ERROR_OUTPUT = "Rewind requested.\nReport captured, but no checkpoint is available to rewind.";

const CASES: Record<RewindVariation, RewindFixtureCase> = {
	success: {
		input: { report: SUCCESS_REPORT },
		details: { report: SUCCESS_REPORT, rewound: true },
		outputText: SUCCESS_OUTPUT,
		result: toolResult(SUCCESS_OUTPUT, { report: SUCCESS_REPORT, rewound: true }),
	},
	error: {
		input: { report: ERROR_REPORT },
		details: { report: ERROR_REPORT, rewound: false },
		outputText: ERROR_OUTPUT,
		result: toolResult(ERROR_OUTPUT, { report: ERROR_REPORT, rewound: false }, true),
	},
	running: {
		input: { report: RUNNING_REPORT },
		outputText: undefined,
		result: optionalToolResult(undefined, undefined),
		pendingCall: pendingToolCall("rewind-running", "rewind", { report: RUNNING_REPORT }),
	},
};

export const REWIND_INPUT: Record<RewindVariation, { readonly report: string }> = Object.fromEntries(
	REWIND_VARIATIONS.map(variation => [variation, CASES[variation].input]),
) as Record<RewindVariation, { readonly report: string }>;

export const REWIND_DETAILS: Record<
	RewindVariation,
	{ readonly report: string; readonly rewound: boolean } | undefined
> = Object.fromEntries(REWIND_VARIATIONS.map(variation => [variation, CASES[variation].details])) as Record<
	RewindVariation,
	{ readonly report: string; readonly rewound: boolean } | undefined
>;

export const REWIND_OUTPUT_TEXT: Record<RewindVariation, string | undefined> = Object.fromEntries(
	REWIND_VARIATIONS.map(variation => [variation, CASES[variation].outputText]),
) as Record<RewindVariation, string | undefined>;

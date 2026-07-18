import { pendingToolCall, toolResult } from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import {
	BREAKPOINT_OUTPUT,
	CONTINUE_OUTPUT,
	INPUT as DEBUG_INPUT,
	ERROR_OUTPUT,
	EVALUATION_OUTPUT,
	LAUNCH_OUTPUT,
	SCOPES_OUTPUT,
	SESSIONS_OUTPUT,
	STACK_OUTPUT,
	STEP_OUTPUT,
	THREADS_OUTPUT,
	VARIABLES_OUTPUT,
} from "../../fixtures/debug-outputs";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	type ToolPreviewView,
	ToolVariationGrid,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `debug` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer
// (`renderDebug`, registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a
// synthetic `ActiveToolCall` built from the knobs. Debug shows a "Debug" head
// + an action badge (launch, stack_trace, evaluate, etc.) + output text on the
// term surface; session snapshot details render as a structured section when
// available.
//
// Axes (control knobs):
//   VARIATION  launch · breakpoint · stack · threads · scopes · variables · evaluate · continue · step · sessions
//   STATE      success · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation =
	| "launch"
	| "breakpoint"
	| "stack"
	| "threads"
	| "scopes"
	| "variables"
	| "evaluate"
	| "continue"
	| "step"
	| "sessions";
type DebugState = "success" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = [
	"launch",
	"breakpoint",
	"stack",
	"threads",
	"scopes",
	"variables",
	"evaluate",
	"continue",
	"step",
	"sessions",
];
const STATES: DebugState[] = ["success", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

function debugContent(variation: Variation): string {
	switch (variation) {
		case "launch":
			return LAUNCH_OUTPUT;
		case "breakpoint":
			return BREAKPOINT_OUTPUT;
		case "stack":
			return STACK_OUTPUT;
		case "threads":
			return THREADS_OUTPUT;
		case "scopes":
			return SCOPES_OUTPUT;
		case "variables":
			return VARIABLES_OUTPUT;
		case "evaluate":
			return EVALUATION_OUTPUT;
		case "continue":
			return CONTINUE_OUTPUT;
		case "step":
			return STEP_OUTPUT;
		case "sessions":
			return SESSIONS_OUTPUT;
	}
}

function debugInput(variation: Variation): Record<string, unknown> {
	return DEBUG_INPUT[variation] ?? { action: variation };
}

// ── synthetic call builder ────────────────────────────────────────────────────

type DebugCallBase = { readonly callId: string; readonly toolName: "debug"; readonly input: Record<string, unknown> };

function debugErrorCall(call: DebugCallBase): ActiveToolCall {
	return {
		...call,
		status: "error",
		output: toolResult(ERROR_OUTPUT, { action: call.input.action ?? "debug", success: false }, true),
	};
}

function debugSuccessCall(call: DebugCallBase, variation: Variation): ActiveToolCall {
	const text = debugContent(variation);
	return {
		...call,
		status: "success",
		output: toolResult(text, { action: call.input.action ?? variation, success: true }),
	};
}

/** Build the exact `ActiveToolCall` a live debug run produces, from the config knobs. */
function buildDebugCall(variation: Variation, state: DebugState): ActiveToolCall {
	const input = debugInput(variation);
	const base: DebugCallBase = { callId: `debug-${variation}-${state}`, toolName: "debug", input };

	if (state === "pending") return pendingToolCall(base.callId, "debug", input);
	if (state === "error") return debugErrorCall(base);
	return debugSuccessCall(base, variation);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

function debugMainCall(variation: Variation, state: DebugState): ActiveToolCall {
	return buildDebugCall(variation, state);
}

const DEBUG_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "launch" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function DebugEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "launch");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = debugMainCall(variation, state);

	return (
		<Demo
			summary="The `debug` tool card, rendered by the PRODUCTION renderer (renderDebug) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Debug shows a 'Debug' head + an action badge (launch, stack_trace, evaluate, etc.) + output text on the term surface; session snapshot details render in a structured section when available."
			importPath="entries/features/debug (live renderDebug)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildDebugCall(v, "success")}
			/>
		</Demo>
	);
}

const debugDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps debug -> renderDebug. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderDebug is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "debug",',
			"//   input:  { action, ...action-specific args },",
			"//   output: { content, details: { action, success } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			'// Head: "Debug" + an action badge (launch, set_breakpoint, stack_trace, evaluate, ...).',
			"// Body: action output text on the dark terminal surface — launch banner,",
			"// breakpoint confirmation, stack frames, threads, scopes/variables tables,",
			"// evaluate result, continue/step outcome, or sessions list. A failed run",
			"// (output.details.success === false) flips the card to the error tone.",
		].join("\n"),
	),
	examples: [
		{
			label: "Launch a session",
			code: JSON.stringify('{ action: "launch", program: "src/main.py", adapter: "debugpy" }'),
		},
		{
			label: "Set a breakpoint",
			code: JSON.stringify('{ action: "set_breakpoint", file: "src/main.py", line: 42 }'),
		},
		{
			label: "Evaluate an expression",
			code: JSON.stringify('{ action: "evaluate", expression: "2 * 21", context: "repl" }'),
		},
		{
			label: "Inspect variables",
			code: JSON.stringify('{ action: "variables", variable_ref: 1001 }'),
		},
	],
	api: [
		{
			name: "action",
			type: "string",
			required: true,
			description:
				"Debugger operation: launch, set_breakpoint, stack_trace, threads, scopes, variables, evaluate, continue, step_over, sessions. Rendered as the action badge.",
		},
		{
			name: "program",
			type: "string",
			description: "launch — entry file/program to run under the adapter.",
		},
		{
			name: "adapter",
			type: "string",
			description: "launch — debug adapter to drive (e.g. debugpy).",
		},
		{
			name: "file",
			type: "string",
			description: "set_breakpoint — source file the breakpoint belongs to.",
		},
		{
			name: "line",
			type: "number",
			description: "set_breakpoint — 1-based line for the breakpoint.",
		},
		{
			name: "frame_id",
			type: "number",
			description: "scopes — stack frame whose scopes to fetch.",
		},
		{
			name: "variable_ref",
			type: "number",
			description: "variables — variablesReference of the scope/object to expand.",
		},
		{
			name: "expression",
			type: "string",
			description: "evaluate — expression to evaluate in the paused context.",
		},
		{
			name: "context",
			type: "string",
			description: 'evaluate — evaluation context, e.g. "repl" or "watch".',
		},
		{
			name: "output.details.action",
			type: "string",
			description: "Echoes the executed action; drives the action badge.",
		},
		{
			name: "output.details.success",
			type: "boolean",
			description: "Whether the operation succeeded; false flips the card to the error tone.",
		},
	],
};

export const debugEntries: readonly ShowcaseEntry[] = [
	{
		id: "debug-tool",
		name: "Debug",
		Component: DebugEntry,
		config: DEBUG_CONFIG,
		docs: debugDocs,
	},
];

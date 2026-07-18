import {
	CALC_DEMO_SESSION_REF,
	CALC_INPUT,
	CALC_OUTPUT,
	type CalcVariation,
	createCalcDemoDriver,
	optionalToolResult,
	pendingToolCall,
} from "@fraym/fixtures";

import type { ActiveToolCall } from "@fraym/ui";
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
// `calc` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer
// (`renderCalc`, registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a
// synthetic `ActiveToolCall` built from the knobs. Calc shows a "Calculator"
// head + an expression badge + the expression→result body.
//
// Axes (control knobs):
//   VARIATION  simple · complex · string · error · pending
//   STATE      success · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = CalcVariation;
type CalcState = "success" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["simple", "complex", "string", "error", "pending"];
const STATES: CalcState[] = ["success", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

/** Cast CALC_INPUT to a plain record to avoid barrel type-collision issues. */
const INPUT_MAP = CALC_INPUT as Record<string, Record<string, unknown>>;
const OUTPUT_MAP = CALC_OUTPUT as Record<string, string | undefined>;

function calcInput(variation: Variation): Record<string, unknown> {
	return INPUT_MAP[variation] ?? { expression: "" };
}

// ── synthetic call builder ────────────────────────────────────────────────────

type CalcCallBase = {
	readonly callId: string;
	readonly toolName: "calc";
	readonly input: Record<string, unknown>;
};

function calcErrorCall(call: CalcCallBase): ActiveToolCall {
	return {
		...call,
		status: "error",
		output: optionalToolResult(OUTPUT_MAP.error ?? "Error", undefined, true),
	};
}

function calcSuccessCall(call: CalcCallBase, variation: Variation): ActiveToolCall {
	const text = OUTPUT_MAP[variation];
	if (text === undefined) {
		return pendingToolCall(call.callId, "calc", call.input);
	}
	return { ...call, status: "success", output: optionalToolResult(text, undefined) };
}

/** Build the exact `ActiveToolCall` a live calc run produces, from the config knobs. */
function buildCalcCall(variation: Variation, state: CalcState): ActiveToolCall {
	const callId = `calc-${variation}-${state}`;
	const input = calcInput(variation);
	const base: CalcCallBase = { callId, toolName: "calc", input };

	if (state === "pending") return pendingToolCall(callId, "calc", input);
	if (state === "error") return calcErrorCall(base);
	return calcSuccessCall(base, variation);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const CALC_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "simple" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function CalcEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "simple");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = buildCalcCall(variation, state);

	return (
		<Demo
			summary="The `calc` (Calculator) tool card, rendered by the PRODUCTION renderer (renderCalc) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Calc shows a 'Calculator' head + an expression badge + the expression→result body."
			importPath="entries/features/calc (live renderCalc)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildCalcCall(v, "success")}
			/>
		</Demo>
	);
}
const calcDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps calc -> renderCalc. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderCalc is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "calc",',
			"//   input:  { expression },",
			'//   output: { content: [{ type: "text", text: "<expression> = <result>" }], details: undefined },',
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			'// Head: "Calculator" + an expression badge.',
			"// Body: the expression -> result line parsed from output.content[].text.",
			"// calc carries no output.details. A failed evaluation flips the card to the",
			"// error tone (e.g. \"Error: Unexpected token ','\").",
		].join("\n"),
	),
	examples: [
		{
			label: "Simple arithmetic",
			code: JSON.stringify('{ expression: "2 + 2" }  // -> "2 + 2 = 4"'),
		},
		{
			label: "Complex expression",
			code: JSON.stringify('{ expression: "Math.sqrt(144) / 3" }  // -> "... = 4"'),
		},
		{
			label: "String concatenation",
			code: JSON.stringify('{ expression: "\\"hello\\" + \\" world\\"" }  // -> "... = hello world"'),
		},
		{
			label: "Evaluation error",
			code: JSON.stringify('{ expression: "JSON.parse([1,2,3])" }  // -> error tone'),
		},
	],
	api: [
		{
			name: "expression",
			type: "string",
			required: true,
			description:
				'Expression to evaluate; shown in the head badge and echoed in the result line. calc returns the formatted "<expression> = <result>" text and no output.details.',
		},
	],
};

export const calcEntries: readonly ShowcaseEntry[] = [
	{
		id: "calc-tool",
		name: "Calculator",
		Component: CalcEntry,
		config: CALC_CONFIG,
		docs: calcDocs,
		demo: {
			createDriver: createCalcDemoDriver,
			sessionRef: CALC_DEMO_SESSION_REF,
			title: "calc · live conversation",
		},
	},
];

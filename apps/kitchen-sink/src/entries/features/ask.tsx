import { ASK_DETAILS, ASK_INPUT, type AskVariation, optionalToolResult, pendingToolCall } from "@fraym/fixtures";
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
// `ask` tool showcase.
//
// Rendered by the PRODUCTION renderer (`renderAsk`, registered in
// @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`.
//
// Axes (control knobs):
//   VARIATION  single · multi-select · with-description · multi-part · custom-input · error · pending
//   STATE      success · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = AskVariation;
type AskState = "success" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = [
	"single",
	"multi-select",
	"with-description",
	"multi-part",
	"custom-input",
	"error",
	"pending",
];
const STATES: AskState[] = ["success", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

/** Cast to plain records to avoid barrel type-collision issues. */
const INPUT_MAP = ASK_INPUT as Record<string, Record<string, unknown>>;
const DETAILS_MAP = ASK_DETAILS as Record<string, Record<string, unknown> | undefined>;

function askInput(variation: Variation): Record<string, unknown> {
	return INPUT_MAP[variation] ?? { questions: [] };
}

type AskCallBase = {
	readonly callId: string;
	readonly toolName: "ask";
	readonly input: Record<string, unknown>;
};

function askErrorCall(call: AskCallBase): ActiveToolCall {
	return {
		...call,
		status: "error",
		output: optionalToolResult("Error: questions must not be empty", {}, true),
	};
}

function askSuccessCall(call: AskCallBase, variation: Variation): ActiveToolCall {
	const details = DETAILS_MAP[variation];
	const text = details ? `User answered` : undefined;
	if (text === undefined) {
		return pendingToolCall(call.callId, "ask", call.input);
	}
	return { ...call, status: "success", output: optionalToolResult(text, details) };
}

function buildAskCall(variation: Variation, state: AskState): ActiveToolCall {
	const callId = `ask-${variation}-${state}`;
	const input = askInput(variation);
	const base: AskCallBase = { callId, toolName: "ask", input };

	if (state === "pending") return pendingToolCall(callId, "ask", input);
	if (state === "error") return askErrorCall(base);
	return askSuccessCall(base, variation);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const ASK_CONFIG: ControlsSchema = {
	variation: {
		kind: "select",
		label: "variation",
		options: VARIATIONS,
		default: "single",
	},
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function AskEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "single");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = buildAskCall(variation, state);

	return (
		<Demo
			summary="The `ask` (Ask) tool card, rendered by the PRODUCTION renderer (renderAsk) on a synthetic ActiveToolCall built from the knobs. Ask shows an 'Ask' head + question/option badges + the question→answer body."
			importPath="entries/features/ask (live renderAsk)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildAskCall(v, "success")}
			/>
		</Demo>
	);
}

const askDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps ask -> renderAsk. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderAsk is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "ask",',
			"//   input:  { questions: [{ id, question, options, multi?, recommended? }] },",
			"//   output: { content, details: { question, options, multi, selectedOptions, customInput? } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"// A multi-part ask instead carries output.details.results: one entry per question.",
			"//",
			"// Head: `Ask` + question/option count badges.",
			"// Body: each question with its options; once answered, the selected option(s)",
			"// are highlighted, the recommended option gets a Recommended badge, and any",
			"// free-text customInput is shown beneath.",
		].join("\n"),
	),
	examples: [
		{
			label: "Single choice (recommended)",
			code: JSON.stringify(
				'{ questions: [{ id: "q1", question: "What Rust web framework?", options: [{ label: "Axum", description: "Tokio ecosystem" }, { label: "Actix Web" }, { label: "Rocket" }], recommended: 0 }] }',
			),
		},
		{
			label: "Multi-select",
			code: JSON.stringify(
				'{ questions: [{ id: "q1", question: "Which features?", options: [{ label: "CLI interface" }, { label: "REST API" }, { label: "WebSocket support" }], multi: true }] }',
			),
		},
		{
			label: "Multi-part (several questions)",
			code: JSON.stringify(
				'{ questions: [{ id: "q1", question: "Experience level?", options: [{ label: "Beginner" }, { label: "Advanced" }] }, { id: "q2", question: "What are you building?", options: [{ label: "CLI tool" }, { label: "Web service" }] }] }',
			),
		},
		{
			label: "Free-text answer",
			code: JSON.stringify(
				"// output.details.customInput carries the user's typed answer alongside selectedOptions.",
			),
		},
	],
	api: [
		{
			name: "questions",
			type: "AskQuestion[]",
			required: true,
			description: "The prompts shown to the user; each is { id, question, options, multi?, recommended? }.",
		},
		{
			name: "questions[].question",
			type: "string",
			required: true,
			description: "The prompt text for a single question.",
		},
		{
			name: "questions[].options",
			type: "Array<{ label; description? }>",
			required: true,
			description: "Selectable choices; an optional description is shown under each label.",
		},
		{
			name: "questions[].multi",
			type: "boolean",
			default: "false",
			description: "Allow selecting several options for this question.",
		},
		{
			name: "questions[].recommended",
			type: "number",
			description: "Index of the suggested option; renders a Recommended badge.",
		},
		{
			name: "output.details.selectedOptions",
			type: "string[]",
			description: "The option label(s) the user picked.",
		},
		{
			name: "output.details.customInput",
			type: "string",
			description: "The user's free-text answer, when provided.",
		},
		{
			name: "output.details.results",
			type: "AskResult[]",
			description: "Per-question answers for a multi-part ask.",
		},
	],
};

export const askEntries: readonly ShowcaseEntry[] = [
	{
		id: "ask-tool",
		name: "Ask",
		Component: AskEntry,
		config: ASK_CONFIG,
		docs: askDocs,
	},
];

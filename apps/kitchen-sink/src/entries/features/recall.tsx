import {
	createRecallDemoDriver,
	pendingToolCall,
	RECALL_DEMO_SESSION_REF,
	RECALL_DETAILS,
	RECALL_INPUT,
	RECALL_OUTPUT_TEXT,
	RECALL_VARIATIONS,
} from "@fraym-ai/fixtures";
import type { ActiveToolCall } from "@fraym-ai/ui";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	ToolVariationGrid,
	toolPreviewControl,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

type State = "success" | "running" | "error";
const STATES: readonly State[] = ["success", "running", "error"];
const INPUT = RECALL_INPUT as Record<string, Record<string, unknown>>;
const VARS = RECALL_VARIATIONS as readonly string[];

function buildCall(variation: string, state: State): ActiveToolCall {
	const input = INPUT[variation] ?? { query: "?" };
	if (state === "running") return pendingToolCall(`rcl-${variation}`, "recall", input) as ActiveToolCall;
	const text = (RECALL_OUTPUT_TEXT as Record<string, string | undefined>)[variation] ?? "";
	const details = (RECALL_DETAILS as Record<string, Record<string, unknown> | undefined>)[variation];
	const isError = state === "error";
	return {
		callId: `rcl-${variation}`,
		toolName: "recall",
		input,
		status: isError ? "error" : "success",
		output: { content: [{ type: "text", text }], details: details ?? {}, isError },
	};
}

const CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARS, default: VARS[0] as string },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function Entry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARS, VARS[0] as string);
	const state = selectControlValue(values.state, STATES, "success");
	const view = toolPreviewView(values.view);
	return (
		<Demo
			summary="Recall memory tool card."
			importPath="@fraym-ai/ui · DEFAULT_TOOL_RENDERERS.recall"
			controls={panel}
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="recall variations"
				view={view}
				items={VARS}
				active={variation}
				buildCall={v => buildCall(v, "success")}
			/>
		</Demo>
	);
}

const recallDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps recall -> renderRecall. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderRecall receives the live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "recall",',
			"//   input:  { query },",
			"//   output: { content, details: { query, count, results, error? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: label `Recall`, the query as a code badge (clipped at 30 chars),",
			"// and a `<count> found` stat (`pending` / `failed` for those states).",
			"// Body: the recalled-memories text (whitespace preserved), or `No results.`",
			"// when the query matched nothing.",
		].join("\n"),
	),
	examples: [
		{
			label: "Found memories",
			code: JSON.stringify('{ query: "tool renderer parity" }'),
		},
		{
			label: "No matches",
			code: JSON.stringify('{ query: "deprecated swarm card flags" }  // count 0 -> body "No results."'),
		},
		{
			label: "Backend error",
			code: JSON.stringify('// status: "error" + output.details.error -> red fail line in the body'),
		},
		{
			label: "Pending lookup",
			code: JSON.stringify('// status: "running" -> head stat "pending", body "Recalling memories…"'),
		},
	],
	api: [
		{
			name: "query",
			type: "string",
			required: true,
			description: "Search text. Rendered in the head as a code badge, clipped to 30 chars.",
		},
		{
			name: "output.details.count",
			type: "number",
			description: "Number of matched memories; drives the `<count> found` head stat.",
		},
		{
			name: "output.details.results",
			type: "Array<{ id: string; score: number; source: string }>",
			description: "Matched memory references the backend returned for the query.",
		},
		{
			name: "output.details.error",
			type: "string",
			description: "Backend failure message; flips the card to the error tone.",
		},
	],
};

export const recallEntries: readonly ShowcaseEntry[] = [
	{
		id: "recall-tool",
		name: "Recall",
		Component: Entry,
		config: CONFIG,
		docs: recallDocs,
		demo: { createDriver: createRecallDemoDriver, sessionRef: RECALL_DEMO_SESSION_REF, title: "recall · memories" },
	},
];

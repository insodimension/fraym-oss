import {
	createReflectDemoDriver,
	pendingToolCall,
	REFLECT_DEMO_SESSION_REF,
	REFLECT_DETAILS,
	REFLECT_INPUT,
	REFLECT_OUTPUT_TEXT,
	REFLECT_VARIATIONS,
} from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import { ToolMainPreview, ToolVariationGrid, toolPreviewView } from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

type State = "success" | "running" | "error";
const STATES: readonly State[] = ["success", "running", "error"];
const INPUT = REFLECT_INPUT as Record<string, Record<string, unknown>>;
const VARS = REFLECT_VARIATIONS as readonly string[];

function buildCall(variation: string, state: State): ActiveToolCall {
	const input = INPUT[variation] ?? { query: "?" };
	if (state === "running") return pendingToolCall(`rfl-${variation}`, "reflect", input) as ActiveToolCall;
	const text = (REFLECT_OUTPUT_TEXT as Record<string, string | undefined>)[variation] ?? "";
	const details = (REFLECT_DETAILS as Record<string, Record<string, unknown> | undefined>)[variation];
	const isError = state === "error";
	return {
		callId: `rfl-${variation}`,
		toolName: "reflect",
		input,
		status: isError ? "error" : "success",
		output: { content: [{ type: "text", text }], details: details ?? {}, isError },
	};
}

const CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARS, default: VARS[0] as string },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: {
		kind: "select",
		label: "view",
		options: ["collapsed", "comfortable", "compact", "spacious"],
		default: "comfortable",
		scope: "display",
	},
};

function Entry() {
	const { values, panel } = useToolConfig();
	const variation = values.variation as string;
	const state = values.state as State;
	const view = toolPreviewView(values.view);
	return (
		<Demo
			summary="Reflect memory tool card."
			importPath="@fraym/ui · DEFAULT_TOOL_RENDERERS.reflect"
			controls={panel}
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="reflect variations"
				view={view}
				items={VARS}
				active={variation}
				buildCall={v => buildCall(v, "success")}
			/>
		</Demo>
	);
}

const reflectDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps reflect -> renderReflect. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderReflect receives the live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "reflect",',
			"//   input:  { query },",
			"//   output: { content, details: { confidence, matchedMemories, sources } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: label `Reflect`, the query as a code badge (clipped at 30 chars),",
			"// and a `done` stat (`pending` / `failed` for those states).",
			"// Body: the synthesized reflection text (whitespace preserved), or",
			"// `No reflection generated.` when the output is empty.",
		].join("\n"),
	),
	examples: [
		{
			label: "Reflect on a decision",
			code: JSON.stringify('{ query: "What did we decide about the tool-card renderer architecture?" }'),
		},
		{
			label: "Summarize prior choices",
			code: JSON.stringify('{ query: "Summarize prior decisions about slash-command discovery" }'),
		},
		{
			label: "Index unavailable",
			code: JSON.stringify('// status: "error" -> body "Reflect failed: memory index is unavailable."'),
		},
		{
			label: "Pending reflection",
			code: JSON.stringify('// status: "running" -> head stat "pending", body "Reflecting on memories…"'),
		},
	],
	api: [
		{
			name: "query",
			type: "string",
			required: true,
			description: "The question to reflect on. Rendered in the head as a code badge, clipped to 30 chars.",
		},
		{
			name: "output.content[].text",
			type: "string",
			description: "The synthesized reflection answer; rendered whitespace-preserved in the body.",
		},
		{
			name: "output.details.matchedMemories",
			type: "number",
			description: "How many stored memories the reflection drew on.",
		},
		{
			name: "output.details.sources",
			type: "string[]",
			description: "Source documents the reflection cited.",
		},
		{
			name: "output.details.error",
			type: "string",
			description: "Failure code (e.g. `memory_index_unavailable`) on the error path.",
		},
	],
};

export const reflectEntries: readonly ShowcaseEntry[] = [
	{
		id: "reflect-tool",
		name: "Reflect",
		Component: Entry,
		config: CONFIG,
		docs: reflectDocs,
		demo: {
			createDriver: createReflectDemoDriver,
			sessionRef: REFLECT_DEMO_SESSION_REF,
			title: "reflect · memories",
		},
	},
];

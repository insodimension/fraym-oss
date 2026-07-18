import {
	createRetainDemoDriver,
	pendingToolCall,
	RETAIN_DEMO_SESSION_REF,
	RETAIN_DETAILS,
	RETAIN_INPUT,
	RETAIN_OUTPUT_TEXT,
	RETAIN_VARIATIONS,
} from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
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
const INPUT = RETAIN_INPUT as Record<string, Record<string, unknown>>;
const VARS = RETAIN_VARIATIONS as readonly string[];

function buildCall(variation: string, state: State): ActiveToolCall {
	const input = INPUT[variation] ?? { items: [] };
	if (state === "running") return pendingToolCall(`rtn-${variation}`, "retain", input) as ActiveToolCall;
	const text = (RETAIN_OUTPUT_TEXT as Record<string, string | undefined>)[variation] ?? "Memory stored.";
	const details = (RETAIN_DETAILS as Record<string, Record<string, unknown> | undefined>)[variation];
	const isError = state === "error";
	return {
		callId: `rtn-${variation}`,
		toolName: "retain",
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
			summary="Retain memory tool card."
			importPath="@fraym/ui · DEFAULT_TOOL_RENDERERS.retain"
			controls={panel}
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="retain variations"
				view={view}
				items={VARS}
				active={variation}
				buildCall={v => buildCall(v, "success")}
			/>
		</Demo>
	);
}

const retainDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps retain -> renderRetain. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderRetain receives the live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "retain",',
			"//   input:  { items: [{ content, context? }] },",
			"//   output: { content, details: { count } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: label `Retain`, a `<count> stored` code badge, and a `<count>`",
			"// stat (`pending` / `failed` for those states). The count comes from",
			"// output.details.count, falling back to input.items.length.",
			"// Body: each item.content rendered as a bullet line; empty-content items",
			"// are skipped, and an empty batch shows `No items stored.`",
		].join("\n"),
	),
	examples: [
		{
			label: "Store memories",
			code: JSON.stringify('{ items: [{ content: "Keep retain output short.", context: "fixture guidance" }] }'),
		},
		{
			label: "Empty batch",
			code: JSON.stringify('{ items: [] }  // count 0 -> body "No items stored."'),
		},
		{
			label: "Backend error",
			code: JSON.stringify('// status: "error" -> the output text renders as a red fail line'),
		},
		{
			label: "Pending store",
			code: JSON.stringify('// status: "running" -> head stat "pending", body "Storing memories…"'),
		},
	],
	api: [
		{
			name: "items",
			type: "Array<{ content: string; context?: string }>",
			required: true,
			description: "Memories to store; each non-empty content renders as a body bullet.",
		},
		{
			name: "items[].content",
			type: "string",
			required: true,
			description: "The memory text shown as a bullet in the card body.",
		},
		{
			name: "items[].context",
			type: "string",
			description: "Optional tag/context attached to the stored memory.",
		},
		{
			name: "output.details.count",
			type: "number",
			description: "Number actually stored; drives the `<count> stored` badge and the head stat.",
		},
	],
};

export const retainEntries: readonly ShowcaseEntry[] = [
	{
		id: "retain-tool",
		name: "Retain",
		Component: Entry,
		config: CONFIG,
		docs: retainDocs,
		demo: { createDriver: createRetainDemoDriver, sessionRef: RETAIN_DEMO_SESSION_REF, title: "retain · memories" },
	},
];

import {
	createRewindDemoDriver,
	pendingToolCall,
	REWIND_DEMO_SESSION_REF,
	REWIND_DETAILS,
	REWIND_INPUT,
	REWIND_OUTPUT_TEXT,
	REWIND_VARIATIONS,
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

type State = "success" | "error" | "running";
const STATES: readonly State[] = ["success", "error", "running"];
const INPUT = REWIND_INPUT as Record<string, Record<string, unknown>>;
const VARS = REWIND_VARIATIONS as readonly string[];

function buildCall(variation: string, state: State): ActiveToolCall {
	const input = INPUT[variation] ?? { report: "?" };
	if (state === "running") return pendingToolCall(`rwd-${variation}`, "rewind", input) as ActiveToolCall;
	const text = (REWIND_OUTPUT_TEXT as Record<string, string | undefined>)[variation] ?? "Rewind requested.";
	const details = (REWIND_DETAILS as Record<string, Record<string, unknown> | undefined>)[variation];
	const isError = state === "error";
	return {
		callId: `rwd-${variation}`,
		toolName: "rewind",
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
		<Demo summary="Rewind tool card." importPath="@fraym/ui · DEFAULT_TOOL_RENDERERS.rewind" controls={panel}>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="rewind variations"
				view={view}
				items={VARS}
				active={variation}
				buildCall={v => buildCall(v, "success")}
			/>
		</Demo>
	);
}

const rewindDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps rewind -> renderRewind. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderRewind receives the live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "rewind",',
			"//   input:  { report },",
			"//   output: { content, details: { report, rewound } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: label `Rewind`, a `rewound`/`failed` badge toned by",
			"// output.details.rewound (add vs del), and a matching stat",
			"// (`pending` while running).",
			"// Body: the captured report text, or `No report captured.` when empty.",
		].join("\n"),
	),
	examples: [
		{
			label: "Rewind to last checkpoint",
			code: JSON.stringify('{ report: "Checkpoint verified; rewind to the last stable state before retrying." }'),
		},
		{
			label: "No checkpoint available",
			code: JSON.stringify(
				'{ report: "Rewind requested before any checkpoint was created." }  // rewound: false -> "failed"',
			),
		},
		{
			label: "Pending rewind",
			code: JSON.stringify('// status: "running" -> head stat "pending", body "Rewinding to checkpoint…"'),
		},
	],
	api: [
		{
			name: "report",
			type: "string",
			required: true,
			description: "The rewind report; rendered as the card body and used as the report fallback.",
		},
		{
			name: "output.details.rewound",
			type: "boolean",
			description: "Whether the rewind succeeded; drives the `rewound`/`failed` badge, stat, and tone.",
		},
		{
			name: "output.details.report",
			type: "string",
			description: "Report echoed in details; used as the body text when input.report is absent.",
		},
	],
};

export const rewindEntries: readonly ShowcaseEntry[] = [
	{
		id: "rewind-tool",
		name: "Rewind",
		Component: Entry,
		config: CONFIG,
		docs: rewindDocs,
		demo: { createDriver: createRewindDemoDriver, sessionRef: REWIND_DEMO_SESSION_REF, title: "rewind" },
	},
];

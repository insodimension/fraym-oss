import {
	CHECKPOINT_DEMO_SESSION_REF,
	CHECKPOINT_DETAILS,
	CHECKPOINT_INPUT,
	CHECKPOINT_OUTPUT_TEXT,
	CHECKPOINT_VARIATIONS,
	createCheckpointDemoDriver,
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
	ToolVariationGrid,
	toolPreviewControl,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

type State = "success" | "running" | "error";
const STATES: readonly State[] = ["success", "running", "error"];
const INPUT = CHECKPOINT_INPUT as Record<string, Record<string, unknown>>;
const VARS = CHECKPOINT_VARIATIONS as readonly string[];

function buildCall(variation: string, state: State): ActiveToolCall {
	const input = INPUT[variation] ?? { goal: "?" };
	if (state === "running") return pendingToolCall(`chk-${variation}`, "checkpoint", input) as ActiveToolCall;
	const text =
		state === "error"
			? "Checkpoint failed: session is not active."
			: ((CHECKPOINT_OUTPUT_TEXT as Record<string, string | undefined>)[variation] ?? "Checkpoint created.");
	const details =
		state === "error"
			? undefined
			: (CHECKPOINT_DETAILS as Record<string, Record<string, unknown> | undefined>)[variation];
	return {
		callId: `chk-${variation}`,
		toolName: "checkpoint",
		input,
		status: state === "error" ? "error" : "success",
		output: { content: [{ type: "text", text }], details: details ?? {}, isError: state === "error" },
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
			summary="Checkpoint tool card."
			importPath="@fraym/ui · DEFAULT_TOOL_RENDERERS.checkpoint"
			controls={panel}
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="checkpoint variations"
				view={view}
				items={VARS}
				active={variation}
				buildCall={v => buildCall(v, "success")}
			/>
		</Demo>
	);
}

const checkpointDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps checkpoint -> renderCheckpoint. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderCheckpoint receives the live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "checkpoint",',
			"//   input:  { goal },",
			"//   output: { content, details: { goal, startedAt } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: label `Checkpoint`, the goal as a code badge (clipped at 40 chars),",
			"// and a stat that shows the localized startedAt timestamp (or `ok` when",
			"// absent; `pending` / `failed` for those states).",
			"// Body: the goal in quotes plus the formatted timestamp underneath.",
		].join("\n"),
	),
	examples: [
		{
			label: "Create a checkpoint",
			code: JSON.stringify('{ goal: "Investigate the renderer regression before editing" }'),
		},
		{
			label: "Pending checkpoint",
			code: JSON.stringify('// status: "running" -> head stat "pending", body "Setting checkpoint…"'),
		},
		{
			label: "Session not active",
			code: JSON.stringify('// status: "error" -> body "Checkpoint failed: session is not active."'),
		},
	],
	api: [
		{
			name: "goal",
			type: "string",
			required: true,
			description: "What the checkpoint marks. Shown as a code badge (clipped to 40 chars) and quoted in the body.",
		},
		{
			name: "output.details.startedAt",
			type: "string",
			description:
				"ISO timestamp of the checkpoint; localized for the head stat and the body line. `start` is also accepted.",
		},
	],
};

export const checkpointEntries: readonly ShowcaseEntry[] = [
	{
		id: "checkpoint-tool",
		name: "Checkpoint",
		Component: Entry,
		config: CONFIG,
		docs: checkpointDocs,
		demo: { createDriver: createCheckpointDemoDriver, sessionRef: CHECKPOINT_DEMO_SESSION_REF, title: "checkpoint" },
	},
];

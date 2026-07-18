import {
	createJobDemoDriver,
	JOB_DEMO_SESSION_REF,
	JOB_DETAILS,
	JOB_INPUT,
	JOB_OUTPUT_TEXT,
	type JobVariation,
	toolResult,
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
	toolPreviewControl,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

type Variation = JobVariation;
type JobState = "success" | "error";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["poll", "cancel", "list", "idle", "error"];
const STATES: JobState[] = ["success", "error"];

type JobCallBase = {
	readonly callId: string;
	readonly toolName: "job";
	readonly input: Record<string, unknown>;
};

function jobErrorCall(call: JobCallBase, text: string): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function jobSuccessCall(call: JobCallBase, variation: Variation): ActiveToolCall {
	const text = JOB_OUTPUT_TEXT[variation] ?? "";
	const details = JOB_DETAILS[variation] ?? {};
	if (variation === "error") return jobErrorCall(call, text);
	return { ...call, status: "success", output: toolResult(text, details) };
}

function buildJobCall(variation: Variation, state: JobState): ActiveToolCall {
	const input = JOB_INPUT[variation] ?? { poll: [] };
	const base: JobCallBase = { callId: `job-${variation}`, toolName: "job", input };
	if (state === "error") return jobErrorCall(base, JOB_OUTPUT_TEXT.error ?? "");
	return jobSuccessCall(base, variation);
}

const JOB_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "poll" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function JobEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "poll");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const mainCall = buildJobCall(variation, state);

	return (
		<Demo
			summary="The `job` tool card, rendered by the PRODUCTION renderer (registered under `job`) on a synthetic ActiveToolCall. Shows 'Job' head + action badge + status count badges + sorted job list with id/type/label/duration/preview."
			importPath="entries/features/job (live job renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildJobCall(v, "success")}
			/>
		</Demo>
	);
}

const jobDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps job -> renderJob. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderJob is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "job",',
			"//   input:  { poll?, cancel?, list? },  // one of poll[] / cancel[] / list",
			"//   output: { content, details: { jobs: JobSnapshot[], cancelled?: { id, status }[] } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			"// Head: 'Job' label + an action badge (list / poll N jobs / cancel N jobs / cancel+poll),",
			"//       then status-count badges (N done / failed / cancelled / running). While jobs",
			"//       are running the stat reads 'waiting on X/Y'.",
			"// Body: jobs sorted running -> failed -> cancelled -> completed, one line each:",
			"//       <sym> <id> [type] <label>  <duration>, with a 2-line result/error preview,",
			"//       plus the cancel outcomes appended for the cancel op.",
		].join("\n"),
	),
	examples: [
		{
			label: "Poll specific jobs",
			code: JSON.stringify('{ poll: ["job-abc123", "job-def456", "job-ghi789"] }'),
		},
		{
			label: "Cancel jobs",
			code: JSON.stringify('{ cancel: ["job-cancel-1", "job-cancel-2"] }  // -> cancel badge (del tone)'),
		},
		{
			label: "List all jobs",
			code: JSON.stringify("{ list: true }"),
		},
		{
			label: "No matching jobs (state)",
			code: JSON.stringify('{ poll: ["job-nonexistent"] }  // jobs:[] -> "No matching jobs found" body'),
		},
	],
	api: [
		{
			name: "poll",
			type: "string[]",
			description:
				"Job ids to wait on and report; head shows 'poll N jobs' (blue). One of poll / cancel / list is required.",
		},
		{
			name: "cancel",
			type: "string[]",
			description:
				"Job ids to cancel; head shows 'cancel N jobs' (del tone) and the outcomes are appended to the body.",
		},
		{
			name: "list",
			type: "boolean",
			description: "Snapshot every known job; head shows the 'list' action badge.",
		},
		{
			name: "output.details.jobs",
			type: "JobSnapshot[]",
			description:
				"Job snapshots { id, type, status, label, durationMs, resultText?, errorText? }; sorted and rendered as the Jobs body.",
		},
		{
			name: "output.details.jobs[].status",
			type: '"running" | "completed" | "failed" | "cancelled"',
			description:
				"Drives the status-count badges and the card tone (failed -> error, running -> pending 'waiting on X/Y').",
		},
		{
			name: "output.details.jobs[].type",
			type: '"bash" | "task"',
			description: "Job kind, shown per row as a [type] tag.",
		},
		{
			name: "output.details.jobs[].durationMs",
			type: "number",
			description: "Wall-clock runtime, formatted (e.g. 824ms / 12.0s) at the end of each job row.",
		},
		{
			name: "output.details.cancelled",
			type: "{ id; status }[]",
			description: "Cancel outcomes for the cancel op (cancelled / not_found), appended after the job list.",
		},
	],
};

export const jobEntries: readonly ShowcaseEntry[] = [
	{
		id: "job-tool",
		name: "Job",
		Component: JobEntry,
		config: JOB_CONFIG,
		docs: jobDocs,
		demo: {
			createDriver: createJobDemoDriver,
			sessionRef: JOB_DEMO_SESSION_REF,
			title: "job · manage async background jobs",
		},
	},
];

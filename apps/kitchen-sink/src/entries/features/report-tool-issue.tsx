import {
	createReportToolIssueDemoDriver,
	pendingToolCall,
	REPORT_TOOL_ISSUE_DEMO_SESSION_REF,
	REPORT_TOOL_ISSUE_INPUT,
	REPORT_TOOL_ISSUE_OUTPUT_TEXT,
	REPORT_TOOL_ISSUE_VARIATIONS,
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
const INPUT = REPORT_TOOL_ISSUE_INPUT as Record<string, { tool: string; report: string }>;
const VARS = REPORT_TOOL_ISSUE_VARIATIONS as readonly string[];

function buildCall(variation: string, state: State): ActiveToolCall {
	const input = INPUT[variation] ?? { tool: "?", report: "?" };
	if (state === "running") return pendingToolCall(`rti-${variation}`, "report_tool_issue", input) as ActiveToolCall;
	const text = (REPORT_TOOL_ISSUE_OUTPUT_TEXT as Record<string, string | undefined>)[variation] ?? "Noted, thanks!";
	const isError = state === "error";
	return {
		callId: `rti-${variation}`,
		toolName: "report_tool_issue",
		input,
		status: isError ? "error" : "success",
		output: { content: [{ type: "text", text }], details: {}, isError },
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
			summary="Report tool issue QA card."
			importPath="@fraym/ui · DEFAULT_TOOL_RENDERERS.report_tool_issue"
			controls={panel}
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="report_tool_issue variations"
				view={view}
				items={VARS}
				active={variation}
				buildCall={v => buildCall(v, "success")}
			/>
		</Demo>
	);
}

const reportToolIssueDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps report_tool_issue -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// report_tool_issue files an AutoQA note about another tool. The renderer",
			"// is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "report_tool_issue",',
			"//   input:  { tool, report },",
			"//   output: { content: [{ type, text }] },   // text-only ack, no details",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			"// Head: the name of the tool being reported. Body: the report text and the",
			"// acknowledgment (e.g. Reported. / Noted, thanks!). The renderer emits no",
			"// output.details — only the acknowledgment text content.",
		].join("\n"),
	),
	examples: [
		{
			label: "File a QA note",
			code: JSON.stringify(
				'{ tool: "read", report: "The read tool returned malformed line selectors for a markdown range request." }',
			),
		},
		{
			label: "Report a browser issue",
			code: JSON.stringify(
				'{ tool: "browser", report: "Empty accessibility snapshot after a successful navigation." }',
			),
		},
		{
			label: "Pending submission",
			code: JSON.stringify('// status: "running" while the note is being filed.'),
		},
		{
			label: "Acknowledged",
			code: JSON.stringify('// output text: "Reported." — no output.details; the card shows the ack only.'),
		},
	],
	api: [
		{
			name: "tool",
			type: "string",
			required: true,
			description: "The name of the tool the issue is about.",
		},
		{
			name: "report",
			type: "string",
			required: true,
			description: "The QA note describing what went wrong.",
		},
		{
			name: "output.content",
			type: "Array<{ type; text }>",
			description: "Acknowledgment text (e.g. 'Reported.' / 'Noted, thanks!'); no output.details is emitted.",
		},
	],
};

export const reportToolIssueEntries: readonly ShowcaseEntry[] = [
	{
		id: "report-tool-issue-tool",
		name: "Report Tool Issue",
		Component: Entry,
		config: CONFIG,
		docs: reportToolIssueDocs,
		demo: {
			createDriver: createReportToolIssueDemoDriver,
			sessionRef: REPORT_TOOL_ISSUE_DEMO_SESSION_REF,
			title: "report_tool_issue · QA",
		},
	},
];

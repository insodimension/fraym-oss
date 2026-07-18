import {
	createRenderMermaidDemoDriver,
	pendingToolCall,
	RENDER_MERMAID_DEMO_SESSION_REF,
	RENDER_MERMAID_DETAILS,
	RENDER_MERMAID_INPUT,
	RENDER_MERMAID_OUTPUT_TEXT,
	type RenderMermaidVariation,
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

type Variation = RenderMermaidVariation;
type MermaidState = "success" | "error";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["flowchart", "sequence", "state", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];
const STATES: MermaidState[] = ["success", "error"];

function mermaidErrorCall(calL: ActiveToolCall, text: string): ActiveToolCall {
	return { ...calL, status: "error", output: { content: [{ type: "text", text }], details: {}, isError: true } };
}

function mermaidSuccessCall(calL: ActiveToolCall, variation: Variation): ActiveToolCall {
	const text = RENDER_MERMAID_OUTPUT_TEXT[variation] ?? "";
	const details = RENDER_MERMAID_DETAILS[variation] ?? {};
	if (variation === "error") return mermaidErrorCall(calL, text);
	return { ...calL, status: "success", output: { content: [{ type: "text", text }], details, isError: false } };
}

function buildMermaidCall(variation: Variation, state: MermaidState): ActiveToolCall {
	const input = RENDER_MERMAID_INPUT[variation] ?? { mermaid: "flowchart LR\n  A --> B" };
	const base: ActiveToolCall = {
		callId: `mmd-${variation}`,
		toolName: "render_mermaid",
		input,
		status: "running",
	};
	if (state === "error") return mermaidErrorCall(base, RENDER_MERMAID_OUTPUT_TEXT.error ?? "Render failed.");
	if (variation === "pending") return pendingToolCall(`mmd-pending`, "render_mermaid", input) as ActiveToolCall;
	return mermaidSuccessCall(base, variation);
}

const MERMAID_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "flowchart" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function MermaidEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "flowchart");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const mainCall = buildMermaidCall(variation, state);

	return (
		<Demo
			summary="The `render_mermaid` tool card, rendered by the PRODUCTION renderer (registered under `render_mermaid`) on a synthetic ActiveToolCall. Shows 'Mermaid Diagram' head + sparkle icon + diagram type badge + ASCII art in a term surface."
			importPath="entries/features/render-mermaid (live render_mermaid renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildMermaidCall(v, "success")}
			/>
		</Demo>
	);
}

const renderMermaidDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps render_mermaid -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The renderer is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "render_mermaid",',
			"//   input:  { mermaid },",
			"//   output: { content, details: { artifactId? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: a `Mermaid Diagram` title + a sparkle icon + a diagram-type badge",
			"// inferred from the source header (flowchart / sequence / state).",
			"// Body: the rendered ASCII-art diagram on a dark term surface (the output",
			"// text); details.artifactId links the saved artifact. Invalid source ->",
			"// the error banner; pending while the render is in flight.",
		].join("\n"),
	),
	examples: [
		{
			label: "Flowchart",
			code: JSON.stringify(
				'{ mermaid: "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End]\n  B -->|No| D[Retry]" }',
			),
		},
		{
			label: "Sequence diagram",
			code: JSON.stringify('{ mermaid: "sequenceDiagram\n  A->>B: ping\n  B-->>A: pong" }'),
		},
		{
			label: "State diagram",
			code: JSON.stringify(
				'{ mermaid: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running: start\n  Running --> Idle: stop" }',
			),
		},
		{
			label: "Invalid source (error)",
			code: JSON.stringify('{ mermaid: "garbage@@@ invalid mermaid source" }'),
		},
	],
	api: [
		{
			name: "mermaid",
			type: "string",
			required: true,
			description:
				"The Mermaid diagram source. Its header (flowchart / sequenceDiagram / stateDiagram-v2) selects the diagram-type badge.",
		},
		{
			name: "output.content",
			type: "string",
			description: "The rendered ASCII-art diagram; drawn on the card's dark term surface.",
		},
		{
			name: "output.details.artifactId",
			type: "string",
			description:
				"Id of the saved artifact holding the rendered diagram (artifact://<id>); appended to the output text.",
		},
	],
};

export const renderMermaidEntries: readonly ShowcaseEntry[] = [
	{
		id: "render-mermaid-tool",
		name: "Render Mermaid",
		Component: MermaidEntry,
		config: MERMAID_CONFIG,
		docs: renderMermaidDocs,
		demo: {
			createDriver: createRenderMermaidDemoDriver,
			sessionRef: RENDER_MERMAID_DEMO_SESSION_REF,
			title: "render_mermaid · Mermaid-to-ASCII diagrams",
		},
	},
];

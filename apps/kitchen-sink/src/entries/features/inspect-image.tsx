import {
	createInspectImageDemoDriver,
	INSPECT_DETAILS,
	INSPECT_IMAGE_DEMO_SESSION_REF,
	INSPECT_INPUT,
	INSPECT_OUTPUT,
	type InspectVariation,
	toolResult,
} from "@fraym-ai/fixtures";
import type { ActiveToolCall } from "@fraym-ai/ui";
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

type Variation = InspectVariation;
type InspectState = "success" | "error";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["normal", "no-question", "empty", "error"];
const STATES: InspectState[] = ["success", "error"];

type InspectCallBase = {
	readonly callId: string;
	readonly toolName: "inspect_image";
	readonly input: Record<string, unknown>;
};

function inspectErrorCall(call: InspectCallBase, text: string): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function inspectSuccessCall(call: InspectCallBase, variation: Variation): ActiveToolCall {
	const text = INSPECT_OUTPUT[variation] ?? "";
	const details = INSPECT_DETAILS[variation] ?? {};
	if (variation === "error") return inspectErrorCall(call, text);
	return { ...call, status: "success", output: toolResult(text, details) };
}

function buildInspectCall(variation: Variation, state: InspectState): ActiveToolCall {
	const input = INSPECT_INPUT[variation] ?? { path: "", question: "" };
	const base: InspectCallBase = { callId: `inspect-${variation}`, toolName: "inspect_image", input };
	if (state === "error") return inspectErrorCall(base, INSPECT_OUTPUT.error);
	return inspectSuccessCall(base, variation);
}

const INSPECT_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "normal" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function InspectEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "normal");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const mainCall = buildInspectCall(variation, state);

	return (
		<Demo
			summary="The `inspect_image` tool card, rendered by the PRODUCTION renderer (registered under `inspect_image`) on a synthetic ActiveToolCall. Shows 'Inspect Image' head + path/model badges + Question section + Analysis section."
			importPath="entries/features/inspect-image (live inspect_image renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildInspectCall(v, "success")}
			/>
		</Demo>
	);
}

const inspectImageDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps inspect_image -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The renderer is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "inspect_image",',
			"//   input:  { path, question? },",
			"//   output: { content, details: { model, imagePath, mimeType, imagePreview? } },",
			'//   status: "success" | "error",',
			"// }",
			"//",
			"// Head: an `Inspect Image` title + path / model badges.",
			"// Body: a Question section (input.question) + an Analysis section (the text",
			"// output) + the image preview (details.imagePreview rendered inline), so the",
			"// card SHOWS the analyzed image alongside the model's description.",
		].join("\n"),
	),
	examples: [
		{
			label: "Describe an image",
			code: JSON.stringify(
				'{ path: "/screenshots/landscape.svg", question: "Describe the composition and colors in this image." }',
			),
		},
		{
			label: "Open-ended (no question)",
			code: JSON.stringify('{ path: "/screenshots/landscape.svg", question: "" }'),
		},
		{
			label: "Ask a specific question",
			code: JSON.stringify('{ path: "/images/empty.png", question: "What\'s in this image?" }'),
		},
		{
			label: "Image not found (error)",
			code: JSON.stringify('{ path: "nonexistent.png", question: "What does this show?" }'),
		},
	],
	api: [
		{
			name: "path",
			type: "string",
			required: true,
			description: "Path to the image to analyze; rendered as the head path badge.",
		},
		{
			name: "question",
			type: "string",
			description: "Question about the image; rendered in the Question section. Empty -> open-ended describe.",
		},
		{
			name: "output.details.model",
			type: "string",
			description: "Vision model used; rendered as a head badge.",
		},
		{
			name: "output.details.imagePath",
			type: "string",
			description: "Resolved path of the inspected image.",
		},
		{
			name: "output.details.mimeType",
			type: "string",
			description: "MIME type of the inspected image.",
		},
		{
			name: "output.details.imagePreview",
			type: "{ data: string; mimeType: string }",
			description: "The analyzed image, rendered inline via ImageBlock — the card shows the image.",
		},
	],
};

export const inspectImageEntries: readonly ShowcaseEntry[] = [
	{
		id: "inspect-image-tool",
		name: "Inspect Image",
		Component: InspectEntry,
		config: INSPECT_CONFIG,
		docs: inspectImageDocs,
		demo: {
			createDriver: createInspectImageDemoDriver,
			sessionRef: INSPECT_IMAGE_DEMO_SESSION_REF,
			title: "inspect_image · analyze a landscape image",
		},
	},
];

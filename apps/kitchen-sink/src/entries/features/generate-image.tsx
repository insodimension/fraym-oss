import {
	createGenerateImageDemoDriver,
	GENERATE_DETAILS,
	GENERATE_IMAGE_DEMO_SESSION_REF,
	GENERATE_INPUT,
	GENERATE_OUTPUT,
	type GenerateVariation,
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
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

type Variation = GenerateVariation;
type GenerateState = "success" | "error";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["normal", "edit", "no-images", "error"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];
const STATES: GenerateState[] = ["success", "error"];

type GenCallBase = {
	readonly callId: string;
	readonly toolName: "generate_image";
	readonly input: Record<string, unknown>;
};

function generateErrorCall(call: GenCallBase, text: string): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function generateSuccessCall(call: GenCallBase, variation: Variation): ActiveToolCall {
	const text = GENERATE_OUTPUT[variation] ?? "";
	const details = GENERATE_DETAILS[variation] ?? {};
	if (variation === "error") return generateErrorCall(call, text);
	return { ...call, status: "success", output: toolResult(text, details) };
}

function buildGenerateCall(variation: Variation, state: GenerateState): ActiveToolCall {
	const input = GENERATE_INPUT[variation] ?? { subject: "" };
	const base: GenCallBase = { callId: `generate-${variation}`, toolName: "generate_image", input };
	if (state === "error") return generateErrorCall(base, GENERATE_OUTPUT.error);
	return generateSuccessCall(base, variation);
}

const GENERATE_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "normal" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function GenerateEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "normal");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const mainCall = buildGenerateCall(variation, state);

	return (
		<Demo
			summary="The `generate_image` tool card, rendered by the PRODUCTION renderer (registered under `generate_image`) on a synthetic ActiveToolCall. Shows 'Generate Image' head + aspect_ratio/provider/model badges + Subject + Revised prompt + Response text + generated images (via ImageBlock)."
			importPath="entries/features/generate-image (live generate_image renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildGenerateCall(v, "success")}
			/>
		</Demo>
	);
}

const generateImageDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps generate_image -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The renderer is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "generate_image",',
			"//   input:  { subject, scene?, style?, changes?, aspect_ratio?, image_size? },",
			"//   output: { content, details: { provider, model, images, imagePreview?, revisedPrompt?, responseText? } },",
			'//   status: "success" | "error",',
			"// }",
			"//",
			"// Head: a `Generate Image` title + aspect_ratio / provider / model badges.",
			"// Body: a Subject section, a Revised prompt section (details.revisedPrompt),",
			"// a Response text section (details.responseText), and the generated images —",
			"// each details.images entry renders inline via ImageBlock, so the card",
			"// SHOWS the actual generated image(s).",
		].join("\n"),
	),
	examples: [
		{
			label: "Generate from a subject",
			code: JSON.stringify(
				'{ subject: "a mountain landscape at sunset", scene: "alpine lake with pine forest", style: "cinematic, ultra-realistic", aspect_ratio: "16:9" }',
			),
		},
		{
			label: "Edit an input image",
			code: JSON.stringify(
				'{ subject: "a photograph of a city skyline", changes: ["Add a dramatic sunset sky", "Adjust lighting for more contrast"] }',
			),
		},
		{
			label: "Pick an output size",
			code: JSON.stringify(
				'{ subject: "an abstract painting", style: "abstract, watercolor", image_size: "1536x1024" }',
			),
		},
		{
			label: "No images returned",
			code: JSON.stringify('// status: "success" but details.images: [] -> the card shows only the response text.'),
		},
	],
	api: [
		{
			name: "subject",
			type: "string",
			required: true,
			description: "Main subject prompt; rendered in the Subject section.",
		},
		{
			name: "scene",
			type: "string",
			description: "Location / environment context folded into the prompt.",
		},
		{
			name: "style",
			type: "string",
			description: "Artistic style descriptor.",
		},
		{
			name: "changes",
			type: "string[]",
			description: "Edits to apply to an input image (edit mode).",
		},
		{
			name: "aspect_ratio",
			type: "string",
			description: 'Aspect ratio (e.g. "16:9"); rendered as a head badge.',
		},
		{
			name: "image_size",
			type: "string",
			description: 'Output pixel size (e.g. "1536x1024").',
		},
		{
			name: "output.details.provider",
			type: "string",
			description: "Image backend (openai / gemini); rendered as a head badge.",
		},
		{
			name: "output.details.model",
			type: "string",
			description: "Model id; rendered as a head badge.",
		},
		{
			name: "output.details.images",
			type: "{ data: string; mimeType: string }[]",
			description: "Generated images; each renders inline via ImageBlock — the card shows the image(s).",
		},
		{
			name: "output.details.imagePreview",
			type: "{ data: string; mimeType: string }",
			description: "Single header preview image for the card.",
		},
		{
			name: "output.details.revisedPrompt",
			type: "string",
			description: "Provider-rewritten prompt; rendered in the Revised prompt section.",
		},
		{
			name: "output.details.responseText",
			type: "string",
			description: "Model commentary; rendered in the Response text section.",
		},
	],
};

export const generateImageEntries: readonly ShowcaseEntry[] = [
	{
		id: "generate-image-tool",
		name: "Generate Image",
		Component: GenerateEntry,
		config: GENERATE_CONFIG,
		docs: generateImageDocs,
		demo: {
			createDriver: createGenerateImageDemoDriver,
			sessionRef: GENERATE_IMAGE_DEMO_SESSION_REF,
			title: "generate_image · landscape at sunset",
		},
	},
];

import { createWriteDemoDriver, genTsContent, toolResult, WRITE_DEMO_SESSION_REF } from "@fraym/fixtures";
import { type ActiveToolCall, useLineStream } from "@fraym/ui";
import { useState } from "react";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	type ToolPreviewView,
	ToolStreamingReplay,
	ToolVariationGrid,
	toolPreviewControl,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `write` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderWrite`,
// registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. Write shows the NEW file content (line-numbered, highlighted)
// — NOT a diff. The content lives in `input.content`; while streaming it arrives via
// the partial-output channel (`output.details.content`). The Demo Dock drives the
// full streamed conversation (createWriteDemoDriver).
//
// Axes (control knobs):
//   VARIATION  module · config · markdown · large
//   STATE      success · diagnostics · error · pending · streaming
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "module" | "config" | "markdown" | "large";
type WriteState = "success" | "diagnostics" | "error" | "pending" | "streaming";
// VIEW = the card's real disclosure axes on the production `ToolCard`: `collapsed`
// (head only) vs the three open densities (comfortable · compact · spacious).
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["module", "config", "markdown", "large"];
const STATES: WriteState[] = ["success", "diagnostics", "error", "pending", "streaming"];

const BASE_PATH: Record<Variation, string> = {
	module: "src/telemetry.ts",
	config: "package.json",
	markdown: "README.md",
	large: "src/generated/types.ts",
};

// ── fixture content per variation ─────────────────────────────────────────────

const MODULE_CONTENT = `import { emit } from "./bus";

export interface TelemetryEvent {
	field1: string;
	field2?: number;
}

export function track(event: TelemetryEvent): void {
	emit("telemetry", event);
}`;

const CONFIG_CONTENT = `{
	"name": "@acme/telemetry",
	"version": "0.1.0",
	"type": "module",
	"main": "./dist/index.js",
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"test": "bun test"
	}
}`;

const MARKDOWN_CONTENT = `# @acme/telemetry

Lightweight, batched telemetry for the Acme platform.

## Usage

\`\`\`ts
import { track } from "@acme/telemetry";

track({ field1: "page_view" });
\`\`\`

Events flush every 5s or 50 events, whichever comes first.`;

// A ~70-line generated file so the scroll window fills + follows the tail (streaming).
const LARGE_CONTENT = genTsContent(70);

const CONTENT: Record<Variation, string> = {
	module: MODULE_CONTENT,
	config: CONFIG_CONTENT,
	markdown: MARKDOWN_CONTENT,
	large: LARGE_CONTENT,
};

const DIAG = {
	server: "tsserver",
	messages: ["[error] src/telemetry.ts:4 Cannot find name 'emit'."],
	summary: "1 error",
	errored: true,
};

const READONLY_ERROR =
	"Refusing to overwrite src/generated/types.ts — file is marked auto-generated (// @generated). Edit the source template instead.";

// ── synthetic call builder ────────────────────────────────────────────────────

/** Build the exact `ActiveToolCall` a live write produces, from the config knobs. */
function buildWriteCall(variation: Variation, state: WriteState): ActiveToolCall {
	const path = BASE_PATH[variation];
	const content = CONTENT[variation];
	const call = { callId: `write-preview-${variation}-${state}`, toolName: "write", input: { path, content } };

	if (state === "pending") return { ...call, input: { path }, status: "running" };
	if (state === "error") {
		return {
			...call,
			status: "error",
			output: { content: [{ type: "text", text: READONLY_ERROR }], details: { isError: true }, isError: true },
		};
	}
	return {
		...call,
		status: "success",
		output: toolResult(
			`Successfully wrote ${content.length} bytes to ${path}`,
			state === "diagnostics" ? { diagnostics: DIAG } : {},
		),
	};
}

const STREAM_INTERVAL_MS = 55;

/** A running (or, once revealed, resolved) write whose content is the streamed prefix so
 *  far — fed through `input.content`, exactly like a live streamed write (the engine merges
 *  toolcall_delta args into call.input; see docs/design/tools/streaming-tool-args.md). */
function streamingWriteCall(variation: Variation, partialContent: string, stillStreaming: boolean): ActiveToolCall {
	const path = BASE_PATH[variation];
	return {
		callId: `write-stream-${variation}`,
		toolName: "write",
		input: { path, content: partialContent },
		status: stillStreaming ? "running" : "success",
		output: stillStreaming
			? undefined
			: { content: [{ type: "text", text: `Successfully wrote to ${path}` }], details: {} },
	};
}

// ── showcase entry ─────────────────────────────────────────────────────────────

function writeMainCall(
	variation: Variation,
	state: WriteState,
	streamedContent: string,
	streaming: boolean,
): ActiveToolCall {
	return state === "streaming"
		? streamingWriteCall(variation, streamedContent, streaming)
		: buildWriteCall(variation, state);
}

function writeGridState(state: WriteState): WriteState {
	return state === "streaming" ? "success" : state;
}

const WRITE_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "module" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: toolPreviewControl(),
};

function WriteEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "module");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	// Streaming reuses the shared `useLineStream` engine: the content grows one line
	// per tick into a running call's partial output → the PRODUCTION renderWrite
	// streams it through the exact path a live write uses. Replay re-arms it.
	const [nonce, setNonce] = useState(0);
	const { text: streamedContent, streaming } = useLineStream(CONTENT[variation], nonce, STREAM_INTERVAL_MS);
	const isStreaming = state === "streaming";
	const mainCall = writeMainCall(variation, state, streamedContent, streaming);
	const gridState = writeGridState(state);

	return (
		<Demo
			summary="The `write` tool card, rendered by the PRODUCTION renderer (renderWrite) on a synthetic ActiveToolCall built from the knobs — identical to a live write. Shows the NEW file content as a line-numbered, syntax-highlighted preview (NOT a diff): `Write <path>` + a `N lines` stat + the content + a diagnostics block. Handles create / overwrite / config / markdown / large; STREAMS the content in (state=streaming) via the partial-output channel, following the tail inside a capped window, exactly like a live run. The Demo Dock replays the full conversation."
			importPath="entries/features/write (live renderWrite)"
			controls={panel}
			stage="stretch"
		>
			<ToolStreamingReplay active={isStreaming} streaming={streaming} onReplay={() => setNonce(n => n + 1)} />
			{/* key includes view+state so toggling remounts the card — ToolCard's
			    `defaultOpen` is initial-state-only (it never auto-closes in production). */}
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildWriteCall(v, gridState)}
			/>
		</Demo>
	);
}

const writeDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps write -> renderWrite. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderWrite is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "write",',
			"//   input:  { path, content },",
			"//   output: { content, details: { diagnostics? } },",
			'//   status: "running" | "streaming" | "success" | "error",',
			"// }",
			"//",
			"// Head: `Write <path>` + an `N lines` stat (NOT a diff — it shows the new file).",
			"// Body: input.content, line-numbered + syntax-highlighted. While streaming the",
			"// content arrives one line at a time via input.content and the card follows the tail.",
			"// A post-write diagnostics block renders from output.details.diagnostics.",
		].join("\n"),
	),
	examples: [
		{
			label: "New module file",
			code: JSON.stringify('{ path: "src/telemetry.ts", content: "import { emit } from \\"./bus\\";\\n..." }'),
		},
		{
			label: "Config / JSON file",
			code: JSON.stringify('{ path: "package.json", content: "{\\n  \\"name\\": \\"@acme/telemetry\\"\\n}" }'),
		},
		{
			label: "Streaming write",
			code: JSON.stringify(
				'// status: "streaming" grows input.content one line per tick — the renderer follows the tail.',
			),
		},
		{
			label: "With diagnostics",
			code: JSON.stringify("// output.details.diagnostics -> tsserver error block beneath the content."),
		},
	],
	api: [
		{
			name: "path",
			type: "string",
			required: true,
			description: "Destination file path; rendered in the head as `Write <path>`.",
		},
		{
			name: "content",
			type: "string",
			required: true,
			description:
				"Full NEW file contents, shown line-numbered and syntax-highlighted (never a diff). While streaming it arrives incrementally via input.content.",
		},
		{
			name: "output.details.diagnostics",
			type: "{ server: string; messages: string[]; summary: string; errored: boolean }",
			description: "Post-write LSP diagnostics; renders an error/warning block beneath the content.",
		},
	],
};

export const writeEntries: readonly ShowcaseEntry[] = [
	{
		id: "write-tool",
		name: "Write",
		Component: WriteEntry,
		config: WRITE_CONFIG,
		docs: writeDocs,
		demo: {
			createDriver: createWriteDemoDriver,
			sessionRef: WRITE_DEMO_SESSION_REF,
			title: "write · live conversation",
		},
	},
];

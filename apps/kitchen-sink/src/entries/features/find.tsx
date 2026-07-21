import { createFindDemoDriver, FIND_DEMO_SESSION_REF } from "@fraym-ai/fixtures";
import { type ActiveToolCall, useLineStream } from "@fraym-ai/ui";
import { useState } from "react";
import { FEATURE_DIRS, RENDER_FILES, ROOT_FILES } from "../../fixtures/file-tree";
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
// `find` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderFind`,
// registered in @fraym-ai/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. Find lists `details.files` (a flat relative-path list; a trailing
// `/` marks a directory) inside the shared card frame; the head shows the glob + `N files`
// + scope + truncation. Find STREAMS a growing file list (state=streaming) via the
// partial-output channel, exactly like a live run.
//
// Axes (control knobs):
//   VARIATION  files · dirs · root
//   STATE      success · empty · truncated · streaming · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "files" | "dirs" | "root";
type FindState = "success" | "empty" | "truncated" | "streaming" | "error" | "pending";
type View = ToolPreviewView;
type FindCallBase = Pick<ActiveToolCall, "callId" | "toolName" | "input">;

const VARIATIONS: Variation[] = ["files", "dirs", "root"];
const STATES: FindState[] = ["success", "empty", "truncated", "streaming", "error", "pending"];

// ── per-variation glob args + result file lists ───────────────────────────────

const INPUT: Record<Variation, Record<string, unknown>> = {
	files: { paths: ["packages/ui/src/**/*-render.tsx", "packages/ui/src/registries/*-renderer.tsx"] },
	dirs: { paths: ["packages/ui/src/features/*"] },
	root: { paths: ["*.json"], gitignore: false },
};

const CONTENT: Record<Variation, { files: string[]; scopePath?: string }> = {
	files: { files: RENDER_FILES, scopePath: "packages/ui/src" },
	dirs: { files: FEATURE_DIRS, scopePath: "packages/ui/src/features" },
	root: { files: ROOT_FILES },
};

// ── synthetic call builder ────────────────────────────────────────────────────

/** An `AgentToolResult`-shaped output: `content` (model-facing newline list) + `details`. */
function findOutput(files: string[], details: Record<string, unknown>, isError = false) {
	return { content: [{ type: "text", text: files.join("\n") }], details, isError };
}

function findSuccessDetails(
	files: string[],
	scopePath: string | undefined,
	truncated = false,
): Record<string, unknown> {
	const details: Record<string, unknown> = { fileCount: files.length, files, scopePath };
	if (!truncated) return details;
	return {
		...details,
		truncated: true,
		resultLimitReached: files.length,
		truncation: { truncatedBy: "lines", artifactId: "find-4a1b" },
	};
}

function findSuccessCall(base: FindCallBase, variation: Variation, truncated = false): ActiveToolCall {
	const { files, scopePath } = CONTENT[variation];
	return {
		...base,
		status: "success",
		output: findOutput(files, findSuccessDetails(files, scopePath, truncated)),
	};
}

function buildFindCall(variation: Variation, state: FindState): ActiveToolCall {
	const input = INPUT[variation];
	const callId = `find-preview-${variation}-${state}`;
	const base = { callId, toolName: "find", input } as const;

	if (state === "pending") return { ...base, status: "running" };

	if (state === "error") {
		return {
			...base,
			status: "error",
			output: findOutput([], { error: "Path not found: packages/ghost" }, true),
		};
	}

	const { scopePath } = CONTENT[variation];

	if (state === "empty") {
		return { ...base, status: "success", output: findOutput([], { fileCount: 0, files: [], scopePath }) };
	}

	return findSuccessCall(base, variation, state === "truncated");
}

const STREAM_INTERVAL_MS = 110;

/** A running (or, once revealed, resolved) find run whose file list is the streamed slice so
 *  far — fed through the partial-output channel (`details.files`), exactly like a live run. */
function streamingFindCall(variation: Variation, partialFiles: string[], stillStreaming: boolean): ActiveToolCall {
	const { files, scopePath } = CONTENT[variation];
	const shown = stillStreaming ? partialFiles : files;
	return {
		callId: `find-stream-${variation}`,
		toolName: "find",
		input: INPUT[variation],
		status: stillStreaming ? "running" : "success",
		output: findOutput(shown, { fileCount: shown.length, files: shown, scopePath }),
	};
}

// ── showcase entry ─────────────────────────────────────────────────────────────

function findMainCall(
	variation: Variation,
	state: FindState,
	streamedFiles: string[],
	streaming: boolean,
): ActiveToolCall {
	return state === "streaming"
		? streamingFindCall(variation, streamedFiles, streaming)
		: buildFindCall(variation, state);
}

function findGridState(state: FindState): FindState {
	return state === "streaming" ? "success" : state;
}

const FIND_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "files" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: toolPreviewControl(),
};

function FindEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "files");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	// Streaming reuses the shared `useLineStream` engine: the file list grows one entry per tick
	// into a running call's partial output → the PRODUCTION renderFind streams it through the exact
	// path a live run uses (a growing `details.files`). Replay re-arms it.
	const [nonce, setNonce] = useState(0);
	const { text: streamedText, streaming } = useLineStream(
		CONTENT[variation].files.join("\n"),
		nonce,
		STREAM_INTERVAL_MS,
	);
	const streamedFiles = streamedText ? streamedText.split("\n").filter(Boolean) : [];
	const isStreaming = state === "streaming";
	const mainCall = findMainCall(variation, state, streamedFiles, streaming);
	const gridState = findGridState(state);

	return (
		<Demo
			summary="The `find` tool card, rendered by the PRODUCTION renderer (renderFind) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Lists `details.files` (flat relative paths; a trailing `/` = a directory, shown with a folder icon + accent) inside the shared card frame; the head shows the glob + `N files` + scope + `⚠ truncated`. STREAMS a growing file list (state=streaming) via the partial-output channel, following the tail inside a capped window, exactly like a live run. The Demo Dock replays the full conversation."
			importPath="entries/features/find (live renderFind)"
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
				buildCall={v => buildFindCall(v, gridState)}
			/>
		</Demo>
	);
}

const findDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps find -> renderFind. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderFind is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "find",',
			"//   input:  { paths, gitignore? },  // glob path patterns",
			"//   output: { content, details: { files, fileCount, scopePath, truncated?, truncation? } },",
			'//   status: "running" | "streaming" | "success" | "error",',
			"// }",
			"//",
			"// Head: the glob + `N files` stat + scope + truncation badge.",
			"// Body: details.files — a flat relative-path list; a trailing `/` marks a directory.",
			"// Find STREAMS a growing list (state=streaming) through the partial-output channel.",
		].join("\n"),
	),
	examples: [
		{
			label: "Glob source files",
			code: JSON.stringify(
				'{ paths: ["packages/ui/src/**/*-render.tsx", "packages/ui/src/registries/*-renderer.tsx"] }',
			),
		},
		{
			label: "Match directories",
			code: JSON.stringify('{ paths: ["packages/ui/src/features/*"] }  // trailing "/" marks dirs'),
		},
		{
			label: "Root, include ignored",
			code: JSON.stringify('{ paths: ["*.json"], gitignore: false }'),
		},
		{
			label: "Streaming / truncated",
			code: JSON.stringify('// status: "streaming" grows details.files; output.details.truncated -> capped badge'),
		},
	],
	api: [
		{
			name: "paths",
			type: "string[]",
			required: true,
			description: "Glob patterns to match; results are listed as flat relative paths.",
		},
		{
			name: "gitignore",
			type: "boolean",
			default: "true",
			description: "Honor .gitignore; set false to include ignored files.",
		},
		{
			name: "output.details.files",
			type: "string[]",
			description: "Matched relative paths; a trailing `/` marks a directory. Streamed incrementally while running.",
		},
		{
			name: "output.details.fileCount",
			type: "number",
			description: "The `N files` head stat. 0 → empty state.",
		},
		{
			name: "output.details.scopePath",
			type: "string",
			description: "Common scope shown in the head.",
		},
		{
			name: "output.details.truncated",
			type: "boolean",
			description: "Result cap hit (with resultLimitReached count); renders the truncated badge.",
		},
		{
			name: "output.details.truncation",
			type: "{ truncatedBy: string; artifactId: string }",
			description: "Full list recoverable via the artifact when truncated.",
		},
		{
			name: "output.details.error",
			type: "string",
			description: "Set on error (e.g. path not found); flips the card to the error tone.",
		},
	],
};

export const findEntries: readonly ShowcaseEntry[] = [
	{
		id: "find-tool",
		name: "Find",
		Component: FindEntry,
		config: FIND_CONFIG,
		docs: findDocs,
		demo: {
			createDriver: createFindDemoDriver,
			sessionRef: FIND_DEMO_SESSION_REF,
			title: "find · live conversation",
		},
	},
];

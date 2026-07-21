import { BASH_DEMO_SESSION_REF, createBashDemoDriver, pendingToolCall, toolResult } from "@fraym-ai/fixtures";
import { type ActiveToolCall, useLineStream } from "@fraym-ai/ui";
import { useState } from "react";
import {
	BUILD_OUTPUT,
	DEV_OUTPUT,
	TEST_OUTPUT,
	TRUNCATED_OUTPUT,
	TYPECHECK_ERROR,
	TYPECHECK_OK,
} from "../../fixtures/terminal-outputs";
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
// `bash` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderBash`,
// registered in @fraym-ai/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. Bash shows the command (`$ cd…/env command`, highlighted) +
// its streamed output on the term surface, a `Wall: Xs` stat, and bg-job / truncated
// badges. Output rides `input`/the partial-output channel exactly like a live run.
//
// Axes (control knobs):
//   VARIATION  quick · long · withEnv · background
//   STATE      success · error · truncated · streaming · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "quick" | "long" | "withEnv" | "background";
type BashState = "success" | "error" | "truncated" | "streaming" | "pending";
// VIEW = the card's real disclosure axes on the production `ToolCard`: `collapsed`
// (head only) vs the three open densities (comfortable · compact · spacious).
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["quick", "long", "withEnv", "background"];
const STATES: BashState[] = ["success", "error", "truncated", "streaming", "pending"];

// ── per-variation command args ────────────────────────────────────────────────

const INPUT: Record<Variation, { command: string; cwd?: string; env?: Record<string, string> }> = {
	quick: { command: "bun run build", cwd: "apps/web" },
	long: { command: "bun test" },
	withEnv: { command: "bun run typecheck", cwd: "packages/store", env: { CI: "1", FORCE_COLOR: "0" } },
	background: { command: "bun run dev:fraym:native" },
};

const OUTPUT: Record<Variation, string> = {
	quick: BUILD_OUTPUT,
	long: TEST_OUTPUT,
	withEnv: TYPECHECK_OK,
	background: DEV_OUTPUT,
};

// ── synthetic call builder ────────────────────────────────────────────────────

type BashInput = (typeof INPUT)[Variation];
type BashCallBase = { readonly callId: string; readonly toolName: "bash"; readonly input: BashInput };

function bashErrorCall(call: BashCallBase): ActiveToolCall {
	return {
		...call,
		status: "error",
		output: toolResult(TYPECHECK_ERROR, { wallTimeMs: 2960, timeoutSeconds: 300 }, true),
	};
}

function bashTruncatedCall(call: BashCallBase): ActiveToolCall {
	return {
		...call,
		status: "success",
		output: toolResult(TRUNCATED_OUTPUT, {
			wallTimeMs: 4120,
			timeoutSeconds: 600,
			meta: { truncation: { artifactId: "mig-9f2a" } },
		}),
	};
}

function bashSuccessDetails(variation: Variation): Record<string, unknown> {
	if (variation === "background")
		return { async: { state: "running", jobId: "job-7", type: "bash" }, timeoutSeconds: 300 };
	const wallTimeMs = variation === "long" ? 148 : variation === "quick" ? 1824 : 2960;
	return { wallTimeMs, timeoutSeconds: 300 };
}

function bashSuccessCall(call: BashCallBase, variation: Variation): ActiveToolCall {
	return { ...call, status: "success", output: toolResult(OUTPUT[variation], bashSuccessDetails(variation)) };
}

/** Build the exact `ActiveToolCall` a live bash run produces, from the config knobs. */
function buildBashCall(variation: Variation, state: BashState): ActiveToolCall {
	const input = INPUT[variation];
	const callId = `bash-preview-${variation}-${state}`;
	const call: BashCallBase = { callId, toolName: "bash", input };

	if (state === "pending") return pendingToolCall(callId, "bash", input);
	if (state === "error") return bashErrorCall(call);
	if (state === "truncated") return bashTruncatedCall(call);
	return bashSuccessCall(call, variation);
}

const STREAM_INTERVAL_MS = 55;

/** A running (or, once revealed, resolved) bash run whose output is the streamed prefix
 *  so far — fed through the partial-output channel (`content[].text`), exactly like a
 *  live streamed run. */
function streamingBashCall(variation: Variation, partialOutput: string, stillStreaming: boolean): ActiveToolCall {
	const input = INPUT[variation];
	return {
		callId: `bash-stream-${variation}`,
		toolName: "bash",
		input,
		status: stillStreaming ? "running" : "success",
		output: stillStreaming
			? { content: [{ type: "text", text: partialOutput }], details: {} }
			: toolResult(OUTPUT[variation], { wallTimeMs: variation === "long" ? 148 : 1824, timeoutSeconds: 300 }),
	};
}

// ── showcase entry ─────────────────────────────────────────────────────────────

function bashMainCall(
	variation: Variation,
	state: BashState,
	streamedOutput: string,
	streaming: boolean,
): ActiveToolCall {
	return state === "streaming"
		? streamingBashCall(variation, streamedOutput, streaming)
		: buildBashCall(variation, state);
}

function bashGridState(state: BashState): BashState {
	return state === "streaming" ? "success" : state;
}

const BASH_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "long" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: toolPreviewControl(),
};

function BashEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "long");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	// Streaming reuses the shared `useLineStream` engine: the output grows one line
	// per tick into a running call's partial output → the PRODUCTION renderBash streams
	// it through the exact path a live run uses. Replay re-arms it.
	const [nonce, setNonce] = useState(0);
	const { text: streamedOutput, streaming } = useLineStream(OUTPUT[variation], nonce, STREAM_INTERVAL_MS);
	const isStreaming = state === "streaming";
	const mainCall = bashMainCall(variation, state, streamedOutput, streaming);
	const gridState = bashGridState(state);

	return (
		<Demo
			summary="The `bash` tool card, rendered by the PRODUCTION renderer (renderBash) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Shows the command (`$ cd…/env command`, bash-highlighted) + its output on the dark term surface, a `Wall: Xs` head stat, and bg-job / truncated badges. STREAMS the output in (state=streaming) via the partial-output channel, following the tail inside a capped window, exactly like a live run. The Demo Dock replays the full conversation."
			importPath="entries/features/bash (live renderBash)"
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
				buildCall={v => buildBashCall(v, gridState)}
			/>
		</Demo>
	);
}

const bashDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps bash / shell / command -> renderBash. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderBash is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "bash",',
			"//   input:  { command, cwd?, env? },",
			"//   output: { content, details: { exitCode, durationMs, background, truncated } },",
			'//   status: "pending" | "streaming" | "success" | "error",',
			"// }",
			"//",
			"// Head: `$ cd <cwd>/<env> command` (bash-highlighted) + a `Wall: Xs` stat.",
			"// Body: streamed stdout/stderr on the dark terminal surface; background-job",
			"// and truncated badges ride output.details.",
		].join("\n"),
	),
	examples: [
		{
			label: "Quick command (success)",
			code: JSON.stringify('{ command: "bun run build", cwd: "packages/ui" }'),
		},
		{
			label: "With environment variables",
			code: JSON.stringify('{ command: "$NODE bin/cli.js", env: { NODE: "node" } }'),
		},
		{
			label: "Background job",
			code: JSON.stringify('{ command: "bun run dev" }  // output.details.background -> bg-job badge'),
		},
		{
			label: "Streaming output",
			code: JSON.stringify(
				'// status: "streaming" feeds output through the partial-output channel,\n// following the tail inside a capped window — exactly like a live run.',
			),
		},
	],
	api: [
		{
			name: "command",
			type: "string",
			required: true,
			description: "Shell command to run. Rendered in the head, bash-highlighted, prefixed with `$`.",
		},
		{
			name: "cwd",
			type: "string",
			description: "Working directory; shown as `cd <cwd>` ahead of the command.",
		},
		{
			name: "env",
			type: "Record<string, string>",
			description: "Extra environment variables, surfaced inline before the command.",
		},
		{
			name: "output.details.exitCode",
			type: "number",
			description: "Process exit code; a non-zero value flips the card to the error tone.",
		},
		{
			name: "output.details.durationMs",
			type: "number",
			description: "Wall-clock runtime, rendered as the `Wall: Xs` head stat.",
		},
		{
			name: "output.details.background",
			type: "boolean",
			description: "Marks a backgrounded job; renders a bg-job badge.",
		},
		{
			name: "output.details.truncated",
			type: "boolean",
			description: "Output was capped at the byte/line limit; renders a 'truncated' badge.",
		},
	],
};

export const bashEntries: readonly ShowcaseEntry[] = [
	{
		id: "bash-tool",
		name: "Bash",
		Component: BashEntry,
		config: BASH_CONFIG,
		docs: bashDocs,
		demo: {
			createDriver: createBashDemoDriver,
			sessionRef: BASH_DEMO_SESSION_REF,
			title: "bash · live conversation",
		},
	},
];

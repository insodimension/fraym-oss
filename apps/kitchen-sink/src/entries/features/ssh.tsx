import { createSshDemoDriver, pendingToolCall, SSH_DEMO_SESSION_REF, toolResult } from "@fraym-ai/fixtures";
import { type ActiveToolCall, useLineStream } from "@fraym-ai/ui";
import { useState } from "react";
import {
	DEPLOY_OUTPUT,
	RESTART_OUTPUT,
	SERVICE_DOWN,
	SSH_INPUT,
	TRUNCATED_OUTPUT as SSH_TRUNCATED_OUTPUT,
	STATUS_OUTPUT,
} from "../../fixtures";
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
// `ssh` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderSsh`,
// registered in @fraym-ai/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. SSH shows an "SSH" head + a `[host]` badge + the `$ command`
// row + remote output on the term surface; truncation spills to an artifact. Output
// rides the partial-output channel while streaming, exactly like a live run. Unlike
// bash there is NO Wall stat (ssh emits no wall time).
//
// Axes (control knobs):
//   VARIATION  status · deploy · audit · restart
//   STATE      success · error · truncated · streaming · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "status" | "deploy" | "audit" | "restart";
type SshState = "success" | "error" | "truncated" | "streaming" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["status", "deploy", "audit", "restart"];
const STATES: SshState[] = ["success", "error", "truncated", "streaming", "pending"];

const OUTPUT: Record<Variation, string> = {
	status: STATUS_OUTPUT,
	deploy: DEPLOY_OUTPUT,
	audit: SSH_TRUNCATED_OUTPUT,
	restart: RESTART_OUTPUT,
};

// ── synthetic call builder ────────────────────────────────────────────────────

type SshInput = (typeof SSH_INPUT)[Variation];
type SshCallBase = { readonly callId: string; readonly toolName: "ssh"; readonly input: SshInput };

function sshErrorCall(call: SshCallBase): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(SERVICE_DOWN, {}, true) };
}

function sshTruncatedCall(call: SshCallBase): ActiveToolCall {
	return {
		...call,
		status: "success",
		output: toolResult(SSH_TRUNCATED_OUTPUT, { meta: { truncation: { artifactId: "ssh-audit-7b3c" } } }),
	};
}

function sshSuccessCall(call: SshCallBase, variation: Variation): ActiveToolCall {
	if (variation === "audit") return sshTruncatedCall(call);
	return { ...call, status: "success", output: toolResult(OUTPUT[variation]) };
}

/** Build the exact `ActiveToolCall` a live ssh run produces, from the config knobs. */
function buildSshCall(variation: Variation, state: SshState): ActiveToolCall {
	const input = SSH_INPUT[variation];
	const callId = `ssh-preview-${variation}-${state}`;
	const call: SshCallBase = { callId, toolName: "ssh", input };

	if (state === "pending") return pendingToolCall(callId, "ssh", input);
	if (state === "error") return sshErrorCall(call);
	if (state === "truncated") return sshTruncatedCall(call);
	return sshSuccessCall(call, variation);
}

const STREAM_INTERVAL_MS = 55;

/** A running (or, once revealed, resolved) ssh run whose output is the streamed prefix
 *  so far — fed through the partial-output channel, exactly like a live streamed run. */
function streamingSshCall(variation: Variation, partialOutput: string, stillStreaming: boolean): ActiveToolCall {
	const input = SSH_INPUT[variation];
	return {
		callId: `ssh-stream-${variation}`,
		toolName: "ssh",
		input,
		status: stillStreaming ? "running" : "success",
		output: stillStreaming
			? { content: [{ type: "text", text: partialOutput }], details: {} }
			: toolResult(OUTPUT[variation]),
	};
}

// ── showcase entry ─────────────────────────────────────────────────────────────

function sshMainCall(
	variation: Variation,
	state: SshState,
	streamedOutput: string,
	streaming: boolean,
): ActiveToolCall {
	return state === "streaming"
		? streamingSshCall(variation, streamedOutput, streaming)
		: buildSshCall(variation, state);
}

function sshGridState(state: SshState): SshState {
	return state === "streaming" ? "success" : state;
}

const SSH_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "deploy" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: toolPreviewControl(),
};

function SshEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "deploy");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const [nonce, setNonce] = useState(0);
	const { text: streamedOutput, streaming } = useLineStream(OUTPUT[variation], nonce, STREAM_INTERVAL_MS);
	const isStreaming = state === "streaming";
	const mainCall = sshMainCall(variation, state, streamedOutput, streaming);
	const gridState = sshGridState(state);

	return (
		<Demo
			summary="The `ssh` tool card, rendered by the PRODUCTION renderer (renderSsh) on a synthetic ActiveToolCall built from the knobs — identical to a live run. SSH has its OWN renderer (not bash): an 'SSH' head + a `[host]` badge + the `$ command` row + remote output on the dark term surface, plus a truncation note + artifact. NO Wall stat (ssh emits none). STREAMS the output in (state=streaming) via the partial-output channel, following the tail. The Demo Dock replays the full conversation."
			importPath="entries/features/ssh (live renderSsh)"
			controls={panel}
			stage="stretch"
		>
			<ToolStreamingReplay active={isStreaming} streaming={streaming} onReplay={() => setNonce(n => n + 1)} />
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildSshCall(v, gridState)}
			/>
		</Demo>
	);
}

const sshDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps ssh -> renderSsh. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderSsh is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "ssh",',
			"//   input:  { host, command, cwd?, timeout? },",
			"//   output: { content, details: { meta?: { truncation: { artifactId } } } },",
			'//   status: "pending" | "running" | "success" | "error",',
			"// }",
			"//",
			'// Head: "SSH" + a [host] badge + the `$ command` row.',
			"// Body: remote stdout/stderr on the dark terminal surface; streams via the",
			"// partial-output channel exactly like a live run. Capped output spills to an",
			"// artifact (output.details.meta.truncation.artifactId). Unlike bash there is",
			"// NO Wall stat — ssh emits no wall time.",
		].join("\n"),
	),
	examples: [
		{
			label: "Host status",
			code: JSON.stringify('{ host: "staging-1", command: "uptime && free -h" }'),
		},
		{
			label: "Deploy (cwd + timeout)",
			code: JSON.stringify(
				'{ host: "staging-1", command: "sudo /opt/deploy/release.sh", cwd: "/opt/deploy", timeout: 600 }',
			),
		},
		{
			label: "Truncated audit (artifact spill)",
			code: JSON.stringify(
				'{ host: "db-1", command: "journalctl -u ssh -n 9000" }  // output.details.meta.truncation.artifactId',
			),
		},
		{
			label: "Streaming output",
			code: JSON.stringify(
				'// status: "running" feeds remote output through the partial-output channel, following the tail.',
			),
		},
	],
	api: [
		{
			name: "host",
			type: "string",
			required: true,
			description: "Remote host/alias to connect to; rendered as the [host] badge.",
		},
		{
			name: "command",
			type: "string",
			required: true,
			description: "Command to run remotely; shown in the `$ command` row.",
		},
		{
			name: "cwd",
			type: "string",
			description: "Working directory on the remote host before running the command.",
		},
		{
			name: "timeout",
			type: "number",
			description: "Max seconds to allow the remote command to run before aborting.",
		},
		{
			name: "output.details.meta.truncation.artifactId",
			type: "string",
			description: "Set when output is capped; the full transcript spills to this artifact.",
		},
	],
};

export const sshEntries: readonly ShowcaseEntry[] = [
	{
		id: "ssh-tool",
		name: "SSH",
		Component: SshEntry,
		config: SSH_CONFIG,
		docs: sshDocs,
		demo: {
			createDriver: createSshDemoDriver,
			sessionRef: SSH_DEMO_SESSION_REF,
			title: "ssh · live conversation",
		},
	},
];

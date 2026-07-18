import {
	createIrcDemoDriver,
	IRC_DEMO_SESSION_REF,
	IRC_DETAILS,
	IRC_INPUT,
	IRC_OUTPUT_TEXT,
	type IrcVariation,
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

type Variation = IrcVariation;
type IrcState = "success" | "error";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["list", "send", "send-no-reply", "send-failed", "error"];
const STATES: IrcState[] = ["success", "error"];

type IrcCallBase = {
	readonly callId: string;
	readonly toolName: "irc";
	readonly input: Record<string, unknown>;
};

function ircErrorCall(call: IrcCallBase, text: string): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function ircSuccessCall(call: IrcCallBase, variation: Variation): ActiveToolCall {
	const text = IRC_OUTPUT_TEXT[variation] ?? "";
	const details = IRC_DETAILS[variation] ?? {};
	if (variation === "error") return ircErrorCall(call, text);
	return { ...call, status: "success", output: toolResult(text, details) };
}

function buildIrcCall(variation: Variation, state: IrcState): ActiveToolCall {
	const input = IRC_INPUT[variation] ?? { op: "list" };
	const base: IrcCallBase = { callId: `irc-${variation}`, toolName: "irc", input };
	if (state === "error") return ircErrorCall(base, IRC_OUTPUT_TEXT.error ?? "");
	return ircSuccessCall(base, variation);
}

const IRC_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "list" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function IrcEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "list");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const mainCall = buildIrcCall(variation, state);

	return (
		<Demo
			summary="The `irc` tool card, rendered by the PRODUCTION renderer (registered under `irc`) on a synthetic ActiveToolCall. Shows 'IRC' head + sparkle icon + op/target badges + message text + delivery results + replies + peer list."
			importPath="entries/features/irc (live irc renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildIrcCall(v, "success")}
			/>
		</Demo>
	);
}

const ircDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps irc -> renderIrc. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderIrc is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "irc",',
			"//   input:  { op, to?, message?, awaitReply? },",
			"//   output: { content, details: { from, peers?, delivered?, replies?, failed?, notFound? } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			"// Head: 'IRC' label + an op badge (accent tone when op === send), plus to=<peer>",
			"//       and no-reply badges; a 'partial' / 'failed' stat when deliveries fail.",
			"// Body: the quoted message, the delivery line (Delivered to N peer(s)), reply",
			"//       blocks, failed/unknown-peer notes, and the live peer list for the list op.",
		].join("\n"),
	),
	examples: [
		{
			label: "List live agents",
			code: JSON.stringify('{ op: "list" }'),
		},
		{
			label: "Send and await a reply",
			code: JSON.stringify(
				'{ op: "send", to: "agent-jo", message: "Can you review the pipeline results?", awaitReply: true }',
			),
		},
		{
			label: "Fire-and-forget send",
			code: JSON.stringify(
				'{ op: "send", to: "agent-alex", message: "Deploy the latest build.", awaitReply: false }  // awaitReply:false -> no-reply badge',
			),
		},
		{
			label: "Delivery failure (state)",
			code: JSON.stringify(
				'// output.details.failed non-empty + delivered:[] -> error tone\n// and a "No recipients received the message." body line.',
			),
		},
	],
	api: [
		{
			name: "op",
			type: '"list" | "send"',
			required: true,
			description:
				"Operation: list live peers, or send a message. Rendered as the head op badge (accent tone for send).",
		},
		{
			name: "to",
			type: "string",
			description: "Recipient peer id (or 'all' to broadcast) for the send op; shown as a to=<peer> badge.",
		},
		{
			name: "message",
			type: "string",
			description: "Message body for the send op; quoted at the top of the card body.",
		},
		{
			name: "awaitReply",
			type: "boolean",
			description: "When false, the call does not wait for a reply and the card shows a 'no-reply' badge.",
		},
		{
			name: "output.details.peers",
			type: "{ id; displayName; kind; status }[]",
			description: "Live agents returned by the list op; rendered in the Peers body as id [name · kind · status].",
		},
		{
			name: "output.details.delivered",
			type: "string[]",
			description: "Peer ids that received the message; drives the 'Delivered to N peer(s)' line.",
		},
		{
			name: "output.details.replies",
			type: "{ from; text }[]",
			description: "Reply blocks rendered under the message when awaitReply resolved.",
		},
		{
			name: "output.details.failed",
			type: "{ id; error }[]",
			description: "Failed deliveries; non-empty flips the card to error (or 'partial' when some replies landed).",
		},
		{
			name: "output.details.notFound",
			type: "string[]",
			description: "Unknown peer ids, listed in the body as '? Unknown peers'.",
		},
	],
};

export const ircEntries: readonly ShowcaseEntry[] = [
	{
		id: "irc-tool",
		name: "IRC",
		Component: IrcEntry,
		config: IRC_CONFIG,
		docs: ircDocs,
		demo: {
			createDriver: createIrcDemoDriver,
			sessionRef: IRC_DEMO_SESSION_REF,
			title: "irc · check agents and message Jo",
		},
	},
];

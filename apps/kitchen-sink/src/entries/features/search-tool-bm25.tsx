import {
	createSearchToolBm25DemoDriver,
	SEARCH_TOOL_BM25_DEMO_SESSION_REF,
	SEARCH_TOOL_BM25_DETAILS,
	SEARCH_TOOL_BM25_INPUT,
	SEARCH_TOOL_BM25_OUTPUT_TEXT,
	type SearchToolBm25Variation,
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

type Variation = SearchToolBm25Variation;
type Bm25State = "success" | "error";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["normal", "no-matches", "empty", "error"];
const STATES: Bm25State[] = ["success", "error"];

type Bm25CallBase = {
	readonly callId: string;
	readonly toolName: "search_tool_bm25";
	readonly input: Record<string, unknown>;
};

function bm25ErrorCall(call: Bm25CallBase, text: string): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function bm25SuccessCall(call: Bm25CallBase, variation: Variation): ActiveToolCall {
	const text = SEARCH_TOOL_BM25_OUTPUT_TEXT[variation] ?? "";
	const details = SEARCH_TOOL_BM25_DETAILS[variation] ?? {};
	if (variation === "error") return bm25ErrorCall(call, text);
	return { ...call, status: "success", output: toolResult(text, details) };
}

function buildBm25Call(variation: Variation, state: Bm25State): ActiveToolCall {
	const input = SEARCH_TOOL_BM25_INPUT[variation] ?? { query: "" };
	const base: Bm25CallBase = { callId: `stbm25-${variation}`, toolName: "search_tool_bm25", input };
	if (state === "error") return bm25ErrorCall(base, SEARCH_TOOL_BM25_OUTPUT_TEXT.error ?? "");
	return bm25SuccessCall(base, variation);
}

const BM25_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "normal" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function SearchToolBm25Entry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "normal");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const mainCall = buildBm25Call(variation, state);

	return (
		<Demo
			summary="The `search_tool_bm25` tool card, rendered by the PRODUCTION renderer (registered under `search_tool_bm25`) on a synthetic ActiveToolCall. Shows 'Tool Discovery' head + query/match/total badges + matched MCP/builtin tool list with description and BM25 scores."
			importPath="entries/features/search-tool-bm25 (live search_tool_bm25 renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildBm25Call(v, "success")}
			/>
		</Demo>
	);
}

const searchToolBm25Docs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps search_tool_bm25 -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The renderer is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "search_tool_bm25",',
			"//   input:  { query, limit },  // BM25 ranking over discoverable tools",
			"//   output: { content, details: { query, limit, total_tools, activated_tools,",
			"//             active_selected_tools, tools: Match[] } },",
			'//   status: "success" | "error",',
			"// }",
			"//",
			"// Head: a 'Tool Discovery' label + query / match / total badges.",
			"// Body: details.tools — the ranked MCP/builtin matches, each with name, label,",
			"// description, server origin, and a BM25 score. tools: [] -> no-match; total_tools: 0 -> empty.",
		].join("\n"),
	),
	examples: [
		{
			label: "Discover tools by query",
			code: JSON.stringify('{ query: "jira issue create ticket", limit: 8 }'),
		},
		{
			label: "No matching tools",
			code: JSON.stringify('{ query: "asdfghjkl zxcvbnm", limit: 8 }  // tools: [] -> no-match state'),
		},
		{
			label: "No discoverable tools",
			code: JSON.stringify('{ query: "jira", limit: 8 }  // total_tools: 0 -> empty state'),
		},
		{
			label: "Discovery unavailable",
			code: JSON.stringify('// status: "error" -> "Tool discovery is unavailable in this session."'),
		},
	],
	api: [
		{
			name: "query",
			type: "string",
			required: true,
			description: "Natural-language query ranked against tool names/descriptions via BM25.",
		},
		{
			name: "limit",
			type: "number",
			description: "Maximum number of ranked tools to return.",
		},
		{
			name: "output.details.total_tools",
			type: "number",
			description: "Total discoverable tools scanned; shown as a head badge. 0 → empty state.",
		},
		{
			name: "output.details.tools",
			type: "{ name; label; description; server_name?; mcp_tool_name?; schema_keys; score }[]",
			description:
				"Ranked matches; each row renders name/label, description, server origin, and BM25 score. [] → no-match state.",
		},
		{
			name: "output.details.tools[].score",
			type: "number",
			description: "BM25 relevance score for the match.",
		},
		{
			name: "output.details.tools[].server_name",
			type: "string",
			description: "MCP server origin (with mcp_tool_name) for MCP-provided tools.",
		},
		{
			name: "output.details.tools[].schema_keys",
			type: "string[]",
			description: "Preview of the tool's input schema keys.",
		},
		{
			name: "output.details.activated_tools",
			type: "string[]",
			description: "Tools activated by this discovery search.",
		},
		{
			name: "output.details.active_selected_tools",
			type: "string[]",
			description: "Builtin tools already active in the session.",
		},
	],
};

export const searchToolBm25Entries: readonly ShowcaseEntry[] = [
	{
		id: "search-tool-bm25-tool",
		name: "Search Tool BM25",
		Component: SearchToolBm25Entry,
		config: BM25_CONFIG,
		docs: searchToolBm25Docs,
		demo: {
			createDriver: createSearchToolBm25DemoDriver,
			sessionRef: SEARCH_TOOL_BM25_DEMO_SESSION_REF,
			title: "search_tool_bm25 · discover Jira tools",
		},
	},
];

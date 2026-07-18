import {
	createWebSearchDemoDriver,
	toolResult,
	WEB_SEARCH_DEMO_SESSION_REF,
	INPUT as WEB_SEARCH_INPUT,
	OUTPUT as WEB_SEARCH_OUTPUT,
	RESPONSE as WEB_SEARCH_RESPONSE,
	type WebSearchVariation,
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

// ─────────────────────────────────────────────────────────────────────────────
// `web_search` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (registered
// under `web_search` in @fraym/ui's tool-renderer map) fed a synthetic
// `ActiveToolCall` built from the knobs — identical to a live run. Web Search
// shows a "Web Search" head + a provider badge + an `N sources` stat; the body
// is the query row, an Answer section, a Sources section, and a Metadata
// section, all driven by `details.response` (a `SearchResponse`).
//
// Axes (control knobs):
//   VARIATION  normal · answer-only · sources-only · error · acme · perplexity · fallback
//   STATE      success · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = WebSearchVariation;
type SearchState = "success" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = [
	"normal",
	"answer-only",
	"sources-only",
	"error",
	"acme",
	"perplexity",
	"fallback",
];
const STATES: SearchState[] = ["success", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

function searchInput(variation: Variation): Record<string, unknown> {
	return WEB_SEARCH_INPUT[variation] ?? { query: "" };
}

// ── synthetic call builder ────────────────────────────────────────────────────

type SearchCallBase = {
	readonly callId: string;
	readonly toolName: "web_search";
	readonly input: Record<string, unknown>;
};

function searchPendingCall(callId: string, input: Record<string, unknown>): ActiveToolCall {
	return { callId, toolName: "web_search", input, status: "running" };
}

function searchErrorCall(call: SearchCallBase, text: string): ActiveToolCall {
	// Error → no structured `details.response`; renderer shows the error banner.
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function searchSuccessCall(call: SearchCallBase, variation: Variation): ActiveToolCall {
	const text = WEB_SEARCH_OUTPUT[variation];

	// The `error` variation's natural form IS an error card, even at "success" state.
	if (variation === "error") return searchErrorCall(call, text);

	// `fallback` has no `details.response` (null) → renderer falls back to raw text.
	// Structured variations carry `details.response` (a `SearchResponse`).
	const response = WEB_SEARCH_RESPONSE[variation];
	const details = response ? { response } : {};
	return { ...call, status: "success", output: toolResult(text, details) };
}

/** Build the exact `ActiveToolCall` a live web_search run produces, from the config knobs. */
function buildSearchCall(variation: Variation, state: SearchState): ActiveToolCall {
	const input = searchInput(variation);
	const base: SearchCallBase = { callId: `web-search-${variation}-${state}`, toolName: "web_search", input };

	if (state === "pending") return searchPendingCall(base.callId, input);
	if (state === "error") return searchErrorCall(base, WEB_SEARCH_OUTPUT.error);
	return searchSuccessCall(base, variation);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const WEB_SEARCH_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "normal" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function WebSearchEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "normal");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = buildSearchCall(variation, state);

	return (
		<Demo
			summary="The `web_search` tool card, rendered by the PRODUCTION renderer (registered under `web_search`) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Web Search shows a 'Web Search' head + a provider badge + an 'N sources' stat; the body is a query row, an Answer section, a Sources section, and a Metadata section, all driven by `details.response`. The `fallback` variation drops `details.response` to exercise the raw-text path; `error` shows the error banner."
			importPath="entries/features/web-search (live web_search renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildSearchCall(v, "success")}
			/>
		</Demo>
	);
}

const webSearchDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps web_search -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The renderer is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "web_search",',
			"//   input:  { query, provider?, num_search_results?, recency? },",
			"//   output: { content, details: { response: SearchResponse | absent } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: a `Web Search` title + a provider badge + an `N sources` stat.",
			"// Body: the query row, an Answer section, a Sources section, and a",
			"// Metadata section — all driven by details.response (a SearchResponse).",
			"// No details.response (error / fallback) -> renderer shows the raw text.",
		].join("\n"),
	),
	examples: [
		{
			label: "Search with answer + sources",
			code: JSON.stringify('{ query: "tokio vs async-std rust runtime", provider: "brave" }'),
		},
		{
			label: "Answer-only (no sources)",
			code: JSON.stringify('{ query: "what year did rust 1.0 release", provider: "gemini" }'),
		},
		{
			label: "Cap the source count",
			code: JSON.stringify(
				'{ query: "best mechanical keyboard switches", provider: "brave", num_search_results: 3 }',
			),
		},
		{
			label: "Recency filter",
			code: JSON.stringify(
				'{ query: "what are the new features in react 19", provider: "acme", recency: "year" }',
			),
		},
	],
	api: [
		{
			name: "query",
			type: "string",
			required: true,
			description: "The search query; rendered in the body's query row.",
		},
		{
			name: "provider",
			type: "string",
			description:
				"Search backend (brave / gemini / acme / perplexity / synthetic); shown as the head provider badge.",
		},
		{
			name: "num_search_results",
			type: "number",
			description: "Cap on the number of returned sources.",
		},
		{
			name: "recency",
			type: "string",
			description: 'Time-window filter (e.g. "year"); restricts results to recent content.',
		},
		{
			name: "output.details.response",
			type: "SearchResponse",
			description:
				"Structured result that drives the body. Absent (error / fallback) -> the card falls back to raw text.",
		},
		{
			name: "output.details.response.answer",
			type: "string",
			description: "Synthesized answer; rendered in the Answer section.",
		},
		{
			name: "output.details.response.sources",
			type: "SearchSource[]",
			description:
				"Ranked results (title / url / snippet / publishedDate); the Sources section and the `N sources` stat.",
		},
		{
			name: "output.details.response.citations",
			type: "SearchCitation[]",
			description: "Inline citations with quoted text linking back to a source url.",
		},
		{
			name: "output.details.response.usage",
			type: "SearchUsage",
			description: "Token / search-request counts surfaced in the Metadata section.",
		},
	],
};

export const webSearchEntries: readonly ShowcaseEntry[] = [
	{
		id: "web-search-tool",
		name: "Web Search",
		Component: WebSearchEntry,
		config: WEB_SEARCH_CONFIG,
		docs: webSearchDocs,
		demo: {
			createDriver: createWebSearchDemoDriver,
			sessionRef: WEB_SEARCH_DEMO_SESSION_REF,
			title: "web_search · live conversation",
		},
	},
];

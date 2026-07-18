import { createSearchDemoDriver, SEARCH_DEMO_SESSION_REF } from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import { CONTENT, INPUT } from "../../fixtures";
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

// ─────────────────────────────────────────────────────────────────────────────
// `search` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderSearch`,
// registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. Search parses `details.displayContent` (the `*N│…` gutter
// format) into directory-grouped, line-numbered match lists; the head shows the
// pattern + `N matches · M files` + truncation. Search does NOT stream (single grep).
//
// Axes (control knobs):
//   VARIATION  multiFile · singleFile · rootFiles
//   STATE      matches · empty · truncated · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "multiFile" | "singleFile" | "rootFiles";
type SearchState = "matches" | "empty" | "truncated" | "error" | "pending";
type View = ToolPreviewView;
type SearchCallBase = Pick<ActiveToolCall, "callId" | "toolName" | "input">;

const VARIATIONS: Variation[] = ["multiFile", "singleFile", "rootFiles"];
const STATES: SearchState[] = ["matches", "empty", "truncated", "error", "pending"];

// ── synthetic call builder ────────────────────────────────────────────────────

/** An `AgentToolResult`-shaped output: `content` (model text, ignored by the renderer) + `details`. */
function searchOutput(text: string, details: Record<string, unknown>, isError = false) {
	return { content: [{ type: "text", text }], details, isError };
}

function searchSuccessDetails(variation: Variation, truncated = false): Record<string, unknown> {
	const { display, matchCount, fileCount, scopePath } = CONTENT[variation];
	const details: Record<string, unknown> = { matchCount, fileCount, scopePath, displayContent: display };
	if (!truncated) return details;
	return {
		...details,
		truncated: true,
		fileLimitReached: 20,
		meta: { truncation: { truncatedBy: "lines", artifactId: "search-7f3c" } },
	};
}

function searchSuccessCall(base: SearchCallBase, variation: Variation, truncated = false): ActiveToolCall {
	const { display } = CONTENT[variation];
	return {
		...base,
		status: "success",
		output: searchOutput(display, searchSuccessDetails(variation, truncated)),
	};
}

function buildSearchCall(variation: Variation, state: SearchState): ActiveToolCall {
	const input = INPUT[variation];
	const callId = `search-preview-${variation}-${state}`;
	const base = { callId, toolName: "search", input } as const;

	if (state === "pending") return { ...base, status: "running" };

	if (state === "error") {
		return {
			...base,
			status: "error",
			output: searchOutput("", { error: "Invalid regex: unbalanced parenthesis at position 7" }, true),
		};
	}

	if (state === "empty") {
		return {
			...base,
			status: "success",
			output: searchOutput("No matches found", { matchCount: 0, fileCount: 0, displayContent: "" }),
		};
	}

	return searchSuccessCall(base, variation, state === "truncated");
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const SEARCH_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "multiFile" },
	state: { kind: "select", label: "state", options: STATES, default: "matches" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: toolPreviewControl(),
};

function SearchEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "multiFile");
	const state = selectControlValue(values.state, STATES, "matches");
	const view: View = toolPreviewView(values.view);

	return (
		<Demo
			summary="The `search` tool card, rendered by the PRODUCTION renderer (renderSearch) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Parses `details.displayContent` (the `*N│…` gutter format) into directory-grouped, line-numbered match lists: dim `dir/` group headers, per-file headers (📄 path #hash + match count), MATCH lines emphasized vs context dimmed, `⋯` gap rows, and a truncation/missing-paths footer. Head shows the pattern + `N matches · M files` + `⚠ truncated`. No streaming (single grep call). The Demo Dock replays the full conversation."
			importPath="entries/features/search (live renderSearch)"
			controls={panel}
			stage="stretch"
		>
			{/* key includes view+state so toggling remounts the card — ToolCard's
			    `defaultOpen` is initial-state-only (it never auto-closes in production). */}
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildSearchCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildSearchCall(v, state === "pending" ? "matches" : state)}
			/>
		</Demo>
	);
}

const searchDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps search -> renderSearch. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderSearch is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "search",',
			"//   input:  { pattern, paths, gitignore? },  // regex + path scope",
			"//   output: { content, details: { displayContent, matchCount, fileCount, scopePath,",
			"//             truncated?, meta? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: the pattern + `N matches · M files` + truncation badge.",
			"// Body: details.displayContent — the `*N│…` gutter format (`*` marks the match line,",
			"// ` ` context) — parsed into directory-grouped, line-numbered match lists.",
			"// search does NOT stream (single grep pass).",
		].join("\n"),
	),
	examples: [
		{
			label: "Multi-file regex",
			code: JSON.stringify('{ pattern: "useToolStream", paths: ["packages/ui/src"] }'),
		},
		{
			label: "Single file",
			code: JSON.stringify('{ pattern: "user\\\\.id", paths: ["packages/ui/src/hooks/session-tools.ts"] }'),
		},
		{
			label: "Root files, include ignored",
			code: JSON.stringify('{ pattern: "\\"name\\"|\\"types\\"", paths: ["."], gitignore: false }'),
		},
		{
			label: "No matches / truncated",
			code: JSON.stringify("// matchCount: 0 -> empty state; output.details.truncated -> capped badge"),
		},
	],
	api: [
		{
			name: "pattern",
			type: "string",
			required: true,
			description: "Regular expression to search for.",
		},
		{
			name: "paths",
			type: "string[]",
			required: true,
			description: "Files or directories to search within.",
		},
		{
			name: "gitignore",
			type: "boolean",
			default: "true",
			description: "Honor .gitignore; set false to include ignored files.",
		},
		{
			name: "output.details.displayContent",
			type: "string",
			description:
				"The `*N│…` gutter listing; parsed into directory-grouped, line-numbered match lists. `*` marks the match line, ` ` context.",
		},
		{
			name: "output.details.matchCount",
			type: "number",
			description: "The `N matches` head stat. 0 → empty state.",
		},
		{
			name: "output.details.fileCount",
			type: "number",
			description: "The `M files` head stat.",
		},
		{
			name: "output.details.scopePath",
			type: "string",
			description: "Directory scope shown in the head.",
		},
		{
			name: "output.details.truncated",
			type: "boolean",
			description: "Result cap hit (with fileLimitReached count); renders the truncated badge.",
		},
		{
			name: "output.details.meta.truncation",
			type: "{ truncatedBy: string; artifactId: string }",
			description: "Full results recoverable via the artifact when truncated.",
		},
		{
			name: "output.details.error",
			type: "string",
			description: "Set on an invalid regex; flips the card to the error tone.",
		},
	],
};

export const searchEntries: readonly ShowcaseEntry[] = [
	{
		id: "search-tool",
		name: "Search",
		Component: SearchEntry,
		config: SEARCH_CONFIG,
		docs: searchDocs,
		demo: {
			createDriver: createSearchDemoDriver,
			sessionRef: SEARCH_DEMO_SESSION_REF,
			title: "search · live conversation",
		},
	},
];

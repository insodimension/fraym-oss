import { AST_GREP_DEMO_SESSION_REF, createAstGrepDemoDriver } from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import { AST_GREP_BROAD, AST_GREP_CAPTURES, AST_GREP_NODE } from "../../fixtures/ast-operations";
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
// `ast_grep` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderAstGrep`,
// registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. ast_grep parses `details.displayContent` (the `*N│…` gutter +
// `meta:` capture format) into directory-grouped, line-numbered structural-match lists;
// the head shows the AST pattern + `N matches · M files` + `searched K` + limit/parse-error
// badges. ast_grep does NOT stream (single native AST query).
//
// Axes (control knobs):
//   VARIATION  captures · node · broad
//   STATE      matches · empty · limit · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "captures" | "node" | "broad";
type AstGrepState = "matches" | "empty" | "limit" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["captures", "node", "broad"];
const STATES: AstGrepState[] = ["matches", "empty", "limit", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

const CONTENT: Record<
	Variation,
	{ display: string; matchCount: number; fileCount: number; filesSearched: number; scopePath?: string }
> = {
	captures: { display: AST_GREP_CAPTURES, matchCount: 4, fileCount: 3, filesSearched: 12, scopePath: "src" },
	node: { display: AST_GREP_NODE, matchCount: 1, fileCount: 1, filesSearched: 3, scopePath: "src/lib" },
	broad: { display: AST_GREP_BROAD, matchCount: 6, fileCount: 6, filesSearched: 240, scopePath: "packages" },
};

const INPUT: Record<Variation, Record<string, unknown>> = {
	captures: { pat: "const [$NAME, $SETTER] = useState($INIT)", paths: ["src"] },
	node: { pat: "export function clamp($$$PARAMS) { $$$BODY }", paths: ["src/lib"] },
	broad: { pat: "console.log($$$ARGS)", paths: ["packages"] },
};

// ── synthetic call builder ────────────────────────────────────────────────────

/** An `AgentToolResult`-shaped output: `content` (model text, ignored by the renderer) + `details`. */
function astGrepOutput(text: string, details: Record<string, unknown>, isError = false) {
	return { content: [{ type: "text", text }], details, isError };
}

type AstGrepCallBase = {
	readonly callId: string;
	readonly toolName: "ast_grep";
	readonly input: Record<string, unknown>;
};

type AstGrepContent = (typeof CONTENT)[Variation];
type AstGrepCallBuilder = (base: AstGrepCallBase, content: AstGrepContent) => ActiveToolCall;

function pendingAstGrepCall(base: AstGrepCallBase): ActiveToolCall {
	return { ...base, status: "running" };
}

function errorAstGrepCall(base: AstGrepCallBase): ActiveToolCall {
	return {
		...base,
		status: "error",
		output: astGrepOutput("", { error: "Invalid AST pattern: unmatched metavariable $$$" }, true),
	};
}

function emptyAstGrepCall(base: AstGrepCallBase, content: AstGrepContent): ActiveToolCall {
	return {
		...base,
		status: "success",
		output: astGrepOutput("No matches found", {
			matchCount: 0,
			fileCount: 0,
			filesSearched: content.filesSearched,
			scopePath: content.scopePath,
			displayContent: "",
			parseErrors: ["src/legacy.ts: unexpected token"],
			parseErrorsTotal: 1,
		}),
	};
}

function limitedAstGrepCall(base: AstGrepCallBase, content: AstGrepContent): ActiveToolCall {
	return {
		...base,
		status: "success",
		output: astGrepOutput(content.display, {
			matchCount: content.matchCount,
			fileCount: content.fileCount,
			filesSearched: content.filesSearched,
			scopePath: content.scopePath,
			displayContent: content.display,
			limitReached: true,
			parseErrors: ["packages/pkg-3/broken.ts: parse error"],
			parseErrorsTotal: 1,
		}),
	};
}

function matchedAstGrepCall(base: AstGrepCallBase, content: AstGrepContent): ActiveToolCall {
	const { display, matchCount, fileCount, filesSearched, scopePath } = content;
	return {
		...base,
		status: "success",
		output: astGrepOutput(display, { matchCount, fileCount, filesSearched, scopePath, displayContent: display }),
	};
}

const AST_GREP_CALL_BUILDERS: Record<AstGrepState, AstGrepCallBuilder> = {
	matches: matchedAstGrepCall,
	empty: emptyAstGrepCall,
	limit: limitedAstGrepCall,
	error: errorAstGrepCall,
	pending: pendingAstGrepCall,
};

function buildAstGrepCall(variation: Variation, state: AstGrepState): ActiveToolCall {
	const input = INPUT[variation];
	const callId = `ast-grep-preview-${variation}-${state}`;
	const base: AstGrepCallBase = { callId, toolName: "ast_grep", input };
	return AST_GREP_CALL_BUILDERS[state](base, CONTENT[variation]);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const AST_GREP_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "captures" },
	state: { kind: "select", label: "state", options: STATES, default: "matches" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function AstGrepEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "captures");
	const state = selectControlValue(values.state, STATES, "matches");
	const view: View = toolPreviewView(values.view);

	return (
		<Demo
			summary="The `ast_grep` tool card, rendered by the PRODUCTION renderer (renderAstGrep) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Parses `details.displayContent` (the `*N│…` gutter + `meta:` capture format) into directory-grouped, line-numbered structural-match lists: dim `dir/` group headers, per-file headers (📄 path #hash + match count), MATCH lines emphasized vs continuation dimmed, and `↳ meta` captured-metavariable rows. Head shows the AST pattern + `N matches · M files` + `searched K` + `⚠ limit reached` / `⚠ N parse errors`. No streaming (single native AST query). The Demo Dock replays the full conversation."
			importPath="entries/features/ast-grep (live renderAstGrep)"
			controls={panel}
			stage="stretch"
		>
			{/* key includes view+state so toggling remounts the card — ToolCard's
			    `defaultOpen` is initial-state-only (it never auto-closes in production). */}
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildAstGrepCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildAstGrepCall(v, state === "pending" ? "matches" : state)}
			/>
		</Demo>
	);
}

const astGrepDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps ast_grep -> renderAstGrep. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderAstGrep is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "ast_grep",',
			"//   input:  { pat, paths },  // structural AST query, not text",
			"//   output: { content, details: { displayContent, matchCount, fileCount,",
			"//             filesSearched, scopePath, limitReached?, parseErrors?, error? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: the AST pattern + `N matches · M files` + `searched K` + limit / parse-error badges.",
			"// Body: details.displayContent — the `*N│…` gutter + `meta:` capture format — parsed into",
			"// directory-grouped, line-numbered structural-match lists. ast_grep does NOT stream.",
		].join("\n"),
	),
	examples: [
		{
			label: "Capture metavariables",
			code: JSON.stringify('{ pat: "const [$NAME, $SETTER] = useState($INIT)", paths: ["src"] }'),
		},
		{
			label: "Node match (function)",
			code: JSON.stringify('{ pat: "export function clamp($$$PARAMS) { $$$BODY }", paths: ["src/lib"] }'),
		},
		{
			label: "Broad scan",
			code: JSON.stringify('{ pat: "console.log($$$ARGS)", paths: ["packages"] }'),
		},
		{
			label: "No matches / bad pattern",
			code: JSON.stringify("// matchCount: 0 -> empty state; output.details.error -> error tone"),
		},
	],
	api: [
		{
			name: "pat",
			type: "string",
			required: true,
			description: "AST pattern with metavariables ($NAME, $$$ARGS); matches structural nodes, not raw text.",
		},
		{
			name: "paths",
			type: "string[]",
			required: true,
			description: "Files or directories to query.",
		},
		{
			name: "output.details.displayContent",
			type: "string",
			description:
				"The `*N│…` gutter + `meta:` capture listing; parsed into directory-grouped, line-numbered match lists.",
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
			name: "output.details.filesSearched",
			type: "number",
			description: "The `searched K` head stat.",
		},
		{
			name: "output.details.scopePath",
			type: "string",
			description: "Directory scope shown in the head.",
		},
		{
			name: "output.details.limitReached",
			type: "boolean",
			description: "Result cap was hit; renders the 'limit' badge.",
		},
		{
			name: "output.details.parseErrors",
			type: "string[]",
			description: "Files that failed to parse (with parseErrorsTotal count); renders the parse-error badge.",
		},
		{
			name: "output.details.error",
			type: "string",
			description: "Set on an invalid pattern; flips the card to the error tone.",
		},
	],
};

export const astGrepEntries: readonly ShowcaseEntry[] = [
	{
		id: "ast-grep-tool",
		name: "AST Grep",
		Component: AstGrepEntry,
		config: AST_GREP_CONFIG,
		docs: astGrepDocs,
		demo: {
			createDriver: createAstGrepDemoDriver,
			sessionRef: AST_GREP_DEMO_SESSION_REF,
			title: "ast_grep · live conversation",
		},
	},
];

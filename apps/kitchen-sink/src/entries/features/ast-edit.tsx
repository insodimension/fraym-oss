import { AST_EDIT_DEMO_SESSION_REF, createAstEditDemoDriver } from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import { AST_EDIT_BROAD, AST_EDIT_MULTI, AST_EDIT_SINGLE } from "../../fixtures/ast-operations";
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
// `ast_edit` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderAstEdit`,
// registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. ast_edit parses `details.displayContent` (the `-<n>│old` / `+<n>│new`
// grouped diff) into directory-grouped before/after change rows; the head shows the op
// pattern (or `N rewrites`) + a `proposed` badge + `N replacements · M files` + `searched K`
// + limit/parse-error badges. ast_edit does NOT stream (single native rewrite pass).
//
// Axes (control knobs):
//   VARIATION  multiFile · single · broad
//   STATE      proposed · empty · limit · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "multiFile" | "single" | "broad";
type AstEditState = "proposed" | "empty" | "limit" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["multiFile", "single", "broad"];
const STATES: AstEditState[] = ["proposed", "empty", "limit", "error", "pending"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

const CONTENT: Record<
	Variation,
	{
		display: string;
		ops: { pat: string; out: string }[];
		paths: string[];
		replacements: number;
		files: number;
		searched: number;
		scopePath?: string;
	}
> = {
	multiFile: {
		display: AST_EDIT_MULTI,
		ops: [{ pat: "console.log($$$ARGS)", out: "logger.info($$$ARGS)" }],
		paths: ["src"],
		replacements: 4,
		files: 3,
		searched: 12,
		scopePath: "src",
	},
	single: {
		display: AST_EDIT_SINGLE,
		ops: [{ pat: "export function clamp($$$P) { $$$B }", out: "export function clamp($$$P): number { $$$B }" }],
		paths: ["src/lib/clamp.ts"],
		replacements: 1,
		files: 1,
		searched: 1,
		scopePath: "src/lib/clamp.ts",
	},
	broad: {
		display: AST_EDIT_BROAD,
		ops: [{ pat: "export const VERSION = $V", out: "export const VERSION = $V" }],
		paths: ["packages"],
		replacements: 6,
		files: 6,
		searched: 240,
		scopePath: "packages",
	},
};

// ── synthetic call builder ────────────────────────────────────────────────────

/** An `AgentToolResult`-shaped output: `content` (model text, ignored by the renderer) + `details`. */
function astEditOutput(text: string, details: Record<string, unknown>, isError = false) {
	return { content: [{ type: "text", text }], details, isError };
}

type AstEditContent = (typeof CONTENT)[Variation];

function emptyAstEditOutput(content: AstEditContent) {
	return astEditOutput("No replacements made", {
		totalReplacements: 0,
		filesTouched: 0,
		filesSearched: content.searched,
		applied: false,
		limitReached: false,
		scopePath: content.scopePath,
		displayContent: "",
		parseErrors: ["src/legacy.ts: unexpected token"],
		parseErrorsTotal: 1,
	});
}

function limitedAstEditOutput(content: AstEditContent) {
	return astEditOutput(content.display, {
		totalReplacements: content.replacements,
		filesTouched: content.files,
		filesSearched: content.searched,
		applied: false,
		limitReached: true,
		scopePath: content.scopePath,
		displayContent: content.display,
		parseErrors: ["packages/pkg-4/legacy.ts: parse error"],
		parseErrorsTotal: 1,
	});
}

function proposedAstEditOutput(content: AstEditContent) {
	return astEditOutput(content.display, {
		totalReplacements: content.replacements,
		filesTouched: content.files,
		filesSearched: content.searched,
		applied: false,
		limitReached: false,
		scopePath: content.scopePath,
		displayContent: content.display,
	});
}

function astEditOutputForState(content: AstEditContent, state: AstEditState) {
	if (state === "error") return astEditOutput("Invalid AST pattern: unbalanced metavariable", {}, true);
	if (state === "empty") return emptyAstEditOutput(content);
	if (state === "limit") return limitedAstEditOutput(content);
	return proposedAstEditOutput(content);
}

function buildAstEditCall(variation: Variation, state: AstEditState): ActiveToolCall {
	const content = CONTENT[variation];
	const callId = `ast-edit-preview-${variation}-${state}`;
	const base = { callId, toolName: "ast_edit", input: { ops: content.ops, paths: content.paths } } as const;

	if (state === "pending") return { ...base, status: "running" };
	return {
		...base,
		status: state === "error" ? "error" : "success",
		output: astEditOutputForState(content, state),
	};
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const AST_EDIT_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "multiFile" },
	state: { kind: "select", label: "state", options: STATES, default: "proposed" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function AstEditEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "multiFile");
	const state = selectControlValue(values.state, STATES, "proposed");
	const view: View = toolPreviewView(values.view);

	return (
		<Demo
			summary="The `ast_edit` tool card, rendered by the PRODUCTION renderer (renderAstEdit) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Parses `details.displayContent` (the `-<n>│old` / `+<n>│new` grouped diff) into directory-grouped before/after change rows (del red / add green) inside the shared card frame: dim `dir/` group headers, per-file headers (📄 path #hash + `N replacements`). Head shows the op pattern (or `N rewrites`) + a `proposed` badge (the edit is a preview pending `resolve`) + `N replacements · M files` + `searched K` + `⚠ limit reached` / `⚠ N parse errors`. No streaming (single native rewrite pass). The Demo Dock replays the full conversation."
			importPath="entries/features/ast-edit (live renderAstEdit)"
			controls={panel}
			stage="stretch"
		>
			{/* key includes view+state so toggling remounts the card — ToolCard's
			    `defaultOpen` is initial-state-only (it never auto-closes in production). */}
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildAstEditCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildAstEditCall(v, state === "pending" ? "proposed" : state)}
			/>
		</Demo>
	);
}

const astEditDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps ast_edit -> renderAstEdit. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderAstEdit is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "ast_edit",',
			"//   input:  { ops: [{ pat, out }], paths },  // structural search -> replacement",
			"//   output: { content, details: { displayContent, totalReplacements, filesTouched,",
			"//             filesSearched, applied, limitReached, scopePath, parseErrors? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: the op pattern (or `N rewrites`) + a `proposed` badge + `N replacements · M files`",
			"// + `searched K` + limit / parse-error badges.",
			"// Body: details.displayContent — the grouped `-<n>│old` / `+<n>│new` diff — parsed into",
			"// directory-grouped before/after change rows. ast_edit does NOT stream (single rewrite pass).",
		].join("\n"),
	),
	examples: [
		{
			label: "Rewrite across a directory",
			code: JSON.stringify(
				'{ ops: [{ pat: "console.log($$$ARGS)", out: "logger.info($$$ARGS)" }], paths: ["src"] }',
			),
		},
		{
			label: "Single-file precise rewrite",
			code: JSON.stringify(
				'{ ops: [{ pat: "export function clamp($$$P) { $$$B }", out: "export function clamp($$$P): number { $$$B }" }], paths: ["src/lib/clamp.ts"] }',
			),
		},
		{
			label: "Limit reached",
			code: JSON.stringify('// output.details.limitReached -> "limit" badge; parseErrors -> parse-error badge'),
		},
		{
			label: "No replacements",
			code: JSON.stringify("// output.details.totalReplacements: 0 -> empty state"),
		},
	],
	api: [
		{
			name: "ops",
			type: "{ pat: string; out: string }[]",
			required: true,
			description:
				"AST search/replace operations. `pat` matches structural nodes via metavariables ($X, $$$ARGS); `out` is the replacement template.",
		},
		{
			name: "paths",
			type: "string[]",
			required: true,
			description: "Files or directories to rewrite within.",
		},
		{
			name: "output.details.displayContent",
			type: "string",
			description:
				"The grouped `-<n>│old` / `+<n>│new` diff; parsed into directory-grouped before/after change rows.",
		},
		{
			name: "output.details.totalReplacements",
			type: "number",
			description: "Replacements made; the `N replacements` head stat. 0 → empty state.",
		},
		{
			name: "output.details.filesTouched",
			type: "number",
			description: "Files changed; the `M files` head stat.",
		},
		{
			name: "output.details.filesSearched",
			type: "number",
			description: "Files scanned; the `searched K` head stat.",
		},
		{
			name: "output.details.applied",
			type: "boolean",
			description: "Whether changes were written; false renders the `proposed` badge.",
		},
		{
			name: "output.details.limitReached",
			type: "boolean",
			description: "Result cap was hit; renders the 'limit' badge.",
		},
		{
			name: "output.details.scopePath",
			type: "string",
			description: "Directory scope shown in the head.",
		},
		{
			name: "output.details.parseErrors",
			type: "string[]",
			description: "Files that failed to parse (with parseErrorsTotal count); renders the parse-error badge.",
		},
	],
};

export const astEditEntries: readonly ShowcaseEntry[] = [
	{
		id: "ast-edit-tool",
		name: "AST Edit",
		Component: AstEditEntry,
		config: AST_EDIT_CONFIG,
		docs: astEditDocs,
		demo: {
			createDriver: createAstEditDemoDriver,
			sessionRef: AST_EDIT_DEMO_SESSION_REF,
			title: "ast_edit · live conversation",
		},
	},
];

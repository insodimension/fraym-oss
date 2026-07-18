import { createLspDemoDriver, LSP_DEMO_SESSION_REF, pendingToolCall, toolResult } from "@fraym/fixtures";
import { type ActiveToolCall, ToolRender } from "@fraym/ui";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo, Note } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	type ToolPreviewView,
	toolPreviewDisplay,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `lsp` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderLsp`,
// registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`
// built from the knobs. Lsp shows all 6 visual families (hover, diagnostics,
// locations, symbols, text, JSON) via text-based parsing of `content[].text`.
//
// Axes (control knobs):
//   FAMILY  hover · diagnostics · diagnosticsOK · diagnosticsMultiFile ·
//           references · definition · symbols · symbolsWorkspace · codeActions ·
//           rename · renameFile · status · capabilities · request · generic · error
//   STATE   pending · success · error · warn
//   VIEW    collapsed · comfortable · compact · spacious
// ─────────────────────────────────────────────────────────────────────────────

type Family =
	| "hover"
	| "diagnostics"
	| "diagnosticsOK"
	| "diagnosticsMultiFile"
	| "references"
	| "definition"
	| "symbols"
	| "symbolsWorkspace"
	| "codeActions"
	| "rename"
	| "renameFile"
	| "status"
	| "capabilities"
	| "request"
	| "generic"
	| "error";

type LspState = "pending" | "success" | "error" | "warn";
type View = ToolPreviewView;

const FAMILIES: Family[] = [
	"hover",
	"diagnostics",
	"diagnosticsOK",
	"diagnosticsMultiFile",
	"references",
	"definition",
	"symbols",
	"symbolsWorkspace",
	"codeActions",
	"rename",
	"renameFile",
	"status",
	"capabilities",
	"request",
	"generic",
	"error",
];

const STATES: LspState[] = ["pending", "success", "error", "warn"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

interface LspInputShape {
	readonly action: string;
	readonly file?: string;
	readonly line?: number;
	readonly symbol?: string;
	readonly query?: string;
	readonly new_name?: string;
	readonly apply?: boolean;
	readonly payload?: string;
}

const FAMILY_INPUT: Record<Family, LspInputShape> = {
	hover: { action: "hover", file: "src/auth.ts", line: 42, symbol: "login" },
	diagnostics: { action: "diagnostics", file: "src/auth.ts" },
	diagnosticsOK: { action: "diagnostics", file: "src/store.ts" },
	diagnosticsMultiFile: { action: "diagnostics", file: "src/**/*.ts" },
	references: { action: "references", file: "src/auth.ts", line: 42, symbol: "login" },
	definition: { action: "definition", file: "src/auth.ts", line: 42, symbol: "login" },
	symbols: { action: "symbols", file: "src/auth.ts" },
	symbolsWorkspace: { action: "symbols", query: "login" },
	codeActions: { action: "code_actions", file: "src/auth.ts", line: 42 },
	rename: { action: "rename", file: "src/auth.ts", line: 42, symbol: "login", new_name: "authenticate", apply: false },
	renameFile: { action: "rename_file", file: "src/auth.ts", new_name: "src/auth-old.ts" },
	status: { action: "status" },
	capabilities: { action: "capabilities", file: "src/auth.ts" },
	request: { action: "request", file: "src/auth.ts", payload: '{"method":"textDocument/completion"}' },
	generic: { action: "reload", file: "src/auth.ts" },
	error: { action: "definition", file: "src/missing.ts", line: 1, symbol: "foo" },
};

const HOVER_TEXT = [
	"Returns the authenticated session for the given user.",
	"",
	"The session includes a signed JWT token and the issued-at timestamp.",
	"",
	"```typescript",
	"function login(username: string, password: string): Promise<Session>",
	"```",
	"",
	"Throws `AuthenticationError` when credentials are invalid.",
].join("\n");

const DIAGNOSTICS_TEXT = [
	"2 error(s), 1 warning(s)",
	"src/auth.ts:42:12 [error] Type 'string' is not assignable to type 'number'",
	"    The expected type comes from property 'id' which is declared here on type 'User'",
	"src/auth.ts:55:8 [error] Cannot find name 'foo'",
	"src/auth.ts:60:3 [warning] Unused variable 'bar'",
].join("\n");

const DIAGNOSTICS_MULTI_TEXT = [
	"1 error(s), 2 warning(s)",
	"# src/",
	"## auth.ts",
	"  src/auth.ts:42:12 [error] Type 'string' is not assignable to type 'number'",
	"  src/auth.ts:60:3 [warning] Unused variable 'bar'",
	"## store.ts",
	"  src/store.ts:15:5 [warning] Variable 'count' is declared but never used",
].join("\n");

const REFERENCES_TEXT = [
	"Found 12 reference(s):",
	"  src/auth.ts:42:12",
	"  src/auth.ts:55:8",
	"  src/store.ts:15:5",
	"  src/store.ts:30:22",
	"  src/utils.ts:8:14",
].join("\n");

const DEFINITION_TEXT = ["Found 2 definition(s):", "  src/auth.ts:42:12", "  src/store.ts:15:5"].join("\n");

const SYMBOLS_TEXT = [
	"Symbols in src/auth.ts:",
	"  ◎ login @ line 42",
	"    ◆ username @ line 42",
	"    ◆ password @ line 42",
	"  ◎ logout @ line 55",
	"  🔒 currentUser @ line 12",
].join("\n");

const SYMBOLS_WORKSPACE_TEXT = [
	'Found 3 symbol(s) matching "login":',
	"  ◎ login @ line 42   src/auth.ts",
	"  ◎ loginUser @ line 88   src/user.ts",
	"  ◆ loginCount @ line 5   src/store.ts",
].join("\n");

const CODE_ACTIONS_TEXT = [
	"3 code action(s):",
	'  0: "Fix typo in variable name" [quickfix]',
	'  1: "Extract to function" [refactor.extract]',
	'  2: "Add missing import" [quickfix]',
].join("\n");

const RENAME_TEXT = [
	"Rename preview:",
	"  typescript-language-server: will rename login to authenticate",
	"    src/auth.ts:42:12",
	"    src/auth.ts:55:8",
].join("\n");

const RENAME_FILE_TEXT = [
	"Renamed src/auth.ts → src/auth-old.ts",
	"  typescript-language-server: applied 3 edit(s) to src/auth-old.ts",
].join("\n");

const STATUS_TEXT = ["Active language servers: typescript, biome", "lspmux: active (multiplexing enabled)"].join("\n");

const CAPABILITIES_TEXT = [
	"typescript:",
	'  capabilities: { "textDocumentSync": 2, "hoverProvider": true, "definitionProvider": true }',
].join("\n");

const REQUEST_TEXT = [
	"typescript ← textDocument/completion:",
	'  { "result": [{ "label": "login", "kind": 6 }] }',
].join("\n");

const GENERIC_TEXT = "Language server reloaded successfully for src/auth.ts";

const ERROR_TEXT =
	"Error: Request textDocument/definition failed with message: Could not find file '/work/fraym-lsp/src/missing.ts'.";

const FAMILY_TEXT: Record<Family, string> = {
	hover: HOVER_TEXT,
	diagnostics: DIAGNOSTICS_TEXT,
	diagnosticsOK: "OK",
	diagnosticsMultiFile: DIAGNOSTICS_MULTI_TEXT,
	references: REFERENCES_TEXT,
	definition: DEFINITION_TEXT,
	symbols: SYMBOLS_TEXT,
	symbolsWorkspace: SYMBOLS_WORKSPACE_TEXT,
	codeActions: CODE_ACTIONS_TEXT,
	rename: RENAME_TEXT,
	renameFile: RENAME_FILE_TEXT,
	status: STATUS_TEXT,
	capabilities: CAPABILITIES_TEXT,
	request: REQUEST_TEXT,
	generic: GENERIC_TEXT,
	error: ERROR_TEXT,
};

// ── synthetic call builder ──────────────────────────────────────────────────

type LspCallBase = { readonly callId: string; readonly toolName: "lsp"; readonly input: LspInputShape };

function lspErrorCall(base: LspCallBase): ActiveToolCall {
	return {
		...base,
		status: "error",
		output: toolResult(ERROR_TEXT, { action: base.input.action, success: false }, true),
	};
}

function lspSuccessCall(base: LspCallBase, family: Family): ActiveToolCall {
	return {
		...base,
		status: "success",
		output: toolResult(FAMILY_TEXT[family], { action: base.input.action, success: true }),
	};
}

function buildLspCall(family: Family, state: LspState): ActiveToolCall {
	const input = FAMILY_INPUT[family];
	const base: LspCallBase = { callId: `lsp-${family}-${state}`, toolName: "lsp", input };

	switch (state) {
		case "pending":
			return pendingToolCall(base.callId, "lsp", input);
		case "error":
			return lspErrorCall(base);
		case "warn":
			// warn = diagnostics with warnings but no errors, or locations empty
			if (family === "diagnostics") {
				return {
					...base,
					status: "success",
					output: toolResult(["1 warning(s)", "src/auth.ts:60:3 [warning] Unused variable 'bar'"].join("\n"), {
						action: "diagnostics",
						success: true,
					}),
				};
			}
			if (family === "references" || family === "definition") {
				return {
					...base,
					status: "success",
					output: toolResult("No references found", { action: family, success: true }),
				};
			}
			// fallback: show warn with empty-ish result
			return lspSuccessCall(base, family);
		default:
			return lspSuccessCall(base, family);
	}
}

// ── showcase entry ───────────────────────────────────────────────────────────

const LSP_CONFIG: ControlsSchema = {
	family: { kind: "select", label: "family", options: FAMILIES, default: "hover" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function LspEntry() {
	const { values, panel } = useToolConfig();
	const family = selectControlValue(values.family, FAMILIES, "hover");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);
	const { open, density } = toolPreviewDisplay(view);

	// Grid state: skip pending for the grid so cards show resolved bodies
	const gridState: LspState = state === "pending" ? "success" : state;
	const gridFamilies = FAMILIES.filter(f => f !== family);

	return (
		<Demo
			summary="The `lsp` tool card — PRODUCTION renderer. Shows all 6 visual families (hover, diagnostics, locations, symbols, text, JSON) with correct head badges (action · target · meta) + action-dependent stat. Rendered by `renderLsp` registered in `DEFAULT_TOOL_RENDERERS`. The Demo Dock replays a synthetic conversation covering all families."
			importPath="entries/features/lsp (production renderer)"
			controls={panel}
			stage="stretch"
		>
			{/* Main preview */}
			<div className="w-full max-w-2xl">
				<ToolRender
					key={`${view}-${state}-${family}`}
					call={buildLspCall(family, state)}
					defaultOpen={open}
					density={density}
				/>
			</div>

			{/* Variation grid */}
			<Note>
				all families {"\u00b7"} {view}
			</Note>
			<div className="grid w-full max-w-2xl gap-2">
				{gridFamilies.map(f => (
					<ToolRender
						key={`${f}-${view}`}
						call={buildLspCall(f, gridState)}
						defaultOpen={open}
						density={density}
					/>
				))}
			</div>
		</Demo>
	);
}

const lspDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps lsp -> renderLsp. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderLsp is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "lsp",',
			"//   input:  { action, file?, line?, symbol?, query?, new_name?, apply?, payload? },",
			"//   output: { content, details: { action, success } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			'// Head: "LSP" + an action badge.',
			"// Body: renderLsp text-parses output.content[].text into one of 6 visual",
			"// families — hover signature, diagnostics list, location list (references/",
			"// definition), symbol tree, plain text (status/capabilities/generic), or raw",
			"// JSON (request). A failed run (output.details.success === false) flips the",
			"// card to the error tone; empty results render an explicit none state.",
		].join("\n"),
	),
	examples: [
		{
			label: "Hover at a position",
			code: JSON.stringify('{ action: "hover", file: "src/auth.ts", line: 42, symbol: "login" }'),
		},
		{
			label: "Diagnostics for a file",
			code: JSON.stringify('{ action: "diagnostics", file: "src/auth.ts" }'),
		},
		{
			label: "Find references",
			code: JSON.stringify('{ action: "references", file: "src/auth.ts", line: 42, symbol: "login" }'),
		},
		{
			label: "Workspace symbols",
			code: JSON.stringify('{ action: "symbols", query: "login" }'),
		},
	],
	api: [
		{
			name: "action",
			type: "string",
			required: true,
			description:
				"LSP operation: hover, diagnostics, references, definition, symbols, code_actions, rename, rename_file, status, capabilities, request, reload. Rendered as the action badge.",
		},
		{
			name: "file",
			type: "string",
			description: "Target file; required for position- and file-scoped actions.",
		},
		{
			name: "line",
			type: "number",
			description: "1-based line for position-scoped actions (hover/references/definition/code_actions).",
		},
		{
			name: "symbol",
			type: "string",
			description: "Symbol name at the position; disambiguates hover/references/definition.",
		},
		{
			name: "query",
			type: "string",
			description: "symbols — workspace-wide symbol search query (omit file for workspace scope).",
		},
		{
			name: "new_name",
			type: "string",
			description: "rename — new identifier; rename_file — new file path.",
		},
		{
			name: "apply",
			type: "boolean",
			description: "rename — whether to apply the edit (false previews the workspace edit).",
		},
		{
			name: "payload",
			type: "string",
			description: "request — raw JSON LSP request body to forward to the server.",
		},
		{
			name: "output.details.action",
			type: "string",
			description: "Echoes the executed action; drives the action badge and the parsed family.",
		},
		{
			name: "output.details.success",
			type: "boolean",
			description: "Whether the request succeeded; false flips the card to the error tone.",
		},
	],
};

export const lspEntries: readonly ShowcaseEntry[] = [
	{
		id: "lsp-tool",
		name: "LSP",
		Component: LspEntry,
		config: LSP_CONFIG,
		docs: lspDocs,
		demo: {
			createDriver: createLspDemoDriver,
			sessionRef: LSP_DEMO_SESSION_REF,
			title: "lsp · live conversation",
			toolDefaultOpen: "all",
		},
	},
];

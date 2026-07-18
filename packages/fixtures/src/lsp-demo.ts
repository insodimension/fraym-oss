// LSP demo script — a `lsp`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym/driver/mock so the lsp tool renders inside a real
// thread via the renderer registry. The conversation walks every LSP shape:
// hover → diagnostics → diagnostics OK → references → definition → symbols →
// code actions → rename → status → capabilities → request → error.
//
// All display content lives in `content[].text` (text-parse-driven renderer).
// Pure data: depends only on @fraym/driver types. No JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-06T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-lsp",
	path: "/work/fraym-lsp",
	displayName: "fraym-lsp",
};

const REF: SessionRef = { workspaceId: "fraym-lsp", sessionId: "demo-lsp" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Code intelligence tour",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 12_400, contextWindow: 200_000, percent: 0.062 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "medium" },
};

// --- step authoring helpers -------------------------------------------------

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}

function verb(message: string): ScriptedEvent {
	return { type: "workingStatus", status: { message, visible: true } };
}

function userMessage(id: string, text: string): ScriptedEvent {
	return { type: "queuedMessageStarted", message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW } };
}

function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, toolName: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName, input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** An `AgentToolResult`-shaped output: `content` (the display text) + `details`. */
function lspResult(text: string, details: Record<string, unknown> = {}, isError = false): unknown {
	return { content: [{ type: "text", text }], details, isError };
}

/** An lsp phase: verb → the card appears running → it resolves. */
function lspPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, "lsp", input), opts.think ?? 620),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 560),
	];
}

// --- realistic lsp outputs (mirrors TUI formatter output) -------------------

const HOVER_TEXT = `Returns the authenticated session for the given user.

\`\`\`typescript
function login(user: User): Session
\`\`\`

The session includes a signed JWT token and the issued-at timestamp.`;

const DIAGNOSTICS_TEXT = [
	"3 error(s), 2 warning(s)",
	"",
	"src/auth.ts:42:12 [error] Type 'string' is not assignable to type 'number'",
	"  message: Type 'string' is not assignable to type 'number'",
	"src/auth.ts:55:8 [error] Cannot find name 'foo'",
	"  message: Cannot find name 'foo'. Did you mean 'Foo'?",
	"src/auth.ts:60:3 [warning] Unused variable 'bar'",
	"  message: 'bar' is declared but its value is never read.",
	"src/store.ts:12:5 [warning] Prefer const over let for immutable bindings",
	"  message: 'count' is never reassigned",
].join("\n");

const DIAGNOSTICS_OK_TEXT = "OK";

const REFERENCES_TEXT = [
	"12 reference(s)",
	"",
	"src/auth.ts:42:12",
	"  context: at src/auth.ts:42:12",
	"src/auth.ts:55:8",
	"  context: at src/auth.ts:55:8",
	"src/auth.ts:100:5",
	"  context: at src/auth.ts:100:5",
	"src/store.ts:12:3",
	"  context: at src/store.ts:12:3",
	"src/store.ts:30:15",
	"  context: at src/store.ts:30:15",
	"src/utils.ts:8:22",
	"  context: at src/utils.ts:8:22",
].join("\n");

const DEFINITION_TEXT = [
	"Found 2 definition(s):",
	"",
	"src/auth.ts:42:12",
	"  context: at src/auth.ts:42:12",
	"src/store.ts:15:8",
	"  context: at src/store.ts:15:8",
].join("\n");

const SYMBOLS_TEXT = [
	"Symbols in src/auth.ts:",
	"",
	"◎ login @ line 42",
	"  ◎ validateCredentials @ line 44",
	"  ◎ issueToken @ line 51",
	"🔒 password @ line 55",
	"◎ logout @ line 100",
	"  ◎ revokeToken @ line 102",
].join("\n");

const CODE_ACTIONS_TEXT = [
	"3 code action(s):",
	"",
	'0: "Fix typo in variable name" [quickfix]',
	'1: "Extract to function" [refactor.extract]',
	'2: "Add missing import" [quickfix]',
].join("\n");

const RENAME_TEXT = [
	"Rename preview:",
	"",
	"typescript: will rename src/auth.ts",
	"  src/auth.ts:42:12  login → authenticate",
	"  src/auth.ts:55:8   login → authenticate",
].join("\n");

const STATUS_TEXT = ["Active language servers: typescript, biome", "lspmux: active (multiplexing enabled)"].join("\n");

const CAPABILITIES_TEXT = [
	"typescript:",
	'  capabilities: { "textDocumentSync": 2, "hoverProvider": true, "definitionProvider": true }',
	"",
	"biome:",
	'  capabilities: { "textDocumentSync": 1, "formattingProvider": true }',
].join("\n");

const REQUEST_TEXT = ["typescript ← custom/method:", '  { "result": [{ "label": "foo", "kind": 3 }] }'].join("\n");

const ERROR_TEXT =
	"Error: Request textDocument/definition failed with message: Could not find file '/work/fraym-lsp/src/missing.ts'.";

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage(
			"u-lsp",
			"Walk me through the LSP shapes — hover, diagnostics, references, symbols, code actions, rename, status, capabilities, request, and an error.",
		),
		200,
	),
	...lspPhase(
		"Hovering over login",
		"l-hover",
		{ action: "hover", file: "src/auth.ts", line: 42, symbol: "login" },
		lspResult(HOVER_TEXT, { action: "hover", success: true }),
		{ think: 540 },
	),
	step(say("Hover shows the signature and doc. "), 360),
	...lspPhase(
		"Checking diagnostics",
		"l-diag",
		{ action: "diagnostics", file: "src/auth.ts" },
		lspResult(DIAGNOSTICS_TEXT, { action: "diagnostics", success: true }),
		{ think: 620 },
	),
	step(say("A few issues to fix. Now references: "), 320),
	...lspPhase(
		"Finding references",
		"l-refs",
		{ action: "references", file: "src/auth.ts", line: 42, symbol: "login" },
		lspResult(REFERENCES_TEXT, { action: "references", success: true }),
		{ think: 580 },
	),
	step(say("Used across auth, store, and utils. Definitions: "), 300),
	...lspPhase(
		"Jumping to definition",
		"l-def",
		{ action: "definition", file: "src/auth.ts", line: 42, symbol: "login" },
		lspResult(DEFINITION_TEXT, { action: "definition", success: true }),
		{ think: 480 },
	),
	step(say("Two sites. Symbol tree: "), 300),
	...lspPhase(
		"Listing symbols",
		"l-syms",
		{ action: "symbols", file: "src/auth.ts" },
		lspResult(SYMBOLS_TEXT, { action: "symbols", success: true }),
		{ think: 480 },
	),
	step(say("Hierarchical outline with icons. Code actions: "), 300),
	...lspPhase(
		"Offering code actions",
		"l-ca",
		{ action: "code_actions", file: "src/auth.ts", line: 42 },
		lspResult(CODE_ACTIONS_TEXT, { action: "code_actions", success: true }),
		{ think: 480 },
	),
	step(say("Quick fixes and refactors available. Rename preview: "), 300),
	...lspPhase(
		"Previewing rename",
		"l-ren",
		{ action: "rename", file: "src/auth.ts", line: 42, symbol: "login", new_name: "authenticate", apply: false },
		lspResult(RENAME_TEXT, { action: "rename", success: true }),
		{ think: 480 },
	),
	step(say("Server status and capabilities: "), 320),
	...lspPhase(
		"Checking server status",
		"l-stat",
		{ action: "status" },
		lspResult(STATUS_TEXT, { action: "status", success: true }),
		{ think: 360 },
	),
	...lspPhase(
		"Querying capabilities",
		"l-cap",
		{ action: "capabilities", file: "src/auth.ts" },
		lspResult(CAPABILITIES_TEXT, { action: "capabilities", success: true }),
		{ think: 420 },
	),
	...lspPhase(
		"Running custom request",
		"l-req",
		{ action: "request", file: "src/auth.ts", payload: '{"method":"textDocument/completion"}' },
		lspResult(REQUEST_TEXT, { action: "request", success: true }),
		{ think: 480 },
	),
	step(say("And an error case: "), 280),
	...lspPhase(
		"Requesting definition of missing file",
		"l-err",
		{ action: "definition", file: "src/missing.ts", line: 1, symbol: "foo" },
		lspResult(ERROR_TEXT, { action: "definition", success: false }, true),
		{ success: false, think: 420, run: 520 },
	),
	step(say("Diagnostics clean on another file: "), 280),
	...lspPhase(
		"Checking clean diagnostics",
		"l-ok",
		{ action: "diagnostics", file: "src/store.ts" },
		lspResult(DIAGNOSTICS_OK_TEXT, { action: "diagnostics", success: true }),
		{ think: 360 },
	),
	step(say("Tour complete. Every LSP family covered."), 360),
	step(completed(), 220),
];

export const lspDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			step(verb("Checking LSP"), 240),
			...lspPhase(
				"Hovering",
				"l-followup",
				{ action: "hover", file: "src/auth.ts", line: 42, symbol: "login" },
				lspResult(HOVER_TEXT, { action: "hover", success: true }),
				{ think: 420 },
			),
			step(say("Follow-up hover complete."), 280),
			step(completed(), 200),
		],
	},
};

// AST-grep demo script — an `ast_grep`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym/driver/mock so the ast_grep tool renders inside a real
// thread via the production renderer (`renderAstGrep`). Walks the shapes: a multi-file
// structural search with captured metavariables, a multi-line match node, and a limit-reached
// sweep with parse errors.
//
// ast_grep returns `details.displayContent` (the user-facing `*N│…` gutter format + `meta:`
// capture rows the renderer parses) + counts (`matchCount` / `fileCount` / `filesSearched`)
// + `limitReached` / `parseErrors`. There is NO streaming — ast_grep is a single native AST
// query. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-05T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-ast-grep",
	path: "/work/fraym-ast-grep",
	displayName: "fraym-ast-grep",
};

const REF: SessionRef = { workspaceId: "fraym-ast-grep", sessionId: "demo-ast-grep" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Find every useState call structurally",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 15_400, contextWindow: 200_000, percent: 0.077 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers (mirror search-demo) ----------------------------

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

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName: "ast_grep", input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** The `{ content, details }` result an ast_grep run returns. `content` is the model-facing
 *  text; `details.displayContent` is the user-facing body the renderer parses. */
function astGrepResult(modelText: string, details: Record<string, unknown>, isError = false): unknown {
	return { content: [{ type: "text", text: modelText }], details, isError };
}

/** An ast_grep phase: verb → the card appears running → it resolves (no streaming). */
function astGrepPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 560),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 560),
	];
}

// --- displayContent builders (the `*N│…` gutter + `meta:` capture format) ----

const BAR = "\u2502"; // │
/** Match line (`*` marker) — the match node's first line. */
const m = (n: number, text: string): string => `*${n}${BAR}${text}`;
/** Continuation line of a multi-line match node (no marker). */
const c = (n: number, text: string): string => ` ${n}${BAR}${text}`;
/** Captured-metavariable row for the preceding match. */
const meta = (s: string): string => `  meta: ${s}`;

const USE_STATE = [
	"# src/hooks/",
	"## use-thread.ts#a4b2",
	m(40, "const [open, setOpen] = useState(false);"),
	meta("$NAME=open, $INIT=false"),
	m(52, "const [count, setCount] = useState(0);"),
	meta("$NAME=count, $INIT=0"),
	"## use-composer.ts#12c7",
	m(18, 'const [text, setText] = useState("");'),
	meta('$NAME=text, $INIT=""'),
	"",
	"# src/features/thread/",
	"## thread.tsx#1c71",
	m(210, "const [hovered, setHovered] = useState<string | null>(null);"),
	meta("$NAME=hovered, $INIT=null"),
].join("\n");

const MULTILINE_FN = [
	"# src/lib/clamp.ts#9f2a",
	m(8, "export function clamp(n: number, lo: number, hi: number) {"),
	c(9, "  return Math.max(lo, Math.min(hi, n));"),
	c(10, "}"),
	meta("$NAME=clamp"),
].join("\n");

// A limit-reached structural sweep with a couple of parse errors.
const CONSOLE_HITS = Array.from({ length: 6 }, (_, i) => [
	`# packages/pkg-${i + 1}/`,
	`## index.ts#${(0x2000 + i).toString(16)}`,
	m((i + 1) * 9, `console.log("pkg-${i + 1} ready", ${i});`),
	meta(`$$$ARGS="pkg-${i + 1} ready", ${i}`),
]).flat();

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(userMessage("u-ag", "Find every useState call structurally and capture the names + initial values."), 200),
	step(say("Running a structural query (`const [$NAME, $SETTER] = useState($INIT)`): "), 320),
	...astGrepPhase(
		"AST-matching useState",
		"ag-usestate",
		{ pat: "const [$NAME, $SETTER] = useState($INIT)", paths: ["src"] },
		astGrepResult(USE_STATE, {
			matchCount: 4,
			fileCount: 3,
			filesSearched: 12,
			scopePath: "src",
			limitReached: false,
			displayContent: USE_STATE,
		}),
	),
	step(say("Four hooks across three files — captures attached. Now a multi-line node pattern: "), 340),
	...astGrepPhase(
		"AST-matching clamp",
		"ag-fn",
		{ pat: "export function clamp($$$PARAMS) { $$$BODY }", paths: ["src/lib"] },
		astGrepResult(MULTILINE_FN, {
			matchCount: 1,
			fileCount: 1,
			filesSearched: 3,
			scopePath: "src/lib",
			limitReached: false,
			displayContent: MULTILINE_FN,
		}),
		{ think: 460 },
	),
	step(say("One match — the full node spans three lines. One broad sweep for stray console.logs: "), 320),
	...astGrepPhase(
		"AST-matching console.log",
		"ag-console",
		{ pat: "console.log($$$ARGS)", paths: ["packages"] },
		astGrepResult(CONSOLE_HITS.join("\n"), {
			matchCount: 6,
			fileCount: 6,
			filesSearched: 240,
			scopePath: "packages",
			limitReached: true,
			parseErrors: ["packages/pkg-3/broken.ts: unexpected token", "packages/pkg-5/legacy.ts: parse error"],
			parseErrorsTotal: 2,
			displayContent: CONSOLE_HITS.join("\n"),
		}),
		{ think: 520, run: 600 },
	),
	step(say("Six console.logs (result limit hit; 2 files failed to parse). AST-grep tour complete."), 360),
	step(completed(), 220),
];

export const astGrepDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...astGrepPhase(
				"AST-matching useToolConfig",
				"ag-followup",
				{ pat: "useToolConfig()", paths: ["packages/ui/src"] },
				astGrepResult(
					["# src/showcase/", "## tool-config.tsx#864f", m(42, "const { values } = useToolConfig();")].join("\n"),
					{
						matchCount: 1,
						fileCount: 1,
						filesSearched: 60,
						scopePath: "packages/ui/src",
						limitReached: false,
						displayContent: [
							"# src/showcase/",
							"## tool-config.tsx#864f",
							m(42, "const { values } = useToolConfig();"),
						].join("\n"),
					},
				),
			),
			step(say("Scripted ast-grep-demo driver — attach a real engine to run live structural queries."), 320),
			step(completed(), 200),
		],
	},
};

// Search demo script — a `search`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym/driver/mock so the search tool renders inside a real
// thread via the production renderer (`renderSearch`). Walks the shapes: a directory
// search (grouped # dir/ + ## file + match/context/gap lines), a single-file search, and
// a truncated search (file-window cap + artifact spill).
//
// Search returns `details.displayContent` (the user-facing `*N│…` / ` N│…` / `  │...`
// gutter format the renderer parses) + counts (`matchCount` / `fileCount`) + truncation
// detail. There is NO streaming — search is a single grep call. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-04T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-search",
	path: "/work/fraym-search",
	displayName: "fraym-search",
};

const REF: SessionRef = { workspaceId: "fraym-search", sessionId: "demo-search" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Find every useToolStream caller",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 16_200, contextWindow: 200_000, percent: 0.081 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers (mirror bash-demo) ------------------------------

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
	return { type: "toolStarted", callId, toolName: "search", input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** The `{ content, details }` result a search run returns. `content` is the model-facing
 *  text; `details.displayContent` is the user-facing body the renderer parses. */
function searchResult(modelText: string, details: Record<string, unknown>, isError = false): unknown {
	return { content: [{ type: "text", text: modelText }], details, isError };
}

/** A search phase: verb → the card appears running → it resolves. */
function searchPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 520),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 560),
	];
}

// --- displayContent builders (the `*N│…` gutter format the renderer parses) --

const BAR = "\u2502"; // │
/** Match line (`*` marker). */
const m = (n: number, text: string): string => `*${n}${BAR}${text}`;
/** Context line (no marker). */
const c = (n: number, text: string): string => ` ${n}${BAR}${text}`;
/** Gap row — non-contiguous line numbers. */
const GAP = `   ${BAR}...`;

const USE_TOOL_STREAM = [
	"# src/hooks/",
	"## session-tools.ts#a4b2",
	m(18, "export function useToolStream(workspace: WorkspaceRef): ToolStreamState {"),
	c(19, "\tconst [state, dispatch] = useReducer(toolReducer, EMPTY);"),
	GAP,
	m(54, "\treturn { calls: state.calls, dispatch };"),
	"## session-types.ts#12c7",
	m(7, "export interface ToolStreamState {"),
	"",
	"# src/features/thread/",
	"## thread.tsx#1c71",
	m(210, "\tconst tools = useToolStream(workspace);"),
	c(211, "\tconst transcript = useTranscript(tools);"),
	"",
	"# src/registries/",
	"## tool-renderer-registry.tsx#ba71",
	m(8, "// `ActiveToolCall` shape produced by `useToolStream()`, so wiring is zero-cost."),
].join("\n");

const SINGLE_FILE = [
	m(42, "if (user.id) {"),
	c(43, "\treturn user;"),
	c(44, "}"),
	GAP,
	m(118, "const id = user.id ?? fallbackId;"),
].join("\n");

// A truncated directory search: the file window (20) filled, so the body shows the
// first slice and points at the artifact spill.
const TODO_HITS = Array.from({ length: 6 }, (_, i) => [
	`# packages/pkg-${i + 1}/`,
	`## index.ts#${(0x1000 + i).toString(16)}`,
	m((i + 1) * 11, `// TODO(${i + 1}): wire the real driver before shipping`),
]).flat();

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(userMessage("u-search", "Where do we call useToolStream? And check session-tools for the definition."), 200),
	step(say("Searching the UI package for every caller: "), 320),
	...searchPhase(
		"Searching useToolStream",
		"s-uts",
		{ pattern: "useToolStream", paths: ["packages/ui/src"] },
		searchResult(USE_TOOL_STREAM, {
			matchCount: 5,
			fileCount: 4,
			scopePath: "packages/ui/src",
			displayContent: USE_TOOL_STREAM,
			files: ["session-tools.ts", "session-types.ts", "thread.tsx", "tool-renderer-registry.tsx"],
		}),
	),
	step(
		say(
			"Five hits across four files — the definition is in `src/hooks/session-tools.ts:18`. Narrowing to that file: ",
		),
		340,
	),
	...searchPhase(
		"Searching user.id",
		"s-single",
		{ pattern: "user\\.id", paths: ["packages/ui/src/hooks/session-tools.ts"], i: false },
		searchResult(SINGLE_FILE, {
			matchCount: 2,
			fileCount: 1,
			displayContent: SINGLE_FILE,
			files: ["session-tools.ts"],
		}),
		{ think: 460 },
	),
	step(say("Two references in that file. One more sweep for leftover TODOs across the workspace: "), 320),
	...searchPhase(
		"Searching TODO",
		"s-todo",
		{ pattern: "TODO\\(", paths: ["packages"], gitignore: true },
		searchResult(TODO_HITS.join("\n"), {
			matchCount: 6,
			fileCount: 6,
			scopePath: "packages",
			displayContent: TODO_HITS.join("\n"),
			truncated: true,
			fileLimitReached: 20,
			meta: { truncation: { truncatedBy: "lines", artifactId: "search-7f3c" } },
		}),
		{ think: 520, run: 600 },
	),
	step(say("Six TODOs (output capped at the 20-file window — full list in the artifact). Search tour complete."), 360),
	step(completed(), 220),
];

export const searchDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...searchPhase(
				"Searching renderSearch",
				"s-followup",
				{ pattern: "renderSearch", paths: ["packages/ui/src"] },
				searchResult(
					["# src/registries/", "## default-tool-renderers.tsx#864f", m(10, "import { renderSearch } from")].join(
						"\n",
					),
					{
						matchCount: 1,
						fileCount: 1,
						scopePath: "packages/ui/src",
						displayContent: [
							"# src/registries/",
							"## default-tool-renderers.tsx#864f",
							m(10, 'import { renderSearch } from "../features/tool-card/tools/search-render";'),
						].join("\n"),
						files: ["default-tool-renderers.tsx"],
					},
				),
			),
			step(say("Scripted search-demo driver — attach a real engine to run live searches."), 320),
			step(completed(), 200),
		],
	},
};

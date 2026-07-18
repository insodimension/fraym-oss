// AST-edit demo script — an `ast_edit`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym/driver/mock so the ast_edit tool renders inside a real
// thread via the production renderer (`renderAstEdit`). Walks the shapes: a multi-file
// proposed rewrite (before/after diff + `proposed` badge), a single-file rewrite, and a
// limit-reached sweep with parse errors.
//
// ast_edit returns `details.displayContent` (the user-facing `-<n>│old` / `+<n>│new` grouped
// diff the renderer parses) + `totalReplacements` / `filesTouched` / `filesSearched` +
// `applied` / `limitReached` / `parseErrors`. There is NO streaming — ast_edit is a single
// native rewrite pass (a preview that `resolve` applies). Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-05T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-ast-edit",
	path: "/work/fraym-ast-edit",
	displayName: "fraym-ast-edit",
};

const REF: SessionRef = { workspaceId: "fraym-ast-edit", sessionId: "demo-ast-edit" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Convert console.log to logger.info",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 15_900, contextWindow: 200_000, percent: 0.08 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers (mirror ast-grep-demo) --------------------------

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
	return { type: "toolStarted", callId, toolName: "ast_edit", input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** The `{ content, details }` result an ast_edit run returns. `content` is the model-facing
 *  text; `details.displayContent` is the user-facing before/after diff the renderer parses. */
function astEditResult(modelText: string, details: Record<string, unknown>, isError = false): unknown {
	return { content: [{ type: "text", text: modelText }], details, isError };
}

/** An ast_edit phase: verb → the card appears running → it resolves (no streaming). */
function astEditPhase(
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

// --- displayContent builders (the `-<n>│old` / `+<n>│new` grouped diff) ------

const BAR = "\u2502"; // │
const f = (name: string, hash: string, count: number): string =>
	`## ${name}#${hash} (${count} ${count === 1 ? "replacement" : "replacements"})`;
const del = (n: number, text: string): string => `-${n}${BAR}${text}`;
const add = (n: number, text: string): string => `+${n}${BAR}${text}`;

const LOG_TO_LOGGER = [
	"# src/hooks/",
	f("use-thread.ts", "a4b2", 2),
	del(40, 'console.log("thread mounted", id);'),
	add(40, 'logger.info("thread mounted", id);'),
	del(58, 'console.log("thread closed");'),
	add(58, 'logger.info("thread closed");'),
	f("use-composer.ts", "12c7", 1),
	del(22, 'console.log("composer ready");'),
	add(22, 'logger.info("composer ready");'),
	"",
	"# src/features/thread/",
	f("thread.tsx", "1c71", 2),
	del(210, 'console.log("render", tools.length);'),
	add(210, 'logger.info("render", tools.length);'),
	del(244, 'console.log("scroll", offset);'),
	add(244, 'logger.info("scroll", offset);'),
].join("\n");

const SINGLE = [
	del(8, "export function clamp(n, lo, hi) {"),
	add(8, "export function clamp(n: number, lo: number, hi: number): number {"),
].join("\n");

// A limit-reached broad rewrite across many packages.
const BROAD = Array.from({ length: 6 }, (_, i) => [
	`# packages/pkg-${i + 1}/`,
	f("index.ts", (0x3000 + i).toString(16), 1),
	del((i + 1) * 7, `export const VERSION = "${i + 1}.0.0";`),
	add((i + 1) * 7, `export const VERSION = "${i + 1}.1.0";`),
])
	.flat()
	.join("\n");

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(userMessage("u-ae", "Convert every console.log to logger.info structurally across src."), 200),
	step(
		say("Running a structural rewrite (`console.log($$$ARGS)` → `logger.info($$$ARGS)`) — previewing the diff: "),
		320,
	),
	...astEditPhase(
		"Rewriting console.log",
		"ae-log",
		{ ops: [{ pat: "console.log($$$ARGS)", out: "logger.info($$$ARGS)" }], paths: ["src"] },
		astEditResult(LOG_TO_LOGGER, {
			totalReplacements: 5,
			filesTouched: 3,
			filesSearched: 12,
			applied: false,
			limitReached: false,
			scopePath: "src",
			displayContent: LOG_TO_LOGGER,
		}),
	),
	step(
		say(
			"Five replacements across three files — **proposed** (approve with `resolve` to apply). Now a single typed signature: ",
		),
		340,
	),
	...astEditPhase(
		"Rewriting clamp signature",
		"ae-clamp",
		{
			ops: [{ pat: "export function clamp($$$P) { $$$B }", out: "export function clamp($$$P): number { $$$B }" }],
			paths: ["src/lib/clamp.ts"],
		},
		astEditResult(SINGLE, {
			totalReplacements: 1,
			filesTouched: 1,
			filesSearched: 1,
			applied: false,
			limitReached: false,
			scopePath: "src/lib/clamp.ts",
			displayContent: SINGLE,
		}),
		{ think: 460 },
	),
	step(say("One typed signature. One broad version bump — this one hits the file limit: "), 320),
	...astEditPhase(
		"Bumping VERSION",
		"ae-version",
		{ ops: [{ pat: "export const VERSION = $V", out: "export const VERSION = $V" }], paths: ["packages"] },
		astEditResult(BROAD, {
			totalReplacements: 6,
			filesTouched: 6,
			filesSearched: 240,
			applied: false,
			limitReached: true,
			parseErrors: ["packages/pkg-4/legacy.ts: parse error"],
			parseErrorsTotal: 1,
			scopePath: "packages",
			displayContent: BROAD,
		}),
		{ think: 520, run: 600 },
	),
	step(say("Six bumps proposed (file limit hit; 1 file failed to parse). AST-edit tour complete."), 360),
	step(completed(), 220),
];

export const astEditDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...astEditPhase(
				"Rewriting var to const",
				"ae-followup",
				{ ops: [{ pat: "var $NAME = $INIT", out: "const $NAME = $INIT" }], paths: ["packages/ui/src"] },
				astEditResult(
					[
						"# src/legacy/",
						f("globals.ts", "864f", 1),
						del(3, "var cache = {};"),
						add(3, "const cache = {};"),
					].join("\n"),
					{
						totalReplacements: 1,
						filesTouched: 1,
						filesSearched: 60,
						applied: false,
						limitReached: false,
						scopePath: "packages/ui/src",
						displayContent: [
							"# src/legacy/",
							f("globals.ts", "864f", 1),
							del(3, "var cache = {};"),
							add(3, "const cache = {};"),
						].join("\n"),
					},
				),
			),
			step(say("Scripted ast-edit-demo driver — attach a real engine to run live structural rewrites."), 320),
			step(completed(), 200),
		],
	},
};

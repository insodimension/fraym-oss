// Bash demo script — a `bash`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym-ai/driver/mock so the bash tool renders inside a real
// thread via the production renderer (`renderBash`). Walks the shell shapes: a quick
// command (wall time), a long STREAMED command (output follows the tail), a failure
// (nonzero exit / stderr), a truncated command (artifact spill), and a background job.
//
// Bash shows the command (`$ cd…/env command`, highlighted) + its output on the term
// surface. Output rides the partial-output channel while streaming (`partialResult`
// stored as `call.output`); details carry `wallTimeMs` / `timeoutSeconds` / `meta.truncation`
// / `async`. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";
import { assistantDelta as say, queuedMessage, runCompleted, scriptedStep as step, toolFinished as toolDone, toolStarted, toolUpdated as toolUpdate, workingStatus as verb } from "./scripted-event-utils";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-03T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-bash",
	path: "/work/fraym-bash",
	displayName: "fraym-bash",
};

const REF: SessionRef = { workspaceId: "fraym-bash", sessionId: "demo-bash" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Run the test + build pipeline",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 18_900, contextWindow: 200_000, percent: 0.0945 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

function userMessage(id: string, text: string): ScriptedEvent {
	return queuedMessage(id, text, NOW);
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return toolStarted(callId, "bash", input);
}

function completed(): ScriptedEvent {
	return runCompleted(SNAPSHOT);
}

/** Reveal cutoffs (line counts) for streaming output in ~`chunks` growing slices. */
function revealStops(lineCount: number, chunks: number, start: number): number[] {
	const stops: number[] = [];
	const span = Math.max(1, lineCount - start);
	for (let i = 1; i <= chunks; i++) {
		const n = Math.min(lineCount, start + Math.ceil((span * i) / chunks));
		if (stops[stops.length - 1] !== n) stops.push(n);
	}
	return stops;
}

// --- phases -----------------------------------------------------------------

/** A static bash phase: verb → the card appears running → it resolves. */
function bashPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 560),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 540),
	];
}

function bashPartialUpdate(callId: string, lines: readonly string[], lineCount: number, delayMs: number): ScriptStep {
	return step(
		toolUpdate(callId, { content: [{ type: "text", text: lines.slice(0, lineCount).join("\n") }] }),
		delayMs,
	);
}

/** A streaming bash run: stdout reveals in growing chunks via the partial channel
 *  (`content[].text`), the output pane follows the tail, then it resolves. */
function bashStreamPhase(
	message: string,
	callId: string,
	input: unknown,
	fullOutput: string,
	finalDetails: Record<string, unknown>,
	opts: { think?: number; tick?: number; run?: number } = {},
): ScriptStep[] {
	const lines = fullOutput.split("\n");
	const stops = [...revealStops(lines.length, 12, 2), lines.length];
	const tickMs = opts.tick ?? 200;
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 480),
		...stops.map(n => bashPartialUpdate(callId, lines, n, tickMs)),
		step(toolDone(callId, toolResult(fullOutput, finalDetails)), opts.run ?? 520),
	];
}

// --- realistic command output -----------------------------------------------

const G = "\u001b[32m"; // green
const R = "\u001b[31m"; // red
const D = "\u001b[2m"; //  dim
const B = "\u001b[1m"; //  bold
const X = "\u001b[0m"; //  reset
const PASS = (name: string, ms: string) => `${G}✓${X} ${name} ${D}[${ms}]${X}`;

// No `$ bun test` echo — the renderer's command row already shows the command.
const TEST_OUTPUT = [
	`${B}bun test v1.2.0${X}`,
	"",
	`${D}src/telemetry.test.ts:${X}`,
	PASS("batches events under the flush threshold", "2.1ms"),
	PASS("flushes on the 50th event", "1.4ms"),
	PASS("flushes after the 5s timer", "5.0ms"),
	PASS("drops events when the buffer overflows", "0.9ms"),
	PASS("redacts pii fields before send", "1.8ms"),
	`${D}src/transport.test.ts:${X}`,
	PASS("retries failed posts with backoff", "12.3ms"),
	PASS("gives up after 5 attempts", "3.1ms"),
	PASS("serializes the batch envelope", "0.7ms"),
	`${D}src/bootstrap.test.ts:${X}`,
	PASS("wires the default sink", "1.0ms"),
	PASS("honors TELEMETRY_DISABLED", "0.6ms"),
	"",
	`${G} 28 pass${X}`,
	" 0 fail",
	" 64 expect() calls",
	`Ran 28 tests across 3 files. ${D}[148.00ms]${X}`,
].join("\n");

const BUILD_OUTPUT = [
	"  vite v6.0.1 building for production...",
	`  ${G}✓${X} 412 modules transformed.`,
	`  dist/index.html                  ${D}0.61 kB │ gzip:  0.34 kB${X}`,
	`  dist/assets/index-4f2a.css      ${D}18.20 kB │ gzip:  4.11 kB${X}`,
	`  dist/assets/index-9c1d.js      ${D}214.77 kB │ gzip: 68.05 kB${X}`,
	`  ${G}✓ built in 1.82s${X}`,
].join("\n");

const TYPECHECK_ERROR = [
	`src/bootstrap.ts(14,22): ${R}error TS2304${X}: Cannot find name 'sessionId'.`,
	`src/bootstrap.ts(20,9): ${R}error TS2554${X}: Expected 2 arguments, but got 1.`,
	`${R}Found 2 errors in 1 file.${X}`,
].join("\n");

// A ~40-line log so the streamed output overflows the scroll window and follows the tail.
const MIGRATION_LOG = Array.from(
	{ length: 40 },
	(_, i) => `[${String(i + 1).padStart(3, "0")}] migrate: applied ${(i + 1) * 7} rows to events_${i + 1}`,
).join("\n");

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage("u-bash", "Run the tests, then the build. If anything fails, typecheck so I can see the errors."),
		200,
	),
	step(say("Running the suite — streaming the output as it goes: "), 320),
	...bashStreamPhase("Running tests", "b-test", { command: "bun test" }, TEST_OUTPUT, {
		wallTimeMs: 148,
		timeoutSeconds: 300,
	}),
	step(say("All 28 green. Building for production: "), 340),
	...bashPhase(
		"Building",
		"b-build",
		{ command: "bun run build", cwd: "apps/web" },
		toolResult(BUILD_OUTPUT, { wallTimeMs: 1824, timeoutSeconds: 300 }),
		{ think: 520 },
	),
	step(say("Build's clean (1.8s). Earlier you saw a type error — re-running typecheck to surface it: "), 320),
	...bashPhase(
		"Typechecking",
		"b-types",
		{ command: "bun run typecheck", env: { CI: "1" } },
		toolResult(TYPECHECK_ERROR, { wallTimeMs: 2960, timeoutSeconds: 300 }, true),
		{ success: false, think: 460, run: 540 },
	),
	step(say("Two errors in bootstrap.ts — an undefined `sessionId`. I'll thread it through. Bash tour complete."), 360),
	step(completed(), 220),
];

export const bashDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...bashStreamPhase(
				"Running a migration",
				"b-followup",
				{ command: "bun run db:migrate", cwd: "packages/store" },
				MIGRATION_LOG,
				{ wallTimeMs: 4120, timeoutSeconds: 600 },
				{ think: 420 },
			),
			step(say("Scripted bash-demo driver — attach a real engine to run live commands."), 320),
			step(completed(), 200),
		],
	},
};

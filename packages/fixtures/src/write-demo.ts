// Write demo script — a `write`-focused conversation expressed as pure
// session-driver events. Replayed through @fraym-ai/driver/mock so the write tool
// renders inside a real thread via the production renderer (`renderWrite`).
// Walks every write shape: create (streamed) → overwrite → markdown → diagnostics
// → error (read-only / plan-mode).
//
// Write shows the NEW file content (not a diff): the renderer reads it from `input.content`.
// While the model streams the tool args, the engine maps `toolcall_delta` → a
// `toolUpdated.partialInput` that the reducer merges into `call.input` — so this demo streams
// content via `partialInput` exactly like a live run (see docs/design/tools/streaming-tool-args.md).
// Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";

const NOW = "2026-06-03T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-write",
	path: "/work/fraym-write",
	displayName: "fraym-write",
};

const REF: SessionRef = { workspaceId: "fraym-write", sessionId: "demo-write" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Scaffold the telemetry module",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 22_400, contextWindow: 200_000, percent: 0.112 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers (mirror edit-demo) ------------------------------

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

function think(text: string): ScriptedEvent {
	return { type: "thinkingDelta", text };
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName: "write", input };
}

function toolUpdate(callId: string, partialInput: unknown): ScriptedEvent {
	return { type: "toolUpdated", callId, partialInput };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** The `{ content, details }` result a write returns. The file content lives in `input`
 *  (not here); `details` carries only extras like diagnostics. */
function writeResult(text: string, extraDetails: Record<string, unknown> = {}): unknown {
	return { content: [{ type: "text", text }], details: extraDetails };
}

/** Reveal cutoffs (line counts) for streaming content in ~`chunks` growing slices. */
function revealStops(lineCount: number, chunks: number, start: number): number[] {
	const stride = Math.max(1, Math.round(lineCount / chunks));
	const stops: number[] = [];
	for (let n = Math.min(start, lineCount); n < lineCount; n += stride) stops.push(n);
	return stops;
}

/** verb status → the running card (toolStart). Shared head for both write phases. */
function phaseHead(message: string, callId: string, input: unknown, thinkMs: number): ScriptStep[] {
	return [step(verb(message), 260), step(toolStart(callId, input), thinkMs)];
}

/** A static write phase: verb → the card appears running (content already in input) → resolves. */
function writePhase(
	message: string,
	callId: string,
	path: string,
	content: string,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		...phaseHead(message, callId, { path, content }, opts.think ?? 600),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 560),
	];
}

function writePartialUpdate(callId: string, lines: readonly string[], lineCount: number, delayMs: number): ScriptStep {
	return step(toolUpdate(callId, { content: lines.slice(0, lineCount).join("\n") }), delayMs);
}

/** A streaming write: the new content reveals in growing chunks via `partialInput.content`
 *  (merged into call.input), the preview follows the tail, then it resolves. */
function writeStreamPhase(
	message: string,
	callId: string,
	path: string,
	fullContent: string,
	finalText: string,
	opts: { think?: number; tick?: number; run?: number } = {},
): ScriptStep[] {
	const lines = fullContent.split("\n");
	const stops = [...revealStops(lines.length, 12, 3), lines.length];
	const tickMs = opts.tick ?? 220;
	return [
		...phaseHead(message, callId, { path }, opts.think ?? 480),
		...stops.map(n => writePartialUpdate(callId, lines, n, tickMs)),
		step(toolDone(callId, writeResult(finalText)), opts.run ?? 520),
	];
}

// --- realistic file contents ------------------------------------------------

/** Generate a ~`lines`-line TS file so the streaming scroll window fills + follows the tail. */
export function genTsContent(lines: number): string {
	const out: string[] = ['import { emit } from "./bus";', "", "export interface TelemetryEvent {"];
	for (let i = 1; i <= lines; i++) out.push(`\tfield${i}: string;`);
	out.push("}", "", "export function track(event: TelemetryEvent): void {", '\temit("telemetry", event);', "}");
	return out.join("\n");
}

const BIG_TS_CONTENT = genTsContent(60);

const CONFIG_CONTENT = `{
\t"name": "@acme/telemetry",
\t"version": "0.1.0",
\t"type": "module",
\t"main": "./dist/index.js",
\t"scripts": {
\t\t"build": "tsc -p tsconfig.json",
\t\t"test": "bun test"
\t}
}`;

const README_CONTENT = `# @acme/telemetry

Lightweight, batched telemetry for the Acme platform.

## Usage

\`\`\`ts
import { track } from "@acme/telemetry";

track({ field1: "page_view" });
\`\`\`

Events are flushed every 5s or 50 events, whichever comes first.`;

const DIAG_CONTENT = `import { track } from "./telemetry";

export function bootstrap() {
\ttrack({ field1: "boot", sessionId });
}`;

const DIAG = {
	server: "tsserver",
	messages: ["[error] src/bootstrap.ts:4 Cannot find name 'sessionId'."],
	summary: "1 error",
	errored: true,
};

const READONLY_ERROR =
	"Refusing to overwrite src/generated/schema.ts — file is marked auto-generated (// @generated). Edit the source template instead.";

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage(
			"u-write",
			"Scaffold a telemetry module: package.json, the main telemetry.ts, a README, and a bootstrap. Don't touch generated files.",
		),
		200,
	),
	// A reasoning beat right before the tools — verifies the reasoning row aligns with
	// the tool gutter in-thread (reasoning is a message block, not a tool card).
	step(
		think(
			"Scope: a `package.json`, the telemetry core (`track` + batching), a README, and a bootstrap. I'll write them in order and keep clear of anything marked `@generated`.",
		),
		520,
	),
	...writePhase(
		"Writing package.json",
		"w-config",
		"package.json",
		CONFIG_CONTENT,
		writeResult("Successfully wrote 142 bytes to package.json"),
		{ think: 520 },
	),
	step(say("Package manifest in place. Now the main module — this one's larger: "), 340),
	...writeStreamPhase(
		"Writing telemetry.ts",
		"w-main",
		"src/telemetry.ts",
		BIG_TS_CONTENT,
		"Successfully wrote 1284 bytes to src/telemetry.ts",
		{ think: 480 },
	),
	step(say("track() batches and flushes events. Adding docs: "), 320),
	...writePhase(
		"Writing the README",
		"w-readme",
		"README.md",
		README_CONTENT,
		writeResult("Successfully wrote 318 bytes to README.md"),
		{ think: 440 },
	),
	step(say("Now a bootstrap that wires it up — though this one has a bug: "), 320),
	...writePhase(
		"Writing bootstrap.ts",
		"w-diag",
		"src/bootstrap.ts",
		DIAG_CONTENT,
		writeResult("Successfully wrote 96 bytes to src/bootstrap.ts", { diagnostics: DIAG }),
		{ think: 460 },
	),
	step(say("The type-checker flagged an undefined `sessionId`. I'll thread it through. Last, the schema: "), 320),
	...writePhase(
		"Overwriting generated schema",
		"w-err",
		"src/generated/schema.ts",
		"",
		{
			content: [{ type: "text", text: READONLY_ERROR }],
			details: { isError: true },
			isError: true,
		},
		{ success: false, think: 420, run: 520 },
	),
	step(say("That file is auto-generated — I'll edit the template instead. Write tour complete."), 360),
	step(completed(), 220),
];

export const writeDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...writeStreamPhase(
				"Writing a file",
				"w-followup",
				"src/telemetry.ts",
				BIG_TS_CONTENT,
				"Successfully wrote 1284 bytes to src/telemetry.ts",
				{ think: 420 },
			),
			step(say("Scripted write-demo driver — attach a real engine to write live files."), 320),
			step(completed(), 200),
		],
	},
};

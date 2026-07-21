// Find demo script — a `find`-focused conversation expressed as pure session-driver events.
// Replayed through @fraym-ai/driver/mock so the find tool renders inside a real thread via the
// production renderer (`renderFind`). Walks the shapes: a STREAMED glob (the file list grows
// as matches arrive), a directory listing (entries with trailing `/`), and a truncated find
// (result-limit cap + artifact spill).
//
// Find returns `details.files` (the relative path list the renderer lists; a trailing `/`
// marks a directory) + `fileCount` / `scopePath` + truncation detail. Find STREAMS: the
// running call carries a growing `details.files` via the partial-output channel. Pure data:
// no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";
import { assistantDelta as say, queuedMessage, runCompleted, scriptedStep as step, toolFinished as toolDone, toolStarted, toolUpdated as toolUpdate, workingStatus as verb } from "./scripted-event-utils";

const NOW = "2026-06-05T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-find",
	path: "/work/fraym-find",
	displayName: "fraym-find",
};

const REF: SessionRef = { workspaceId: "fraym-find", sessionId: "demo-find" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Find every tool-renderer module",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 14_800, contextWindow: 200_000, percent: 0.074 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

function userMessage(id: string, text: string): ScriptedEvent {
	return queuedMessage(id, text, NOW);
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return toolStarted(callId, "find", input);
}

function completed(): ScriptedEvent {
	return runCompleted(SNAPSHOT);
}

/** The `{ content, details }` result a find run returns. `content` carries the newline-joined
 *  list (model-facing); `details.files` is the structured list the renderer lists. */
function findResult(files: string[], details: Record<string, unknown>, isError = false): unknown {
	return { content: [{ type: "text", text: files.join("\n") }], details, isError };
}

function findDetails(files: string[], scopePath: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
	return { scopePath, fileCount: files.length, files, ...extra };
}

/** A static find phase: verb → the card appears running → it resolves. */
function findPhase(
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

/** A streaming find run: matches arrive in growing slices via the partial channel
 *  (`details.files`), the list follows the tail, then it resolves. */
function findStreamPhase(
	message: string,
	callId: string,
	input: unknown,
	files: string[],
	scopePath: string,
	opts: { think?: number; tick?: number; run?: number } = {},
): ScriptStep[] {
	const tickMs = opts.tick ?? 170;
	const updates = files.map((_, index) => {
		const slice = files.slice(0, index + 1);
		return step(toolUpdate(callId, findResult(slice, findDetails(slice, scopePath))), tickMs);
	});
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 480),
		...updates,
		step(toolDone(callId, findResult(files, findDetails(files, scopePath))), opts.run ?? 520),
	];
}

// --- realistic find output --------------------------------------------------

// `*-render.tsx` across the UI package (scope packages/ui/src) — the streamed glob.
const RENDER_FILES = [
	"features/tool-card/tools/bash-render.tsx",
	"features/tool-card/tools/find-render.tsx",
	"features/tool-card/tools/search-render.tsx",
	"registries/edit-renderer.tsx",
	"registries/read-renderer.tsx",
	"registries/write-renderer.tsx",
	"registries/default-tool-renderers.tsx",
	"registries/tool-renderer-registry.tsx",
];

// A directory listing (entries with a trailing `/`) — scope packages/ui/src/features.
const FEATURE_DIRS = ["tool-card/", "diff/", "message/", "thread/", "subagent-swarm/", "data-inspector/"];

// A truncated `**/*.ts` sweep: more results than the limit, so it spills to an artifact.
const TS_FILES = Array.from({ length: 18 }, (_, i) => `packages/pkg-${i + 1}/src/index.ts`);

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(userMessage("u-find", "Find all the tool-renderer modules, then list the feature folders."), 200),
	step(say("Globbing the UI package for every renderer — streaming results as they come in: "), 320),
	...findStreamPhase(
		"Finding renderers",
		"f-renderers",
		{ paths: ["packages/ui/src/**/*-render.tsx", "packages/ui/src/registries/*-renderer.tsx"] },
		RENDER_FILES,
		"packages/ui/src",
		{ think: 460 },
	),
	step(say("Eight renderer modules. Now the feature folders: "), 340),
	...findPhase(
		"Finding feature dirs",
		"f-dirs",
		{ paths: ["packages/ui/src/features/*"] },
		findResult(FEATURE_DIRS, findDetails(FEATURE_DIRS, "packages/ui/src/features")),
		{ think: 420 },
	),
	step(say("Six feature dirs. One broad sweep for every `index.ts` — this one's capped at the limit: "), 320),
	...findPhase(
		"Finding index.ts",
		"f-index",
		{ paths: ["**/index.ts"], limit: 12 },
		findResult(TS_FILES.slice(0, 12), {
			...findDetails(TS_FILES.slice(0, 12), "."),
			truncated: true,
			resultLimitReached: 12,
			truncation: { truncatedBy: "lines", artifactId: "find-4a1b" },
		}),
		{ think: 520, run: 600 },
	),
	step(say("Capped at 12 of 18 (full list in the artifact). Find tour complete."), 360),
	step(completed(), 220),
];

export const findDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...findStreamPhase(
				"Finding test files",
				"f-followup",
				{ paths: ["packages/ui/src/**/*.test.ts"] },
				[
					"features/tool-card/tools/bodies/test/ansi.test.ts",
					"features/tool-card/tools/bodies/test/search-display.test.ts",
				],
				"packages/ui/src",
				{ think: 420 },
			),
			step(say("Scripted find-demo driver — attach a real engine to glob live."), 320),
			step(completed(), 200),
		],
	},
};

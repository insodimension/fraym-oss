// Resolve demo script — a `resolve`-focused conversation expressed as
// pure session-driver events. Replayed through @fraym/driver/mock so the
// resolve tool renders inside a real thread via the production renderer
// (`renderResolve`). Walks through a proposed edit that gets accepted.
//
// Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";
import { RESOLVE_DETAILS, RESOLVE_INPUT } from "./resolve-outputs";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-resolve",
	path: "/",
	displayName: "Fraym Resolve Demo",
};

const REF: SessionRef = { workspaceId: "fraym-resolve", sessionId: "demo-resolve" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Resolve demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 3_200, contextWindow: 200_000, percent: 0.016 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers -------------------------------------------------

function step(event: Record<string, unknown>, delayMs = 0): ScriptStep {
	return { event: event as never, delayMs };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function say(text: string): Record<string, unknown> {
	return { type: "assistantDelta", text };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

// --- resolve helpers ---------------------------------------------------------

interface ResolveInput {
	readonly action: string;
	readonly reason: string;
}

interface ResolveOutput {
	readonly content?: Array<{ type: string; text: string }>;
	readonly details?: Record<string, unknown> | undefined;
	readonly isError?: boolean;
}

function resolveStarted(callId: string, input: ResolveInput): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName: "resolve", input };
}

function resolveDone(callId: string, output: ResolveOutput, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function resolvePhase(
	message: string,
	callId: string,
	input: ResolveInput,
	output: ResolveOutput,
	opts: { think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(resolveStarted(callId, input), opts.think ?? 320),
		step(resolveDone(callId, output, !output.isError), opts.run ?? 420),
	];
}

// --- demo script ------------------------------------------------------------

const ACCEPT_OUTPUT: ResolveOutput = {
	content: [{ type: "text", text: "Accepted: Fix null-handling in parser.ts" }],
	details: RESOLVE_DETAILS["apply-accept"],
};

const DISCARD_OUTPUT: ResolveOutput = {
	content: [{ type: "text", text: "Discarded: Refactor API types" }],
	details: RESOLVE_DETAILS.discard,
};

const FAILED_OUTPUT: ResolveOutput = {
	content: [{ type: "text", text: "Failed: Update config parsing" }],
	details: RESOLVE_DETAILS["apply-failed"],
	isError: true,
};

const INTRO: ScriptStep[] = [
	step(say("I have a few pending actions to resolve.")),
	...resolvePhase(
		"Accepting edit…",
		"resolve-1",
		RESOLVE_INPUT["apply-accept"] as unknown as ResolveInput,
		ACCEPT_OUTPUT,
	),
	step(say("The parser.ts null-handling fix is accepted.")),
	...resolvePhase(
		"Discarding proposal…",
		"resolve-2",
		RESOLVE_INPUT.discard as unknown as ResolveInput,
		DISCARD_OUTPUT,
	),
	step(say("The API types refactor was discarded — no breaking change.")),
	...resolvePhase(
		"Applying edit…",
		"resolve-3",
		RESOLVE_INPUT["apply-failed"] as unknown as ResolveInput,
		FAILED_OUTPUT,
	),
	step(say("The config-parsing patch failed due to a merge conflict; needs manual resolution.")),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	step(
		say(
			"Three actions processed: one accepted, one discarded, one failed — all recorded in the resolve cards above.",
		),
	),
	step(completed()),
];

export const resolveDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	speed: 1,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

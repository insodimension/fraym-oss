// Tool-group demo script — a Forge-editor / Arc probe conversation expressed as pure
// session-driver events. Replayed through @fraym/driver/mock so a long run of
// consecutive tool calls lands in a real thread; with `groupConsecutiveTools` on
// (the entry's dock `threadSettings`), the run collapses into ONE `ToolGroupCard`
// instead of a wall of cards. Reuses `TOOL_GROUP_CALLS` so the live thread matches
// the standalone preview. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";
import { TOOL_GROUP_CALLS, type ToolGroupCallSpec } from "./tool-group-outputs";

const NOW = "2026-06-18T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "arc-sample",
	path: "/work/arc-sample",
	displayName: "ArcSample",
};

const REF: SessionRef = { workspaceId: "arc-sample", sessionId: "demo-tool-group" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Check Forge open status",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 77_000, contextWindow: 200_000, percent: 0.385 },
	config: { provider: "openai", modelId: "gpt-5-4-mini", thinkingLevel: "high" },
};

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}

function userMessage(id: string, text: string): ScriptedEvent {
	return { type: "queuedMessageStarted", message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW } };
}

function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** A probe call: the card appears running, then resolves (success or error). */
function probe(call: ToolGroupCallSpec, think = 90, run = 140): ScriptStep[] {
	return [
		step({ type: "toolStarted", callId: call.callId, toolName: call.toolName, input: call.input }, think),
		step({ type: "toolFinished", callId: call.callId, success: call.status !== "error", output: call.output }, run),
	];
}

const INTRO: ScriptStep[] = [
	step(userMessage("u-tg", "Check the Forge project is open and scan the Arc combat-character setup."), 200),
	step(say("Probing the live editor over the Fraym ACP bridge — this is a burst of small reads: "), 320),
	...TOOL_GROUP_CALLS.flatMap(call => probe(call)),
	step(
		say(
			"Editor's open. Found `BP_ArcCharacter` + its data asset; the `BP_ArcCharacterBase` probe failed (no such Blueprint — it's `BP_ArcCharacter`). Arc damage/action tags are registered. Ready to scaffold the character.",
		),
		360,
	),
	step(completed(), 220),
];

export const toolGroupDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			step(say("Re-running the editor probe burst: "), 280),
			...TOOL_GROUP_CALLS.slice(0, 6).flatMap(call => probe(call)),
			step(say("Scripted tool-group demo — attach a real engine for live editor calls."), 320),
			step(completed(), 200),
		],
	},
};

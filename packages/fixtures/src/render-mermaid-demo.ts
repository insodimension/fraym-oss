// render_mermaid demo script — agent renders a flowchart, then a sequence diagram.
// Pure session-driver events replayed through @fraym-ai/driver/mock.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptStep } from "@fraym-ai/driver/mock";
import { RENDER_MERMAID_DETAILS, RENDER_MERMAID_INPUT, RENDER_MERMAID_OUTPUT_TEXT } from "./render-mermaid-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-mermaid", path: "/work/mermaid", displayName: "Mermaid Demo" };
const REF: SessionRef = { workspaceId: "fraym-mermaid", sessionId: "demo-mermaid" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "render_mermaid · Mermaid-to-ASCII diagrams",
	status: "idle",
	updatedAt: NOW,
	config: undefined,
};

function step(event: Record<string, unknown>, delayMs = 0): ScriptStep {
	return { event: event as never, delayMs };
}

function say(text: string): Record<string, unknown> {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, input: unknown): Record<string, unknown> {
	return { type: "toolStarted", callId, toolName: "render_mermaid", input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function mermaidPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message)),
		step(toolStart(callId, input), opts.think ?? 300),
		step(toolDone(callId, output), opts.run ?? 200),
	];
}

const INTRO: ScriptStep[] = [
	step(say("Here's a flowchart showing the decision process for the pipeline:")),
	...mermaidPhase(
		"Rendering flowchart…",
		"mmd-1",
		RENDER_MERMAID_INPUT.flowchart,
		toolResult(
			RENDER_MERMAID_OUTPUT_TEXT.flowchart ?? "",
			RENDER_MERMAID_DETAILS.flowchart as Record<string, unknown>,
		),
		{ think: 500 },
	),
	step(say("Now let me show the interaction sequence between the services:")),
	...mermaidPhase(
		"Rendering sequence diagram…",
		"mmd-2",
		RENDER_MERMAID_INPUT.sequence,
		toolResult(RENDER_MERMAID_OUTPUT_TEXT.sequence ?? "", RENDER_MERMAID_DETAILS.sequence as Record<string, unknown>),
		{ think: 400 },
	),
	step(say("That gives us a clear picture of both the flow and the protocol.")),
	step(completed()),
];

export const renderMermaidDemoScript: DemoScript = { snapshot: SNAPSHOT, intro: INTRO };

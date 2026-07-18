import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";
import { createScriptedDriver } from "@fraym/driver/mock";
import { SEARCH_TOOL_BM25_DETAILS } from "./search-tool-bm25-outputs";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-07T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-bm25", path: "/work/bm25", displayName: "Tool Discovery Demo" };
const REF: SessionRef = { workspaceId: "fraym-bm25", sessionId: "demo-bm25" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "search_tool_bm25 · discover Jira tools",
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
	return { type: "toolStarted", callId, toolName: "search_tool_bm25", input };
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

const MATCH_DETAILS = SEARCH_TOOL_BM25_DETAILS.normal;

function discoveryPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number } = {},
): ScriptStep[] {
	return [step(verb(message)), step(toolStart(callId, input), opts.think ?? 300), step(toolDone(callId, output), 200)];
}

const INTRO: ScriptStep[] = [
	step(say("Let me search for Jira-related tools you can use.")),
	...discoveryPhase(
		"Searching discoverable tools…",
		"bm25-1",
		{ query: "jira issue create ticket", limit: 8 },
		toolResult(
			JSON.stringify({
				query: "jira",
				activated_tools: ["jira_create_issue", "jira_search_issues"],
				match_count: 2,
				total_tools: 24,
			}),
			MATCH_DETAILS,
		),
		{ think: 500 },
	),
	step(say("Found 2 Jira tools: Create Issue and Search Issues. They are now activated.")),
	step(completed()),
];

const DEMO_SCRIPT: DemoScript = { snapshot: SNAPSHOT, intro: INTRO };

export function createSearchToolBm25DemoDriver() {
	return createScriptedDriver(DEMO_SCRIPT);
}

export const SEARCH_TOOL_BM25_DEMO_SESSION_REF = REF;

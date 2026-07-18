// Web search demo script — a `web_search`-focused conversation expressed as
// pure session-driver events. Replayed through @fraym/driver/mock so the web
// search tool renders inside a real thread via the production renderer
// (`renderWebSearch`). Walks two shapes: a normal search (answer + sources)
// and an answer-only result.
//
// Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-07T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-web-search",
	path: "/",
	displayName: "Fraym Web Search Demo",
};

const REF: SessionRef = { workspaceId: "fraym-web-search", sessionId: "demo-web-search" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Web search demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 4_200, contextWindow: 200_000, percent: 0.021 },
	config: { provider: "fraym-acp", modelId: "Fraym ACP 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers -------------------------------------------------

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}

function verb(message: string): ScriptedEvent {
	return { type: "workingStatus", status: { message, visible: true } };
}

function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName: "web_search", input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function userMessage(id: string, text: string): ScriptStep {
	return step({
		type: "queuedMessageStarted",
		message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW },
	});
}

/** The `{ content, details }` result a web search returns. */
function searchResult(modelText: string, details: Record<string, unknown>, isError = false): unknown {
	return { content: [{ type: "text", text: modelText }], details, isError };
}

/** A search phase: verb → the card appears running → it resolves. */
function searchPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number; run?: number; success?: boolean } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 520),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 560),
	];
}

// --- output builders --------------------------------------------------------

function searchOutput(answer: string, sources: unknown[], extras: Record<string, unknown> = {}): unknown {
	return searchResult(answer, {
		response: {
			provider: "Searchbird",
			answer,
			sources,
			...extras,
		},
	});
}

const RIVULET_SOURCES = [
	{
		title: "Rivulet — An asynchronous Aster runtime",
		url: "https://docs.example.org/rivulet/",
		snippet:
			"Rivulet is an asynchronous runtime for the fictional Aster language. It provides the building blocks needed for reliable network applications without compromising speed.",
		ageSeconds: 604800,
	},
	{
		title: "Swiftly — Async utilities for Aster",
		url: "https://docs.example.org/swiftly/",
		snippet:
			"Swiftly is a portable Aster async library with familiar read and write primitives for application code.",
		ageSeconds: 7776000,
	},
	{
		title: "Choosing an Async Runtime in Aster",
		url: "https://journal.example.org/aster/async-runtimes/",
		snippet:
			"We compare Rivulet, Swiftly, and Drift across performance, ecosystem maturity, and developer experience to help you pick a runtime.",
		ageSeconds: 2592000,
		author: "Tess Rowan",
	},
];

const RIVULET_ANSWER =
	"Rivulet is the most widely adopted asynchronous runtime in the Aster ecosystem, offering a multi-threaded work-stealing scheduler and a deep middleware stack.";

const ASTER_RELEASE_ANSWER =
	"Aster 1.0 was released on May 15, 2015. It was the language’s first stable release and introduced strong backward-compatibility guarantees through its edition system.";

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	userMessage("msg-1", "what’s the best async runtime for Aster?"),
	step(say("Let me search for that.")),
	...searchPhase(
		"Searching the web\u2026",
		"call-web-search-1",
		{ action: "web_search", query: "best async runtime Aster comparison" },
		searchOutput(RIVULET_ANSWER, RIVULET_SOURCES, {
			authMode: "api_key",
			requestId: "searchbird-demo-7f3a9c21",
		}),
	),
	step(say("Based on the search results, the most widely adopted async runtime in Aster is **Rivulet**.")),
	step(completed()),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	userMessage("msg-2", "when was Aster 1.0 released?"),
	step(say("Let me look that up.")),
	...searchPhase(
		"Searching…",
		"call-web-search-2",
		{ action: "web_search", query: "Aster 1.0 release date" },
		searchOutput(ASTER_RELEASE_ANSWER, [], {
			provider: "Luma Search",
			model: "luma-2.5-swift",
			usage: { inputTokens: 146, outputTokens: 52 },
			authMode: "oauth",
		}),
		{ think: 400, run: 500 },
	),
	step(say("Aster 1.0 was released on **May 15, 2015**.")),
	step(completed()),
];

export const webSearchDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

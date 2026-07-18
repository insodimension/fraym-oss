// Browser demo script — a `browser`-focused conversation expressed as pure
// session-driver events. Replayed through @fraym/driver/mock so the browser tool
// renders inside a real thread via the production renderer (`renderBrowser`). Walks
// the action shapes: open a headless tab, run JS (observe the a11y tree), capture a
// screenshot (an INLINE image block in `content[]`), and close. Browser has NO
// result streaming (`_onUpdate` is unused) — every phase is static (toolStarted →
// toolFinished). Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";
import { SCREENSHOT_B64 } from "./browser-outputs";
import { assistantDelta as say, queuedMessage, runCompleted, scriptedStep as step, toolFinished as toolDone, toolStarted, workingStatus as verb } from "./scripted-event-utils";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-06T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-browser",
	path: "/work/fraym-browser",
	displayName: "fraym-browser",
};

const REF: SessionRef = { workspaceId: "fraym-browser", sessionId: "demo-browser" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Screenshot example.com + read its a11y tree",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 12_800, contextWindow: 200_000, percent: 0.064 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "medium" },
};

function userMessage(id: string, text: string): ScriptedEvent {
	return queuedMessage(id, text, NOW);
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return toolStarted(callId, "browser", input);
}

function completed(): ScriptedEvent {
	return runCompleted(SNAPSHOT);
}

/** A static browser phase: verb → the card appears running → it resolves (no streaming). */
function browserPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 520),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 520),
	];
}

const OPEN_DETAILS = { action: "open", name: "main", browser: "headless", url: "https://example.com/" };
const RUN_DETAILS = { action: "run", name: "main", browser: "headless", url: "https://example.com/" };
const OPENED = 'Opened tab "main" on headless Chromium\nURL: https://example.com/\nTitle: Example Domain';

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage(
			"u-br",
			"Open example.com headless, tell me the title + element count, grab a screenshot, then close it.",
		),
		200,
	),
	step(say("Opening a headless tab: "), 320),
	...browserPhase(
		"Opening tab",
		"b-open",
		{ action: "open", name: "main", url: "https://example.com" },
		toolResult(OPENED, OPEN_DETAILS),
	),
	step(say("Loaded. Reading the accessibility tree: "), 340),
	...browserPhase(
		"Observing the page",
		"b-run",
		{
			action: "run",
			name: "main",
			code: "const obs = await tab.observe();\ndisplay(obs.elements.length + ' elements');\nreturn obs.title;",
		},
		toolResult('12 elements\n"Example Domain"', RUN_DETAILS),
	),
	step(say("Now capturing a screenshot: "), 320),
	...browserPhase(
		"Capturing screenshot",
		"b-shot",
		{ action: "run", name: "main", code: "await tab.screenshot();" },
		{
			content: [
				{ type: "text", text: "📸 saved screenshot-2026-06-06.svg (360×220 · 6.2 KB)" },
				{ type: "image", data: SCREENSHOT_B64, mimeType: "image/svg+xml" },
			],
			details: {
				action: "run",
				name: "main",
				browser: "headless",
				url: "https://example.com/",
				screenshots: [
					{ dest: "screenshot-2026-06-06.svg", mimeType: "image/svg+xml", bytes: 6200, width: 360, height: 220 },
				],
			},
			isError: false,
		},
	),
	step(say("Capture's above. Closing the tab: "), 320),
	...browserPhase(
		"Closing tabs",
		"b-close",
		{ action: "close", all: true },
		toolResult("Closed 1 tab(s)", { action: "close", name: "main" }),
	),
	step(say("Done — “Example Domain”, 12 elements, screenshot attached above."), 360),
	step(completed(), 220),
];

export const browserDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...browserPhase(
				"Reopening tab",
				"b-followup",
				{ action: "open", name: "main", url: "https://example.com" },
				toolResult(OPENED, OPEN_DETAILS),
			),
			step(say("Scripted browser-demo driver — attach a real engine to drive a live headless browser."), 320),
			step(completed(), 200),
		],
	},
};

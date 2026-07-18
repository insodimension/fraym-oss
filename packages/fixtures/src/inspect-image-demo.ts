// inspect_image demo script — shows an image being analyzed

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-07T12:00:00.000Z";
const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-inspect",
	path: "/work/inspect",
	displayName: "Image inspection",
};
const REF: SessionRef = { workspaceId: "fraym-inspect", sessionId: "demo-inspect" };
const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Inspect Image demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 1000, contextWindow: 200000, percent: 0.005 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "medium" },
};

const SVG_B64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTIwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzRhOTBkOSIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjMwIiBmaWxsPSIjZmZkNzAwIi8+PHJlY3QgeT0iODAiIHdpZHRoPSIxNjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZDhhNGUiLz48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+Cg==";

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}
function verb(msg: string): ScriptedEvent {
	return { type: "workingStatus", status: { message: msg, visible: true } };
}
function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}
function userMessage(id: string, text: string): ScriptedEvent {
	return { type: "queuedMessageStarted", message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW } };
}
function toolStart(callId: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName: "inspect_image", input };
}
function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}
function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

const INTRO: ScriptStep[] = [
	step({ type: "sessionOpened", snapshot: SNAPSHOT }),
	step(verb("Starting inspect_image demo")),
	step(userMessage("1", "What's in this image?")),
	step(say("Let me analyze that image."), 200),
	step(toolStart("ii-1", { path: "/screenshots/landscape.svg", question: "Describe the composition and colors." })),
	step(
		toolDone("ii-1", {
			content: [
				{
					type: "text",
					text: "The image shows a simple landscape scene with a blue sky (#4a90d9), a golden-yellow sun at center, and green ground (#2d8a4e). The composition is minimal and geometric.",
				},
			],
			details: {
				model: "gpt-4o",
				imagePath: "/screenshots/landscape.svg",
				mimeType: "image/svg+xml",
				imagePreview: { data: SVG_B64, mimeType: "image/svg+xml" },
			},
		}),
	),
	step(completed()),
];

export const inspectImageDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
};

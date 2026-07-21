// generate_image demo script — generates two landscape images

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";

const NOW = "2026-06-07T12:00:00.000Z";
const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-genimg", path: "/work/genimg", displayName: "Image generation" };
const REF: SessionRef = { workspaceId: "fraym-genimg", sessionId: "demo-genimg" };
const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Generate Image demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 1000, contextWindow: 200000, percent: 0.005 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "medium" },
};

const SVG1_B64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTIwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzRhOTBkOSIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjMwIiBmaWxsPSIjZmZkNzAwIi8+PHJlY3QgeT0iODAiIHdpZHRoPSIxNjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZDhhNGUiLz48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+Cg==";
const SVG2_B64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTIwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzJjODdmMCIvPjxjaXJjbGUgY3g9IjExMCIgY3k9IjMwIiByPSIyNSIgZmlsbD0iI2ZmZDcwMCIvPjxyZWN0IHk9IjgwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjE2OTNmIi8+PHBhdGggZD0iTTAgODAgUTUwIDYwIDgwIDc1IFExMTAgOTAgMTYwIDcwIEwxNjAgODAgWiIgZmlsbD0iIzNhOWQ1ZSIgb3BhY2l0eT0iMC42Ii8+PC9zdmc+Cg==";

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
	return { type: "toolStarted", callId, toolName: "generate_image", input };
}
function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}
function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

const INTRO: ScriptStep[] = [
	step({ type: "sessionOpened", snapshot: SNAPSHOT }),
	step(verb("Starting generate_image demo")),
	step(userMessage("1", "Generate a mountain landscape at sunset")),
	step(say("Generating..."), 300),
	step(toolStart("gi-1", { subject: "a mountain landscape at sunset", aspect_ratio: "16:9" })),
	step(
		toolDone("gi-1", {
			content: [{ type: "text", text: "Generated 2 images of a mountain landscape at sunset." }],
			details: {
				provider: "openai",
				model: "dall-e-3",
				imageCount: 2,
				imagePaths: ["/tmp/gen-img-1.svg", "/tmp/gen-img-2.svg"],
				images: [
					{ data: SVG1_B64, mimeType: "image/svg+xml" },
					{ data: SVG2_B64, mimeType: "image/svg+xml" },
				],
				revisedPrompt: "A serene mountain landscape at golden hour...",
				responseText: "Here are two variations.",
			},
		}),
	),
	step(completed()),
];

export const generateImageDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
};

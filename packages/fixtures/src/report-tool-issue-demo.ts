// Report tool issue demo script — a `report_tool_issue`-focused conversation
// expressed as pure session-driver events. Replayed through @fraym/driver/mock
// so success, consent-denied, pending, and skipped report states render through
// the production tool-call path.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptStep } from "@fraym/driver/mock";
import {
	REPORT_TOOL_ISSUE_DETAILS,
	REPORT_TOOL_ISSUE_INPUT,
	REPORT_TOOL_ISSUE_OUTPUT_TEXT,
	type ReportToolIssueVariation,
} from "./report-tool-issue-outputs";
import { optionalToolResult, pendingToolCall, toolResult } from "./tool-call-utils";

const NOW = "2026-06-08T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-report-tool-issue",
	path: "/",
	displayName: "Fraym Report Tool Issue Demo",
};

const REF: SessionRef = { workspaceId: "fraym-report-tool-issue", sessionId: "demo-report-tool-issue" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Report tool issue demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 4_900, contextWindow: 200_000, percent: 0.0245 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

function step(event: Record<string, unknown>, delayMs = 0): ScriptStep {
	return { event: event as never, delayMs };
}

function verb(message: string): Record<string, unknown> {
	return { type: "workingStatus", status: { message, visible: true } };
}

function say(text: string): Record<string, unknown> {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, input: unknown): Record<string, unknown> {
	const call = pendingToolCall(callId, "report_tool_issue", input);
	return { type: "toolStarted", callId: call.callId, toolName: call.toolName, input: call.input };
}

function toolDone(callId: string, output: unknown, success = true): Record<string, unknown> {
	return { type: "toolFinished", callId, success, output };
}

function completed(): Record<string, unknown> {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

function userMessage(id: string, text: string): ScriptStep {
	return step({
		type: "queuedMessageStarted",
		message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW },
	});
}

function reportOutput(variation: ReportToolIssueVariation): unknown {
	const text = REPORT_TOOL_ISSUE_OUTPUT_TEXT[variation];
	if (variation === "skipped") return optionalToolResult(text, REPORT_TOOL_ISSUE_DETAILS[variation]);
	return toolResult(text ?? "", REPORT_TOOL_ISSUE_DETAILS[variation], variation === "error");
}

function reportPhase(
	message: string,
	callId: string,
	variation: ReportToolIssueVariation,
	opts: { think?: number; run?: number; success?: boolean } = {},
): ScriptStep[] {
	return [
		step(verb(message), 180),
		step(toolStart(callId, REPORT_TOOL_ISSUE_INPUT[variation]), opts.think ?? 280),
		step(toolDone(callId, reportOutput(variation), opts.success ?? variation !== "error"), opts.run ?? 360),
	];
}

const INTRO: ScriptStep[] = [
	step(say("The read tool returned malformed output, so I will file an AutoQA report.")),
	...reportPhase("Reporting the malformed read output…", "report-tool-issue-success", "success"),
	step(say("Reported. I also hit a browser issue, but this run has no AutoQA consent.")),
	...reportPhase("Trying to report without AutoQA consent…", "report-tool-issue-error", "error", { success: false }),
	step(say("Consent was missing, so the issue was only noted locally.")),
	step(completed(), 200),
];

const FOLLOWUP_STEPS: ScriptStep[] = [
	userMessage("msg-2", "show the queued and skipped states too"),
	step(say("I will start a report, leave it pending briefly, then show a skipped duplicate.")),
	step(verb("Queueing report…"), 180),
	step(toolStart("report-tool-issue-pending", REPORT_TOOL_ISSUE_INPUT.pending), 320),
	step(toolDone("report-tool-issue-pending", reportOutput("success")), 700),
	...reportPhase("Skipping duplicate report…", "report-tool-issue-skipped", "skipped", { think: 240, run: 260 }),
	step(say("The queued report resolved, and the duplicate was skipped.")),
	step(completed(), 200),
];

export const reportToolIssueDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: { steps: FOLLOWUP_STEPS },
};

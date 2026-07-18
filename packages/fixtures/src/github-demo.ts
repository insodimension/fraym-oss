// GitHub demo script — a `github`-focused conversation expressed as pure
// session-driver events. Replayed through @fraym/driver/mock so the github tool
// renders inside a real thread via the production renderer (`renderGithub`).
// Walks a repo view followed by an issue search. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-07T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-github",
	path: "/work/acme-cockpit",
	displayName: "acme-labs/cockpit",
};

const REF: SessionRef = { workspaceId: "fraym-github", sessionId: "demo-github" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "GitHub tool demo",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 5_000, contextWindow: 200_000, percent: 0.025 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "medium" },
};

// --- step authoring helpers (mirror browser-demo) ----------------------------

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}

function verb(message: string): ScriptedEvent {
	return { type: "workingStatus", status: { message, visible: true } };
}

function userMessage(id: string, text: string): ScriptedEvent {
	return { type: "queuedMessageStarted", message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW } };
}

function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName: "github", input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** A github phase: verb → the card appears running → it resolves. */
function ghPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { think?: number; run?: number; success?: boolean } = {},
): ScriptStep[] {
	const { think = 300, run = 400, success = true } = opts;
	return [
		step(verb(message)),
		step(say("Let me look that up..."), think),
		step(toolStart(callId, input), run),
		step(toolDone(callId, output, success), 100),
	];
}

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step({ type: "sessionOpened", snapshot: SNAPSHOT }),
	step(verb("Starting GitHub demo")),
	step(userMessage("1", "Show me the acme-labs/cockpit repo")),
	...ghPhase(
		"Viewing repo",
		"gh-1",
		{ op: "repo_view", repo: "acme-labs/cockpit" },
		toolResult(
			[
				"# acme-labs/cockpit",
				"",
				"A sample workspace for reviewing and organizing project tasks.",
				"",
				"Stars: 128 • Forks: 34 • License: MIT",
				"Language: TypeScript (78%), CSS (14%), Markdown (8%)",
				"Updated: 2026-06-07",
			].join("\n"),
			{ repo: "acme-labs/cockpit", branch: "main" },
		),
	),
	...ghPhase(
		"Searching issues",
		"gh-2",
		{ op: "search_issues", repo: "acme-labs/cockpit", query: "renderer bug" },
		toolResult(
			[
				"Showing 3 of 3 open issues matching `renderer bug` in acme-labs/cockpit",
				"",
				"#42  Renderer shows blank preview after a saved edit       (bug, high)  opened 2d ago",
				"#38  Keyboard focus skips the filter menu                  (bug)        opened 5d ago",
			].join("\n"),
			{ repo: "acme-labs/cockpit" },
		),
	),
	step(completed()),
];

export const githubDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...ghPhase(
				"Checking PR",
				"gh-3",
				{ op: "pr_checkout", repo: "acme-labs/cockpit", pr: "142" },
				toolResult(
					[
						"✓ Checked out PR #142 into /worktrees/pr-142",
						"Branch: feature/github-renderer (remote: origin)",
					].join("\n"),
					{
						repo: "acme-labs/cockpit",
						branch: "feature/github-renderer",
						worktreePath: "/worktrees/pr-142",
					},
				),
			),
			step(say("Scripted GitHub demo driver — attach a host integration for live repository operations."), 320),
			step(completed(), 200),
		],
	},
};

// Todo demo script — a `todo_write`-focused conversation expressed as pure
// session-driver events. Replayed through @fraym-ai/driver/mock so the todo tool
// renders inside a real thread via the production renderer (`renderTodo` →
// `TodoChecklistBody`). Walks the real usage pattern: the agent writes a plan,
// then calls `todo_write` again as it starts and finishes items — each call is
// its own card whose checklist reflects the evolving phases (pending →
// in_progress → completed, with a `§ notes` block on an in-progress item).
//
// The card reads `call.output.details.phases` (Engine `TodoToolDetails`). Pure data:
// no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";

const NOW = "2026-06-06T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-todo",
	path: "/work/fraym-todo",
	displayName: "fraym-todo",
};

const REF: SessionRef = { workspaceId: "fraym-todo", sessionId: "demo-todo" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Plan + track the rate-limit work",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 9_400, contextWindow: 200_000, percent: 0.047 },
	config: { provider: "acme", modelId: "Sonnet 4.6", thinkingLevel: "medium" },
};

// --- todo phases (the checklist as it evolves across calls) -----------------

type TodoTask = { content: string; status: string; notes?: string[] };

function phase(tasks: TodoTask[]) {
	return [{ name: "Rate limiting", tasks }];
}

const PLAN = phase([
	{ content: "Add the Redis token-bucket store", status: "pending" },
	{ content: "Wire the middleware", status: "pending" },
	{ content: "Cover it with tests", status: "pending" },
]);

const STARTED = phase([
	{
		content: "Add the Redis token-bucket store",
		status: "in_progress",
		notes: ["Sliding-window counter keyed by client id; reuse the existing redis pool."],
	},
	{ content: "Wire the middleware", status: "pending" },
	{ content: "Cover it with tests", status: "pending" },
]);

const MIDWAY = phase([
	{ content: "Add the Redis token-bucket store", status: "completed" },
	{ content: "Wire the middleware", status: "in_progress" },
	{ content: "Cover it with tests", status: "pending" },
]);

const DONE = phase([
	{ content: "Add the Redis token-bucket store", status: "completed" },
	{ content: "Wire the middleware", status: "completed" },
	{ content: "Cover it with tests", status: "completed" },
]);

// --- step authoring helpers (mirror task-demo / bash-demo) ------------------

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

function todoStart(callId: string, op: string): ScriptedEvent {
	return { type: "toolStarted", callId, toolName: "todo_write", input: { ops: [{ op }] } };
}

function todoFinish(callId: string, phases: ReturnType<typeof phase>): ScriptedEvent {
	return {
		type: "toolFinished",
		callId,
		success: true,
		output: { content: [{ type: "text", text: "Updated todos" }], details: { phases, storage: "session" } },
	};
}

/** One `todo_write` call → a card whose checklist shows `phases`. */
function todoCall(callId: string, op: string, phases: ReturnType<typeof phase>, delayMs: number): ScriptStep[] {
	return [step(todoStart(callId, op), delayMs), step(todoFinish(callId, phases), 360)];
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(userMessage("u-todo", "Add request rate limiting to the API — plan it and keep a checklist as you go."), 200),
	step(say("Here's the plan — I'll track it as a todo list and update it as each step lands:"), 360),
	step(verb("Writing the plan"), 220),
	...todoCall("todo-plan", "init", PLAN, 360),
	step(say("Starting on the token-bucket store."), 520),
	...todoCall("todo-start", "start", STARTED, 420),
	step(say("Store's in. Moving to the middleware."), 700),
	...todoCall("todo-midway", "done", MIDWAY, 420),
	step(say("Middleware wired and tests are green — plan complete:"), 700),
	...todoCall("todo-done", "done", DONE, 420),
	step(say("All three items done. Rate limiting is in and covered."), 380),
	step(completed(), 220),
];

export const todoDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			step(say("Scripted todo-demo driver — attach a real engine to drive a live checklist."), 320),
			step(completed(), 200),
		],
	},
};

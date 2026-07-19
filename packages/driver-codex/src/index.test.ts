import { describe, expect, test } from "bun:test";
import { codexFrameToAgentEvents, type CodexFrame } from "./index.js";

const ctx = { sessionId: "demo", assistantMessageId: "a1", reasoningMessageId: "r1" };

const capturedNotifications = [
	{ method: "item/agentMessage/delta", params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_message", delta: "Hel" } },
	{ method: "item/agentMessage/delta", params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_message", delta: "lo" } },
	{ method: "item/reasoning/textDelta", params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_reasoning", delta: "Thinking" } },
	{
		method: "item/started",
		params: {
			threadId: "thread_1",
			turnId: "turn_1",
			item: { id: "item_command", type: "commandExecution", command: "ls -la", status: "inProgress" },
		},
	},
	{ method: "item/commandExecution/outputDelta", params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_command", delta: "index.js\n" } },
	{
		method: "item/completed",
		params: {
			threadId: "thread_1",
			turnId: "turn_1",
			item: { id: "item_command", type: "commandExecution", command: "ls -la", aggregatedOutput: "index.js\n", exitCode: 0, status: "completed" },
		},
	},
	{
		method: "item/started",
		params: {
			threadId: "thread_1",
			turnId: "turn_1",
			item: { id: "item_diff", type: "fileChange", changes: [{ path: "index.js", kind: { type: "add" }, diff: "console.log('hello')\n" }], status: "inProgress" },
		},
	},
	{ method: "item/fileChange/outputDelta", params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_diff", delta: "+++ index.js\n+console.log('hello')" } },
	{
		method: "item/completed",
		params: {
			threadId: "thread_1",
			turnId: "turn_1",
			item: { id: "item_diff", type: "fileChange", changes: [{ path: "index.js", kind: { type: "add" }, diff: "console.log('hello')\n" }], status: "completed" },
		},
	},
	{ method: "turn/completed", params: { threadId: "thread_1", turn: { id: "turn_1", status: "completed" } } },
] as const satisfies readonly CodexFrame[];

describe("codexFrameToAgentEvents", () => {
	test("maps captured app-server notifications into a streamed AgentEvent sequence", () => {
		const events = capturedNotifications.flatMap(frame => codexFrameToAgentEvents(frame, ctx));
		expect(events).toEqual([
			{ type: "assistant.message.delta", sessionId: "demo", messageId: "a1", delta: "Hel" },
			{ type: "assistant.message.delta", sessionId: "demo", messageId: "a1", delta: "lo" },
			{ type: "reasoning.delta", sessionId: "demo", messageId: "r1", delta: "Thinking" },
			{ type: "tool_call.start", sessionId: "demo", toolCallId: "item_command", toolName: "bash", input: { command: "ls -la" }, status: "running" },
			{ type: "tool_call.update", sessionId: "demo", toolCallId: "item_command", status: "running", output: "index.js\n" },
			{ type: "tool_call.end", sessionId: "demo", toolCallId: "item_command", status: "succeeded", output: "index.js\n" },
			{ type: "tool_call.start", sessionId: "demo", toolCallId: "item_diff", toolName: "edit", input: { path: "index.js", changes: [{ path: "index.js", kind: { type: "add" }, diff: "console.log('hello')\n" }] }, status: "running" },
			{ type: "tool_call.update", sessionId: "demo", toolCallId: "item_diff", status: "running", output: "+++ index.js\n+console.log('hello')" },
			{ type: "tool_call.end", sessionId: "demo", toolCallId: "item_diff", status: "succeeded", output: { details: { totalFiles: 1, perFileResults: [{ path: "index.js", op: "create", diff: "+1|console.log('hello')" }] } } },
			{ type: "session.done", sessionId: "demo" },
		]);
	});

	test("maps a bridge approval request into an approval.request event", () => {
		expect(
			codexFrameToAgentEvents(
				{
					type: "bridge.request",
					requestId: "42",
					method: "item/commandExecution/requestApproval",
					params: { itemId: "item_command", command: "npm test" },
				},
				ctx,
			),
		).toEqual([{ type: "approval.request", sessionId: "demo", approvalId: "42", prompt: "Allow command?\nnpm test" }]);
	});
});

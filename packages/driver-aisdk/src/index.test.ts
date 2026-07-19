import { describe, expect, test } from "bun:test";
import type { AgentEvent } from "@fraym/driver";
import type { TextStreamPart, ToolSet } from "ai";
import { MockLanguageModelV2, simulateReadableStream } from "ai/test";
import { createAiSdkDriver, streamPartToAgentEvents } from "./index";

const SID = "s1";

describe("streamPartToAgentEvents", () => {
	test("text-delta maps to an assistant message delta", () => {
		const part: TextStreamPart<ToolSet> = { type: "text-delta", id: "m0", text: "Hi" };
		expect(streamPartToAgentEvents(part, SID)).toEqual([{ type: "assistant.message.delta", sessionId: SID, messageId: "m0", delta: "Hi" }]);
	});

	test("reasoning-delta maps to a reasoning delta", () => {
		const part: TextStreamPart<ToolSet> = { type: "reasoning-delta", id: "r0", text: "think" };
		expect(streamPartToAgentEvents(part, SID)).toEqual([{ type: "reasoning.delta", sessionId: SID, messageId: "r0", delta: "think" }]);
	});

	test("tool-call opens a running tool card", () => {
		const part: TextStreamPart<ToolSet> = { type: "tool-call", toolCallId: "t1", toolName: "ping", input: { x: 1 }, dynamic: true };
		expect(streamPartToAgentEvents(part, SID)).toEqual([{ type: "tool_call.start", sessionId: SID, toolCallId: "t1", toolName: "ping", input: { x: 1 }, status: "running" }]);
	});

	test("tool-result closes the card as succeeded", () => {
		const part: TextStreamPart<ToolSet> = { type: "tool-result", toolCallId: "t1", toolName: "ping", input: { x: 1 }, output: { ok: true }, dynamic: true };
		expect(streamPartToAgentEvents(part, SID)).toEqual([{ type: "tool_call.end", sessionId: SID, toolCallId: "t1", status: "succeeded", output: { ok: true } }]);
	});

	test("tool-error closes the card as failed", () => {
		const part: TextStreamPart<ToolSet> = { type: "tool-error", toolCallId: "t1", toolName: "ping", input: {}, error: "boom", dynamic: true };
		expect(streamPartToAgentEvents(part, SID)).toEqual([{ type: "tool_call.end", sessionId: SID, toolCallId: "t1", status: "failed", output: "boom" }]);
	});

	test("lifecycle parts map to nothing", () => {
		const start: TextStreamPart<ToolSet> = { type: "text-start", id: "m0" };
		const finish: TextStreamPart<ToolSet> = { type: "finish", finishReason: "stop", totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
		expect(streamPartToAgentEvents(start, SID)).toEqual([]);
		expect(streamPartToAgentEvents(finish, SID)).toEqual([]);
	});
});

describe("createAiSdkDriver", () => {
	test("streams a turn: start, user message, deltas, done", async () => {
		const model = new MockLanguageModelV2({
			doStream: async () => ({
				stream: simulateReadableStream({
					chunks: [
						{ type: "stream-start", warnings: [] },
						{ type: "text-start", id: "0" },
						{ type: "text-delta", id: "0", delta: "Hello" },
						{ type: "text-delta", id: "0", delta: " world" },
						{ type: "text-end", id: "0" },
						{ type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 } },
					],
				}),
			}),
		});
		const driver = createAiSdkDriver({ model, sessionId: SID });
		const events: AgentEvent[] = [];
		driver.subscribe(event => events.push(event));
		await driver.prompt("hi");

		expect(events.map(event => event.type)).toEqual(["session.start", "user.message", "assistant.message.delta", "assistant.message.delta", "session.done"]);
		let text = "";
		for (const event of events) {
			if (event.type === "assistant.message.delta") text += event.delta;
		}
		expect(text).toBe("Hello world");
	});

	test("emits session.error when the stream errors and skips done", async () => {
		const model = new MockLanguageModelV2({
			doStream: async () => ({
				stream: simulateReadableStream({
					chunks: [
						{ type: "stream-start", warnings: [] },
						{ type: "error", error: "kaboom" },
						{ type: "finish", finishReason: "error", usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } },
					],
				}),
			}),
		});
		const driver = createAiSdkDriver({ model, sessionId: SID });
		const events: AgentEvent[] = [];
		driver.subscribe(event => events.push(event));
		await driver.prompt("hi");

		expect(events.some(event => event.type === "session.error")).toBe(true);
		expect(events.some(event => event.type === "session.done")).toBe(false);
	});
});

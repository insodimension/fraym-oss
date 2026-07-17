import { describe, expect, test } from "bun:test";

import type { AgentEvent } from "@fraym/driver";

import { createThreadState, reduceThreadEvent } from "./thread-state";

const sessionId = "thread-test";

describe("reduceThreadEvent", () => {
  test("accumulates assistant message deltas without changing message order", () => {
    const events: readonly AgentEvent[] = [
      { type: "session.start", sessionId },
      {
        type: "user.message",
        sessionId,
        messageId: "user-1",
        content: "Add a health check",
      },
      {
        type: "assistant.message.delta",
        sessionId,
        messageId: "assistant-1",
        delta: "I'll add ",
      },
      {
        type: "assistant.message.delta",
        sessionId,
        messageId: "assistant-1",
        delta: "the endpoint.",
      },
    ];

    const state = events.reduce(reduceThreadEvent, createThreadState());

    expect(state.messages).toEqual([
      { id: "user-1", role: "user", content: "Add a health check" },
      {
        id: "assistant-1",
        role: "assistant",
        content: "I'll add the endpoint.",
      },
    ]);
    expect(state.waiting).toBe(false);
  });

  test("records failures as a visible terminal error", () => {
    const state = reduceThreadEvent(createThreadState(), {
      type: "session.error",
      sessionId,
      message: "The workspace is unavailable.",
    });

    expect(state.phase).toBe("error");
    expect(state.error).toBe("The workspace is unavailable.");
  });

  test("accumulates each tool call input, output deltas, and terminal status", () => {
    const events: readonly AgentEvent[] = [
      { type: "session.start", sessionId },
      {
        type: "tool_call.start",
        sessionId,
        toolCallId: "bash-1",
        toolName: "mcp__shell__bash",
        input: { command: "bun test" },
        status: "running",
      },
      {
        type: "tool_call.update",
        sessionId,
        toolCallId: "bash-1",
        status: "running",
        output: "first chunk\n",
      },
      {
        type: "tool_call.update",
        sessionId,
        toolCallId: "bash-1",
        status: "running",
        output: "second chunk",
      },
      {
        type: "tool_call.end",
        sessionId,
        toolCallId: "bash-1",
        status: "succeeded",
      },
    ];

    const state = events.reduce(reduceThreadEvent, createThreadState());

    expect(state.toolCalls).toEqual([{
      id: "bash-1",
      name: "mcp__shell__bash",
      status: "succeeded",
      input: { command: "bun test" },
      output: "first chunk\nsecond chunk",
    }]);
  });

  test("keeps tool output accumulation isolated by call id", () => {
    const events: readonly AgentEvent[] = [
      { type: "tool_call.start", sessionId, toolCallId: "one", toolName: "read", input: { path: "one.ts" }, status: "running" },
      { type: "tool_call.start", sessionId, toolCallId: "two", toolName: "read", input: { path: "two.ts" }, status: "running" },
      { type: "tool_call.update", sessionId, toolCallId: "one", status: "running", output: ["a"] },
      { type: "tool_call.update", sessionId, toolCallId: "two", status: "running", output: ["b"] },
      { type: "tool_call.update", sessionId, toolCallId: "one", status: "running", output: ["c"] },
    ];

    const state = events.reduce(reduceThreadEvent, createThreadState());
    expect(state.toolCalls[0]?.output).toEqual(["a", "c"]);
    expect(state.toolCalls[1]?.output).toEqual(["b"]);
  });

  test("accumulates structured output fields recursively", () => {
    const events: readonly AgentEvent[] = [
      { type: "tool_call.start", sessionId, toolCallId: "bash", toolName: "bash", input: {}, status: "running" },
      { type: "tool_call.update", sessionId, toolCallId: "bash", status: "running", output: { stdout: "first\n", diagnostics: ["one"] } },
      { type: "tool_call.end", sessionId, toolCallId: "bash", status: "succeeded", output: { stdout: "second", diagnostics: ["two"], exitCode: 0 } },
    ];

    const state = events.reduce(reduceThreadEvent, createThreadState());
    expect(state.toolCalls[0]?.output).toEqual({
      stdout: "first\nsecond",
      diagnostics: ["one", "two"],
      exitCode: 0,
    });
  });

  test("accumulates reasoning deltas and settles the trace on the next event", () => {
    const events: readonly AgentEvent[] = [
      { type: "session.start", sessionId },
      { type: "reasoning.delta", sessionId, messageId: "assistant-1", delta: "Inspect " },
      { type: "reasoning.delta", sessionId, messageId: "assistant-1", delta: "the boundary." },
    ];

    const streaming = events.reduce(reduceThreadEvent, createThreadState());
    expect(streaming.reasoning).toEqual([{
      messageId: "assistant-1",
      content: "Inspect the boundary.",
      streaming: true,
    }]);

    const settled = reduceThreadEvent(streaming, {
      type: "assistant.message.delta",
      sessionId,
      messageId: "assistant-1",
      delta: "I found it.",
    });
    expect(settled.reasoning[0]?.streaming).toBe(false);
    expect(settled.items).toEqual([
      { kind: "reasoning", id: "assistant-1" },
      { kind: "message", id: "assistant-1" },
    ]);
  });

  test("resolves approvals without moving their place in the transcript", () => {
    const requested = reduceThreadEvent(createThreadState(), {
      type: "approval.request",
      sessionId,
      approvalId: "approval-1",
      prompt: "Run the migration?",
    });
    const resolved = reduceThreadEvent(requested, {
      type: "approval.response",
      sessionId,
      approvalId: "approval-1",
      decision: "rejected",
    });

    expect(resolved.approvals).toEqual([{
      id: "approval-1",
      prompt: "Run the migration?",
      decision: "rejected",
    }]);
    expect(resolved.items).toEqual([{ kind: "approval", id: "approval-1" }]);
  });
});

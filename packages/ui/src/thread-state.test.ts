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
});

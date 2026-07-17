import { describe, expect, test } from "bun:test";

import { codingSessionFixture, isTerminalToolCallStatus } from "./index";

describe("isTerminalToolCallStatus", () => {
  test("distinguishes active and terminal tool calls", () => {
    expect(isTerminalToolCallStatus("pending")).toBe(false);
    expect(isTerminalToolCallStatus("running")).toBe(false);
    expect(isTerminalToolCallStatus("succeeded")).toBe(true);
    expect(isTerminalToolCallStatus("failed")).toBe(true);
    expect(isTerminalToolCallStatus("cancelled")).toBe(true);
  });
});

describe("codingSessionFixture", () => {
  test("records a complete nine-tool coding session", () => {
    const starts = codingSessionFixture.filter((event) => event.type === "tool_call.start");
    const ends = codingSessionFixture.filter((event) => event.type === "tool_call.end");

    expect(starts).toHaveLength(9);
    expect(ends).toHaveLength(9);
    expect(new Set(starts.map((event) => event.toolCallId)).size).toBe(9);
    expect(codingSessionFixture.some((event) => event.type === "reasoning.delta")).toBe(true);
    expect(codingSessionFixture.some((event) => event.type === "approval.request")).toBe(true);
    expect(codingSessionFixture.at(-1)?.type).toBe("session.done");
  });
});

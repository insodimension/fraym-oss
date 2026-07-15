import { describe, expect, test } from "bun:test";

import { isTerminalToolCallStatus } from "./index";

describe("isTerminalToolCallStatus", () => {
  test("distinguishes active and terminal tool calls", () => {
    expect(isTerminalToolCallStatus("pending")).toBe(false);
    expect(isTerminalToolCallStatus("running")).toBe(false);
    expect(isTerminalToolCallStatus("succeeded")).toBe(true);
    expect(isTerminalToolCallStatus("failed")).toBe(true);
    expect(isTerminalToolCallStatus("cancelled")).toBe(true);
  });
});


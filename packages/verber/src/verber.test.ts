import { describe, expect, test } from "bun:test";
import { describeTool, inferToolKind, resolveVerber } from "./index";
describe("verber", () => {
  test("resolves profile priority", () => {
    expect(
      resolveVerber({
        profile: "tui",
        workingStatus: { message: "Reading files...", visible: true },
      }).text,
    ).toBe("Reading files");
    expect(
      resolveVerber({ profile: "codex", phase: "tool", toolIntent: "Editing" })
        .text,
    ).toBe("Thinking");
  });
  test("rotates expressive language", () =>
    expect(
      resolveVerber({ profile: "expressive", phase: "reasoning", tick: 5 })
        .text,
    ).toBe("Synthesizing"));
  test("infers and describes tools", () => {
    expect(inferToolKind("grep_search")).toBe("search");
    expect(describeTool("apply_patch")).toBe("Editing");
  });
});

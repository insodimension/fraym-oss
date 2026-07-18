import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandTagProvider, useCommandTagResolver } from "./command-tag-registry";
import { DEFAULT_TOOL_RENDERERS } from "./default-tool-renderers";
import { groupBlocks } from "./message-block-registry";
import { resolveSurfaceRegistration, surfaceKey } from "./surface-renderer-registry";
import { isToolView, resolveToolRenderer } from "./tool-renderer-registry";

describe("renderer contracts", () => {
  test("resolves normalized tools into rich views", () => {
    const renderer = resolveToolRenderer({}, "mcp__files__read");
    expect(renderer).toBe(DEFAULT_TOOL_RENDERERS.read);
    const result = renderer?.({ callId: "call-1", toolName: "mcp__files__read", status: "success", input: { path: "README.md" }, output: { content: "hello" } });
    expect(result !== undefined && isToolView(result)).toBe(true);
    if (result !== undefined && isToolView(result)) expect(result.kind).toBe("read");
  });

  test("uses dedicated rich views for showcase tool cards", () => {
    const calls = [
      { callId: "goal-1", toolName: "goal", status: "success", input: { action: "show" }, output: { content: "Goal active" } },
      { callId: "bash-1", toolName: "bash", status: "success", input: { command: "bun test" }, output: { content: "4 pass" } },
      { callId: "ssh-1", toolName: "ssh", status: "success", input: { host: "example.test", command: "uptime" }, output: { content: "up 2 days" } },
      { callId: "job-1", toolName: "job", status: "success", input: { action: "list" }, output: { details: { jobs: [] } } },
      { callId: "eval-1", toolName: "eval", status: "success", input: { code: "2 + 2" }, output: { content: "4" } },
    ] as const;

    for (const call of calls) {
      const renderer = resolveToolRenderer(DEFAULT_TOOL_RENDERERS, call.toolName);
      expect(renderer).not.toBe(DEFAULT_TOOL_RENDERERS["*"]);
      const result = renderer?.(call);
      expect(result !== undefined && isToolView(result)).toBe(true);
      if (result !== undefined && isToolView(result)) expect(result.body).not.toBeNull();
    }
  });

  test("groups adjacent reasoning and tool blocks only when a run has multiple entries", () => {
    const grouped = groupBlocks([{ type: "text", text: "Start" }, { type: "reasoning", text: "Think" }, { type: "tool" }, { type: "text", text: "Done" }]);
    expect(grouped.map(item => item.kind)).toEqual(["single", "group", "single"]);
    expect(grouped[1]?.kind === "group" ? grouped[1].items.length : 0).toBe(2);
  });

  test("resolves surface placement and never drops unknown inputs", () => {
    const input = { channel: "hostUi", request: { id: "request-1", kind: "select" } } as const;
    expect(surfaceKey(input)).toBe("hostUi:select");
    expect(resolveSurfaceRegistration({}, "hostUi:select").placement).toBe("docked");
    expect(typeof resolveSurfaceRegistration({}, "hostUi:unknown").render).toBe("function");
  });

  test("resolves recipe and skill command tags", () => {
    function Probe() { const resolve = useCommandTagResolver(); return <>{resolve("/recipe-review")?.label}|{resolve("/skill:cleanup")?.label}</>; }
    const html = renderToStaticMarkup(createElement(CommandTagProvider, { recipes: [{ id: "recipe-review", name: "Review changes" }] }, createElement(Probe)));
    expect(html).toContain("Review changes|cleanup");
  });
});

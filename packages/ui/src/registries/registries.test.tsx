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
    const result = renderer?.({ id: "call-1", name: "mcp__files__read", status: "succeeded", input: { path: "README.md" }, output: { content: "hello" } });
    expect(result !== undefined && isToolView(result)).toBe(true);
    if (result !== undefined && isToolView(result)) expect(result.kind).toBe("read");
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

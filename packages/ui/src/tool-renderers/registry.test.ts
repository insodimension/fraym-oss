import { describe, expect, test } from "bun:test";

import { createToolRendererRegistry, normalizeToolName } from "./registry";
import type { ToolRenderer } from "./types";

const exact: ToolRenderer = () => "exact";
const read: ToolRenderer = () => "read";
const fallback: ToolRenderer = () => "fallback";

describe("ToolRendererRegistry", () => {
  test("resolves exact names before normalized names and fallback", () => {
    const registry = createToolRendererRegistry({ Read: exact, read, "*": fallback });

    expect(registry.resolve("Read")).toBe(exact);
    expect(registry.resolve("READ")).toBe(read);
    expect(registry.resolve("unknown")).toBe(fallback);
  });

  test("normalizes realm and MCP harness prefixes", () => {
    const registry = createToolRendererRegistry({ read, "*": fallback });

    expect(normalizeToolName(" realm/READ ")).toBe("read");
    expect(normalizeToolName("MCP__filesystem__READ")).toBe("read");
    expect(normalizeToolName("MCP__filesystem__realm/READ")).toBe("read");
    expect(registry.resolve("realm/READ")).toBe(read);
    expect(registry.resolve("MCP__filesystem__READ")).toBe(read);
  });

  test("merges nested registries with child overrides", () => {
    const parentRead: ToolRenderer = () => "parent";
    const childRead: ToolRenderer = () => "child";
    const parent = createToolRendererRegistry({ read: parentRead, "*": fallback });
    const child = createToolRendererRegistry({ read: childRead }, parent);

    expect(child.resolve("read")).toBe(childRead);
    expect(child.resolve("missing")).toBe(fallback);
  });
});

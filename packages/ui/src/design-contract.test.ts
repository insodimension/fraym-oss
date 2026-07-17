import { describe, expect, test } from "bun:test";

const canonicalTokens = [
  ["--fraym-color-primary", "#b78cff"],
  ["--fraym-color-bg", "#0b0b0d"],
  ["--fraym-color-surface", "#151518"],
  ["--fraym-color-surface-2", "#1c1c20"],
  ["--fraym-color-surface-3", "#222227"],
  ["--fraym-color-border", "#27272c"],
  ["--fraym-color-text", "#ececee"],
  ["--fraym-color-text-2", "#9a9aa2"],
  ["--fraym-color-text-3", "#65656d"],
  ["--fraym-color-success", "#62c08a"],
  ["--fraym-color-danger", "#e07a86"],
  ["--fraym-color-warning", "#e0b15b"],
] as const;

describe("DESIGN.md token contract", () => {
  test("mirrors the canonical YAML values in the runtime stylesheet", async () => {
    const stylesheet = await Bun.file(new URL("./styles.css", import.meta.url)).text();

    for (const [property, value] of canonicalTokens) {
      expect(stylesheet).toContain(`${property}: ${value};`);
    }

    expect(stylesheet).toContain('--fraym-font-sans: "IBM Plex Sans"');
    expect(stylesheet).toContain('--fraym-font-mono: "IBM Plex Mono"');
    expect(stylesheet).toContain("--fraym-space-xs: 3px;");
    expect(stylesheet).toContain("--fraym-space-xl: 26px;");
    expect(stylesheet).toContain("--fraym-radius-xl: 14px;");
  });
});

import { describe, expect, test } from "bun:test";

const legacyColorAliases = [
  ["--fraym-color-primary", "--fr-accent"],
  ["--fraym-color-primary-strong", "--fr-accent-2"],
  ["--fraym-color-on-primary", "--fr-accent-ink"],
  ["--fraym-color-bg", "--fr-bg"],
  ["--fraym-color-rail", "--fr-rail"],
  ["--fraym-color-surface", "--fr-surface"],
  ["--fraym-color-surface-2", "--fr-surface-2"],
  ["--fraym-color-surface-3", "--fr-surface-3"],
  ["--fraym-color-border", "--fr-border"],
  ["--fraym-color-border-soft", "--fr-border-soft"],
  ["--fraym-color-text", "--fr-text"],
  ["--fraym-color-text-2", "--fr-text-2"],
  ["--fraym-color-text-3", "--fr-text-3"],
  ["--fraym-color-success", "--fr-add"],
  ["--fraym-color-danger", "--fr-del"],
  ["--fraym-color-warning", "--fr-warn"],
  ["--fraym-color-info", "--fr-blue"],
  ["--fraym-color-iris", "--fr-iris"],
  ["--fraym-color-accent", "--fr-accent"],
  ["--fraym-color-muted", "--fr-text-2"],
  ["--fraym-color-accent-dim", "--fr-accent-dim"],
  ["--fraym-color-accent-line", "--fr-accent-line"],
  ["--fraym-color-diff-added-bg", "--fr-add-bg"],
  ["--fraym-color-diff-added-text", "--fr-add"],
  ["--fraym-color-diff-removed-bg", "--fr-del-bg"],
  ["--fraym-color-diff-removed-text", "--fr-del"],
] as const;

const runtimeTokens = [
  ["--fr-bg", "#0b0b0d"],
  ["--fr-surface", "#151518"],
  ["--fr-surface-2", "#1c1c20"],
  ["--fr-surface-3", "#222227"],
  ["--fr-border", "#27272c"],
  ["--fr-text", "#ececee"],
  ["--fr-accent", "#7a60c1"],
  ["--fr-add", "#62c08a"],
  ["--fr-del", "#e07a86"],
] as const;

describe("legacy styles.css color alias contract", () => {
  test("aliases legacy color names to the live palette", async () => {
    const stylesheet = await Bun.file(new URL("./styles.css", import.meta.url)).text();

    for (const [property, target] of legacyColorAliases) {
      expect(stylesheet).toContain(`${property}: var(${target});`);
    }

    expect(stylesheet).toContain('--fraym-font-sans: "IBM Plex Sans"');
    expect(stylesheet).toContain('--fraym-font-mono: "IBM Plex Mono"');
    expect(stylesheet).toContain("--fraym-space-xs: 3px;");
    expect(stylesheet).toContain("--fraym-space-xl: 26px;");
    expect(stylesheet).toContain("--fraym-radius-xl: 14px;");
  });
});

describe("runtime theme.css token contract", () => {
  test("runtime theme.css mirrors the reconciled design contract", async () => {
    const stylesheet = await Bun.file(new URL("./theme/theme.css", import.meta.url)).text();

    for (const [property, value] of runtimeTokens) {
      expect(stylesheet).toContain(`${property}: ${value};`);
    }

    expect(stylesheet).toContain('--fr-accent: #7a60c1;');
  });
});

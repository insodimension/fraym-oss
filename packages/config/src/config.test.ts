import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FRAYM_UI_CONFIG,
  globToRegExp,
  mergeBenchLayouts,
  resolveFraymUiConfig,
  resolveSlashEntryLayered,
  resolveToolIcon,
} from "./index";

describe("configuration", () => {
  test("validates persisted values and migrations", () => {
    expect(
      resolveFraymUiConfig({ density: "compact", maxVisibleTurns: 9999 })
        .maxVisibleTurns,
    ).toBe(500);
    expect(resolveFraymUiConfig({ density: "bad" as never }).density).toBe(
      DEFAULT_FRAYM_UI_CONFIG.density,
    );
    expect(
      resolveFraymUiConfig({ designPersona: "architect" } as never)
        .studioPersona,
    ).toBe("architect");
  });
  test("merges layout arrays by stable id", () => {
    expect(
      mergeBenchLayouts(
        { rail: [{ id: "chat", enabled: true }] },
        { rail: [{ id: "chat", order: 2 }, { id: "files" }] },
      ).rail,
    ).toEqual([{ id: "chat", enabled: true, order: 2 }, { id: "files" }]);
  });
  test("resolves exact and layered presentation policies", () => {
    expect(
      resolveToolIcon({ version: 1, exact: { read: "file" } }, "read"),
    ).toEqual({ icon: "file" });
    expect(
      resolveSlashEntryLayered(
        [
          { version: 1, exact: { plan: { label: "Plan" } } },
          { version: 1, rules: [{ match: "p*", icon: "list" }] },
        ],
        "plan",
      ),
    ).toEqual({ label: "Plan", icon: "list" });
    expect(globToRegExp("a?c").test("ABC")).toBe(true);
  });
});

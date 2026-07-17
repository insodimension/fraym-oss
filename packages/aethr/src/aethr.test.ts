import { describe, expect, test } from "bun:test";
import { AETHR_STATES, THEMES } from "./index";
describe("aethr contracts", () => {
  test("defines every emotional envelope", () =>
    expect(Object.keys(AETHR_STATES)).toEqual([
      "idle",
      "nudge",
      "dreaming",
      "uncertain",
      "satisfied",
    ]));
  test("keeps every theme color normalized", () => {
    for (const theme of Object.values(THEMES))
      for (const value of [
        ...theme.baseColor,
        ...theme.accentColor,
        ...theme.edgeColor,
        ...theme.glowColor,
      ]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
  });
});

import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { entries } from "./index";
import { initialKnobValues } from "../entry";
import { createEntryDockFixture } from "../dock-fixtures";
import { ThemeProvider } from "@fraym/ui";
import {
  componentsEntries,
  elementsEntries,
  featuresEntries,
  pagesEntries,
  tokenEntries,
} from "./showcase-catalog";

describe("kitchen sink entries", () => {
  test("registers every current token, element, tool, and feature entry exactly once", () => {
    expect(entries).toHaveLength(138);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(entries.filter((entry) => entry.group === "elements")).toHaveLength(
      78,
    );
    expect(entries.filter((entry) => entry.group === "tools")).toHaveLength(9);
  });

  test("re-homes every existing entry into exactly one shell tier", () => {
    const tieredEntries = [
      ...tokenEntries,
      ...elementsEntries,
      ...componentsEntries,
      ...featuresEntries,
      ...pagesEntries,
    ];
    expect(tieredEntries).toHaveLength(entries.length);
    expect(new Set(tieredEntries.map((entry) => entry.id)).size).toBe(
      entries.length,
    );
    expect(pagesEntries.map((entry) => entry.id)).toEqual([
      "streaming-thread",
    ]);
  });

  test("renders every live demo and provides a usage snippet", () => {
    for (const entry of entries) {
      const values = initialKnobValues(entry.knobs);
      expect(() =>
        renderToStaticMarkup(
          createElement(
            ThemeProvider,
            null,
            createElement(entry.Demo, { values }),
          ),
        ),
      ).not.toThrow();
      expect(entry.code(values).trim().length).toBeGreaterThan(0);
      expect(entry.importCode).toContain("@fraym/");
      expect(entry.examples.length).toBeGreaterThanOrEqual(2);
      expect(entry.props.length).toBeGreaterThan(0);
    }
  });

  test("regenerates Button usage from its live knob values", () => {
    const button = entries.find((entry) => entry.id === "button");
    expect(button).toBeDefined();
    if (button === undefined) return;

    const code = button.code({
      variant: "danger",
      size: "lg",
      label: "Delete session",
      disabled: true,
    });

    expect(code).toContain('variant="danger"');
    expect(code).toContain('size="lg"');
    expect(code).toContain("disabled");
    expect(code).toContain("Delete session");
  });

  test("provides an ordered contextual AgentEvent replay for every entry", () => {
    for (const entry of entries) {
      const fixture = createEntryDockFixture(entry);
      expect(fixture[0]?.type).toBe("session.start");
      expect(fixture[1]?.type).toBe("user.message");
      expect(
        fixture.some((event) => event.type === "assistant.message.delta"),
      ).toBe(true);
      expect(fixture.at(-1)?.type).toBe("session.done");
      expect(new Set(fixture.map((event) => event.sessionId)).size).toBe(1);
      if (entry.group === "tools") {
        expect(fixture.some((event) => event.type === "tool_call.start")).toBe(
          true,
        );
        expect(fixture.some((event) => event.type === "tool_call.end")).toBe(
          true,
        );
      }
    }
  });
});

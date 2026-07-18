import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider, TooltipProvider } from "@fraym/ui";
import { ToolConfigProvider } from "../showcase/tool-config";
import { TIERS } from "./registry";

const entries = TIERS.flatMap(tier => tier.entries);

describe("kitchen sink entries", () => {
	test("registers the complete public catalog exactly once", () => {
		expect(TIERS.map(tier => [tier.id, tier.entries.length])).toEqual([
			["guide", 7],
			["tokens", 4],
			["elements", 42],
			["components", 9],
			["features", 42],
		]);
		expect(entries).toHaveLength(104);
		expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
	});

	test("renders every catalog entry", () => {
		for (const entry of entries) {
			expect(() => renderToStaticMarkup(
				createElement(ThemeProvider, null,
					createElement(TooltipProvider, null,
						createElement(ToolConfigProvider, { schema: entry.config, children: createElement(entry.Component) }),
					),
				),
			)).not.toThrow();
		}
	});

	test("keeps documented entries structurally complete", () => {
		for (const entry of entries.filter(entry => entry.docs)) {
			expect(entry.docs?.import.trim().length).toBeGreaterThan(0);
			expect(entry.docs?.anatomy.trim().length).toBeGreaterThan(0);
			expect(entry.docs?.examples.length).toBeGreaterThan(0);
			expect(entry.docs?.api.length).toBeGreaterThan(0);
		}
	});
});

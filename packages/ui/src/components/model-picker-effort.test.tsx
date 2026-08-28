import { describe, expect, test } from "bun:test";
import { type ReactNode, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SliderStep } from "../elements/slider";
import { ModelEffortPicker, type ModelSelection } from "./model-picker";

/**
 * The reasoning-effort row has to work against a REAL engine's per-model level list, which is
 * measured — not the invented six-notch scale the shell used to fall back to. Most models accept
 * only `["off","auto"]`; a few accept five. Both shapes are exercised here from the user's side:
 * what the row NAMES as active, which choices are visible, and what clicking one reports back.
 *
 * `ModelEffortPicker` is hook-free on purpose, so these tests call it as a plain function and read
 * the element tree it returns — no DOM needed for a click.
 */

/** The props these tests read off the returned tree; `isValidElement` narrows to them without a cast. */
interface ProbedProps {
	readonly children?: ReactNode;
	readonly onClick?: () => void;
	readonly steps?: readonly SliderStep[];
}

const MODEL = (effort: string): ModelSelection => ({ id: "acme/m1", name: "m1", effort });

function walk(node: ReactNode, visit: (type: unknown, props: ProbedProps) => void): void {
	if (Array.isArray(node)) {
		for (const child of node) walk(child, visit);
		return;
	}
	if (!isValidElement<ProbedProps>(node)) return;
	visit(node.type, node.props);
	walk(node.props.children, visit);
}

/** Clicks the `<button>` whose visible text is `label`; fails if the user has no such button. */
function click(node: ReactNode, label: string): void {
	let onClick: (() => void) | undefined;
	walk(node, (type, props) => {
		if (type === "button" && props.children === label) onClick = props.onClick;
	});
	expect(onClick, `no clickable "${label}"`).toBeFunction();
	onClick?.();
}

/** Every clickable choice's visible text, in render order. */
function buttonLabels(node: ReactNode): readonly string[] {
	const labels: string[] = [];
	walk(node, (type, props) => {
		if (type === "button" && typeof props.children === "string") labels.push(props.children);
	});
	return labels;
}

/** The labels of the slider's notches, in the order they appear low → high. */
function sliderStepLabels(node: ReactNode): readonly string[] {
	const scales: (readonly SliderStep[])[] = [];
	walk(node, (_type, props) => {
		if (props.steps !== undefined) scales.push(props.steps);
	});
	expect(scales).toHaveLength(1);
	return (scales[0] ?? []).map(step => step.label);
}

describe("ModelEffortPicker with an off/auto model (the common Yarin case)", () => {
	const EFFORTS = ["off", "auto"] as const;

	test("shows both choices as labelled pills, marks the active one, and hides the slider", () => {
		const tree = ModelEffortPicker({ efforts: EFFORTS, model: MODEL("off"), onSelect: () => {} });
		const html = renderToStaticMarkup(tree);
		expect(html).toContain("Reasoning effort");
		// A two-value set has one graded step: a slider there could only ever draw the thumb where
		// it already is, so the row must not render one.
		expect(html).not.toContain('data-slot="slider-stepped"');
		// The active pill is the accent one; the alternative stays muted, and both are clickable.
		expect(html).toMatch(/aria-pressed="true"[^>]*data-tone="accent"[^>]*>Off</);
		expect(html).toMatch(/aria-pressed="false"[^>]*data-tone="mute"[^>]*>Auto</);
		expect(buttonLabels(tree)).toEqual(["Off", "Auto"]);
	});

	test("names the active value in the header even when it is auto", () => {
		const html = renderToStaticMarkup(
			ModelEffortPicker({ efforts: EFFORTS, model: MODEL("auto"), onSelect: () => {} }),
		);
		expect(html).toMatch(/text-fr-accent[^>]*>Auto</);
		expect(html).toMatch(/aria-pressed="true"[^>]*data-tone="accent"[^>]*>Auto</);
		expect(html).toMatch(/aria-pressed="false"[^>]*data-tone="mute"[^>]*>Off</);
	});

	test("clicking Auto reports effort: auto and preserves the rest of the selection", () => {
		const calls: ModelSelection[] = [];
		click(
			ModelEffortPicker({ efforts: EFFORTS, model: MODEL("off"), onSelect: next => calls.push(next) }),
			"Auto",
		);
		expect(calls).toEqual([{ id: "acme/m1", name: "m1", effort: "auto" }]);
	});

	test("clicking Off reports effort: off", () => {
		const calls: ModelSelection[] = [];
		click(
			ModelEffortPicker({ efforts: EFFORTS, model: MODEL("auto"), onSelect: next => calls.push(next) }),
			"Off",
		);
		expect(calls).toEqual([{ id: "acme/m1", name: "m1", effort: "off" }]);
	});
});

describe("ModelEffortPicker with a five-level model", () => {
	const EFFORTS = ["off", "auto", "low", "high", "max"] as const;

	test("keeps the graded slider, in rank order, and still offers Auto", () => {
		const tree = ModelEffortPicker({ efforts: EFFORTS, model: MODEL("low"), onSelect: () => {} });
		const html = renderToStaticMarkup(tree);
		expect(html).toContain('data-slot="slider-stepped"');
		// `efforts` order is deliberately NOT rank order, so an unsorted scale fails here.
		expect(sliderStepLabels(tree)).toEqual(["Off", "Low", "High", "Max"]);
		// What a screen reader / the thumb position report: step 1 of 0..3, named "Low".
		expect(html).toContain('aria-valuetext="Low"');
		expect(html).toContain('aria-valuemax="3"');
		expect(html).toContain('aria-valuenow="1"');
		expect(html).toMatch(/text-fr-accent[^>]*>Low</);
		expect(buttonLabels(tree)).toEqual(["Auto"]);
	});

	test("Auto stays clickable beside the slider", () => {
		const calls: ModelSelection[] = [];
		click(
			ModelEffortPicker({ efforts: EFFORTS, model: MODEL("low"), onSelect: next => calls.push(next) }),
			"Auto",
		);
		expect(calls).toEqual([{ id: "acme/m1", name: "m1", effort: "auto" }]);
	});
});

describe("ModelEffortPicker edge cases", () => {
	test("no levels at all keeps the row hidden", () => {
		expect(ModelEffortPicker({ efforts: [], model: MODEL("off"), onSelect: () => {} })).toBeNull();
	});

	test("a host that reports no current value says so instead of leaving the eyebrow bare", () => {
		const html = renderToStaticMarkup(
			ModelEffortPicker({ efforts: ["off", "auto"], model: MODEL(""), onSelect: () => {} }),
		);
		expect(html).toContain("Not set");
		// Nothing may be shown as active while the host has told us nothing.
		expect(html).not.toContain('aria-pressed="true"');
	});

	test("a single level is shown as one labelled pill, never a slider", () => {
		const tree = ModelEffortPicker({ efforts: ["off"], model: MODEL("off"), onSelect: () => {} });
		const html = renderToStaticMarkup(tree);
		expect(html).not.toContain('data-slot="slider-stepped"');
		expect(html).toMatch(/aria-pressed="true"[^>]*data-tone="accent"[^>]*>Off</);
		expect(buttonLabels(tree)).toEqual(["Off"]);
	});

	test("auto alone still gives a reachable Auto choice", () => {
		const calls: ModelSelection[] = [];
		click(ModelEffortPicker({ efforts: ["auto"], model: MODEL(""), onSelect: next => calls.push(next) }), "Auto");
		expect(calls).toEqual([{ id: "acme/m1", name: "m1", effort: "auto" }]);
	});

	test("two graded steps plus auto stay pills — three named choices beat a two-notch track", () => {
		const tree = ModelEffortPicker({ efforts: ["low", "off", "auto"], model: MODEL("low"), onSelect: () => {} });
		expect(renderToStaticMarkup(tree)).not.toContain('data-slot="slider-stepped"');
		// Rank order survives, with Auto last since it is not part of the gradient.
		expect(buttonLabels(tree)).toEqual(["Off", "Low", "Auto"]);
	});
});

import { createReplayDriver } from "@fraym/driver";
import { createElement, type ComponentType } from "react";
import { createEntryDockFixture } from "../dock-fixtures";
import type { Entry, Knob } from "../entry";
import { Demo } from "../showcase/demo";
import { useControls, type ControlsSchema } from "../showcase/controls";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry, Tier } from "../showcase/types";
import { entries } from "./index";

type CatalogTier = Exclude<Tier, "guide">;

const componentIds = new Set([
	"diff-block", "collapsible", "menu", "confirm-dialog", "page-header",
	"filter-pills", "input-group", "selector-menu", "bottom-sheet", "dock-split",
	"tool-renderer-registry", "message-block-registry", "surface-renderer-registry",
	"command-tag-registry", "agent-setup", "form-sheet", "install-progress",
	"waiting-for-app", "oauth-popup", "approval-card", "reasoning-row",
]);

function tierFor(entry: Entry): CatalogTier {
	if (entry.id === "theme-engine" || entry.group === "tokens") return "tokens";
	if (entry.id === "streaming-thread") return "pages";
	if (componentIds.has(entry.id)) return "components";
	if (entry.group === "elements") return "elements";
	return "features";
}

function control(knob: Knob): ControlsSchema[string] {
	if (knob.kind === "toggle") return { kind: "boolean", label: knob.label, default: knob.defaultValue };
	if (knob.kind === "pick") return { kind: "select", label: knob.label, default: knob.defaultValue, options: knob.options };
	if (knob.kind === "number") return {
		kind: "number",
		label: knob.label,
		default: knob.defaultValue,
		...(knob.min === undefined ? {} : { min: knob.min }),
		...(knob.max === undefined ? {} : { max: knob.max }),
		...(knob.step === undefined ? {} : { step: knob.step }),
	};
	return { kind: "text", label: knob.label, default: knob.defaultValue };
}

function schemaFor(entry: Entry): ControlsSchema {
	return Object.fromEntries(entry.knobs.map(knob => [knob.prop, control(knob)]));
}

function docsFor(entry: Entry): EntryDocs {
	return {
		import: entry.importCode,
		anatomy: entry.description,
		examples: entry.examples.map(example => ({ label: example.title, code: example.code })),
		api: entry.props.map(prop => ({
			name: prop.name,
			type: prop.type,
			default: prop.defaultValue,
			description: prop.description,
		})),
	};
}

function packagePath(entry: Entry): string {
	return entry.importCode.match(/from\s+["']([^"']+)/)?.[1] ?? "@fraym/ui";
}

function componentFor(entry: Entry): ComponentType {
	const schema = schemaFor(entry);
	const importPath = packagePath(entry);
	return function EntryDemo() {
		const controls = useControls(schema);
		return (
			<Demo
				summary={entry.description}
				importPath={importPath}
				controls={entry.knobs.length ? controls.panel : undefined}
				stage="center"
			>
				{createElement(entry.Demo, { values: controls.values })}
			</Demo>
		);
	};
}

function showcaseEntry(entry: Entry): ShowcaseEntry {
	return {
		id: entry.id,
		name: entry.title,
		group: entry.tier,
		Component: componentFor(entry),
		docs: docsFor(entry),
		demo: {
			createDriver: ({ speed = 1 } = {}) => createReplayDriver(createEntryDockFixture(entry), {
				delay: Math.max(20, Math.round(220 * speed)),
				autoRespond: { decision: "approved", delay: Math.max(40, Math.round(440 * speed)) },
			}),
			sessionRef: `showcase:${entry.id}`,
			title: `${entry.title} in context`,
		},
	};
}

const entriesByTier: Record<CatalogTier, ShowcaseEntry[]> = {
	tokens: [],
	elements: [],
	components: [],
	features: [],
	pages: [],
};

for (const entry of entries) entriesByTier[tierFor(entry)].push(showcaseEntry(entry));

export const tokenEntries = entriesByTier.tokens;
export const elementsEntries = entriesByTier.elements;
export const componentsEntries = entriesByTier.components;
export const featuresEntries = entriesByTier.features;
export const pagesEntries = entriesByTier.pages;

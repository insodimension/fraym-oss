import { createReplayDriver } from "@fraym/driver";
import { createElement, type ComponentType } from "react";
import { createEntryDockFixture } from "../dock-fixtures";
import type { Entry, Knob } from "../entry";
import { initialKnobValues } from "../entry";
import { entries } from "./index";
import { Demo } from "../showcase/demo";
import { useControls, type ControlsSchema } from "../showcase/controls";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry, Tier } from "../showcase/types";

const componentIds = new Set([
	"diff-block", "collapsible", "menu", "confirm-dialog", "page-header",
	"filter-pills", "input-group", "selector-menu", "bottom-sheet", "dock-split",
	"tool-renderer-registry", "message-block-registry", "surface-renderer-registry",
	"command-tag-registry", "agent-setup", "form-sheet", "install-progress",
	"waiting-for-app", "oauth-popup", "approval-card", "reasoning-row",
]);

function tierFor(entry: Entry): Exclude<Tier, "guide"> {
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
	return Object.fromEntries(entry.knobs.map((knob) => [knob.prop, control(knob)]));
}

function docsFor(entry: Entry): EntryDocs {
	return {
		import: entry.importCode,
		anatomy: entry.description,
		examples: entry.examples.map((example) => ({ label: example.title, code: example.code })),
		api: entry.props.map((prop) => ({
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
	return function OssEntryDemo() {
		const controls = useControls(schema);
		const values = entry.knobs.length ? controls.values : initialKnobValues(entry.knobs);
		return (
			<Demo
				summary={entry.description}
				importPath={packagePath(entry)}
				controls={entry.knobs.length ? controls.panel : undefined}
				stage="center"
			>
				{createElement(entry.Demo, { values })}
			</Demo>
		);
	};
}

const showcaseEntries = entries.map<ShowcaseEntry>((entry) => ({
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
}));

function select(tier: Exclude<Tier, "guide">) {
	return showcaseEntries.filter((entry) => {
		const source = entries.find((candidate) => candidate.id === entry.id);
		return source ? tierFor(source) === tier : false;
	});
}

export const ossTokenEntries = select("tokens");
export const elementsEntries = select("elements");
export const componentsEntries = select("components");
export const featuresEntries = select("features");
export const pagesEntries = select("pages");

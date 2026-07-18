import {
	createResolveDemoDriver,
	optionalToolResult,
	pendingToolCall,
	RESOLVE_DEMO_SESSION_REF,
	RESOLVE_DETAILS,
	RESOLVE_INPUT,
	RESOLVE_OUTPUT_TEXT,
	type ResolveVariation,
} from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	type ToolPreviewView,
	ToolVariationGrid,
	toolPreviewControl,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `resolve` tool showcase.
//
// Rendered by the PRODUCTION renderer (`renderResolve`, registered in
// @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`.
//
// Axes (control knobs):
//   VARIATION  apply-accept · discard · apply-with-source · apply-failed · pending
//   STATE      success · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = ResolveVariation;
type ResolveState = "success" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["apply-accept", "discard", "apply-with-source", "apply-failed", "pending"];
const STATES: ResolveState[] = ["success", "error", "pending"];

/** Cast to plain records to avoid barrel type-collision issues. */
const INPUT_MAP = RESOLVE_INPUT as Record<string, Record<string, unknown>>;
const DETAILS_MAP = RESOLVE_DETAILS as Record<string, Record<string, unknown> | undefined>;
const OUTPUT_TEXT_MAP = RESOLVE_OUTPUT_TEXT as Record<string, string | undefined>;

function resolveInput(variation: Variation): Record<string, unknown> {
	return INPUT_MAP[variation] ?? { action: "apply", reason: "" };
}

type ResolveCallBase = {
	readonly callId: string;
	readonly toolName: "resolve";
	readonly input: Record<string, unknown>;
};

function resolveEffectiveState(variation: Variation, state: ResolveState): ResolveState {
	if (state !== "success") return state;
	if (variation === "apply-failed") return "error";
	if (variation === "pending") return "pending";
	return state;
}

function resolveGridState(variation: Variation): ResolveState {
	return resolveEffectiveState(variation, "success");
}

function resolveErrorCall(call: ResolveCallBase, variation: Variation): ActiveToolCall {
	const details = DETAILS_MAP[variation];
	return {
		...call,
		status: "error",
		output: optionalToolResult(OUTPUT_TEXT_MAP[variation] ?? "Failed to resolve pending action", details, true),
	};
}

function resolveSuccessCall(call: ResolveCallBase, variation: Variation): ActiveToolCall {
	const details = DETAILS_MAP[variation];
	const text = OUTPUT_TEXT_MAP[variation];
	if (!details || text === undefined) {
		return pendingToolCall(call.callId, "resolve", call.input);
	}
	return { ...call, status: "success", output: optionalToolResult(text, details) };
}

function buildResolveCall(variation: Variation, state: ResolveState): ActiveToolCall {
	const callId = `resolve-${variation}-${state}`;
	const input = resolveInput(variation);
	const base: ResolveCallBase = { callId, toolName: "resolve", input };

	const effectiveState = resolveEffectiveState(variation, state);
	if (effectiveState === "pending") return pendingToolCall(callId, "resolve", input);
	if (effectiveState === "error") return resolveErrorCall(base, variation);
	return resolveSuccessCall(base, variation);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const RESOLVE_CONFIG: ControlsSchema = {
	variation: {
		kind: "select",
		label: "variation",
		options: VARIATIONS,
		default: "apply-accept",
	},
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function ResolveEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "apply-accept");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = buildResolveCall(variation, state);

	return (
		<Demo
			summary="The `resolve` tool card, rendered by the PRODUCTION renderer (renderResolve) on a synthetic ActiveToolCall built from the knobs. Resolve shows a 'Resolve' head + action badge + the pending→resolved outcome body."
			importPath="entries/features/resolve (live renderResolve)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildResolveCall(v, resolveGridState(v))}
			/>
		</Demo>
	);
}

const resolveDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps resolve -> renderResolve. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// resolve acts on a PENDING action (an earlier tool awaiting apply/discard).",
			"// renderResolve is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "resolve",',
			"//   input:  { action, reason },",
			"//   output: { content, details: { action, reason, label, sourceToolName? } },",
			'//   status: "pending" | "success" | "error",',
			"// }",
			"//",
			"// Head: `Resolve` + the action badge (apply / discard).",
			"// Body: the pending action label, the reason, and the resolved outcome",
			"// (Action accepted / Action discarded / Failed to resolve).",
		].join("\n"),
	),
	examples: [
		{
			label: "Apply a pending edit",
			code: JSON.stringify(
				'{ action: "apply", reason: "Edit looks correct — fixes the type error and keeps existing behavior." }',
			),
		},
		{
			label: "Discard a pending action",
			code: JSON.stringify(
				'{ action: "discard", reason: "Introduces a breaking API change without a migration path." }',
			),
		},
		{
			label: "Apply with source tool",
			code: JSON.stringify(
				'// output.details.sourceToolName: "ast_grep" attributes the pending action to its origin tool.',
			),
		},
		{
			label: "Apply failed (error)",
			code: JSON.stringify('// status: "error" -> "Failed to resolve: ..." when the patch cannot be applied.'),
		},
	],
	api: [
		{
			name: "action",
			type: '"apply" | "discard"',
			required: true,
			description: "Whether to apply or discard the pending action.",
		},
		{
			name: "reason",
			type: "string",
			required: true,
			description: "Why the action was applied or discarded; shown in the body.",
		},
		{
			name: "output.details.label",
			type: "string",
			description: "Human label of the pending action (e.g. 'ast_edit: Fix null-handling in parser.ts').",
		},
		{
			name: "output.details.sourceToolName",
			type: "string",
			description: "The tool that produced the pending action.",
		},
		{
			name: "output.details.action",
			type: "string",
			description: "The resolved action echoed back; drives the badge tone.",
		},
	],
};

export const resolveEntries: readonly ShowcaseEntry[] = [
	{
		id: "resolve-tool",
		name: "Resolve",
		Component: ResolveEntry,
		config: RESOLVE_CONFIG,
		docs: resolveDocs,
		demo: {
			createDriver: createResolveDemoDriver,
			sessionRef: RESOLVE_DEMO_SESSION_REF,
			title: "resolve · live conversation",
		},
	},
];

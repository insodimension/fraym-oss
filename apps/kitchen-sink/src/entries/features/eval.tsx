import { createEvalDemoDriver, EVAL_DEMO_SESSION_REF, EVAL_FIGURE_B64 } from "@fraym-ai/fixtures";
import type { ActiveToolCall } from "@fraym-ai/ui";
import {
	CELL_AGENTS,
	CELL_JS,
	CELL_LOAD,
	CELL_PLOT,
	CELL_SINGLE,
	CELL_SUMMARIZE,
	JSON_OUTPUTS,
} from "../../fixtures/notebook-cells";
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
// `eval` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (`renderEval`,
// registered in @fraym-ai/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic `ActiveToolCall`.
// eval is a notebook: a cell stack (code + output/markdown + status/duration/exit), a
// per-cell Status operation tree (file/folder/git/package prelude ops), an `agent()`
// subagent-progress tree, captured display() JSON outputs, and inline figures. The
// Demo Dock streams the cells in cell-by-cell (partial-output channel), exactly like
// a live run.
//
// Axes (control knobs):
//   VARIATION  notebook · single · js · agents
//   STATE      success · error · running · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "notebook" | "single" | "js" | "agents";
type EvalState = "success" | "error" | "running" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["notebook", "single", "js", "agents"];
const STATES: EvalState[] = ["success", "error", "running", "pending"];

type Cell = Record<string, unknown>;

const CELLS: Record<Variation, Cell[]> = {
	notebook: [CELL_LOAD, CELL_SUMMARIZE, CELL_PLOT],
	single: [CELL_SINGLE],
	js: [CELL_JS],
	agents: [CELL_AGENTS],
};

const EXTRA: Record<Variation, Record<string, unknown>> = {
	notebook: { jsonOutputs: JSON_OUTPUTS, images: [{ data: EVAL_FIGURE_B64, mimeType: "image/svg+xml" }] },
	single: {},
	js: {},
	agents: {},
};

// --- synthetic call builder --------------------------------------------------

function evalResult(cells: Cell[], extra: Record<string, unknown> = {}, isError = false) {
	return {
		content: [
			{
				type: "text",
				text: cells
					.map(c => c.output)
					.filter(Boolean)
					.join("\n"),
			},
		],
		details: { language: "python", languages: ["python"], cells, ...extra },
		isError,
	};
}

function evalInput(cells: Cell[]) {
	return { cells: cells.map(c => ({ language: c.language === "js" ? "js" : "py", code: c.code })) };
}

function withStatus(cell: Cell, status: string): Cell {
	return { ...cell, status, ...(status === "complete" ? {} : { output: "", durationMs: undefined }) };
}

function buildEvalCall(variation: Variation, state: EvalState): ActiveToolCall {
	const cells = CELLS[variation];
	const input = evalInput(cells);
	const callId = `eval-preview-${variation}-${state}`;

	if (state === "pending") return { callId, toolName: "eval", input, status: "running" };

	if (state === "running") {
		// Last cell mid-execution; trailing cells pending — the live running snapshot.
		const revealed = cells.map((c, i) => (i < cells.length - 1 ? c : withStatus(c, "running")));
		return {
			callId,
			toolName: "eval",
			input,
			status: "running",
			output: { content: [{ type: "text", text: "" }], details: { cells: revealed } },
		};
	}

	if (state === "error") {
		const errored = cells.map((c, i) =>
			i === cells.length - 1
				? { ...c, status: "error", exitCode: 1, output: "Traceback (most recent call last):\n  KeyError: 'rps'" }
				: c,
		);
		return { callId, toolName: "eval", input, status: "error", output: evalResult(errored, EXTRA[variation], true) };
	}

	return { callId, toolName: "eval", input, status: "success", output: evalResult(cells, EXTRA[variation]) };
}

// --- showcase entry ----------------------------------------------------------

const EVAL_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "notebook" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function EvalEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "notebook");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	return (
		<Demo
			summary="The `eval` tool card, rendered by the PRODUCTION renderer (renderEval) on a synthetic ActiveToolCall built from the knobs. eval is a notebook: a cell stack (code + output/markdown + status/duration/exit badges), a per-cell Status operation tree (the prelude's file/folder/git/package ops), an agent() subagent-progress tree, captured display() JSON outputs (a JSON tree), and inline figures. The `agents` variation shows a cell that fanned out subagents on different models; `notebook` shows a read→summarize→plot session with a JSON output + a figure. The Demo Dock streams the cells in cell-by-cell via the partial-output channel, exactly like a live run."
			importPath="entries/features/eval (live renderEval)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={buildEvalCall(variation, state)} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildEvalCall(v, state === "pending" || state === "running" ? "success" : state)}
			/>
		</Demo>
	);
}

const evalDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps eval -> renderEval. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderEval is handed a live ActiveToolCall and returns the notebook card:",
			"// {",
			'//   toolName: "eval",',
			'//   input:  { cells: [{ language: "py" | "js", code }] },',
			"//   output: { content, details: { language, languages, cells, jsonOutputs?, images? } },",
			'//   status: "pending" | "running" | "success" | "error",',
			"// }",
			"//",
			'// Head: "Eval" + a cell/language summary.',
			"// Body: a cell stack — each cell shows its code, streamed output and a",
			"// status/durationMs/exitCode footer. Cells carry a Status op tree",
			"// (statusEvents: read/ls/git/package prelude ops + an agent() subagent tree),",
			"// captured display() JSON (output.details.jsonOutputs) and inline figures",
			"// (output.details.images). Cells stream in one-by-one via the partial-output channel.",
		].join("\n"),
	),
	examples: [
		{
			label: "Python notebook (multi-cell)",
			code: JSON.stringify(
				'{ cells: [{ language: "py", code: "rows = json.load(open(path))" }, { language: "py", code: "display(stats)" }] }',
			),
		},
		{
			label: "Single JS cell",
			code: JSON.stringify('{ cells: [{ language: "js", code: "console.log((await scan()).length)" }] }'),
		},
		{
			label: "Subagent fan-out",
			code: JSON.stringify(
				'{ cells: [{ language: "py", code: "r = await agent(reviewer, tasks)" }] }  // statusEvents render an agent() progress tree',
			),
		},
		{
			label: "Running (streaming)",
			code: JSON.stringify(
				'// status: "running" reveals completed cells; the trailing cell streams via the partial-output channel.',
			),
		},
	],
	api: [
		{
			name: "cells",
			type: '{ language: "py" | "js"; code: string }[]',
			required: true,
			description: "Ordered notebook cells; each carries its source language and code. Rendered as the cell stack.",
		},
		{
			name: "cells[].language",
			type: '"py" | "js"',
			description: "Per-cell runtime; selects the syntax highlighter and execution kernel.",
		},
		{
			name: "cells[].code",
			type: "string",
			description: "Cell source, shown in the cell's code block.",
		},
		{
			name: "output.details.cells",
			type: "Cell[]",
			description: "Executed cells with results: index, title, output, status, durationMs and optional exitCode.",
		},
		{
			name: "output.details.cells[].status",
			type: '"complete" | "running" | "error"',
			description: "Per-cell execution state; drives the cell footer badge and error tone.",
		},
		{
			name: "output.details.cells[].statusEvents",
			type: "StatusEvent[]",
			description:
				"Per-cell operation tree — read/ls/git/package prelude ops and agent() subagent-progress entries.",
		},
		{
			name: "output.details.jsonOutputs",
			type: "unknown[]",
			description: "Captured display() JSON payloads, rendered as structured output.",
		},
		{
			name: "output.details.images",
			type: "{ data: string; mimeType: string }[]",
			description: "Inline figures captured from display(fig); rendered beneath the producing cell.",
		},
	],
};

export const evalEntries: readonly ShowcaseEntry[] = [
	{
		id: "eval-tool",
		name: "Eval",
		Component: EvalEntry,
		config: EVAL_CONFIG,
		docs: evalDocs,
		demo: {
			createDriver: createEvalDemoDriver,
			sessionRef: EVAL_DEMO_SESSION_REF,
			title: "eval · live conversation",
		},
	},
];

// Eval demo script — an `eval`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym/driver/mock so the eval tool renders inside a real
// thread via the production renderer (`renderEval`). Walks the notebook shapes: a
// multi-cell py session that reads a file (per-cell status tree), summarizes with a
// `display()` JSON output, and plots an inline figure — STREAMED cell-by-cell via the
// partial-output channel (`partialResult.details.cells` grows), then resolved.
//
// eval renders a cell stack (code + output/markdown + status/duration/exit), a
// per-cell Status operation tree, captured display() JSON outputs, and inline
// figures. details carry `cells[]` / `jsonOutputs[]` / `images[]` / per-cell
// `statusEvents[]` / `meta.truncation`. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-05T12:00:00.000Z";
const CALL = "eval-metrics";

const WORKSPACE: WorkspaceRef = { workspaceId: "fraym-eval", path: "/work/fraym-eval", displayName: "fraym-eval" };
const REF: SessionRef = { workspaceId: "fraym-eval", sessionId: "demo-eval" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Crunch the latency metrics",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 22_400, contextWindow: 200_000, percent: 0.112 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

/** A small SVG bar chart (base64) used as the inline `display()` figure. */
export const EVAL_FIGURE_B64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMzIwIDE4MCI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiMwZjExMTciLz48ZyBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjExIiBmaWxsPSIjN2Q4NTkwIj48dGV4dCB4PSIxMiIgeT0iMjAiPnJlcXVlc3RzIC8gc2VjIChwNTApPC90ZXh0PjwvZz48cmVjdCB4PSIyNCIgeT0iMTA4IiB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIGZpbGw9IiM0YzlhZmYiLz48cmVjdCB4PSI4MiIgeT0iNzMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI5NSIgZmlsbD0iIzNmYjk1MCIvPjxyZWN0IHg9IjE0MCIgeT0iMjgiIHdpZHRoPSI0MCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiNkMjk5MjIiLz48cmVjdCB4PSIxOTgiIHk9IjQ4IiB3aWR0aD0iNDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjZjg1MTQ5Ii8+PHJlY3QgeD0iMjU2IiB5PSIzIiB3aWR0aD0iNDAiIGhlaWdodD0iMTY1IiBmaWxsPSIjYTM3MWY3Ii8+PGxpbmUgeDE9IjEyIiB5MT0iMTY4IiB4Mj0iMzA4IiB5Mj0iMTY4IiBzdHJva2U9IiMzMDM2M2QiLz48L3N2Zz4=";

// --- cell shapes ------------------------------------------------------------

const CELL0_CODE = 'import json\nrows = json.load(open("data/metrics.json"))\nprint(f"{len(rows)} rows loaded")';
const CELL1_CODE =
	'rps = sorted(r["rps"] for r in rows)\ndisplay({"p50": rps[len(rps)//2], "p99": rps[int(len(rps)*0.99)], "samples": len(rps)})';
const CELL2_CODE =
	"import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nax.bar(range(5), [60, 95, 140, 120, 165])\ndisplay(fig)";

type Cell = Record<string, unknown>;

function cell(index: number, title: string, code: string, extra: Cell): Cell {
	return { index, title, code, language: "python", output: "", status: "pending", ...extra };
}

const CELL0_DONE = cell(0, "load metrics", CELL0_CODE, {
	output: "128 rows loaded",
	status: "complete",
	durationMs: 240,
	statusEvents: [{ op: "read", chars: 8421, path: "data/metrics.json" }],
});
const CELL1_DONE = cell(1, "summarize", CELL1_CODE, { output: "", status: "complete", durationMs: 95 });
const CELL2_DONE = cell(2, "plot p50", CELL2_CODE, { output: "", status: "complete", durationMs: 1340 });

const JSON_OUTPUTS = [{ p50: 140, p99: 165, samples: 128 }];
const IMAGES = [{ data: EVAL_FIGURE_B64, mimeType: "image/svg+xml" }];

function evalResult(cells: Cell[], extra: Record<string, unknown> = {}, isError = false): unknown {
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

// --- step authoring helpers -------------------------------------------------

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}
function verb(message: string): ScriptedEvent {
	return { type: "workingStatus", status: { message, visible: true } };
}
function userMessage(id: string, text: string): ScriptedEvent {
	return { type: "queuedMessageStarted", message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW } };
}
function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}
function evalStart(): ScriptedEvent {
	return {
		type: "toolStarted",
		callId: CALL,
		toolName: "eval",
		input: {
			cells: [
				{ language: "py", code: CELL0_CODE },
				{ language: "py", code: CELL1_CODE },
				{ language: "py", code: CELL2_CODE },
			],
		},
	};
}
function evalUpdate(cells: Cell[], extra: Record<string, unknown> = {}): ScriptedEvent {
	return { type: "toolUpdated", callId: CALL, partialResult: { details: { cells, ...extra } } };
}
function evalDone(): ScriptedEvent {
	return {
		type: "toolFinished",
		callId: CALL,
		success: true,
		output: evalResult([CELL0_DONE, CELL1_DONE, CELL2_DONE], { jsonOutputs: JSON_OUTPUTS, images: IMAGES }),
	};
}
function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

// A running snapshot of a cell (spinner state) for the streamed reveal.
function running(c: Cell): Cell {
	return { ...c, status: "running", output: "", durationMs: undefined };
}

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(userMessage("u-eval", "Load data/metrics.json, give me p50/p99 RPS, and plot the per-bucket p50."), 200),
	step(say("Running it in the python kernel — three cells, streaming as they execute: "), 340),
	step(verb("Evaluating 3 cells"), 240),
	step(evalStart(), 460),
	// cell 0 runs → completes
	step(evalUpdate([running(CELL0_DONE)]), 420),
	step(evalUpdate([CELL0_DONE]), 520),
	// cell 1 runs → completes (display() JSON)
	step(evalUpdate([CELL0_DONE, running(CELL1_DONE)]), 360),
	step(evalUpdate([CELL0_DONE, CELL1_DONE], { jsonOutputs: JSON_OUTPUTS }), 480),
	// cell 2 runs → completes (figure)
	step(evalUpdate([CELL0_DONE, CELL1_DONE, running(CELL2_DONE)], { jsonOutputs: JSON_OUTPUTS }), 360),
	step(evalUpdate([CELL0_DONE, CELL1_DONE, CELL2_DONE], { jsonOutputs: JSON_OUTPUTS, images: IMAGES }), 1100),
	step(evalDone(), 420),
	step(
		say(
			"p50 is 140 rps, p99 165 across 128 samples; the bucket plot's attached. The first cell read 8.4K chars from metrics.json. Eval tour complete.",
		),
		380,
	),
	step(completed(), 220),
];

export const evalDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			step(say("Scripted eval-demo driver — attach a real engine to run live code."), 320),
			step(completed(), 200),
		],
	},
};

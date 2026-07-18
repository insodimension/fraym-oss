export type NotebookCell = Record<string, unknown>;

export const CELL_LOAD: NotebookCell = {
	index: 0,
	title: "load metrics",
	language: "python",
	code: 'import json\nrows = json.load(open("data/metrics.json"))\nprint(f"{len(rows)} rows loaded")',
	output: "128 rows loaded",
	status: "complete",
	durationMs: 240,
	statusEvents: [{ op: "read", chars: 8421, path: "data/metrics.json" }],
};

export const CELL_SUMMARIZE: NotebookCell = {
	index: 1,
	title: "summarize",
	language: "python",
	code: 'rps = sorted(r["rps"] for r in rows)\ndisplay({"p50": rps[len(rps)//2], "p99": rps[-2], "samples": len(rps)})',
	output: "",
	status: "complete",
	durationMs: 95,
};

export const CELL_PLOT: NotebookCell = {
	index: 2,
	title: "plot p50",
	language: "python",
	code: "import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nax.bar(range(5), [60, 95, 140, 120, 165])\ndisplay(fig)",
	output: "",
	status: "complete",
	durationMs: 1340,
};

export const CELL_JS: NotebookCell = {
	index: 0,
	title: "scan files",
	language: "js",
	code: 'const files = await Array.fromAsync(new Bun.Glob("src/**/*.ts").scan());\nconsole.log(files.length + " ts files");',
	output: "284 ts files",
	status: "complete",
	durationMs: 180,
	statusEvents: [{ op: "ls", count: 284 }],
};

export const CELL_SINGLE: NotebookCell = {
	index: 0,
	title: "quick check",
	language: "python",
	code: "import sys\nprint(sys.version.split()[0])",
	output: "3.12.4",
	status: "complete",
	durationMs: 60,
};

export const CELL_AGENTS: NotebookCell = {
	index: 0,
	title: "fan out review",
	language: "py",
	code: 'r = await agent("reviewer", ["audit auth", "audit billing"])\ndisplay(r)',
	output: "",
	status: "running",
	statusEvents: [
		{
			op: "agent",
			id: "reviewer-0",
			status: "completed",
			toolCount: 8,
			contextTokens: 44_000,
			contextWindow: 200_000,
			cost: 0.12,
			model: "acme/sonnet-4.6",
			durationMs: 21_400,
		},
		{
			op: "agent",
			id: "reviewer-1",
			status: "running",
			toolCount: 3,
			contextTokens: 58_000,
			contextWindow: 200_000,
			cost: 0.19,
			model: "openai/gpt-5",
			currentTool: "Read",
			lastIntent: "auditing the billing webhook",
		},
	],
};

export const JSON_OUTPUTS = [{ p50: 140, p99: 165, samples: 128 }];

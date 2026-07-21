type RecallVariation = "found-results" | "no-results" | "error" | "pending";

interface RecallFixtureCase {
	readonly input: { readonly query: string };
	readonly details?: Record<string, unknown> | undefined;
	readonly outputText?: string | undefined;
}

const FOUND_RESULTS_TEXT = [
	"Found 3 relevant memories for query: tool renderer parity",
	"",
	"1. Tool renderers return ToolView data only; demos must replay through @fraym-ai/driver/mock instead of importing fraym-ui.",
	"2. Tool parity fixtures should cover success, empty, error, and pending states before wiring the Demo Dock.",
	"3. The TUI renderer is the source of truth for compact labels, badges, body text, and failure copy.",
].join("\n");

const NO_RESULTS_TEXT = [
	"Found 0 relevant memories for query: deprecated swarm card flags",
	"",
	"No matching memories were found.",
].join("\n");

const CASES: Record<RecallVariation, RecallFixtureCase> = {
	"found-results": {
		input: { query: "tool renderer parity" },
		details: {
			query: "tool renderer parity",
			count: 3,
			results: [
				{ id: "mem-toolview-contract", score: 0.94, source: "docs/design/tools/README.md" },
				{ id: "mem-fixture-states", score: 0.87, source: "docs/checkpoints/2026-06-06_lsp-tool-parity.md" },
				{ id: "mem-tui-truth", score: 0.81, source: "docs/design/04-fraym-ui-parity-components.md" },
			],
		},
		outputText: FOUND_RESULTS_TEXT,
	},
	"no-results": {
		input: { query: "deprecated swarm card flags" },
		details: { query: "deprecated swarm card flags", count: 0, results: [] },
		outputText: NO_RESULTS_TEXT,
	},
	error: {
		input: { query: "workspace memory backend" },
		details: { query: "workspace memory backend", count: 0, results: [], error: "memory backend unavailable" },
		outputText: "Error: Hindsight recall backend is unavailable.",
	},
	pending: {
		input: { query: "pending memory lookup" },
		details: undefined,
		outputText: undefined,
	},
};

export const RECALL_INPUT: Record<RecallVariation, { readonly query: string }> = {
	"found-results": CASES["found-results"].input,
	"no-results": CASES["no-results"].input,
	error: CASES.error.input,
	pending: CASES.pending.input,
};

export const RECALL_DETAILS: Record<RecallVariation, Record<string, unknown> | undefined> = {
	"found-results": CASES["found-results"].details,
	"no-results": CASES["no-results"].details,
	error: CASES.error.details,
	pending: CASES.pending.details,
};

export const RECALL_OUTPUT_TEXT: Record<RecallVariation, string | undefined> = {
	"found-results": CASES["found-results"].outputText,
	"no-results": CASES["no-results"].outputText,
	error: CASES.error.outputText,
	pending: CASES.pending.outputText,
};

export const RECALL_VARIATIONS: readonly string[] = ["found-results", "no-results", "error", "pending"];

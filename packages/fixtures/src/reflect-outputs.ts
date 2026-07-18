export type ReflectVariation = "answer" | "error" | "pending";

export const REFLECT_INPUT: Record<ReflectVariation, { query: string }> = {
	answer: { query: "What did we decide about the tool-card renderer architecture?" },
	error: { query: "Recall the migration plan for the legacy memory store" },
	pending: { query: "Summarize prior decisions about slash-command discovery" },
};

export const REFLECT_DETAILS: Record<ReflectVariation, Record<string, unknown> | undefined> = {
	answer: {
		query: REFLECT_INPUT.answer.query,
		confidence: "high",
		matchedMemories: 3,
		sources: [
			"docs/design/04-fraym-ui-parity-components.md",
			"docs/design/tools/README.md",
			"docs/checkpoints/2026-06-06_lsp-tool-parity.md",
		],
	},
	error: {
		query: REFLECT_INPUT.error.query,
		error: "memory_index_unavailable",
		retryable: true,
	},
	pending: undefined,
};

export const REFLECT_OUTPUT_TEXT: Record<ReflectVariation, string | undefined> = {
	answer:
		"Tool renderers stay UI-agnostic: each renderer accepts an ActiveToolCall and returns a ToolView, while shared chrome remains in the tool-card shell. Renderer fixtures should use realistic inputs/results so parity work exercises the same code path as live sessions.",
	error: "Reflect failed: memory index is unavailable.",
	pending: undefined,
};

export const REFLECT_VARIATIONS: readonly string[] = ["answer", "error", "pending"];

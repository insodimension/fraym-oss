// Resolve tool fixtures — pending-action resolve output (accept/discard/failed).
// Uses a single `RESOLVE_CASES` array as source of truth; all variation types,
// maps, and output texts are derived from it.

export type ResolveVariation = (typeof RESOLVE_CASES)[number]["id"];

interface ResolveCase {
	readonly id: string;
	readonly input: Record<string, unknown>;
	readonly details?: Record<string, unknown>;
	readonly outputText?: string | undefined;
}

const RESOLVE_CASES = [
	{
		id: "apply-accept",
		input: {
			action: "apply",
			reason: "Edit looks correct — the change fixes the type error and keeps existing behavior.",
		},
		details: {
			action: "apply",
			reason: "Edit looks correct — the change fixes the type error and keeps existing behavior.",
			label: "ast_edit: Fix null-handling in parser.ts",
		},
		outputText: "Action accepted: Fix null-handling in parser.ts",
	},
	{
		id: "discard",
		input: { action: "discard", reason: "The change introduces a breaking API change without migration path." },
		details: {
			action: "discard",
			reason: "The change introduces a breaking API change without migration path.",
			label: "ast_edit: Refactor API types",
		},
		outputText: "Action discarded: Refactor API types",
	},
	{
		id: "apply-with-source",
		input: { action: "apply", reason: "The refactor improves readability and passes all existing tests." },
		details: {
			action: "apply",
			reason: "The refactor improves readability and passes all existing tests.",
			label: "ast_grep: Simplify pattern matching",
			sourceToolName: "ast_grep",
		},
		outputText: "Action accepted: Simplify pattern matching",
	},
	{
		id: "apply-failed",
		input: { action: "apply", reason: "Failed to apply patch: merge conflict in src/main.ts." },
		details: {
			action: "apply",
			reason: "Failed to apply patch: merge conflict in src/main.ts.",
			label: "edit: Update config parsing",
		},
		outputText: "Failed to resolve: Edit update config parsing",
	},
	{
		id: "pending",
		input: { action: "apply", reason: "This edit fixes the null-handling issue in the parser." },
		outputText: undefined,
	},
] as const satisfies readonly ResolveCase[];
// ─── Derived maps ───────────────────────────────────────────────────────────

export const RESOLVE_INPUT: Record<string, Record<string, unknown>> = {
	"apply-accept": {
		action: "apply",
		reason: "Edit looks correct — the change fixes the type error and keeps existing behavior.",
	},
	discard: { action: "discard", reason: "The change introduces a breaking API change without migration path." },
	"apply-with-source": { action: "apply", reason: "The refactor improves readability and passes all existing tests." },
	"apply-failed": { action: "apply", reason: "Failed to apply patch: merge conflict in src/main.ts." },
	pending: { action: "apply", reason: "This edit fixes the null-handling issue in the parser." },
};

export const RESOLVE_DETAILS: Record<string, Record<string, unknown> | undefined> = {
	"apply-accept": {
		action: "apply",
		reason: "Edit looks correct — the change fixes the type error and keeps existing behavior.",
		label: "ast_edit: Fix null-handling in parser.ts",
	},
	discard: {
		action: "discard",
		reason: "The change introduces a breaking API change without migration path.",
		label: "ast_edit: Refactor API types",
	},
	"apply-with-source": {
		action: "apply",
		reason: "The refactor improves readability and passes all existing tests.",
		label: "ast_grep: Simplify pattern matching",
		sourceToolName: "ast_grep",
	},
	"apply-failed": {
		action: "apply",
		reason: "Failed to apply patch: merge conflict in src/main.ts.",
		label: "edit: Update config parsing",
	},
	pending: undefined,
};

export const RESOLVE_OUTPUT_TEXT: Record<string, string | undefined> = {
	"apply-accept": "Action accepted: Fix null-handling in parser.ts",
	discard: "Action discarded: Refactor API types",
	"apply-with-source": "Action accepted: Simplify pattern matching",
	"apply-failed": "Failed to resolve: Edit update config parsing",
	pending: undefined,
};

// Report tool issue fixtures — AutoQA report submission output.
// Details are intentionally absent; the renderer only receives text content.

export type ReportToolIssueVariation = "success" | "error" | "pending" | "skipped";

interface ReportToolIssueCase {
	readonly input: { readonly tool: string; readonly report: string };
	readonly outputText?: string;
}

const CASES: Record<ReportToolIssueVariation, ReportToolIssueCase> = {
	success: {
		input: {
			tool: "read",
			report: "The read tool returned malformed line selectors for a markdown range request.",
		},
		outputText: "Reported.",
	},
	error: {
		input: {
			tool: "browser",
			report: "The browser tool returned an empty accessibility snapshot after a successful navigation.",
		},
		outputText: "Noted, thanks!",
	},
	pending: {
		input: {
			tool: "edit",
			report: "The edit tool preview did not include the expected replacement hunk.",
		},
	},
	skipped: {
		input: {
			tool: "bash",
			report: "The bash tool emitted a duplicated minimizer footer for a short command.",
		},
		outputText: "Noted, thanks!",
	},
};

export const REPORT_TOOL_ISSUE_VARIATIONS: readonly ReportToolIssueVariation[] = [
	"success",
	"error",
	"pending",
	"skipped",
];

export const REPORT_TOOL_ISSUE_INPUT: Record<
	ReportToolIssueVariation,
	{ readonly tool: string; readonly report: string }
> = Object.fromEntries(REPORT_TOOL_ISSUE_VARIATIONS.map(variation => [variation, CASES[variation].input])) as Record<
	ReportToolIssueVariation,
	{ readonly tool: string; readonly report: string }
>;

export const REPORT_TOOL_ISSUE_DETAILS: Record<ReportToolIssueVariation, undefined> = Object.fromEntries(
	REPORT_TOOL_ISSUE_VARIATIONS.map(variation => [variation, undefined]),
) as Record<ReportToolIssueVariation, undefined>;

export const REPORT_TOOL_ISSUE_OUTPUT_TEXT: Record<ReportToolIssueVariation, string | undefined> = Object.fromEntries(
	REPORT_TOOL_ISSUE_VARIATIONS.map(variation => [variation, CASES[variation].outputText]),
) as Record<ReportToolIssueVariation, string | undefined>;

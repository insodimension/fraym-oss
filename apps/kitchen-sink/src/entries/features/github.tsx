import {
	createGithubDemoDriver,
	GITHUB_DETAILS as DETAILS,
	GITHUB_DEMO_SESSION_REF,
	type GithubVariation,
	GITHUB_INPUT as INPUT,
	GITHUB_OUTPUT as OUTPUT,
	pendingToolCall,
	toolResult,
} from "@fraym-ai/fixtures";
import type { ActiveToolCall } from "@fraym-ai/ui";
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
// `github` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer (registered
// under `github` in @fraym-ai/ui's tool-renderer map) fed a synthetic
// `ActiveToolCall` built from the knobs — identical to a live run. GitHub shows
// a "GitHub" head + an op badge + repo/branch/chips; the body is text output
// for most ops and a structured Actions run-watch for `run_watch`.
//
// Axes (control knobs):
//   VARIATION  repo-view · search-issues · search-code · pr-create · pr-checkout · run-watch · run-watch-completed · error
//   STATE      success · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Variation = GithubVariation;
type GithubState = "success" | "error" | "pending";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = [
	"repo-view",
	"search-issues",
	"search-code",
	"pr-create",
	"pr-checkout",
	"run-watch",
	"run-watch-completed",
	"error",
];

const STATES: GithubState[] = ["success", "error", "pending"];

// ── synthetic call builder ────────────────────────────────────────────────────

type GithubCallBase = {
	readonly callId: string;
	readonly toolName: "github";
	readonly input: Record<string, unknown>;
};

function githubErrorCall(call: GithubCallBase, text: string): ActiveToolCall {
	return { ...call, status: "error", output: toolResult(text, {}, true) };
}

function githubSuccessCall(call: GithubCallBase, variation: Variation): ActiveToolCall {
	const text = OUTPUT[variation] ?? "";
	const details = DETAILS[variation] ?? {};

	// The `error` variation's natural form IS an error card, even at "success" state.
	if (variation === "error") return githubErrorCall(call, text);

	return { ...call, status: "success", output: toolResult(text, details) };
}

/** Build the exact `ActiveToolCall` a live github run produces, from the config knobs. */
function buildGithubCall(variation: Variation, state: GithubState): ActiveToolCall {
	const input = INPUT[variation] ?? { op: "repo_view", repo: "example-org/fraym-demo" };
	const base: GithubCallBase = { callId: `github-${variation}-${state}`, toolName: "github", input };

	if (state === "pending") return pendingToolCall(base.callId, "github", input);
	if (state === "error") return githubErrorCall(base, OUTPUT.error);
	return githubSuccessCall(base, variation);
}

// ── showcase entry ─────────────────────────────────────────────────────────────

const GITHUB_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "repo-view" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	view: toolPreviewControl(),
};

function GithubEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "repo-view");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = buildGithubCall(variation, state);

	return (
		<Demo
			summary="The `github` tool card, rendered by the PRODUCTION renderer (registered under `github`) on a synthetic ActiveToolCall built from the knobs — identical to a live run. GitHub shows a 'GitHub' head + an op badge + repo/branch/chips; the body is text output for most ops and a structured Actions run-watch for `run_watch`. The `error` variation shows the error banner."
			importPath="entries/features/github (live github renderer)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildGithubCall(v, "success")}
			/>
		</Demo>
	);
}

const githubDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps github -> its renderer. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// The renderer is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "github",',
			"//   input:  { op, repo, branch?, query?, pr?, run?, title?, base?, head? },",
			"//   output: { content, details: { repo, branch?, worktreePath?, checkouts?, watch? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: a `GitHub` title + an op badge + repo / branch chips.",
			"// Body: plain text output for most ops; a structured Actions run-watch",
			"// panel for run_watch (driven by details.watch). On error the renderer",
			"// drops details and shows the error banner.",
		].join("\n"),
	),
	examples: [
		{
			label: "View a repo",
			code: JSON.stringify('{ op: "repo_view", repo: "example-org/fraym-demo", branch: "main" }'),
		},
		{
			label: "Search issues",
			code: JSON.stringify('{ op: "search_issues", repo: "example-org/fraym-demo", query: "renderer bug" }'),
		},
		{
			label: "Create a PR",
			code: JSON.stringify(
				'{ op: "pr_create", repo: "example-org/fraym-demo", title: "Add GitHub tool renderer", base: "main", head: "feature/github-renderer" }',
			),
		},
		{
			label: "Watch a CI run",
			code: JSON.stringify(
				'{ op: "run_watch", repo: "example-org/fraym-demo", run: "4567" }\n// output.details.watch -> Actions run-watch panel',
			),
		},
	],
	api: [
		{
			name: "op",
			type: '"repo_view" | "search_issues" | "search_code" | "pr_create" | "pr_checkout" | "run_watch"',
			required: true,
			description: "Operation to perform; rendered as the head op badge and selects the body shape.",
		},
		{
			name: "repo",
			type: "string",
			required: true,
			description: "Target `owner/name`; rendered as the head repo chip.",
		},
		{
			name: "branch",
			type: "string",
			description: "Branch for repo_view; rendered as the head branch chip.",
		},
		{
			name: "query",
			type: "string",
			description: "Search query for search_issues / search_code.",
		},
		{
			name: "pr",
			type: "string",
			description: "PR number for pr_checkout.",
		},
		{
			name: "run",
			type: "string",
			description: "Workflow run id for run_watch.",
		},
		{
			name: "title / base / head",
			type: "string",
			description: "PR fields for pr_create (title, base branch, head branch).",
		},
		{
			name: "output.details.repo",
			type: "string",
			description: "Resolved repo; rendered as the head repo chip.",
		},
		{
			name: "output.details.branch",
			type: "string",
			description: "Resolved / checked-out branch; rendered as the head branch chip.",
		},
		{
			name: "output.details.checkouts",
			type: "{ prNumber; url; branch; worktreePath; remote }[]",
			description: "pr_checkout results — each PR worktree the op created or reused.",
		},
		{
			name: "output.details.watch",
			type: "{ mode; state; repo; run?; runs?; jobs; failedLogs }",
			description: "run_watch payload driving the Actions run-watch panel (job statuses + failed-log tails).",
		},
	],
};

export const githubEntries: readonly ShowcaseEntry[] = [
	{
		id: "github-tool",
		name: "GitHub",
		Component: GithubEntry,
		config: GITHUB_CONFIG,
		docs: githubDocs,
		demo: {
			createDriver: createGithubDemoDriver,
			sessionRef: GITHUB_DEMO_SESSION_REF,
			title: "github · live conversation",
		},
	},
];

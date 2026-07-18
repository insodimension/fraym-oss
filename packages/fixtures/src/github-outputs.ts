// GitHub tool fixtures — realistic GhToolDetails-shaped output per variation.
// Used by the kitchen-sink github entry to build synthetic ActiveToolCalls.
//
// Each OUTPUT string is the exact `content[].text` the tool emits for that
// variation; DETAILS carries the structured `details` object.

// ─── Types ─────────────────────────────────────────────────────────────────

export type GithubVariation =
	| "repo-view"
	| "search-issues"
	| "search-code"
	| "pr-create"
	| "pr-checkout"
	| "run-watch"
	| "run-watch-completed"
	| "error";

// ─── Repo View ──────────────────────────────────────────────────────────────

export const REPO_VIEW_OUTPUT = [
	"# acme-labs/cockpit",
	"",
	"A sample workspace for reviewing and organizing project tasks.",
	"",
	"Stars: 128 • Forks: 34 • License: MIT",
	"Language: TypeScript (78%), CSS (14%), Markdown (8%)",
	"Topics: demo, agent-tools, workspace",
	"Updated: 2026-06-07",
	"Default branch: main",
	"Homepage: https://example.com/cockpit",
].join("\n");

// ─── Search Issues ──────────────────────────────────────────────────────────

export const SEARCH_ISSUES_OUTPUT = [
	"Showing 3 of 3 open issues matching `renderer bug` in acme-labs/cockpit",
	"",
	"#42  Renderer shows blank preview after a saved edit       (bug, high)  opened 2d ago",
	"#38  Keyboard focus skips the filter menu                  (bug)        opened 5d ago",
	"#35  Compact tool card is missing its body border          (bug)        opened 8d ago",
].join("\n");

// ─── Search Code ────────────────────────────────────────────────────────────

export const SEARCH_CODE_OUTPUT = [
	"acme-labs/cockpit: 4 results in 3 files",
	"",
	"src/renderers/tool-card.tsx",
	"  Line 42:  const KIND_CONFIG: Record<ToolKind, { icon: IconName; iconColor: string }> = {",
	"  Line 128: const config = KIND_CONFIG[kind];",
	"",
	"src/renderers/bash-render.tsx",
	'  Line 15: import { Badge } from "../components/badge";',
].join("\n");

// ─── PR Create ──────────────────────────────────────────────────────────────

export const PR_CREATE_OUTPUT = [
	"https://github.com/acme-labs/cockpit/pull/142",
	"",
	"Add a tool icon for the GitHub renderer",
	"",
	"Base: main ← Head: feature/github-renderer",
	"Reviews: 0 ✓ • Checks: pending",
].join("\n");

// ─── PR Checkout ────────────────────────────────────────────────────────────

export const PR_CHECKOUT_OUTPUT = [
	"✓ Checked out PR #142 into /worktrees/pr-142",
	"Branch: feature/github-renderer (remote: origin)",
	"Switched to worktree at /worktrees/pr-142",
].join("\n");

// ─── Run Watch (watching) ───────────────────────────────────────────────────

export const RUN_WATCH_DETAILS = {
	watch: {
		mode: "run",
		state: "watching",
		repo: "acme-labs/cockpit",
		run: {
			id: 4567,
			workflowName: "CI / Test & Lint",
			displayTitle: "chore: update dependencies",
			branch: "main",
			headSha: "a1b2c3d4",
			status: "in_progress",
			jobs: [
				{ id: 1, name: "lint", status: "completed", conclusion: "success", durationSeconds: 45 },
				{ id: 2, name: "typecheck", status: "completed", conclusion: "success", durationSeconds: 120 },
				{ id: 3, name: "test", status: "in_progress", durationSeconds: 67 },
				{ id: 4, name: "build", status: "queued" },
			],
		},
		failedLogs: [],
	},
};

// ─── Run Watch (completed with failures) ────────────────────────────────────

export const RUN_WATCH_COMPLETED_DETAILS = {
	watch: {
		mode: "commit",
		state: "completed",
		repo: "acme-labs/cockpit",
		headSha: "b2c3d4e5",
		note: "3 workflow runs completed, 1 failure detected",
		runs: [
			{
				id: 4567,
				workflowName: "CI / Test & Lint",
				branch: "main",
				headSha: "b2c3d4e5",
				status: "completed",
				conclusion: "success",
				jobs: [
					{ id: 1, name: "lint", status: "completed", conclusion: "success", durationSeconds: 45 },
					{ id: 2, name: "typecheck", status: "completed", conclusion: "success", durationSeconds: 120 },
					{ id: 3, name: "test", status: "completed", conclusion: "success", durationSeconds: 180 },
					{ id: 4, name: "build", status: "completed", conclusion: "success", durationSeconds: 90 },
				],
			},
			{
				id: 4568,
				workflowName: "E2E Tests",
				branch: "main",
				headSha: "b2c3d4e5",
				status: "completed",
				conclusion: "failure",
				jobs: [
					{ id: 5, name: "setup", status: "completed", conclusion: "success", durationSeconds: 30 },
					{ id: 6, name: "e2e-chrome", status: "completed", conclusion: "failure", durationSeconds: 240 },
					{ id: 7, name: "e2e-firefox", status: "completed", conclusion: "failure", durationSeconds: 255 },
				],
			},
			{
				id: 4569,
				workflowName: "Deploy Preview",
				branch: "main",
				headSha: "b2c3d4e5",
				status: "completed",
				conclusion: "skipped",
				jobs: [],
			},
		],
		failedLogs: [
			{
				runId: 4568,
				workflowName: "E2E Tests",
				jobName: "e2e-chrome",
				available: true,
				tail: [
					"Error: Test 'Login flow' failed: timeout waiting for #submit 5000ms",
					"  at waitForSelector (browser.ts:142)",
					"  at LoginPage.login (pages/login.ts:56)",
					"  at login.test.ts:23",
					"",
					"Error: Test 'Dashboard loads data' failed: expected 200 got 503",
					"  at dashboard.test.ts:45",
				].join("\n"),
			},
			{
				runId: 4568,
				workflowName: "E2E Tests",
				jobName: "e2e-firefox",
				available: true,
				tail: ["Error: Test 'Search autocomplete' failed: element not found", "  at search.test.ts:67"].join("\n"),
			},
		],
	},
};

// ─── Error ──────────────────────────────────────────────────────────────────

export const ERROR_OUTPUT = "Error: GitHub API rate limit exceeded. Try again in 5 minutes.";

// ─── Output text by variation ───────────────────────────────────────────────

export const OUTPUT: Record<GithubVariation, string> = {
	"repo-view": REPO_VIEW_OUTPUT,
	"search-issues": SEARCH_ISSUES_OUTPUT,
	"search-code": SEARCH_CODE_OUTPUT,
	"pr-create": PR_CREATE_OUTPUT,
	"pr-checkout": PR_CHECKOUT_OUTPUT,
	"run-watch": "",
	"run-watch-completed": "",
	error: ERROR_OUTPUT,
};

// ─── Structured details by variation ────────────────────────────────────────

export const DETAILS: Record<GithubVariation, Record<string, unknown> | null> = {
	"repo-view": {
		repo: "acme-labs/cockpit",
		branch: "main",
	},
	"search-issues": {
		repo: "acme-labs/cockpit",
	},
	"search-code": {
		repo: "acme-labs/cockpit",
	},
	"pr-create": {
		repo: "acme-labs/cockpit",
	},
	"pr-checkout": {
		repo: "acme-labs/cockpit",
		branch: "feature/github-renderer",
		worktreePath: "/worktrees/pr-142",
		remote: "origin",
		remoteBranch: "feature/github-renderer",
		checkouts: [
			{
				prNumber: 142,
				url: "https://github.com/acme-labs/cockpit/pull/142",
				branch: "feature/github-renderer",
				worktreePath: "/worktrees/pr-142",
				remote: "origin",
				remoteBranch: "feature/github-renderer",
				reused: false,
			},
		],
	},
	"run-watch": RUN_WATCH_DETAILS,
	"run-watch-completed": RUN_WATCH_COMPLETED_DETAILS,
	error: null,
};

// ─── Inputs ────────────────────────────────────────────────────────────────

export const INPUT: Record<GithubVariation, Record<string, unknown>> = {
	"repo-view": { op: "repo_view", repo: "acme-labs/cockpit", branch: "main" },
	"search-issues": { op: "search_issues", repo: "acme-labs/cockpit", query: "renderer bug" },
	"search-code": { op: "search_code", repo: "acme-labs/cockpit", query: "KIND_CONFIG" },
	"pr-create": {
		op: "pr_create",
		repo: "acme-labs/cockpit",
		title: "Add GitHub tool renderer icon",
		base: "main",
		head: "feature/github-renderer",
	},
	"pr-checkout": { op: "pr_checkout", repo: "acme-labs/cockpit", pr: "142" },
	"run-watch": { op: "run_watch", repo: "acme-labs/cockpit", run: "4567" },
	"run-watch-completed": { op: "run_watch", repo: "acme-labs/cockpit", run: "4568" },
	error: { op: "repo_view", repo: "acme-labs/cockpit" },
};

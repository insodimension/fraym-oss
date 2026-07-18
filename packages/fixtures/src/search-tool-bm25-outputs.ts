// search_tool_bm25 tool fixtures — discoverable tool search results.
// Each variation produces realistic SearchToolBm25Details-shaped data.

export type SearchToolBm25Variation = "normal" | "no-matches" | "empty" | "error";

interface SearchToolBm25Match {
	name: string;
	label: string;
	description: string;
	server_name?: string;
	mcp_tool_name?: string;
	schema_keys: string[];
	score: number;
}

interface SearchToolBm25Details {
	query: string;
	limit: number;
	total_tools: number;
	activated_tools: string[];
	active_selected_tools: string[];
	tools: SearchToolBm25Match[];
}

// ─── Normal · query matches MCP tools ──────────────────────────────────

export const NORMAL_INPUT = { query: "jira issue create ticket", limit: 8 };

export const NORMAL_DETAILS: SearchToolBm25Details = {
	query: "jira issue create ticket",
	limit: 8,
	total_tools: 24,
	activated_tools: ["jira_create_issue", "jira_search_issues"],
	active_selected_tools: ["read", "search", "bash", "write", "edit"],
	tools: [
		{
			name: "jira_create_issue",
			label: "Create Jira Issue",
			description:
				"Creates a new issue in Jira with the specified project, summary, description, issue type, priority, assignee, labels, and optional custom fields.",
			server_name: "atlassian-mcp",
			mcp_tool_name: "jira_create_issue",
			schema_keys: ["project", "summary", "description", "issuetype", "priority"],
			score: 0.912345,
		},
		{
			name: "jira_search_issues",
			label: "Search Jira Issues",
			description:
				"Searches for Jira issues using JQL (Jira Query Language). Returns issues matching the query with relevant fields.",
			server_name: "atlassian-mcp",
			mcp_tool_name: "jira_search_issues",
			schema_keys: ["jql", "maxResults", "fields"],
			score: 0.784512,
		},
		{
			name: "linear_create_issue",
			label: "Create Linear Issue",
			description: "Creates a new issue in Linear with team, title, description, priority, assignee, and labels.",
			server_name: "linear-mcp",
			mcp_tool_name: "linear_create_issue",
			schema_keys: ["teamId", "title", "description", "priority"],
			score: 0.451278,
		},
		{
			name: "github_create_issue",
			label: "Create GitHub Issue",
			description: "Creates a new issue in a GitHub repository with title, body, assignees, labels, and milestone.",
			server_name: "github-mcp",
			mcp_tool_name: "github_create_issue",
			schema_keys: ["owner", "repo", "title", "body"],
			score: 0.312567,
		},
	],
};

export const NORMAL_OUTPUT = JSON.stringify({
	query: "jira issue create ticket",
	activated_tools: ["jira_create_issue", "jira_search_issues"],
	match_count: 4,
	total_tools: 24,
});

// ─── No matches · query matches nothing ────────────────────────────────

export const NO_MATCHES_INPUT = { query: "asdfghjkl zxcvbnm", limit: 8 };

export const NO_MATCHES_DETAILS: SearchToolBm25Details = {
	query: "asdfghjkl zxcvbnm",
	limit: 8,
	total_tools: 24,
	activated_tools: [],
	active_selected_tools: ["read", "search", "bash", "write", "edit"],
	tools: [],
};

export const NO_MATCHES_OUTPUT = JSON.stringify({
	query: "asdfghjkl zxcvbnm",
	activated_tools: [],
	match_count: 0,
	total_tools: 24,
});

// ─── Empty · no discoverable tools at all ──────────────────────────────

export const EMPTY_INPUT = { query: "jira", limit: 8 };

export const EMPTY_DETAILS: SearchToolBm25Details = {
	query: "jira",
	limit: 8,
	total_tools: 0,
	activated_tools: [],
	active_selected_tools: ["read", "search", "bash", "write", "edit"],
	tools: [],
};

export const EMPTY_OUTPUT = JSON.stringify({
	query: "jira",
	activated_tools: [],
	match_count: 0,
	total_tools: 0,
});

// ─── Error · tool discovery unavailable ────────────────────────────────

export const ERROR_INPUT = { query: "jira", limit: 8 };
export const ERROR_TEXT = "Error: Tool discovery is unavailable in this session.";

// ─── Derived maps ──────────────────────────────────────────────────────

export const SEARCH_TOOL_BM25_INPUT: Record<string, Record<string, unknown>> = {
	normal: NORMAL_INPUT,
	"no-matches": NO_MATCHES_INPUT,
	empty: EMPTY_INPUT,
	error: ERROR_INPUT,
};

export const SEARCH_TOOL_BM25_DETAILS: Record<string, Record<string, unknown>> = {
	normal: NORMAL_DETAILS as unknown as Record<string, unknown>,
	"no-matches": NO_MATCHES_DETAILS as unknown as Record<string, unknown>,
	empty: EMPTY_DETAILS as unknown as Record<string, unknown>,
	error: {},
};

export const SEARCH_TOOL_BM25_OUTPUT_TEXT: Record<string, string | undefined> = {
	normal: NORMAL_OUTPUT,
	"no-matches": NO_MATCHES_OUTPUT,
	empty: EMPTY_OUTPUT,
	error: ERROR_TEXT,
};

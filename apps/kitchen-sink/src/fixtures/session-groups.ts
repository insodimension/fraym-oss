import type { RepoGroup } from "@fraym/ui";

export const SESSION_GROUPS: readonly RepoGroup[] = [
	{
		repo: "fraym",
		branch: "feat/showcase",
		dot: "var(--fr-accent)",
		items: [
			{ id: "ui-polish", title: "Polish kitchen sink entries", time: "now", status: "working", active: true },
			{ id: "theme-pass", title: "Audit token contrast", time: "18m", status: "failed" },
			{ id: "docs-nav", title: "Wire docs navigation", time: "1h", status: "idle" },
			{ id: "rail-collapse", title: "Add show-more to session rail", time: "3h", status: "idle" },
			{ id: "icon-set", title: "Refresh icon set", time: "5h", status: "idle" },
			{ id: "token-rename", title: "Rename surface tokens", time: "1d", status: "idle" },
			{ id: "perf-pass", title: "Profile rail re-renders", time: "2d", status: "idle" },
		],
	},
	{
		repo: "session-driver",
		branch: "main",
		dot: "var(--fr-blue)",
		items: [
			{ id: "event-stream", title: "Replay stream reducer", time: "2h", status: "idle" },
			{ id: "mcp-tools", title: "Map MCP tool lifecycle", time: "4h", status: "working" },
		],
	},
];


export type TodoTask = { content: string; status: string; notes?: string[] };
export type TodoPhase = { name: string; tasks: TodoTask[] };

export const PHASES_BY_VARIATION: Record<"single" | "phases" | "notes" | "mixed" | "empty", TodoPhase[]> = {
	single: [
		{
			name: "Implementation",
			tasks: [
				{ content: "Apply the rate-limit fix", status: "completed" },
				{ content: "Wire the Redis store", status: "in_progress" },
				{ content: "Run the tests", status: "pending" },
			],
		},
	],
	phases: [
		{
			name: "Foundation",
			tasks: [
				{ content: "Scaffold the crate", status: "completed" },
				{ content: "Wire the workspace", status: "completed" },
			],
		},
		{
			name: "Auth",
			tasks: [
				{ content: "Port the credential store", status: "in_progress" },
				{ content: "Wire OAuth providers", status: "pending" },
			],
		},
		{ name: "Verification", tasks: [{ content: "Run cargo test", status: "pending" }] },
	],
	notes: [
		{
			name: "Migration",
			tasks: [
				{ content: "Map the legacy schema", status: "completed" },
				{
					content: "Port the writer path",
					status: "in_progress",
					notes: [
						"Blocked on the dual-write flag — needs a feature gate before cutover.",
						"Reuse migrateBatch() from the v1 importer.",
					],
				},
				{ content: "Backfill historical rows", status: "pending" },
			],
		},
	],
	mixed: [
		{
			name: "Cleanup",
			tasks: [
				{ content: "Delete the dead adapter", status: "completed" },
				{ content: "Drop the legacy flag", status: "abandoned" },
				{ content: "Document the new path", status: "in_progress" },
				{ content: "Announce in the changelog", status: "pending" },
			],
		},
	],
	empty: [],
};

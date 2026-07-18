import type { ActiveWorkTool } from "@fraym/ui";

export const ACTIVE_WORK_TOOLS: readonly ActiveWorkTool[] = [
	{ id: "inspect", label: "Inspect schema", status: "success", icon: "db" },
	{ id: "author", label: "Author assets", status: "running", icon: "spark" },
	{ id: "verify", label: "Verify output", status: "queued", icon: "check" },
];


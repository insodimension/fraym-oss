import type { DiagramEdge } from "@fraym/ui";

export const DIAGRAM_EDGES: DiagramEdge[] = [
	{
		from: "client",
		fs: "bottom",
		fo: 0.5,
		to: "engine",
		ts: "top",
		to2: 0.5,
		kind: "contract",
		dir: "bi",
		label: "one contract",
	},
	{ from: "tool", fs: "left", fo: 0.5, to: "engine", ts: "right", to2: 0.5, kind: "mcp", dir: "bi", label: "MCP" },
];


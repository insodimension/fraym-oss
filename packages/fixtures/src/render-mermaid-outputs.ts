// render_mermaid tool fixtures — Mermaid-to-ASCII rendering results.
// Real ASCII output from beautiful-mermaid (captured from live runs).

import { optionalToolResult, pendingToolCall, toolResult } from "./tool-call-utils";

export type RenderMermaidVariation = "flowchart" | "sequence" | "state" | "error" | "pending";

interface RenderMermaidCase {
	readonly input: Record<string, unknown>;
	readonly details?: Record<string, unknown>;
	readonly outputText?: string;
	readonly call: unknown;
}

const FLOWCHART_SOURCE = "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End]\n  B -->|No| D[Retry]";

const FLOWCHART_ASCII = [
	"┌───────┐     ◇──────────◇        ┌───────┐",
	"│       │     │          │        │       │",
	"│ Start ├────►│ Decision │ ├─Yes─►│  End  │",
	"│       │     │          │        │       │",
	"└───────┘     ◇─────┬────◇        └───────┘",
	"                    │",
	"                    │",
	"                    No",
	"                    │",
	"                    │",
	"                    │",
	"                    │",
	"                    ├┐",
	"                    ││",
	"                    ▼│",
	"               ┌───────┐",
	"               │       │",
	"               │ Retry │",
	"               │       │",
	"               └───────┘",
].join("\n");

const SEQUENCE_SOURCE = "sequenceDiagram\n  A->>B: ping\n  B-->>A: pong";

const SEQUENCE_ASCII = [
	" ┌───┐     ┌───┐",
	" │ A │     │ B │",
	" └─┬─┘     └─┬─┘",
	"   │         │",
	"   │  ping   │",
	"   │─────────▶",
	"   │         │",
	"   │  pong   │",
	"   ◀╌╌╌╌╌╌╌╌╌│",
	"   │         │",
	" ┌─┴─┐     ┌─┴─┐",
	" │ A │     │ B │",
	" └───┘     └───┘",
].join("\n");

const STATE_SOURCE = "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running: start\n  Running --> Idle: stop";

const STATE_ASCII = [
	"●─────────●",
	"│         │",
	"●─────────●",
	"     │",
	"     │",
	"     ▼",
	"╭─────────╮",
	"│         │",
	"│   Idle  │",
	"│         │",
	"╰────┬────╯",
	"     ▲",
	"   start",
	"     │",
	"   stop",
	"     ▼",
	"╭────┴────╮",
	"│         │",
	"│ Running │",
	"│         │",
	"╰─────────╯",
].join("\n");

const ERROR_INPUT_TEXT = "garbage@@@ invalid mermaid source";
const ERROR_OUTPUT_TEXT =
	'Invalid mermaid header: "garbage@@@". Expected "graph TD", "flowchart LR", "stateDiagram-v2", etc.';

const CASES: Record<RenderMermaidVariation, RenderMermaidCase> = {
	flowchart: {
		input: { mermaid: FLOWCHART_SOURCE },
		details: { artifactId: "artifact-abc123" },
		outputText: `${FLOWCHART_ASCII}\n\nSaved artifact: artifact://artifact-abc123`,
		call: {
			...pendingToolCall("mmd-flowchart", "render_mermaid", { mermaid: FLOWCHART_SOURCE }),
			status: "success" as const,
			output:
				optionalToolResult(`${FLOWCHART_ASCII}\n\nSaved artifact: artifact://artifact-abc123`, {
					artifactId: "artifact-abc123",
				}) ??
				toolResult(`${FLOWCHART_ASCII}\n\nSaved artifact: artifact://artifact-abc123`, {
					artifactId: "artifact-abc123",
				}),
		},
	},
	sequence: {
		input: { mermaid: SEQUENCE_SOURCE },
		details: { artifactId: "artifact-def456" },
		outputText: `${SEQUENCE_ASCII}\n\nSaved artifact: artifact://artifact-def456`,
		call: {
			...pendingToolCall("mmd-sequence", "render_mermaid", { mermaid: SEQUENCE_SOURCE }),
			status: "success" as const,
			output:
				optionalToolResult(`${SEQUENCE_ASCII}\n\nSaved artifact: artifact://artifact-def456`, {
					artifactId: "artifact-def456",
				}) ??
				toolResult(`${SEQUENCE_ASCII}\n\nSaved artifact: artifact://artifact-def456`, {
					artifactId: "artifact-def456",
				}),
		},
	},
	state: {
		input: { mermaid: STATE_SOURCE },
		details: { artifactId: "artifact-ghi789" },
		outputText: `${STATE_ASCII}\n\nSaved artifact: artifact://artifact-ghi789`,
		call: {
			...pendingToolCall("mmd-state", "render_mermaid", { mermaid: STATE_SOURCE }),
			status: "success" as const,
			output:
				optionalToolResult(`${STATE_ASCII}\n\nSaved artifact: artifact://artifact-ghi789`, {
					artifactId: "artifact-ghi789",
				}) ??
				toolResult(`${STATE_ASCII}\n\nSaved artifact: artifact://artifact-ghi789`, {
					artifactId: "artifact-ghi789",
				}),
		},
	},
	error: {
		input: { mermaid: ERROR_INPUT_TEXT },
		details: undefined,
		outputText: ERROR_OUTPUT_TEXT,
		call: {
			...pendingToolCall("mmd-error", "render_mermaid", { mermaid: ERROR_INPUT_TEXT }),
			status: "error" as const,
			output: toolResult(ERROR_OUTPUT_TEXT, {}, true),
		},
	},
	pending: {
		input: { mermaid: FLOWCHART_SOURCE },
		outputText: undefined,
		call: pendingToolCall("mmd-pending", "render_mermaid", { mermaid: FLOWCHART_SOURCE }),
	},
};

export const RENDER_MERMAID_VARIATIONS: readonly RenderMermaidVariation[] = [
	"flowchart",
	"sequence",
	"state",
	"error",
	"pending",
];

export const RENDER_MERMAID_INPUT: Record<RenderMermaidVariation, Record<string, unknown>> = Object.fromEntries(
	RENDER_MERMAID_VARIATIONS.map(variation => [variation, CASES[variation].input]),
) as Record<RenderMermaidVariation, Record<string, unknown>>;

export const RENDER_MERMAID_DETAILS: Record<RenderMermaidVariation, Record<string, unknown> | undefined> =
	Object.fromEntries(RENDER_MERMAID_VARIATIONS.map(variation => [variation, CASES[variation].details])) as Record<
		RenderMermaidVariation,
		Record<string, unknown> | undefined
	>;

export const RENDER_MERMAID_OUTPUT_TEXT: Record<RenderMermaidVariation, string | undefined> = Object.fromEntries(
	RENDER_MERMAID_VARIATIONS.map(variation => [variation, CASES[variation].outputText]),
) as Record<RenderMermaidVariation, string | undefined>;

import { createTodoDemoDriver, TODO_DEMO_SESSION_REF } from "@fraym-ai/fixtures";
import type { ActiveToolCall } from "@fraym-ai/ui";
import { PHASES_BY_VARIATION } from "../../fixtures";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	ToolVariationGrid,
	toolPreviewControl,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `todo` / `todo_write` tool showcase.
//
// SEPARATE tool from `task` (subagent dispatch). Rendered by the PRODUCTION
// renderer (`renderTodo`, registered in @fraym-ai/ui's DEFAULT_TOOL_RENDERERS) fed a
// synthetic `todo_write` ActiveToolCall whose `output.details.phases` is the
// checklist — exactly the shape the todo renderer consumes. Mirrors `todoToolRenderer`.
//
// Axes (control knobs):
//   VARIATION  single · phases · notes · mixed · empty
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "single" | "phases" | "notes" | "mixed" | "empty";

const VARIATIONS: Variation[] = ["single", "phases", "notes", "mixed", "empty"];

/** An `AgentToolResult`-shaped output carrying `TodoToolDetails`. */
function buildTodoCall(variation: Variation): ActiveToolCall {
	const phases = PHASES_BY_VARIATION[variation];
	return {
		callId: `todo-${variation}`,
		toolName: "todo_write",
		status: "success",
		input: { ops: [{ op: "init" }] },
		output: {
			content: [{ type: "text", text: phases.length > 0 ? "Updated todos" : "No todos" }],
			details: { phases, storage: "session" },
		},
	};
}

const TODO_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "phases" },
	view: toolPreviewControl(),
};

function TodoEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "phases");
	const view = toolPreviewView(values.view);

	return (
		<Demo
			summary="The `todo`/`todo_write` tool card — the agent's progress checklist, a SEPARATE tool from `task` (subagent dispatch). Rendered by the PRODUCTION renderer (renderTodo) on a synthetic todo_write ActiveToolCall. Mirrors the todo renderer: head `Todo · N tasks` (+ a `done` badge), body = the per-phase checkbox list — roman-numeral phase headers when there are multiple phases, rows colored by status (completed = ✓ strikethrough, in-progress = accent, abandoned = ✕ strikethrough, pending = dim), a `+N` note marker, and `§ notes` blocks under in-progress tasks."
			importPath="entries/features/todo (live renderTodo)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${variation}`} call={buildTodoCall(variation)} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildTodoCall(v)}
			/>
		</Demo>
	);
}

const todoDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym-ai/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps todo / todo_write -> renderTodo. A SEPARATE tool from task.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderTodo is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "todo_write",',
			"//   input:  { ops: [{ op }] },                 // the mutation ops applied",
			"//   output: { content, details: { phases, storage } },",
			'//   status: "success",',
			"// }",
			"// TodoPhase = { name, tasks: TodoTask[] }",
			"// TodoTask  = { content, status, notes?: string[] }",
			"//",
			"// Head: `Todo · N tasks` (+ a done badge once every task is completed).",
			"// Body: the per-phase checkbox list — roman-numeral phase headers when there",
			"// are multiple phases; rows colored by status (completed = check + strikethrough,",
			"// in-progress = accent, abandoned = cross + strikethrough, pending = dim); a +N",
			"// note marker, and a section-notes block under in-progress tasks.",
		].join("\n"),
	),
	examples: [
		{
			label: "Single-phase checklist",
			code: JSON.stringify(
				'// output.details.phases: [{ name: "Implementation", tasks: [{ content: "Apply the rate-limit fix", status: "completed" }, { content: "Wire the Redis store", status: "in_progress" }, { content: "Run the tests", status: "pending" }] }]',
			),
		},
		{
			label: "Multiple phases (roman-numeral headers)",
			code: JSON.stringify(
				'// phases: [{ name: "Foundation", tasks: [...] }, { name: "Auth", tasks: [...] }, { name: "Verification", tasks: [...] }]',
			),
		},
		{
			label: "Task with notes",
			code: JSON.stringify(
				'// tasks: [{ content: "Port the writer path", status: "in_progress", notes: ["Blocked on the dual-write flag", "Reuse migrateBatch() from the v1 importer"] }]',
			),
		},
		{
			label: "Empty (no todos)",
			code: JSON.stringify('// phases: [] -> head reads "No todos"'),
		},
	],
	api: [
		{
			name: "ops",
			type: "Array<{ op: string }>",
			required: true,
			description: "Mutation ops applied to the todo list this call (e.g. { op: 'init' }).",
		},
		{
			name: "output.details.phases",
			type: "TodoPhase[]",
			description: "The rendered checklist; each phase is { name, tasks }. Empty array renders 'No todos'.",
		},
		{
			name: "output.details.phases[].tasks[].status",
			type: "string",
			description: "One of completed / in_progress / pending / abandoned; drives the row color and glyph.",
		},
		{
			name: "output.details.phases[].tasks[].notes",
			type: "string[]",
			description: "Optional notes rendered as a section-notes block under in-progress tasks.",
		},
		{
			name: "output.details.storage",
			type: "string",
			description: "Where the list is persisted (e.g. 'session').",
		},
	],
};

export const todoEntries: readonly ShowcaseEntry[] = [
	{
		id: "todo-tool",
		name: "Todo",
		Component: TodoEntry,
		config: TODO_CONFIG,
		docs: todoDocs,
		demo: {
			createDriver: createTodoDemoDriver,
			sessionRef: TODO_DEMO_SESSION_REF,
			title: "todo · live conversation",
		},
	},
];

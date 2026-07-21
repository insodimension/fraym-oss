// `todo` / `todo_write` tool renderer — the agent's structured checklist.
//
// SEPARATE tool from `task` (subagent dispatch): Engine `TodoTool` (`name "todo"`,
// `label "Todo"`, "Write a structured todo list to track progress within a
// session"). Mirrors Engine's `todoToolRenderer` (`tools/todo.ts`): head `Todo` +
// `N tasks`; body = the per-phase checklist (`TodoChecklistBody`). The same
// phases drive the dock Tasks Work-plan panel (`tasksUpdated` / `DockTasksView`),
// which now renders the SAME `TodoChecklistBody` checklist so the thread tool
// card and the dock share one consistent surface.

import type { TaskPhase, TaskStatus } from "@fraym-ai/driver";
import { Badge } from "../../../elements/badge";
import { readResultContentText } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { TodoChecklistBody } from "./bodies/todo-body";

const TODO_STATUSES = new Set<TaskStatus>(["pending", "in_progress", "completed", "abandoned"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toTaskStatus(value: unknown): TaskStatus {
	return typeof value === "string" && TODO_STATUSES.has(value as TaskStatus) ? (value as TaskStatus) : "pending";
}

/** Pull `TodoToolDetails.phases` (`{ name, tasks: { content, status, notes? }[] }[]`)
 *  out of the tool output (or a bare details object), defensively. */
function readTodoPhases(output: unknown): readonly TaskPhase[] | null {
	if (!isRecord(output)) return null;
	const details = isRecord(output.details) ? output.details : output;
	const source = details.phases;
	if (!Array.isArray(source)) return null;
	const phases: TaskPhase[] = [];
	for (const raw of source) {
		if (!isRecord(raw) || typeof raw.name !== "string") continue;
		const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
		const mapped = tasks.filter(isRecord).map(task => ({
			content: typeof task.content === "string" ? task.content : "",
			status: toTaskStatus(task.status),
			notes: Array.isArray(task.notes) ? task.notes.filter((n): n is string => typeof n === "string") : undefined,
		}));
		if (mapped.length > 0) phases.push({ name: raw.name, tasks: mapped });
	}
	return phases.length > 0 ? phases : null;
}

function countTodos(phases: readonly TaskPhase[]): { total: number; done: number } {
	let total = 0;
	let done = 0;
	for (const phase of phases) {
		for (const task of phase.tasks) {
			total += 1;
			if (task.status === "completed") done += 1;
		}
	}
	return { total, done };
}

function todoStatus(status: string): ToolView["status"] {
	return status === "error" ? "error" : status === "success" ? "success" : "pending";
}

/** Render a `todo`/`todo_write` call as a TUI-faithful checklist card. */
export const renderTodo: ToolRenderer = (call): ToolView => {
	const status = todoStatus(call.status);
	const phases = readTodoPhases(call.output);
	if (!phases) {
		// No checklist to render: still running, an error, or a non-list op (`rm`/`view`
		// on an empty/lost list). Surface the tool's TEXT message, never a raw JSON dump
		// (`DataInspectorBody`) of the result/input.
		if (status === "pending") return { kind: "todo", label: "Todo", status, stat: "working", body: null };
		const message = (readResultContentText(call.output) ?? call.text)?.trim();
		if (status === "error") {
			return {
				kind: "todo",
				label: "Todo",
				status,
				stat: "failed",
				body: (
					<ToolBodySection padContent>
						<ToolBodyTerm lines={[["fail", message || "Todo update failed"]]} />
					</ToolBodySection>
				),
			};
		}
		return {
			kind: "todo",
			label: "Todo",
			status,
			stat: "done",
			body: message ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">{message}</div>
				</ToolBodySection>
			) : null,
		};
	}
	const { total, done } = countTodos(phases);
	return {
		kind: "todo",
		label: "Todo",
		badges: done > 0 ? <Badge variant="code" tone="add">{`${done} done`}</Badge> : undefined,
		status,
		stat: `${total} ${total === 1 ? "task" : "tasks"}`,
		body: <TodoChecklistBody phases={phases} />,
	};
};

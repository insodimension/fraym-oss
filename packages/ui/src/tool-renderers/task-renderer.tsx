import { Badge } from "../elements/badge";
import type { ActiveToolCall } from "../hooks/session-types";
import type { ToolCallState } from "../thread-state";
import type { ToolRenderer, ToolView } from "../registries/tool-renderer-registry";
import { stringField } from "./data";

export function TaskToolRenderer(call: ToolCallState) {
	const role = stringField(call.input, "role", "agent") ?? "subagent";
	const task = stringField(call.input, "task", "prompt") ?? "Delegated task";
	const summary =
		stringField(call.output, "summary", "output", "result") ??
		(typeof call.output === "string" ? call.output : "Waiting for the subagent…");
	const status = stringField(call.output, "status") ?? call.status;
	return (
		<div className="fraym-tool-task">
			<div className="fraym-tool-row">
				<Badge tone="accent">{role}</Badge>
				<Badge>{status}</Badge>
			</div>
			<strong>{task}</strong>
			<p>{summary}</p>
		</div>
	);
}

function taskCall(call: ActiveToolCall): ToolCallState {
	return {
		id: call.callId,
		name: call.displayName ?? call.toolName,
		input: call.input,
		output: call.output,
		status: call.status === "success" ? "succeeded" : call.status === "error" ? "failed" : "running",
	};
}

export const renderTask: ToolRenderer = call =>
	({
		kind: "task",
		label: "Task",
		status: call.status === "error" ? "error" : call.status === "success" ? "success" : "pending",
		stat: call.status === "error" ? "failed" : call.status === "success" ? "done" : "running",
		body: <TaskToolRenderer {...taskCall(call)} />,
	}) satisfies ToolView;

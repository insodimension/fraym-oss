import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { toolStatusForCall } from "./renderer-utils";

function formatedTimestamp(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString();
	} catch {
		return iso;
	}
}

export const renderCheckpoint: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const goal = readStringField(call.input, "goal")?.trim() || "?";
	const details = readField(call.output, "details") as Record<string, unknown> | undefined;
	const startedAt = readStringField(details, "start") ?? readStringField(details, "startedAt");
	const errorText = readResultContentText(call.output) ?? "Checkpoint failed";
	const status = toolStatusForCall(call.status);

	const badges: ReactNode[] = [
		<Badge key="goal" variant="code" tone="accent">
			{goal.length > 40 ? `${goal.slice(0, 40)}…` : goal}
		</Badge>,
	];

	return {
		label: "Checkpoint",
		kind: "checkpoint",
		status,
		badges,
		stat:
			call.status === "running"
				? "pending"
				: call.status === "error"
					? "failed"
					: startedAt
						? formatedTimestamp(startedAt)
						: "ok",
		body:
			call.status === "running" ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">Setting checkpoint…</div>
				</ToolBodySection>
			) : call.status === "error" ? (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["fail", errorText]]} />
				</ToolBodySection>
			) : (
				<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
					<div className="font-primary text-fr-sm text-fr-text-2 italic">“{goal}”</div>
					{startedAt ? <div className="mt-1 text-fr-text-3">{formatedTimestamp(startedAt)}</div> : null}
				</ToolBodySection>
			),
	};
};

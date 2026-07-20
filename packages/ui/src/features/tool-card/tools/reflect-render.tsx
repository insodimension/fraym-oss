import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";

export const renderReflect: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const query = readStringField(call.input, "query")?.trim();
	const answer = readResultContentText(call.output) ?? "";
	const errorText = answer || "Reflect failed";
	const status = call.status === "error" ? "error" : call.status === "running" ? "pending" : "success";

	const badges: ReactNode[] = [];
	if (query) {
		badges.push(
			<Badge key="q" variant="code" tone="accent">
				{query.length > 30 ? `${query.slice(0, 30)}…` : query}
			</Badge>,
		);
	}

	return {
		label: "Reflect",
		kind: "reflect",
		status,
		badges,
		stat: call.status === "running" ? "pending" : call.status === "error" ? "failed" : "done",
		body:
			call.status === "running" ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">Reflecting on memories…</div>
				</ToolBodySection>
			) : call.status === "error" ? (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["fail", errorText]]} />
				</ToolBodySection>
			) : answer ? (
				<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
					<div className="font-primary text-fr-sm text-fr-text-2 leading-relaxed whitespace-pre-wrap">
						{answer}
					</div>
				</ToolBodySection>
			) : (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">No reflection generated.</div>
				</ToolBodySection>
			),
	};
};

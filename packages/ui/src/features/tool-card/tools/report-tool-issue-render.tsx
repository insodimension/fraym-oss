import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";

export const renderReportToolIssue: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const tool = readStringField(call.input, "tool")?.trim();
	const report = readStringField(call.input, "report")?.trim();
	const response = readResultContentText(call.output) ?? "";
	const errorText = response || "Report failed";
	const status = call.status === "error" ? "error" : call.status === "running" ? "pending" : "success";

	const badges: ReactNode[] = [];
	if (tool) {
		badges.push(
			<Badge key="tool" variant="code" tone="accent">
				{tool.length > 30 ? `${tool.slice(0, 30)}…` : tool}
			</Badge>,
		);
	}

	return {
		label: "Report Tool Issue",
		kind: "report_tool_issue",
		status,
		badges,
		stat: call.status === "running" ? "pending" : call.status === "error" ? "failed" : "reported",
		body:
			call.status === "running" ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">Reporting issue…</div>
				</ToolBodySection>
			) : call.status === "error" ? (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["fail", errorText]]} />
				</ToolBodySection>
			) : (
				<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
					{report ? (
						<div className="font-primary text-fr-sm text-fr-text-2 leading-relaxed whitespace-pre-wrap">
							{report}
						</div>
					) : null}
					{response ? <div className="mt-1 font-primary text-fr-xs text-fr-text-3 italic">{response}</div> : null}
				</ToolBodySection>
			),
	};
};

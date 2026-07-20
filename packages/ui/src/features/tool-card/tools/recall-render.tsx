import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";

function parseFoundCount(text: string, details: Record<string, unknown> | undefined): number {
	const fromDetails = readField(details, "count");
	if (typeof fromDetails === "number") return fromDetails;
	const match = text.match(/Found (\d+) relevant/i);
	return match ? Number(match[1]) : 0;
}

export const renderRecall: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const query = readStringField(call.input, "query")?.trim();
	const details = readField(call.output, "details") as Record<string, unknown> | undefined;
	const fallbackText = readResultContentText(call.output) ?? "";
	const found = call.status === "success" ? parseFoundCount(fallbackText, details) : 0;
	const errorText = fallbackText || "Recall failed";
	const status =
		call.status === "error" ? "error" : call.status === "running" ? "pending" : found > 0 ? "success" : "warn";

	const badges: ReactNode[] = [];
	if (query) {
		badges.push(
			<Badge key="q" variant="code" tone="accent">
				{query.length > 30 ? `${query.slice(0, 30)}…` : query}
			</Badge>,
		);
	}

	return {
		label: "Recall",
		kind: "recall",
		status,
		badges,
		stat: call.status === "running" ? "pending" : call.status === "error" ? "failed" : `${found} found`,
		body:
			call.status === "running" ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">Recalling memories…</div>
				</ToolBodySection>
			) : call.status === "error" ? (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["fail", errorText]]} />
				</ToolBodySection>
			) : fallbackText ? (
				<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
					<div className="font-primary text-fr-sm text-fr-text-2 leading-relaxed whitespace-pre-wrap">
						{fallbackText}
					</div>
				</ToolBodySection>
			) : (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">No results.</div>
				</ToolBodySection>
			),
	};
};

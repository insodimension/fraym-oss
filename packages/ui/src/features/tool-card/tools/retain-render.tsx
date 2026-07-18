import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readResultContentText } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";

interface RetainItem {
	readonly content?: string | undefined;
	readonly context?: string | undefined;
}

function readRetainItems(input: unknown): RetainItem[] {
	const raw = readField(input, "items");
	if (!Array.isArray(raw)) return [];
	return raw as RetainItem[];
}

export const renderRetain: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const items = readRetainItems(call.input);
	const details = readField(call.output, "details") as Record<string, unknown> | undefined;
	const countField = readField(details, "count");
	const count = typeof countField === "number" ? countField : items.length;
	const errorText = readResultContentText(call.output) ?? "Retain failed";
	const status = call.status === "error" ? "error" : call.status === "running" ? "pending" : "success";

	const visibleItems = items.filter(item => (item.content ?? "").trim().length > 0);

	const badges: ReactNode[] = [
		<Badge key="count" variant="code" tone="accent">
			{count} stored
		</Badge>,
	];

	return {
		label: "Retain",
		kind: "retain",
		status,
		badges,
		stat: call.status === "running" ? "pending" : call.status === "error" ? "failed" : `${count}`,
		body:
			call.status === "running" ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">Storing memories…</div>
				</ToolBodySection>
			) : call.status === "error" ? (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["fail", errorText]]} />
				</ToolBodySection>
			) : visibleItems.length > 0 ? (
				<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
					{visibleItems.map((item, index) => (
						<div key={index} className="flex items-start gap-2 font-primary text-fr-sm text-fr-text-2">
							<span className="shrink-0 text-fr-text-3">•</span>
							<span className="leading-relaxed">{item.content?.trim() ?? ""}</span>
						</div>
					))}
				</ToolBodySection>
			) : (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">No items stored.</div>
				</ToolBodySection>
			),
	};
};

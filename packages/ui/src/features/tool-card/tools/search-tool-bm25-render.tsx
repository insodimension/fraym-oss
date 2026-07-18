import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import {
	asText,
	readField,
	readResultContentText,
	readStringField,
	toTermLines,
} from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { readNumberField, readStringArrayField, toolStatusForCall } from "./renderer-utils";

interface SearchToolBm25Match {
	name: string;
	label: string;
	description: string;
	server_name?: string | undefined;
	mcp_tool_name?: string | undefined;
	schema_keys: string[];
	score: number;
}

function readMatchDetails(details: unknown): SearchToolBm25Match[] {
	const raw = readField(details, "tools");
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
		.map(m => ({
			name: readStringField(m, "name") ?? "",
			label: readStringField(m, "label") ?? "",
			description: readStringField(m, "description") ?? "",
			server_name: readStringField(m, "server_name"),
			mcp_tool_name: readStringField(m, "mcp_tool_name"),
			schema_keys: readStringArrayField(m, "schema_keys"),
			score: readNumberField(m, "score") ?? 0,
		}));
}

function formatScore(score: number): string {
	return score.toFixed(3);
}

const MATCH_BODY_MAX_HEIGHT = 300;

function searchStatus(call: ActiveToolCall): Pick<ToolView, "status" | "stat"> {
	const status = toolStatusForCall(call.status);
	const stat = call.status === "error" ? "failed" : call.status === "running" ? "running" : "done";
	return { status, stat };
}

function searchBadges(query: string, matchCount: number, totalTools: number | undefined): ReactNode[] {
	const badges: ReactNode[] = [];
	if (query) {
		badges.push(
			<Badge key="query" variant="code" tone="mute">
				{query}
			</Badge>,
		);
	}
	badges.push(
		<Badge key="count" variant="code" tone="accent">
			{matchCount === 0 ? "0 matches" : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
		</Badge>,
	);
	badges.push(
		<Badge key="total" variant="code" tone="mute">
			{totalTools ?? "?"} total
		</Badge>,
	);
	return badges;
}

function emptyBody(message: string): ReactNode {
	return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">{message}</div>;
}

function matchLines(tools: readonly SearchToolBm25Match[]): string[] {
	const lines: string[] = [];
	for (const tool of tools) {
		const labelParts: string[] = [];
		if (tool.server_name) labelParts.push(`[${tool.server_name}]`);
		labelParts.push(tool.label || tool.name);
		labelParts.push(`score ${formatScore(tool.score)}`);
		lines.push(labelParts.join(" "));
		if (tool.description) lines.push(`  ${tool.description}`);
	}
	return lines;
}

function matchSummary(activatedCount: number, activeCount: number, totalTools: number | undefined): string {
	const prefix = activatedCount > 0 ? `Activated ${activatedCount} tool${activatedCount !== 1 ? "s" : ""} - ` : "";
	return `${prefix}${activeCount} tool${activeCount !== 1 ? "s" : ""} active - ${totalTools ?? "?"} total discoverable`;
}

function matchBody({
	tools,
	activatedCount,
	activeCount,
	totalTools,
}: {
	readonly tools: readonly SearchToolBm25Match[];
	readonly activatedCount: number;
	readonly activeCount: number;
	readonly totalTools: number | undefined;
}): ReactNode {
	return (
		<div className="space-y-1">
			<div className="px-0.5 pb-1 font-secondary text-fr-2xs text-fr-text-3">
				{matchSummary(activatedCount, activeCount, totalTools)}
			</div>
			<ToolBodySection key="matches" title="Matches" padContent maxHeight={MATCH_BODY_MAX_HEIGHT}>
				<ToolBodyTerm lines={toTermLines(matchLines(tools).join("\n"))} />
			</ToolBodySection>
		</div>
	);
}

function searchBody({
	call,
	details,
	isError,
	query,
	tools,
	totalTools,
}: {
	readonly call: ActiveToolCall;
	readonly details: unknown;
	readonly isError: boolean;
	readonly query: string;
	readonly tools: readonly SearchToolBm25Match[];
	readonly totalTools: number | undefined;
}): ReactNode {
	if (isError) {
		const text = readResultContentText(call.output) ?? asText(call.output) ?? "request failed";
		return <EditErrorBody message={text} />;
	}
	if (totalTools === 0) return emptyBody("No discoverable tools are currently loaded.");
	if (tools.length === 0) return emptyBody(`No matching tools found for "${query}".`);

	const activatedTools = readField(details, "activated_tools");
	const activeSelectedTools = readField(details, "active_selected_tools");
	return matchBody({
		tools,
		activatedCount: Array.isArray(activatedTools) ? activatedTools.length : 0,
		activeCount: Array.isArray(activeSelectedTools) ? activeSelectedTools.length : 0,
		totalTools,
	});
}

const renderSearchToolBm25: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readField(call.output, "details") as unknown;
	const isError = readField(call.output, "isError") === true;
	const query = readStringField(call.input, "query") ?? readStringField(details, "query") ?? "";
	const tools = readMatchDetails(details);
	const totalTools = readNumberField(details, "total_tools");

	return {
		kind: "skill",
		label: "Tool Discovery",
		badges: searchBadges(query, tools.length, totalTools),
		bodyVariant: totalTools === 0 || tools.length === 0 || isError ? "term" : undefined,
		...searchStatus(call),
		body: searchBody({ call, details, isError, query, tools, totalTools }),
	};
};

export { renderSearchToolBm25 };

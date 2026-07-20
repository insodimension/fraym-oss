import { Fragment, type ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { Icon } from "../../../icons";
import {
	asText,
	readField,
	readResultContentText,
	readStringField,
	toTermLines,
} from "../../../registries/default-renderer-utils";
import type { ToolRendererMap, ToolView } from "../../../registries/tool-renderer-registry";
import { DataInspectorBody } from "../../data-inspector";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { ToolArgsPreview } from "./bodies/tool-args-preview";
import { UNREAL_OFFICIAL_ICONS, type UnrealCategory } from "./unreal-icons";

export const UNREAL_MCP_TOOL_NAMES = {
	callTool: "mcp__unreal_mcp_call_tool",
	listToolsets: "mcp__unreal_mcp_list_toolsets",
	describeToolset: "mcp__unreal_mcp_describe_toolset",
} as const;

// MCP toolset name -> official Unreal category (keyed into UNREAL_OFFICIAL_ICONS).
// Matched by case-insensitive substring against the wire toolset_name.
const TOOLSET_CATEGORIES: readonly (readonly [readonly string[], UnrealCategory])[] = [
	[["blueprint"], "blueprint"],
	[["actor"], "actor"],
	[["asset", "content", "data"], "asset"],
	[["material"], "material"],
	[["mesh", "geometry", "static"], "mesh"],
	[["anim", "rig", "skeleton"], "animation"],
	[["niagara", "vfx", "particle"], "niagara"],
	[["sequencer", "cinematic", "movie", "sequence"], "sequencer"],
	[["umg", "widget", "slate"], "umg"],
	[["test", "automation"], "test"],
	[["programmatic", "python", "script"], "python"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Match an MCP toolset name to an official Unreal category, or null when none
 *  applies. Tolerates any runtime value (MCP input is untyped wire data). */
export function unrealCategoryForToolset(toolsetName: unknown): UnrealCategory | null {
	const normalized = typeof toolsetName === "string" ? toolsetName.toLowerCase() : "";
	if (!normalized) return null;
	return TOOLSET_CATEGORIES.find(([terms]) => terms.some(term => normalized.includes(term)))?.[1] ?? null;
}

/** Head icon for a matched category: the official Unreal asset icon (grayscale,
 *  dark-theme optimized). Unmatched -> the neutral house toolset glyph. */
function categoryIcon(category: UnrealCategory | null): ReactNode {
	if (category)
		return (
			<img src={UNREAL_OFFICIAL_ICONS[category]} alt="" aria-hidden width={15} height={15} className="shrink-0" />
		);
	return <Icon name="grid" size={15} className="text-fr-add" />;
}

function compactText(value: unknown): string {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function contentText(call: ActiveToolCall): string {
	return (
		readResultContentText(call.output) ??
		call.text ??
		(typeof call.output === "string" ? call.output : (asText(call.output) ?? ""))
	);
}

function parseJson(value: unknown): unknown {
	if (typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

/** Prefer structured result details; tolerate raw and JSON-text MCP output. */
function structuredOutput(call: ActiveToolCall): unknown {
	const details = readField(call.output, "details");
	if (details !== undefined) return parseJson(details);
	if (Array.isArray(call.output)) return call.output;
	if (isRecord(call.output) && !("content" in call.output)) return call.output;
	return parseJson(contentText(call));
}

function recordRows(value: unknown): readonly Record<string, unknown>[] | undefined {
	if (Array.isArray(value)) return value.every(isRecord) ? value : undefined;
	if (!isRecord(value)) return undefined;
	const nestedRows = Object.values(value).find(Array.isArray);
	return Array.isArray(nestedRows) && nestedRows.every(isRecord) ? nestedRows : undefined;
}

function plainBody(call: ActiveToolCall, empty = "Done."): ReactNode {
	const text = contentText(call);
	return (
		<ToolBodySection padContent>
			{text ? (
				<ToolBodyTerm lines={toTermLines(text)} />
			) : (
				<div className="font-primary text-fr-sm text-fr-text-3 italic">{empty}</div>
			)}
		</ToolBodySection>
	);
}

function pendingBody(input: unknown, argumentsOnly = false): ReactNode {
	const args = isRecord(input) && argumentsOnly && "arguments" in input ? { arguments: input.arguments } : input;
	return (
		<ToolBodySection padContent>
			<ToolArgsPreview args={args} maxValueLength={96} />
		</ToolBodySection>
	);
}

function errorBody(call: ActiveToolCall): ReactNode {
	const text = contentText(call) || "Unreal MCP tool failed.";
	return (
		<ToolBodySection padContent>
			<ToolBodyTerm lines={[["fail", text]]} />
		</ToolBodySection>
	);
}

function statusFor(call: ActiveToolCall): ToolStatus {
	if (call.status === "running") return "pending";
	if (call.status === "error" || readField(call.output, "isError") === true) return "error";
	return "success";
}

function statFor(status: ToolStatus): string | undefined {
	if (status === "pending") return "running…";
	if (status === "error") return "failed";
	return undefined;
}

function toolsetBadge(toolsetName: string | undefined): ReactNode | undefined {
	return toolsetName ? (
		<Badge variant="code" tone="accent">
			{toolsetName}
		</Badge>
	) : undefined;
}

function renderTableBody(rows: readonly Record<string, unknown>[]): ReactNode {
	if (rows.length === 0) return <div className="font-primary text-fr-sm text-fr-text-3 italic">No toolsets.</div>;
	const columns = Object.keys(rows[0] ?? {});
	if (columns.length === 0) return <DataInspectorBody value={rows} />;
	return (
		<div className="flex flex-col gap-1.5">
			{rows.map((row, index) => (
				<div key={index} className="rounded-[10px] border border-fr-border-soft bg-fr-surface-2 p-2.5">
					<div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1">
						{columns.map(column => (
							<Fragment key={column}>
								<span className="text-fr-xs text-fr-text-3">{column}</span>
								<span className="min-w-0 fr-overflow text-fr-xs text-fr-text">{compactText(row[column])}</span>
							</Fragment>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function renderCallTool(call: ActiveToolCall): ToolView {
	const input = isRecord(call.input) ? call.input : undefined;
	const toolsetName = readStringField(input, "toolset_name");
	const toolName = readStringField(input, "tool_name") ?? "Call tool";
	const status = statusFor(call);
	const value = structuredOutput(call);
	return {
		label: toolName,
		headIcon: categoryIcon(unrealCategoryForToolset(toolsetName)),
		badges: toolsetBadge(toolsetName),
		kind: "mcp",
		status,
		stat: statFor(status),
		body:
			status === "pending" ? (
				pendingBody(input, true)
			) : status === "error" ? (
				errorBody(call)
			) : value !== undefined ? (
				<DataInspectorBody value={value} />
			) : (
				plainBody(call)
			),
	};
}

function renderListToolsets(call: ActiveToolCall): ToolView {
	const status = statusFor(call);
	const value = structuredOutput(call);
	const rows = recordRows(value);
	return {
		label: "List toolsets",
		headIcon: categoryIcon(null),
		kind: "mcp",
		status,
		stat:
			status === "success" && rows
				? `${rows.length} ${rows.length === 1 ? "toolset" : "toolsets"}`
				: statFor(status),
		body:
			status === "pending" ? (
				pendingBody(call.input)
			) : status === "error" ? (
				errorBody(call)
			) : rows ? (
				<ToolBodySection padContent>{renderTableBody(rows)}</ToolBodySection>
			) : (
				plainBody(call)
			),
	};
}

function renderDescribeToolset(call: ActiveToolCall): ToolView {
	const input = isRecord(call.input) ? call.input : undefined;
	const toolsetName = readStringField(input, "toolset_name");
	const status = statusFor(call);
	const value = structuredOutput(call);
	return {
		label: "Describe toolset",
		headIcon: categoryIcon(unrealCategoryForToolset(toolsetName)),
		badges: toolsetBadge(toolsetName),
		kind: "mcp",
		status,
		stat: statFor(status),
		body:
			status === "pending" ? (
				pendingBody(input)
			) : status === "error" ? (
				errorBody(call)
			) : value !== undefined ? (
				<DataInspectorBody value={value} />
			) : (
				plainBody(call)
			),
	};
}

/** Exact MCP wire names only; the registry handles exact lookup before normalized fallback. */
export const UNREAL_TOOL_RENDERERS: ToolRendererMap = Object.freeze({
	[UNREAL_MCP_TOOL_NAMES.callTool]: renderCallTool,
	[UNREAL_MCP_TOOL_NAMES.listToolsets]: renderListToolsets,
	[UNREAL_MCP_TOOL_NAMES.describeToolset]: renderDescribeToolset,
});

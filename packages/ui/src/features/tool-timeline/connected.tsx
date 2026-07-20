import { useMemo } from "react";
import { useToolStream } from "../../hooks/use-session";
import type { ToolTimelineStatus } from "../surface-kit";
import { toolKindForName, useToolDisplaySettings } from "../tool-card";
import { ToolTimeline, type ToolTimelineItem, type ToolTimelineSettings } from "./tool-timeline";

const PREVIEW_MAX_LENGTH = 120;

function truncatePreview(text: string): string {
	return text.length > PREVIEW_MAX_LENGTH ? `${text.slice(0, PREVIEW_MAX_LENGTH - 3)}...` : text;
}

function stringifyPreview(value: unknown): string {
	try {
		return truncatePreview(JSON.stringify(value));
	} catch {
		return Object.prototype.toString.call(value);
	}
}

const PRIMITIVE_PREVIEWERS: Partial<Record<string, (value: unknown) => string>> = {
	boolean: value => String(value),
	number: value => String(value),
	string: value => value as string,
};

function primitivePreview(value: unknown): string | undefined {
	return PRIMITIVE_PREVIEWERS[typeof value]?.(value);
}

function previewValue(value: unknown): string {
	if (value == null) return "";
	return primitivePreview(value) ?? stringifyPreview(value);
}

function objectPreviewEntries(input: Record<string, unknown>): readonly (readonly [string, string])[] | undefined {
	const entries = Object.entries(input).slice(0, 6);
	return entries.length > 0 ? entries.map(([key, value]) => [key, previewValue(value)] as const) : undefined;
}

function previewArgs(input: unknown): readonly (readonly [string, string])[] | undefined {
	if (input == null) return undefined;
	if (typeof input === "object" && !Array.isArray(input))
		return objectPreviewEntries(input as Record<string, unknown>);
	return [["input", previewValue(input)]];
}

const TOOL_STATUS: Record<"running" | "success" | "error", ToolTimelineStatus> = {
	error: "failed",
	running: "running",
	success: "success",
};

function toolStatus(status: "running" | "success" | "error"): ToolTimelineStatus {
	return TOOL_STATUS[status];
}

export interface ConnectedToolTimelineProps {
	readonly settings?: ToolTimelineSettings;
	readonly className?: string;
}

export function ConnectedToolTimeline({ settings, className }: ConnectedToolTimelineProps) {
	const activeTools = useToolStream();
	const toolDisplaySettings = useToolDisplaySettings();
	const tools = useMemo<ToolTimelineItem[]>(
		() =>
			activeTools.map(tool => ({
				id: tool.callId,
				kind: toolKindForName(tool.toolName),
				title: <>{tool.toolName}</>,
				stat:
					tool.progress != null
						? `${Math.round(tool.progress * 100)}%`
						: tool.status === "running"
							? "running"
							: tool.status,
				status: toolStatus(tool.status),
				args: previewArgs(tool.input),
				output: tool.text ? ([["plain", tool.text]] as const) : undefined,
			})),
		[activeTools],
	);
	const mergedSettings = useMemo<ToolTimelineSettings>(
		() => ({ ...settings, defaultOpen: settings?.defaultOpen ?? toolDisplaySettings.defaultOpen }),
		[settings, toolDisplaySettings.defaultOpen],
	);

	return <ToolTimeline tools={tools} settings={mergedSettings} className={className} />;
}

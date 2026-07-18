import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField } from "../../../registries/default-renderer-utils";
import type { ToolStatus } from "../tool-card";

export function readNumberField(value: unknown, key: string): number | undefined {
	const field = readField(value, key);
	return typeof field === "number" ? field : undefined;
}

export function readStringArrayField(value: unknown, key: string): string[] {
	const field = readField(value, key);
	return Array.isArray(field) ? field.filter((item): item is string => typeof item === "string") : [];
}

export function toPathList(value: unknown): string[] {
	if (typeof value === "string") return [value];
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function readFirstTextResult(output: unknown): string | undefined {
	const content = readField(output, "content");
	if (!Array.isArray(content)) return undefined;
	for (const part of content) {
		if (readField(part, "type") !== "text") continue;
		const text = readField(part, "text");
		if (typeof text === "string") return text;
	}
	return undefined;
}

export function toolStatusForCall(status: ActiveToolCall["status"]): ToolStatus {
	return status === "error" ? "error" : status === "running" ? "pending" : "success";
}

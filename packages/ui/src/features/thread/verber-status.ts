import type { WorkingStatus } from "@fraym/driver";
import { useRef } from "react";
import type { ActiveToolCall, VibrMode, VibrState } from "../../hooks/session-types";

export type VerberProfileId = "default";
export type VerberPhase = "idle" | "working";
export type VerberToolKind = "tool";
export interface VerberState { readonly label: string; readonly phase: VerberPhase; }

const INTENT_FIELD = "_i";

export interface ThreadVerberInput {
	readonly profile: VerberProfileId;
	readonly isStreaming: boolean;
	readonly vibrState: VibrState;
	readonly vibrMode: VibrMode;
	readonly activeTools: readonly ActiveToolCall[];
	readonly workingStatus: WorkingStatus | null;
	readonly toolCount?: number;
	readonly toolIntent?: string | null;
}
export function resolveThreadVerber(input: ThreadVerberInput): VerberState {
	const label = input.toolIntent ?? input.workingStatus?.message ?? (input.isStreaming ? "Working" : "Ready");
	return { label, phase: input.isStreaming || input.activeTools.length > 0 ? "working" : "idle" };
}

export function readIntent(input: unknown): string | undefined {
	if (!input || typeof input !== "object") return undefined;
	const value = (input as Record<string, unknown>)[INTENT_FIELD];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function activeToolIntent(activeTools: readonly ActiveToolCall[]): string | undefined {
	for (let index = activeTools.length - 1; index >= 0; index -= 1) {
		const intent = readIntent(activeTools[index]?.input);
		if (intent) return intent;
	}
	return undefined;
}

export function useStickyToolIntent(activeTools: readonly ActiveToolCall[], isStreaming: boolean): string | undefined {
	const previous = useRef<string | undefined>(undefined);
	const intent = activeToolIntent(activeTools);
	if (intent) previous.current = intent;
	if (!isStreaming) previous.current = undefined;
	return intent ?? previous.current;
}

export function phaseForSession(streaming: boolean, _vibrState: VibrState, activeToolCount: number): VerberPhase {
	return streaming || activeToolCount > 0 ? "working" : "idle";
}

export function toolKindForVibrMode(_mode: VibrMode): VerberToolKind | undefined {
	return "tool";
}

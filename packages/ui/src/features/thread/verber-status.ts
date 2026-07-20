import type { WorkingStatus } from "@fraym/driver";
import {
	resolveVerber,
	type VerberPhase,
	type VerberProfileId,
	type VerberState,
	type VerberToolKind,
} from "@fraym/verber";
import { useRef } from "react";
import type { ActiveToolCall, VibrMode, VibrState } from "../../hooks/session-types";

/** The intent field every tool call carries (engine `INTENT_FIELD`, the TUI verb source). */
const INTENT_FIELD = "_i";

export interface ThreadVerberInput {
	readonly profile: VerberProfileId;
	readonly isStreaming: boolean;
	readonly vibrState: VibrState;
	readonly vibrMode: VibrMode;
	readonly activeTools: readonly ActiveToolCall[];
	readonly workingStatus: WorkingStatus | null;
	readonly toolCount?: number;
	/**
	 * The model's own `_i` intent for the current action — same source the TUI's
	 * working verb uses. When set it wins over the driver's reconstructed tool
	 * title (TUI parity). Usually supplied by {@link useStickyToolIntent} so it
	 * persists across the reasoning gaps between tools.
	 */
	readonly toolIntent?: string | null;
}

export function resolveThreadVerber(input: ThreadVerberInput): VerberState {
	const runningTools = input.activeTools.filter(tool => tool.status === "running");
	const activeTool = runningTools.at(-1);
	const toolIntent = input.toolIntent ?? readIntent(activeTool?.input);
	return resolveVerber({
		profile: input.profile,
		phase: phaseForSession(input.isStreaming, input.vibrState, runningTools.length),
		// Prefer the model's `_i` intent (what the TUI shows). The driver's
		// reconstructed tool title is only a fallback for actions with no intent.
		workingStatus: toolIntent ? null : input.workingStatus,
		toolIntent,
		toolKind: toolKindForVibrMode(input.vibrMode),
		toolName: activeTool?.toolName,
		tick: input.toolCount,
	});
}

/** Pull the trimmed `_i` intent out of a tool call's raw input, if present. */
export function readIntent(input: unknown): string | undefined {
	if (!input || typeof input !== "object") return undefined;
	const raw = (input as Record<string, unknown>)[INTENT_FIELD];
	if (typeof raw !== "string") return undefined;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/** The `_i` intent of the newest running tool, if any. */
export function activeToolIntent(activeTools: readonly ActiveToolCall[]): string | undefined {
	for (let i = activeTools.length - 1; i >= 0; i--) {
		const tool = activeTools[i];
		if (tool?.status !== "running") continue;
		const intent = readIntent(tool.input);
		if (intent) return intent;
	}
	return undefined;
}

/**
 * Sticky tool intent: returns the latest tool `_i` and keeps showing it through
 * the reasoning/typing gaps between tools (so the verb doesn't flicker back to
 * "Working"), exactly like the TUI loader lingers on its last message. Resets
 * when the turn stops streaming.
 */
export function useStickyToolIntent(activeTools: readonly ActiveToolCall[], isStreaming: boolean): string | undefined {
	const ref = useRef<string | undefined>(undefined);
	const current = activeToolIntent(activeTools);
	if (current) {
		ref.current = current;
	} else if (!isStreaming) {
		ref.current = undefined;
	}
	return ref.current;
}

function phaseForSession(streaming: boolean, vibrState: VibrState, activeToolCount: number): VerberPhase {
	if (!streaming) return "idle";
	if (activeToolCount > 0) return "tool";
	if (vibrState === "typing") return "typing";
	return "reasoning";
}

function toolKindForVibrMode(mode: VibrMode): VerberToolKind | undefined {
	if (
		mode === "search" ||
		mode === "read" ||
		mode === "run" ||
		mode === "edit" ||
		mode === "skill" ||
		mode === "mcp"
	) {
		return mode;
	}
	return undefined;
}

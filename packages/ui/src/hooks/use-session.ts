import type { ContextUsage, Goal, PlanModeState, SubagentBatch, TaskPhase, WorkingStatus } from "@fraym-ai/driver";
import { use, useMemo } from "react";
import { SessionContext, type SessionContextValue } from "./session-provider";
import type { ActiveToolCall, VibrMode, VibrState } from "./session-types";

export function useSession(): SessionContextValue {
	const ctx = use(SessionContext);
	if (!ctx) throw new Error("useSession must be used within a <SessionProvider>");
	return ctx;
}

export function useSessionOptional(): SessionContextValue | null {
	return use(SessionContext);
}

export function useWorkingStatus(): WorkingStatus | null {
	return useSession().workingStatus;
}

export function useContextUsage(): ContextUsage | null {
	return useSession().contextUsage;
}

export function useTasks(): readonly TaskPhase[] {
	return useSession().tasks;
}

export function usePlanMode(): PlanModeState | null {
	return useSession().planMode;
}

export function useGoal(): Goal | null {
	return useSession().goal;
}

export function useToolStream(): readonly ActiveToolCall[] {
	return useSession().activeTools;
}

export function useSubagentBatches(): readonly SubagentBatch[] {
	return useSession().subagentBatches;
}

export interface VibrDerived {
	readonly state: VibrState;
	readonly mode: VibrMode;
	readonly energy: number;
	readonly verb: string;
}

export function useVibr(): VibrDerived {
	const session = useSession();
	return useMemo<VibrDerived>(
		() => ({
			state: session.vibrState,
			mode: session.vibrMode,
			energy: session.energy,
			verb: session.workingStatus?.message ?? (session.isStreaming ? "Working" : ""),
		}),
		[session.vibrState, session.vibrMode, session.energy, session.workingStatus, session.isStreaming],
	);
}

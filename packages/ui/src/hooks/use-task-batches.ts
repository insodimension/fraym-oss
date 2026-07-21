// useTaskBatches — every subagent batch for the current session, from BOTH
// sources: `session.subagentBatches` (event-fed: the mock/kitchen-sink driver)
// AND batches derived on the fly from `task`/`agent` tool calls in the live
// `activeTools` + settled/hydrated `transcript` (the real engine, which carries
// the data as `TaskToolDetails` on the tool call rather than as batch events).
//
// Deriving from the transcript means reopened sessions render their swarm cards
// too, with no reducer or hydration plumbing — the tool call is the source of
// truth for that `callId`.

import type { SubagentBatch } from "@fraym-ai/driver";
import { useMemo } from "react";
import { isTaskTool, taskCallToBatch } from "./session-task-batch";
import type { ActiveToolCall, SessionTranscriptMessage } from "./session-types";
import { useSession } from "./use-session";

/** Collect `task`/`agent` tool calls, transcript order first, live `activeTools` overriding by `callId`. */
function collectTaskCalls(
	transcript: readonly SessionTranscriptMessage[],
	activeTools: readonly ActiveToolCall[],
): ActiveToolCall[] {
	const byCallId = new Map<string, ActiveToolCall>();
	for (const message of transcript) {
		for (const block of message.blocks) {
			if (block.type === "tool" && isTaskTool(block.call.toolName)) byCallId.set(block.call.callId, block.call);
		}
	}
	for (const call of activeTools) {
		if (isTaskTool(call.toolName)) byCallId.set(call.callId, call);
	}
	return [...byCallId.values()];
}

/**
 * All subagent batches for the session, deduped by `callId`. Event-fed batches
 * (`session.subagentBatches`) take precedence; any `task` call without one is
 * derived from its tool data via {@link taskCallToBatch}.
 */
export function useTaskBatches(): readonly SubagentBatch[] {
	const { subagentBatches, activeTools, transcript } = useSession();
	return useMemo(() => {
		const byCallId = new Map<string, SubagentBatch>();
		for (const call of collectTaskCalls(transcript, activeTools)) {
			const batch = taskCallToBatch(call);
			if (batch) byCallId.set(batch.callId, batch);
		}
		// Event-fed batches win — they carry incremental state the tool call may not.
		for (const batch of subagentBatches) byCallId.set(batch.callId, batch);
		return [...byCallId.values()];
	}, [subagentBatches, activeTools, transcript]);
}

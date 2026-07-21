import type { SessionSnapshot } from "@fraym-ai/driver";
import type { ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";

export function scriptedStep(event: ScriptedEvent, delayMs = 0): ScriptStep {
  return { event, delayMs };
}

export function workingStatus(message: string): ScriptedEvent {
  return { type: "workingStatus", status: { message, visible: true } };
}

export function queuedMessage(
  id: string,
  text: string,
  timestamp: string,
): ScriptedEvent {
  return {
    type: "queuedMessageStarted",
    message: {
      id,
      mode: "followUp",
      text,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

export function assistantDelta(text: string): ScriptedEvent {
  return { type: "assistantDelta", text };
}

export function toolStarted(
  callId: string,
  toolName: string,
  input: unknown,
): ScriptedEvent {
  return { type: "toolStarted", callId, toolName, input };
}

export function toolUpdated(
  callId: string,
  partialResult: unknown,
): ScriptedEvent {
  return { type: "toolUpdated", callId, partialResult };
}

export function toolFinished(
  callId: string,
  output: unknown,
  success = true,
): ScriptedEvent {
  return { type: "toolFinished", callId, success, output };
}

export function runCompleted(snapshot: SessionSnapshot): ScriptedEvent {
  return { type: "runCompleted", snapshot };
}

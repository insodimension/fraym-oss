import type { AgentEvent } from "@fraym/driver";

import type { Entry } from "./entry";

const prompts: Readonly<Record<string, string>> = {
  tokens: "Can you show me which design values this agent surface is using?",
  button: "Give me a clear action to run the next agent step.",
  "icon-button": "Add a compact action for pinning this result.",
  badge: "How should this completed tool state be labeled?",
  card: "Put this approval summary into a structured surface.",
  code: "Show the exact command I should run next.",
  "streaming-markdown": "Explain the change with markdown and a small code sample.",
  spinner: "Show me that the agent is still connecting.",
  "thinking-dots": "Let me know the agent is considering the next step.",
  skeleton: "Reserve the result layout while the agent loads it.",
  shimmer: "Show a live loading surface for the incoming artifact.",
  separator: "Separate the reasoning from the final answer.",
  "scroll-area": "Keep this longer tool trace inside a bounded region.",
  tooltip: "Add keyboard-friendly context to this compact action.",
  kbd: "Show the shortcut for opening the agent composer.",
  textarea: "Give me a place to add a follow-up instruction.",
  "message-actions": "Add the usual actions beneath the agent response.",
  "message-usage": "Show the token usage for this completed turn.",
  "streaming-thread": "Replay a complete coding-agent turn in this surface.",
};

const responses: Readonly<Record<Entry["group"], readonly string[]>> = {
  tokens: [
    "The surface is reading from the same semantic token contract as the full application. ",
    "Here are the active color, type, spacing, and shape values in context.",
  ],
  elements: [
    "I have placed the requested element directly in the response flow. ",
    "It stays interactive, responds to the live knobs, and inherits the active theme.",
  ],
  features: [
    "This fixture is entering through the typed driver contract. ",
    "The thread below accumulates deltas and tool state exactly as a real harness would.",
  ],
};

export function createEntryDockFixture(entry: Entry): readonly AgentEvent[] {
  const sessionId = `sink-dock-${entry.id}`;
  const messageId = `${sessionId}-assistant`;
  const response = responses[entry.group];

  return [
    { type: "session.start", sessionId },
    {
      type: "user.message",
      sessionId,
      messageId: `${sessionId}-user`,
      content: prompts[entry.id] ?? `Show ${entry.title} inside this agent session.`,
    },
    {
      type: "assistant.message.delta",
      sessionId,
      messageId,
      delta: response[0] ?? "",
    },
    {
      type: "assistant.message.delta",
      sessionId,
      messageId,
      delta: response[1] ?? "",
    },
    { type: "session.done", sessionId },
  ];
}

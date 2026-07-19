import { describe, expect, test } from "bun:test";
import type { AgentEvent, AgentEventStream } from "@fraym/driver";
import { createReplayingStream, messagesFromEvents, relativeAge, sessionTitleFromEvents } from "./session-store";

const SID = "s1";

const TRANSCRIPT: readonly AgentEvent[] = [
  { type: "session.start", sessionId: SID },
  { type: "user.message", sessionId: SID, messageId: "u1", content: "What is a monad?" },
  { type: "reasoning.delta", sessionId: SID, messageId: "r1", delta: "hmm" },
  { type: "assistant.message.delta", sessionId: SID, messageId: "a1", delta: "A monad " },
  { type: "assistant.message.delta", sessionId: SID, messageId: "a1", delta: "is a monoid." },
  { type: "session.done", sessionId: SID },
  { type: "user.message", sessionId: SID, messageId: "u2", content: "Shorter." },
  { type: "assistant.message.delta", sessionId: SID, messageId: "a2", delta: "Wrapper type." },
];

describe("messagesFromEvents", () => {
  test("rebuilds alternating user/assistant turns from streamed deltas", () => {
    expect(messagesFromEvents(TRANSCRIPT)).toEqual([
      { role: "user", content: "What is a monad?" },
      { role: "assistant", content: "A monad is a monoid." },
      { role: "user", content: "Shorter." },
      { role: "assistant", content: "Wrapper type." },
    ]);
  });

  test("reasoning and lifecycle events never leak into the seeded history", () => {
    const seeded = messagesFromEvents(TRANSCRIPT);
    expect(seeded.some((message) => typeof message.content === "string" && message.content.includes("hmm"))).toBe(false);
  });

  test("empty transcript yields no messages", () => {
    expect(messagesFromEvents([])).toEqual([]);
  });
});

describe("sessionTitleFromEvents", () => {
  test("uses the first user message, collapsed and trimmed", () => {
    expect(sessionTitleFromEvents(TRANSCRIPT)).toBe("What is a monad?");
  });

  test("truncates long first messages with an ellipsis", () => {
    const events: readonly AgentEvent[] = [
      { type: "user.message", sessionId: SID, messageId: "u1", content: "x".repeat(100) },
    ];
    const title = sessionTitleFromEvents(events);
    expect(title.length).toBeLessThanOrEqual(44);
    expect(title.endsWith("…")).toBe(true);
  });

  test("falls back to 'New session' without a user message", () => {
    expect(sessionTitleFromEvents([{ type: "session.start", sessionId: SID }])).toBe("New session");
  });
});

describe("createReplayingStream", () => {
  test("replays the recorded transcript before piping live events", () => {
    const holder: { fn: ((event: AgentEvent) => void) | null } = { fn: null };
    const live: AgentEventStream = {
      subscribe(listener) {
        holder.fn = listener;
        return () => {
          holder.fn = null;
        };
      },
    };
    const stream = createReplayingStream(live, TRANSCRIPT.slice(0, 2));
    const seen: AgentEvent[] = [];
    const unsubscribe = stream.subscribe((event) => seen.push(event));
    expect(seen.map((event) => event.type)).toEqual(["session.start", "user.message"]);

    holder.fn?.({ type: "session.done", sessionId: SID });
    expect(seen.at(-1)?.type).toBe("session.done");

    unsubscribe();
    expect(holder.fn).toBeNull();
  });
});

describe("relativeAge", () => {
  test("buckets seconds, minutes, hours, days", () => {
    const now = 1_000_000_000_000;
    expect(relativeAge(now - 5_000, now)).toBe("now");
    expect(relativeAge(now - 5 * 60_000, now)).toBe("5m");
    expect(relativeAge(now - 3 * 3_600_000, now)).toBe("3h");
    expect(relativeAge(now - 2 * 86_400_000, now)).toBe("2d");
  });
});

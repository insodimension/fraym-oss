import { describe, expect, test } from "bun:test";

import {
  createEventStreamSessionDriver,
  type AgentEvent,
  type AgentEventListener,
  type AgentEventStream,
  type ContextUsage,
  type SessionDriverEvent,
  type SessionSnapshot,
  type Unsubscribe,
} from "./index";

const sessionId = "usage-test";

/**
 * A hand-written `AgentEventStream` we push events into synchronously. The
 * package's other stream fixture (`createReplayDriver`) is timer-driven, which
 * cannot express "assert the snapshot between two specific events" without
 * racing the clock.
 */
function createManualStream(): {
  stream: AgentEventStream;
  emit: (event: AgentEvent) => void;
} {
  const listeners = new Set<AgentEventListener>();

  return {
    stream: {
      subscribe(listener): Unsubscribe {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    emit(event) {
      for (const listener of listeners) listener(event);
    },
  };
}

interface Harness {
  emit: (event: AgentEvent) => void;
  snapshot: () => SessionSnapshot;
  usage: () => ContextUsage | undefined;
  driverEvents: readonly SessionDriverEvent[];
  transcript: () => readonly { role: string; blocks: readonly unknown[] }[];
  stop: () => void;
}

/** Subscribes a driver to a manual stream and records what a consumer sees. */
function harness(): Harness {
  const { stream, emit } = createManualStream();
  const driver = createEventStreamSessionDriver(stream, { sessionId });
  const driverEvents: SessionDriverEvent[] = [];
  let latest: SessionSnapshot | null = null;
  let transcript: readonly { role: string; blocks: readonly unknown[] }[] = [];

  const unsubscribe = driver.subscribe(driver.sessionRef, (event) => {
    driverEvents.push(event);
    if (event.type === "sessionUpdated") latest = event.snapshot;
    if (event.type === "sessionJournalUpdated") transcript = event.transcript;
  });

  return {
    emit,
    snapshot() {
      if (latest === null) throw new Error("no snapshot was published");
      return latest;
    },
    usage() {
      return latest?.contextUsage;
    },
    driverEvents,
    transcript: () => transcript,
    stop: unsubscribe,
  };
}

describe("createEventStreamSessionDriver context.usage", () => {
  test("lands on the snapshot with a percent derived from tokens over window", () => {
    const h = harness();
    h.emit({ type: "context.usage", sessionId, tokens: 25_887, contextWindow: 128_000 });

    expect(h.usage()).toEqual({
      tokens: 25_887,
      contextWindow: 128_000,
      percent: (25_887 / 128_000) * 100,
    });
    expect(h.usage()?.percent).toBeCloseTo(20.22, 2);

    h.stop();
  });

  test("keeps percent null when the engine cannot report tokens", () => {
    const h = harness();
    h.emit({ type: "context.usage", sessionId, tokens: null, contextWindow: 128_000 });

    const usage = h.usage();
    expect(usage?.tokens).toBeNull();
    expect(usage?.contextWindow).toBe(128_000);
    // A confident 0% would render an empty ring for a context that may be full.
    expect(usage?.percent).toBeNull();

    h.stop();
  });

  test("never derives a non-finite percent from a zero or negative window", () => {
    for (const contextWindow of [0, -1]) {
      const h = harness();
      h.emit({ type: "context.usage", sessionId, tokens: 25_887, contextWindow });

      const percent = h.usage()?.percent;
      expect(percent).toBeNull();
      expect(Number.isFinite(percent ?? 0)).toBe(true);

      h.stop();
    }
  });

  test("a later usage event replaces the earlier one", () => {
    const h = harness();
    h.emit({ type: "context.usage", sessionId, tokens: 1_000, contextWindow: 128_000 });
    h.emit({ type: "context.usage", sessionId, tokens: 64_000, contextWindow: 128_000 });

    expect(h.usage()).toEqual({
      tokens: 64_000,
      contextWindow: 128_000,
      percent: 50,
    });

    h.stop();
  });

  test("a shrinking window is honoured rather than merged with the old one", () => {
    const h = harness();
    h.emit({ type: "context.usage", sessionId, tokens: 90_000, contextWindow: 200_000 });
    h.emit({ type: "context.usage", sessionId, tokens: 90_000, contextWindow: 100_000 });

    expect(h.usage()).toEqual({
      tokens: 90_000,
      contextWindow: 100_000,
      percent: 90,
    });

    h.stop();
  });

  test("a usage event mid-turn disturbs neither the in-flight message nor the status", () => {
    const h = harness();
    h.emit({ type: "session.start", sessionId });
    h.emit({
      type: "user.message",
      sessionId,
      messageId: "user-1",
      content: "How full is the window?",
    });
    h.emit({
      type: "assistant.message.delta",
      sessionId,
      messageId: "agent-1",
      delta: "Checking",
    });

    h.emit({ type: "context.usage", sessionId, tokens: 25_887, contextWindow: 128_000 });

    // The meter updated...
    expect(h.usage()?.tokens).toBe(25_887);
    // ...without ending the turn or settling the streaming agent segment.
    expect(h.snapshot().status).toBe("running");
    expect(h.transcript().some((message) => message.role === "agent")).toBe(false);
    expect(h.driverEvents.some((event) => event.type === "turnEnded")).toBe(false);
    expect(h.driverEvents.some((event) => event.type === "runCompleted")).toBe(false);

    // The interrupted segment still accumulates and settles whole.
    h.emit({
      type: "assistant.message.delta",
      sessionId,
      messageId: "agent-1",
      delta: " the window.",
    });
    h.emit({ type: "session.done", sessionId });

    const agentMessage = h.transcript().find((message) => message.role === "agent");
    expect(agentMessage?.blocks).toEqual([
      { type: "text", text: "Checking the window." },
    ]);
    expect(h.snapshot().status).toBe("idle");
    // Settling the turn must not drop the meter.
    expect(h.usage()?.tokens).toBe(25_887);

    h.stop();
  });
});

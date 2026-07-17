import { describe, expect, test } from "bun:test";

import {
  createReplayDriver,
  type AgentEvent,
} from "./index";

const events: readonly AgentEvent[] = [
  { type: "session.start", sessionId: "replay-test" },
  {
    type: "user.message",
    sessionId: "replay-test",
    messageId: "user-1",
    content: "Hello",
  },
  { type: "session.done", sessionId: "replay-test" },
];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("createReplayDriver", () => {
  test("emits recorded events in order", async () => {
    const received: string[] = [];
    const replay = createReplayDriver(events, { delay: 1 });

    await new Promise<void>((resolve) => {
      replay.subscribe((event) => {
        received.push(event.type);
        if (event.type === "session.done") {
          resolve();
        }
      });
    });

    expect(received).toEqual(["session.start", "user.message", "session.done"]);
  });

  test("applies configured per-event delays", async () => {
    const receivedAt: number[] = [];
    const startedAt = performance.now();
    const replay = createReplayDriver(events.slice(0, 2), { delays: [15, 30] });

    await new Promise<void>((resolve) => {
      replay.subscribe(() => {
        receivedAt.push(performance.now() - startedAt);
        if (receivedAt.length === 2) {
          resolve();
        }
      });
    });

    expect(receivedAt[0]).toBeGreaterThanOrEqual(10);
    expect(receivedAt[1]).toBeGreaterThanOrEqual(35);
  });

  test("stops emitting after unsubscribe", async () => {
    const received: AgentEvent[] = [];
    const replay = createReplayDriver(events, { delay: 20 });
    const unsubscribe = replay.subscribe((event) => received.push(event));

    await wait(25);
    unsubscribe();
    await wait(50);

    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe("session.start");
  });
});

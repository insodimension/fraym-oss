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

  test("pauses at an approval until a response resumes it", async () => {
    const gatedEvents: readonly AgentEvent[] = [
      { type: "session.start", sessionId: "approval-test" },
      {
        type: "approval.request",
        sessionId: "approval-test",
        approvalId: "approval-1",
        prompt: "Apply the patch?",
      },
      { type: "session.done", sessionId: "approval-test" },
    ];
    const received: AgentEvent[] = [];
    const replay = createReplayDriver(gatedEvents, { delay: 1 });
    replay.subscribe((event) => received.push(event));

    await wait(50);
    expect(received.map((event) => event.type)).toEqual([
      "session.start",
      "approval.request",
    ]);

    replay.respondToApproval({
      type: "approval.response",
      sessionId: "approval-test",
      approvalId: "approval-1",
      decision: "approved",
    });
    await wait(30);

    expect(received.map((event) => event.type)).toEqual([
      "session.start",
      "approval.request",
      "approval.response",
      "session.done",
    ]);
  });

  test("can auto-respond after a configured approval delay", async () => {
    const gatedEvents: readonly AgentEvent[] = [
      {
        type: "approval.request",
        sessionId: "auto-approval-test",
        approvalId: "approval-1",
        prompt: "Continue?",
      },
      { type: "session.done", sessionId: "auto-approval-test" },
    ];
    const received: AgentEvent[] = [];
    const startedAt = performance.now();
    let responseAt = 0;
    const replay = createReplayDriver(gatedEvents, {
      delay: 1,
      autoRespond: { decision: "approved", delay: 15 },
    });

    await new Promise<void>((resolve) => {
      replay.subscribe((event) => {
        received.push(event);
        if (event.type === "approval.response") {
          responseAt = performance.now() - startedAt;
        }
        if (event.type === "session.done") {
          resolve();
        }
      });
    });

    expect(received.map((event) => event.type)).toEqual([
      "approval.request",
      "approval.response",
      "session.done",
    ]);
    expect(responseAt).toBeGreaterThanOrEqual(12);
  });
});

import { describe, expect, test } from "bun:test";
import type { SessionDriverEvent, SessionQueuedMessage } from "@fraym/driver";
import { createReplayDriverHarness } from "./index";

function eventsOfType<Type extends SessionDriverEvent["type"]>(
  events: readonly SessionDriverEvent[],
  type: Type,
): Extract<SessionDriverEvent, { type: Type }>[] {
  return events.filter(
    (event): event is Extract<SessionDriverEvent, { type: Type }> =>
      event.type === type,
  );
}

describe("ReplayDriverHarness", () => {
  test("records replay delivery", async () => {
    const harness = createReplayDriverHarness();
    const session = await harness.driver.createSession(harness.workspace);

    await harness.driver.sendUserMessage(session.ref, {
      text: "hi",
      deliverAs: "steer",
    });

    expect(harness.deliveries()).toEqual([{ via: "steer", text: "hi" }]);
  });

  test("emits ordered journal snapshots with transcript-only messages", async () => {
    const harness = createReplayDriverHarness();
    const session = await harness.driver.createSession(harness.workspace);
    const events: SessionDriverEvent[] = [];
    const unsubscribe = harness.driver.subscribe(session.ref, (event) => {
      events.push(event);
    });

    harness.scriptAssistantReply("first answer");
    await harness.driver.sendUserMessage(session.ref, {
      text: "first question",
      deliverAs: "followUp",
    });
    harness.scriptAssistantReply("second answer");
    await harness.driver.sendUserMessage(session.ref, {
      text: "second question",
      deliverAs: "followUp",
    });
    unsubscribe();

    const journalUpdates = eventsOfType(events, "sessionJournalUpdated");
    expect(journalUpdates.map((event) => event.seq)).toEqual([1, 2]);
    for (const event of journalUpdates) {
      expect(event).toMatchObject({
        type: "sessionJournalUpdated",
        sessionRef: session.ref,
        timestamp: expect.any(String),
        customMessages: {},
      });
    }
    expect(
      journalUpdates.at(-1)?.transcript.map((message) => ({
        role: message.role,
        blocks: message.blocks,
      })),
    ).toEqual([
      {
        role: "user",
        blocks: [{ type: "text", text: "first question" }],
      },
      {
        role: "agent",
        blocks: [{ type: "text", text: "first answer" }],
      },
      {
        role: "user",
        blocks: [{ type: "text", text: "second question" }],
      },
      {
        role: "agent",
        blocks: [{ type: "text", text: "second answer" }],
      },
    ]);

    for (const event of eventsOfType(events, "runCompleted")) {
      expect(event.snapshot).not.toHaveProperty("transcript");
    }
  });

  test("publishes lifecycle and explicit configuration mutations", async () => {
    const harness = createReplayDriverHarness();
    const session = await harness.driver.createSession(harness.workspace);
    const events: SessionDriverEvent[] = [];
    const unsubscribe = harness.driver.subscribe(session.ref, (event) => {
      events.push(event);
    });

    await harness.driver.archiveSession(session.ref);
    await harness.driver.unarchiveSession(session.ref);
    await harness.driver.pinSession(session.ref);
    await harness.driver.unpinSession(session.ref);
    await harness.driver.renameSession(session.ref, "Release review");
    await harness.driver.setSessionModel(session.ref, {
      provider: "openai",
      modelId: "gpt-5.6",
    });
    await harness.driver.setSessionThinkingLevel(session.ref, "high");
    await harness.driver.setSessionApprovalMode(session.ref, "write");
    await harness.driver.setSessionEphemeral(session.ref, true);
    unsubscribe();

    const updates = eventsOfType(events, "sessionUpdated");
    expect(updates).toHaveLength(9);
    expect(updates[0]!.snapshot.archivedAt).toEqual(expect.any(String));
    expect(updates[1]!.snapshot.archivedAt).toBeUndefined();
    expect(updates[2]!.snapshot.pinnedAt).toEqual(expect.any(String));
    expect(updates[3]!.snapshot.pinnedAt).toBeUndefined();
    expect(updates[4]!.snapshot.title).toBe("Release review");
    expect(updates[5]!.snapshot.config).toEqual({
      provider: "openai",
      modelId: "gpt-5.6",
    });
    expect(updates[8]!.snapshot.config).toEqual({
      provider: "openai",
      modelId: "gpt-5.6",
      thinkingLevel: "high",
      approvalMode: "write",
      ephemeral: true,
    });
  });

  test("replaces queued messages in the publicly listed snapshot", async () => {
    const harness = createReplayDriverHarness();
    const session = await harness.driver.createSession(harness.workspace);
    const original: readonly SessionQueuedMessage[] = [
      {
        id: "queued-1",
        mode: "steer",
        text: "obsolete",
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      },
    ];
    const replacement: readonly SessionQueuedMessage[] = [
      {
        id: "queued-2",
        mode: "followUp",
        text: "continue after the current run",
        createdAt: "2026-07-19T00:01:00.000Z",
        updatedAt: "2026-07-19T00:01:00.000Z",
      },
    ];

    await harness.driver.replaceQueuedMessages(session.ref, original);
    await harness.driver.replaceQueuedMessages(session.ref, replacement);

    const snapshot = (await harness.driver.listSessions(harness.workspace)).find(
      (candidate) => candidate.ref.sessionId === session.ref.sessionId,
    );
    expect(snapshot?.queuedMessages).toEqual(replacement);
  });
});

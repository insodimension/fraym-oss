import { describe, expect, test } from "bun:test";
import type {
  EngineConfigDriver,
  SessionDriver,
  SessionDriverEvent,
  WorkspaceRef,
} from "@fraym-ai/driver";
export interface ConformanceDelivery {
  readonly via: "prompt" | "steer";
  readonly text: string;
}
export interface ConformanceConfigHarness {
  readonly config: EngineConfigDriver;
  readonly writableProbe?: { readonly path: string; readonly value: unknown };
  triggerExternalChange?(path: string, value: unknown): void | Promise<void>;
}
export interface SessionDriverConformanceHarness {
  readonly driver: SessionDriver;
  readonly workspace: WorkspaceRef;
  scriptAssistantReply?(text: string): void;
  deliveries?(): readonly ConformanceDelivery[];
  readonly configHarness?: ConformanceConfigHarness;
  dispose?(): void | Promise<void>;
}
export interface SessionDriverConformanceOptions {
  readonly name: string;
  createHarness():
    SessionDriverConformanceHarness | Promise<SessionDriverConformanceHarness>;
}
const wait = async (events: readonly SessionDriverEvent[], type: string) => {
  const limit = Date.now() + 3_000;
  while (!events.some((event) => event.type === type)) {
    if (Date.now() > limit) throw new Error(`Timed out waiting for ${type}`);
    await Bun.sleep(10);
  }
};
export function describeSessionDriverConformance(
  options: SessionDriverConformanceOptions,
): void {
  describe(`session driver conformance: ${options.name}`, () => {
    test("supports lifecycle and transcript delivery", async () => {
      const harness = await options.createHarness();
      const session = await harness.driver.createSession(harness.workspace, {
        title: "conformance",
      });
      expect(
        (await harness.driver.listSessions(harness.workspace)).some(
          (item) => item.ref.sessionId === session.ref.sessionId,
        ),
      ).toBe(true);
      const events: SessionDriverEvent[] = [];
      const unsubscribe = harness.driver.subscribe(session.ref, (event) => {
        events.push(event);
      });
      harness.scriptAssistantReply?.("reply");
      await harness.driver.sendUserMessage(session.ref, { text: "hello" });
      await wait(events, "runCompleted");
      expect(
        events.some((event) => event.type === "sessionJournalUpdated"),
      ).toBe(true);
      unsubscribe();
      await harness.driver.closeSession(session.ref);
      await harness.dispose?.();
    });
    test("stops delivery after unsubscribe", async () => {
      const harness = await options.createHarness();
      const session = await harness.driver.createSession(harness.workspace);
      const events: SessionDriverEvent[] = [];
      harness.driver.subscribe(session.ref, (event) => {
        events.push(event);
      })();
      await harness.driver.sendUserMessage(session.ref, { text: "quiet" });
      expect(events).toHaveLength(0);
      await harness.dispose?.();
    });
    test("uses the requested delivery lanes", async () => {
      const harness = await options.createHarness();
      const session = await harness.driver.createSession(harness.workspace);
      await harness.driver.sendUserMessage(session.ref, {
        text: "steer",
        deliverAs: "steer",
      });
      await harness.driver.sendUserMessage(session.ref, {
        text: "next",
        deliverAs: "followUp",
      });
      if (harness.deliveries)
        expect(harness.deliveries().slice(-2)).toEqual([
          { via: "steer", text: "steer" },
          { via: "prompt", text: "next" },
        ]);
      await harness.dispose?.();
    });
  });
}

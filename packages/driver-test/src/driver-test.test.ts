import { describe, expect, test } from "bun:test";
import {
  createReferenceConfigDriver,
  createReplayDriverHarness,
  journalMessageEntry,
} from "./index";
describe("driver test references", () => {
  test("journals deterministic messages", () =>
    expect(journalMessageEntry(2, "assistant", "ok")).toMatchObject({
      sequence: 2,
      kind: "message",
    }));
  test("records replay delivery", async () => {
    const harness = createReplayDriverHarness();
    const session = await harness.driver.createSession(harness.workspace);
    await harness.driver.sendUserMessage(session.ref, {
      text: "hi",
      deliverAs: "steer",
    });
    expect(harness.deliveries()).toEqual([{ via: "steer", text: "hi" }]);
  });
  test("reports push capability honestly", () => {
    expect(
      createReferenceConfigDriver({ withSubscriptions: false }).config
        .subscribeConfigChanges,
    ).toBeUndefined();
    expect(
      createReferenceConfigDriver().config.subscribeConfigChanges,
    ).toBeFunction();
  });
});

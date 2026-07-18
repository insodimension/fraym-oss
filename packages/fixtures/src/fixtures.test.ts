import { describe, expect, test } from "bun:test";
import {
  createFraymDemoDriver,
  FRAYM_DEMO_SESSION_REF,
  fraymDemoScript,
  genNumberedDiff,
  MEMORY_DEMO_NOTES,
  STUDIO_MOCK_ARTIFACTS,
} from "./index";
describe("fixtures", () => {
  test("keeps snapshots and refs aligned", () =>
    expect(fraymDemoScript.snapshot.ref).toEqual(FRAYM_DEMO_SESSION_REF));
  test("replays a complete authored tool turn", async () => {
    const events: string[] = [];
    const driver = createFraymDemoDriver({ speed: 0 });
    const stop = driver.subscribe(FRAYM_DEMO_SESSION_REF, (event) => {
      events.push(event.type);
    });
    await Bun.sleep(10);
    stop();
    expect(events).toEqual([
      "queuedMessageStarted",
      "workingStatus",
      "assistantDelta",
      "assistantDelta",
      "workingStatus",
      "toolStarted",
      "toolFinished",
      "workingStatus",
      "toolStarted",
      "toolFinished",
      "turnEnded",
      "runCompleted",
    ]);
  });
  test("provides deterministic synthetic builders", () => {
    expect(genNumberedDiff(3)).toContain("line 3");
    expect(MEMORY_DEMO_NOTES.length).toBeGreaterThan(0);
    expect(STUDIO_MOCK_ARTIFACTS[0]?.content).toContain("Acme Labs");
  });
});

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { foldPasteAttachment } from "./composer/composer-core";
import {
  contextBreakdownPercent,
  contextBreakdownToRows,
} from "./context-popover/context-popover";
import { partitionBlocks } from "./message/messages/message-body";
import { hostUiInstanceKey } from "./approvals/select-request-picker";
import {
  anchorCompensationTop,
  nextPinnedState,
} from "./thread/message-thread-viewport";
import { splitUserPastedText } from "./thread/thread-message";
import { resolveThreadVerber } from "./thread/verber-status";
import { WorkingTail } from "./thread/working-tail";
import { ToolMetadataRow } from "./tool-metadata";

describe("chat surface contracts", () => {
  test("round-trips neutral length-delimited paste sentinels", () => {
    const attachment = {
      id: "paste-1",
      text: "alpha\nbeta",
    };
    expect(splitUserPastedText(foldPasteAttachment(attachment))).toEqual([
      { type: "paste", text: "alpha\nbeta" },
    ]);
  });

  test("keeps a pinned viewport stable through content shrink", () => {
    expect(
      nextPinnedState({
        top: 300,
        height: 700,
        clientHeight: 200,
        lastTop: 400,
        lastHeight: 800,
        threshold: 80,
        pinned: true,
      }),
    ).toBe(true);
    expect(
      nextPinnedState({
        top: 300,
        height: 800,
        clientHeight: 200,
        lastTop: 400,
        lastHeight: 800,
        threshold: 80,
        pinned: true,
      }),
    ).toBe(false);
  });

  test("restores an unpinned reader anchor only when it remains valid", () => {
    expect(
      anchorCompensationTop({
        pinned: false,
        desiredTop: 240,
        scrollTop: 180,
        scrollHeight: 600,
        clientHeight: 300,
      }),
    ).toBe(240);
    expect(
      anchorCompensationTop({
        pinned: false,
        desiredTop: 340,
        scrollTop: 180,
        scrollHeight: 600,
        clientHeight: 300,
      }),
    ).toBeNull();
  });

  test("partitions adjacent reasoning and tool blocks into one trace", () => {
    expect(
      partitionBlocks([
        { type: "text" },
        { type: "reasoning" },
        { type: "tool" },
        { type: "text" },
      ]),
    ).toEqual([
      { kind: "prose", block: { type: "text" }, index: 0 },
      {
        kind: "trace",
        entries: [
          { block: { type: "reasoning" }, index: 1 },
          { block: { type: "tool" }, index: 2 },
        ],
      },
      { kind: "prose", block: { type: "text" }, index: 3 },
    ]);
  });

  test("derives context allocation rows and a clamped percentage", () => {
    const breakdown = {
      contextWindow: 100_000,
      usedTokens: 75_000,
      autoCompactBufferTokens: 0,
      freeTokens: 25_000,
      categories: [
        { id: "system", label: "System", tokens: 20_000 },
        { id: "tools", label: "Tools", tokens: 15_000 },
      ],
    };
    expect(contextBreakdownPercent(breakdown)).toBe(75);
    expect(contextBreakdownToRows(breakdown).map((row) => row.name)).toEqual(
      expect.arrayContaining(["System", "Tools"]),
    );
  });

  test("keeps checkbox host requests mounted across request-id refreshes", () => {
    const base = {
      requestId: "one",
      kind: "select" as const,
      title: "Choose",
      selectionMarker: "checkbox" as const,
      options: ["A", "B"],
    };
    expect(hostUiInstanceKey(base)).toBe(hostUiInstanceKey({ ...base, requestId: "two" }));
  });

  test("renders only visible tool metadata", () => {
    const html = renderToStaticMarkup(
      <ToolMetadataRow
        items={[
          { id: "path", label: "path", value: "index.ts" },
          { id: "secret", label: "secret", value: "hidden", hidden: true },
        ]}
      />,
    );
    expect(html).toContain("index.ts");
    expect(html).not.toContain("hidden");
  });
});

describe("working tail with presence chrome disabled", () => {
  // How `thread-core` decides the tail renders once `showPresence` is no longer
  // forwarded: the tail is the thread's call, not the avatar setting's.
  const tailShow = (presence: unknown, streaming: boolean, reconnecting: boolean) =>
    presence != null || streaming || reconnecting;

  test("shimmers the working verb while streaming with no presence node", () => {
    const html = renderToStaticMarkup(
      <WorkingTail
        presence={undefined}
        verb="Reading"
        streaming
        show={tailShow(undefined, true, false)}
      />,
    );
    expect(html).toContain('data-slot="working-tail"');
    expect(html).toContain("Reading...");
  });

  test("drops the shimmer when the shell hands down an empty verb", () => {
    const html = renderToStaticMarkup(
      <WorkingTail presence={undefined} verb="" streaming show={tailShow(undefined, true, false)} />,
    );
    expect(html).toContain('data-slot="working-tail"');
    expect(html).not.toContain('data-slot="shimmer"');
  });

  test("still surfaces the reconnect status with no presence node", () => {
    const html = renderToStaticMarkup(
      <WorkingTail
        presence={undefined}
        verb="Reading"
        reconnecting
        show={tailShow(undefined, false, true)}
      />,
    );
    expect(html).toContain('data-slot="working-tail-reconnecting"');
    expect(html).not.toContain("Reading...");
  });

  test("keeps presence and verb together when avatars are on", () => {
    const html = renderToStaticMarkup(
      <WorkingTail
        presence={<span data-slot="test-orb" />}
        verb="Editing"
        streaming
        show={tailShow(<span />, true, false)}
      />,
    );
    expect(html).toContain('data-slot="test-orb"');
    expect(html).toContain("Editing...");
  });
});

describe("thread verber resolution", () => {
  const idleInput = {
    profile: "tui" as const,
    isStreaming: true,
    vibrState: "thinking" as const,
    vibrMode: "" as const,
    activeTools: [],
    workingStatus: null,
  };
  const running = (toolName: string) => ({
    callId: "call-1",
    toolName,
    status: "running" as const,
  });

  test.each([
    ["read_file", "Reading"],
    ["apply_patch", "Editing"],
    ["grep_search", "Searching"],
  ])("derives the action verb from a running %s call", (toolName, expected) => {
    const state = resolveThreadVerber({ ...idleInput, activeTools: [running(toolName)] });
    expect(state).toMatchObject({ text: expected, visible: true, phase: "tool", source: "tool" });
  });

  test("prefers the model's own intent over the tool name", () => {
    const state = resolveThreadVerber({
      ...idleInput,
      activeTools: [{ ...running("read_file"), input: { _i: "Checking the migration." } }],
    });
    expect(state).toMatchObject({ text: "Checking the migration", source: "tool-intent" });
  });

  test("never yields an empty verb while streaming with no running tool", () => {
    const state = resolveThreadVerber(idleInput);
    expect(state.visible).toBe(true);
    expect(state.text.length).toBeGreaterThan(0);
  });

  test("hides the verb once the turn stops streaming", () => {
    expect(resolveThreadVerber({ ...idleInput, isStreaming: false })).toMatchObject({
      visible: false,
      phase: "idle",
    });
  });
});

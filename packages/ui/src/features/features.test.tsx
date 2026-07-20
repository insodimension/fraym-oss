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
  scrollViewportToBottom,
} from "./thread/message-thread-viewport";
import { splitUserPastedText } from "./thread/thread-message";
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

  test("never forwards a scrolling implementation value as an effect cleanup", () => {
    let options: ScrollToOptions | undefined;
    const viewport = {
      scrollHeight: 640,
      scrollTo(next: ScrollToOptions) {
        options = next;
        return { animation: true } as never;
      },
    };

    expect(scrollViewportToBottom(viewport, "auto")).toBeUndefined();
    expect(options).toEqual({ top: 640, behavior: "auto" });
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

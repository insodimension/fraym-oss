import { describe, expect, test } from "bun:test";

import { parseStreamingMarkdown } from "./StreamingMarkdown";

describe("parseStreamingMarkdown", () => {
  test("keeps an unfinished code fence as a stable code block", () => {
    expect(parseStreamingMarkdown("Working on it.\n\n```ts\nconst status =")).toEqual([
      { kind: "text", content: "Working on it.\n\n" },
      {
        kind: "code",
        language: "ts",
        code: "const status =",
        complete: false,
      },
    ]);
  });
});

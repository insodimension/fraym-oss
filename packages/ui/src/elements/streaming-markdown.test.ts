import { describe, expect, test } from "bun:test";

import { parseSessionHref } from "./static-markdown-lite";

describe("parseSessionHref", () => {
	test("recognizes session links", () => {
		expect(parseSessionHref("session://workspace/session-1")).toEqual({
			workspaceId: "workspace",
			sessionId: "session-1",
		});
	});
});

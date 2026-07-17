import { describe, expect, test } from "bun:test";

import {
  filterSlashCommands,
  getComposerKeyAction,
  slashQuery,
  type SlashCommand,
} from "./composer-state";

const commands: readonly SlashCommand[] = [
  { name: "clear", label: "Clear session", description: "Reset the transcript", group: "Session" },
  { name: "theme", label: "Change theme", description: "Switch appearance", group: "View" },
  { name: "replay", label: "Replay fixture", description: "Run the session again", group: "Session" },
];

describe("composer key handling", () => {
  test("submits on Enter and preserves Shift+Enter for newlines", () => {
    expect(getComposerKeyAction({ key: "Enter", shiftKey: false, menuOpen: false })).toBe("submit");
    expect(getComposerKeyAction({ key: "Enter", shiftKey: true, menuOpen: false })).toBe("newline");
  });

  test("routes navigation keys to an open slash menu", () => {
    expect(getComposerKeyAction({ key: "ArrowDown", shiftKey: false, menuOpen: true })).toBe("menu-next");
    expect(getComposerKeyAction({ key: "ArrowUp", shiftKey: false, menuOpen: true })).toBe("menu-previous");
    expect(getComposerKeyAction({ key: "Enter", shiftKey: false, menuOpen: true })).toBe("menu-select");
    expect(getComposerKeyAction({ key: "Escape", shiftKey: false, menuOpen: true })).toBe("menu-close");
  });
});

describe("slash command filtering", () => {
  test("opens only for a slash at the beginning of a single-line value", () => {
    expect(slashQuery("/re")).toBe("re");
    expect(slashQuery("please /re")).toBeNull();
    expect(slashQuery("/re\nnext")).toBeNull();
  });

  test("filters by command metadata and keeps the seed order", () => {
    expect(filterSlashCommands(commands, "/").map((command) => command.name)).toEqual(["clear", "theme", "replay"]);
    expect(filterSlashCommands(commands, "/re").map((command) => command.name)).toEqual(["replay"]);
    expect(filterSlashCommands(commands, "/view").map((command) => command.name)).toEqual(["theme"]);
    expect(filterSlashCommands(commands, "hello")).toEqual([]);
  });
});

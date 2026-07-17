export interface SlashCommand {
  name: string;
  label: string;
  description: string;
  group: string;
  icon?: string;
}

export type ComposerKeyAction =
  | "none"
  | "submit"
  | "newline"
  | "menu-next"
  | "menu-previous"
  | "menu-select"
  | "menu-close";

export interface ComposerKeyInput {
  key: string;
  shiftKey: boolean;
  menuOpen: boolean;
}

export function getComposerKeyAction({
  key,
  menuOpen,
  shiftKey,
}: ComposerKeyInput): ComposerKeyAction {
  if (menuOpen) {
    if (key === "ArrowDown") return "menu-next";
    if (key === "ArrowUp") return "menu-previous";
    if (key === "Escape") return "menu-close";
    if (key === "Enter" && !shiftKey) return "menu-select";
  }

  if (key === "Enter") return shiftKey ? "newline" : "submit";
  return "none";
}

export function slashQuery(value: string): string | null {
  if (!value.startsWith("/") || value.includes("\n")) return null;
  return value.slice(1).trimStart().toLowerCase();
}

export function filterSlashCommands(
  commands: readonly SlashCommand[],
  value: string,
): readonly SlashCommand[] {
  const query = slashQuery(value);
  if (query === null) return [];
  if (query.length === 0) return commands;

  const directMatches = commands.filter((command) =>
    `${command.name} ${command.label}`.toLowerCase().includes(query),
  );
  if (directMatches.length > 0) return directMatches;

  return commands.filter((command) =>
    `${command.description} ${command.group}`.toLowerCase().includes(query),
  );
}

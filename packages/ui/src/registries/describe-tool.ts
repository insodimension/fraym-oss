export type ToolKindId = "read" | "search" | "edit" | "run" | "skill" | "mcp" | "web" | "todo" | "realm" | "tool";
export interface ToolDescriptor { readonly id: string; readonly kind: ToolKindId; readonly verb: string; readonly target?: string; readonly groupKey: string; readonly groupLabel: string }

const kindNames: Record<string, ToolKindId> = {
  read: "read", cat: "read", open: "read", view: "read", glob: "search", grep: "search", search: "search", find: "search", rg: "search",
  web_search: "web", websearch: "web", webfetch: "web", browse: "web", write: "edit", edit: "edit", edit_file: "edit", str_replace: "edit",
  multiedit: "edit", multi_edit: "edit", apply_patch: "edit", bash: "run", shell: "run", command: "run", powershell: "run", run: "run", exec: "run",
  task: "skill", agent: "skill", workflow: "skill", skill: "skill", todo_write: "todo", todowrite: "todo", todo: "todo",
};
export function normalizeDescribedToolName(toolName: string) { let name = toolName.trim(); if (name.includes("/")) name = name.slice(name.lastIndexOf("/") + 1); if (name.includes("__")) name = name.slice(name.lastIndexOf("__") + 2); return name.toLowerCase(); }
function record(value: unknown): Record<string, unknown> | undefined { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function first(args: Record<string, unknown> | undefined, keys: readonly string[]) { for (const key of keys) { const value = args?.[key]; if (typeof value === "string" && value.trim()) return value.trim(); } return undefined; }
function baseName(value: string | undefined) { return value?.split(/[\\/]/).at(-1) || value; }
export function describeTool(toolName: string, input?: unknown): ToolDescriptor {
  const id = normalizeDescribedToolName(toolName); const args = record(input);
  const baseKind: ToolKindId = toolName.toLowerCase().startsWith("mcp") ? "mcp" : toolName.includes("/") ? "realm" : kindNames[id] ?? "tool";
  const target = baseKind === "read" || baseKind === "edit" ? first(args, ["path", "file", "file_path", "filePath"]) : baseKind === "run" ? first(args, ["command", "cmd", "script"]) : baseKind === "search" ? first(args, ["pattern", "query", "q", "regex"]) : baseKind === "mcp" ? toolName.split("__")[1] : undefined;
  const kind = baseKind === "read" && target?.toLowerCase().startsWith("skill://") ? "skill" : baseKind;
  const verb = kind === "read" ? "Reading files" : kind === "search" ? "Searching the codebase" : kind === "web" ? "Browsing the web" : kind === "todo" ? "Updating the plan" : kind === "edit" ? `${id === "write" ? "Creating" : "Editing"}${baseName(target) ? ` ${baseName(target)}` : " a file"}` : kind === "run" ? target ? `Running ${target.split(/\s+/).slice(0, 2).join(" ")}` : "Running a command" : kind === "mcp" ? target ? `Calling ${target}` : "Calling a tool" : kind === "skill" ? target?.toLowerCase().startsWith("skill://") ? "Loading a skill" : "Delegating to a sub-agent" : "Working";
  return { id, kind, verb, ...(target ? { target } : {}), groupKey: kind === "read" ? "read" : "", groupLabel: "Read" };
}

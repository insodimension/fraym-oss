export type ToolIconName = "file" | "folder" | "search" | "edit" | "terminal" | "list" | "bot" | "globe" | "plug" | "code" | "tool";
export interface ToolIconRule { readonly tool: string | readonly string[]; readonly icon: ToolIconName; readonly color?: string }
export interface ToolIconPolicy { readonly version: 1; readonly rules: readonly ToolIconRule[] }
export const DEFAULT_TOOL_ICON_POLICY: ToolIconPolicy = { version: 1, rules: [
  { tool: ["read", "cat", "view", "open"], icon: "file" }, { tool: ["glob", "grep", "search", "find", "rg"], icon: "search" },
  { tool: ["write", "edit", "apply_patch"], icon: "edit" }, { tool: ["bash", "shell", "command", "run", "exec"], icon: "terminal" },
  { tool: ["todo", "todo_write"], icon: "list" }, { tool: ["task", "agent", "skill"], icon: "bot" }, { tool: ["web", "browse", "web_search"], icon: "globe" },
  { tool: "mcp__*", icon: "plug" }, { tool: "*", icon: "tool" },
] };

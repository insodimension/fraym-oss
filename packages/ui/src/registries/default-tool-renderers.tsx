import { BashToolRenderer, GenericToolRenderer, LspToolRenderer, SearchToolRenderer, TaskToolRenderer, TodoToolRenderer } from "../tool-renderers/renderers";
import { describeTool } from "./describe-tool";
import { renderEdit } from "./edit-renderer";
import { renderRead } from "./read-renderer";
import type { ToolRenderer, ToolRendererMap } from "./tool-renderer-registry";
import { renderWrite } from "./write-renderer";
import { FEATURE_TOOL_RENDERERS } from "../features/tool-card/tools/feature-renderers";

function view(body: (call: Parameters<ToolRenderer>[0]) => React.ReactNode): ToolRenderer {
  return call => { const descriptor = describeTool(call.name, call.input); return { label: descriptor.groupLabel === "Read" && descriptor.kind !== "read" ? call.name : descriptor.id, badges: descriptor.target ? <code className="fraym-tool-head__target">{descriptor.target}</code> : null, status: call.status, kind: descriptor.kind, bodyVariant: descriptor.kind === "run" ? "terminal" : "default", body: body(call) }; };
}

const bash = view(call => <BashToolRenderer {...call} />);
const search = view(call => <SearchToolRenderer {...call} />);
const todo = view(call => <TodoToolRenderer {...call} />);
const task = view(call => <TaskToolRenderer {...call} />);
const lsp = view(call => <LspToolRenderer {...call} />);
const fallback = view(call => <GenericToolRenderer {...call} />);

export const DEFAULT_TOOL_RENDERERS: ToolRendererMap = Object.freeze({
  ...FEATURE_TOOL_RENDERERS,
  read: renderRead, cat: renderRead, open: renderRead, view: renderRead,
  edit: renderEdit, edit_file: renderEdit, str_replace: renderEdit, apply_patch: renderEdit,
  write: renderWrite,
  bash, shell: bash, command: bash, run: bash, exec: bash,
  search, grep: search, glob: search, find: search, rg: search,
  todo, todo_write: todo, todowrite: todo,
  task, agent: task,
  lsp,
  "*": fallback,
});

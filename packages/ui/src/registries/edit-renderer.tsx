import { EditToolRenderer } from "../tool-renderers/file-renderers";
import { toToolCallState, toToolStatus } from "../tool-renderers/call-adapter";
import { readStringField } from "./default-renderer-utils";
import type { ToolRenderer } from "./tool-renderer-types";

export const renderEdit: ToolRenderer = call => {
  const path = readStringField(call.input, "path", "file", "file_path") ?? "File";
  const diff = readStringField(call.output, "diff") ?? readStringField(call.input, "diff", "patch") ?? "";
  let added = 0; let deleted = 0;
  for (const line of diff.split("\n")) { if (line.startsWith("+") && !line.startsWith("+++")) added += 1; else if (line.startsWith("-") && !line.startsWith("---")) deleted += 1; }
  return { label: "Edit", badges: <code className="fraym-tool-head__target">{path}</code>, stat: `+${added} −${deleted}`, status: toToolStatus(call), kind: "edit", defaultOpen: call.status === "error", body: <EditToolRenderer {...toToolCallState(call)} /> };
};

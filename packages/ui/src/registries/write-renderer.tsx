import { WriteToolRenderer } from "../tool-renderers/renderers";
import { readField, readResultContentText, readStringField } from "./default-renderer-utils";
import type { ToolRenderer } from "./tool-renderer-registry";

export const renderWrite: ToolRenderer = call => {
  const path = readStringField(call.input, "path", "file", "file_path") ?? "File";
  const content = readStringField(call.input, "content", "text") ?? readResultContentText(call.output) ?? "";
  const diagnostics = readField(call.output, "diagnostics");
  const count = Array.isArray(diagnostics) ? diagnostics.length : 0;
  return { label: "Write", badges: <code className="fraym-tool-head__target">{path}</code>, stat: count ? `${count} diagnostics` : `${content.split("\n").length} lines`, status: call.status, kind: "edit", bodyVariant: "code", body: <WriteToolRenderer {...call} /> };
};

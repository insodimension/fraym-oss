import { ReadToolRenderer } from "../tool-renderers/file-renderers";
import { toToolCallState, toToolStatus } from "../tool-renderers/call-adapter";
import { readResultContentText, readStringField } from "./default-renderer-utils";
import type { ToolRenderer } from "./tool-renderer-types";

export const renderRead: ToolRenderer = call => {
  const path = readStringField(call.input, "path", "file", "file_path") ?? "File";
  const text = readResultContentText(call.output) ?? "";
  const lineCount = text ? text.split("\n").length : undefined;
  return { label: "Read", badges: <code className="fraym-tool-head__target">{path}</code>, ...(lineCount ? { stat: `${lineCount} lines` } : {}), status: toToolStatus(call), kind: "read", body: <ReadToolRenderer {...toToolCallState(call)} /> };
};

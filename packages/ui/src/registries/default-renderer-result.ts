import { asText } from "./default-renderer-as-text";
import { readField } from "./default-renderer-fields";
export function readResultContentText(output: unknown): string | undefined {
  const content = readField(output, "content");
  if (Array.isArray(content)) return content.flatMap(item => { const text = asText(readField(item, "text")) ?? asText(item); return text ? [text] : []; }).join("\n") || undefined;
  return asText(content) ?? asText(readField(output, "text")) ?? asText(readField(output, "output")) ?? asText(output);
}

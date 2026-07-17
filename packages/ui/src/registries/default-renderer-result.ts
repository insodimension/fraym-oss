import { asText } from "./default-renderer-as-text";
import { readField } from "./default-renderer-fields";
export function readResultContentText(output: unknown): string | undefined {
  const content = readField(output, "content");
  if (Array.isArray(content)) return content.map(item => asText(readField(item, "text")) ?? asText(item)).filter(Boolean).join("\n") || undefined;
  return asText(content) ?? asText(readField(output, "text")) ?? asText(readField(output, "output")) ?? asText(output);
}

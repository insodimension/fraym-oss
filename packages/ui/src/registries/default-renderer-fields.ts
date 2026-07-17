export function readField(value: unknown, key: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined;
}
export function readStringField(value: unknown, ...keys: string[]): string | undefined {
  for (const key of keys) { const field = readField(value, key); if (typeof field === "string" && field.trim()) return field; }
  return undefined;
}

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringField(value: unknown, ...keys: readonly string[]): string | undefined {
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string") return field;
  }
  return undefined;
}

export function numberField(value: unknown, ...keys: readonly string[]): number | undefined {
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "number") return field;
  }
  return undefined;
}

export function arrayField(value: unknown, ...keys: readonly string[]): readonly unknown[] {
  if (!isRecord(value)) return [];
  for (const key of keys) {
    const field = value[key];
    if (Array.isArray(field)) return field;
  }
  return [];
}

export function prettyValue(value: unknown): string {
  if (value === undefined) return "Not available";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

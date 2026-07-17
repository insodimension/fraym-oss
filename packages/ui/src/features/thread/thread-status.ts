export interface ThreadVerbInput { readonly streaming: boolean; readonly reconnecting?: boolean; readonly activeIntent?: string; readonly fallback?: string }
export function resolveThreadVerb(input: ThreadVerbInput): string { return input.reconnecting ? "Reconnecting" : input.activeIntent ?? input.fallback ?? (input.streaming ? "Working" : "Ready"); }
export function readIntent(input: unknown): string | undefined { if (!input || typeof input !== "object") return undefined; const value = (input as Record<string, unknown>).intent; return typeof value === "string" ? value : undefined; }
export function activeToolIntent(activeTools: readonly { readonly input?: unknown }[]): string | undefined { return activeTools.map((tool) => readIntent(tool.input)).find(Boolean); }

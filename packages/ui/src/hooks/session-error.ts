/**
 * Human-readable text for a caught session/driver error.
 *
 * An error thrown INSIDE the per-session ACP sidecar is marshaled back over
 * JSON-RPC by the ACP SDK as a generic `Error("Internal error")` with the REAL
 * message stashed in `error.data.details` (e.g. a rejected `session/prompt` on a
 * terminal turn failure — `Codex error event: The usage limit has been reached
 * (code=usage_limit_reached)`). Surfacing `error.message` alone shows the useless
 * "Internal error" banner. Prefer the non-empty `data.details`, then the Error
 * message, then a string coercion. Mirrors driver-acp's own `errorText`.
 */
export function errorMessageText(error: unknown): string {
	const details = (error as { data?: { details?: unknown } } | null)?.data?.details;
	if (typeof details === "string" && details.trim()) return details;
	if (error instanceof Error) return error.message;
	return String(error);
}

import type { SessionDriver, SessionRef } from "@fraym/driver";
import { useMemo } from "react";
import type { FileCompletionSource } from "../features/composer";
import { useSessionOptional } from "./use-session";

/**
 * Build the `@`-mention file-search source the {@link Composer} calls when the user
 * types `@`. It round-trips through the same `queryCompletions` lane the slash menu
 * uses (`_fraym/session/completions`), which the engine answers with native fuzzy
 * file search rooted at the session cwd — full TUI `@` parity, no extra protocol.
 *
 * Returns `undefined` (mentions disabled) until both a driver and a live session
 * ref resolve. Explicit `null` args opt out of the session-context fallback, exactly
 * like {@link useSlashCommands}.
 */
export function useFileCompletions(
	driverArg?: SessionDriver | null,
	sessionRefArg?: SessionRef | null,
): FileCompletionSource | undefined {
	const session = useSessionOptional();
	const driver = driverArg !== undefined ? driverArg : (session?.driver ?? null);
	const sessionRef = sessionRefArg !== undefined ? sessionRefArg : (session?.sessionRef ?? null);

	return useMemo<FileCompletionSource | undefined>(() => {
		if (!driver || !sessionRef) return undefined;
		return async (query, signal) => {
			// The engine keys file search off an `@`-prefixed token at the caret; a
			// synthetic `@<query>` is all it needs (surrounding text is irrelevant to
			// fuzzy file matching), so we send exactly that.
			const text = `@${query}`;
			const items = await driver.queryCompletions(sessionRef, { text, cursor: text.length });
			if (signal.aborted) return [];
			return items
				.filter(item => item.kind === "file" || item.kind === "mention")
				.map(item => ({ label: item.label, value: item.value, description: item.detail, kind: item.kind }));
		};
	}, [driver, sessionRef]);
}

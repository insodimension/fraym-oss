import type { SessionDriver, SessionRef } from "@fraym-ai/driver";
import { useMemo } from "react";
import type { ArgumentCompletionSource } from "../features/composer";
import { useSessionOptional } from "./use-session";

/**
 * Build the dynamic argument-completion source the {@link Composer} calls once a slash
 * command is committed and the user types its arguments (extension/hook flags like
 * `/sidequest --mode …`). It round-trips through the same `queryCompletions` lane the
 * slash menu uses (`_fraym/session/completions`), which the engine answers with
 * `command-arg` rows — full TUI `getArgumentCompletions` parity, no extra protocol.
 *
 * Returns `undefined` (dynamic args disabled) until both a driver and a live session
 * ref resolve. Explicit `null` args opt out of the session-context fallback, exactly
 * like {@link useSlashCommands} / {@link useFileCompletions}.
 */
export function useArgumentCompletions(
	driverArg?: SessionDriver | null,
	sessionRefArg?: SessionRef | null,
): ArgumentCompletionSource | undefined {
	const session = useSessionOptional();
	const driver = driverArg !== undefined ? driverArg : (session?.driver ?? null);
	const sessionRef = sessionRefArg !== undefined ? sessionRefArg : (session?.sessionRef ?? null);

	return useMemo<ArgumentCompletionSource | undefined>(() => {
		if (!driver || !sessionRef) return undefined;
		return async (commandValue, argsPrefix, signal) => {
			// The engine keys argument completions off the committed command plus the arg
			// text before the caret; `<command> <argsPrefix>` is exactly what the TUI sends.
			// Only `command-arg` rows are dynamic args — command-name rows are dropped.
			const text = `${commandValue} ${argsPrefix}`;
			const items = await driver.queryCompletions(sessionRef, { text, cursor: text.length });
			if (signal.aborted) return [];
			return items
				.filter(item => item.kind === "command-arg")
				.map(item => ({ label: item.label, value: item.value, description: item.detail, hint: item.hint }));
		};
	}, [driver, sessionRef]);
}

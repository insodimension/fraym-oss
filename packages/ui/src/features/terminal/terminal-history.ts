export interface TerminalHistoryUpdate {
	readonly data: string;
	readonly reset: boolean;
}

/**
 * Reconcile the engine's bounded terminal-history snapshot with the snapshot
 * already consumed by xterm.
 *
 * The engine retains only the newest history window. Once that window reaches
 * its cap, a new PTY chunk shifts bytes off the front, so `next` no longer
 * starts with `previous`. The surviving suffix is still an exact prefix of the
 * next snapshot; append only the bytes after that overlap. Replaying the whole
 * bounded snapshot would reset xterm on every output chunk and duplicate a
 * full TUI frame into scrollback.
 */
export function terminalHistoryUpdate(previous: string, next: string): TerminalHistoryUpdate {
	if (next === previous) return { data: "", reset: false };
	if (next.startsWith(previous)) return { data: next.slice(previous.length), reset: false };
	if (!previous || !next) return { data: next, reset: true };

	// A short anchor avoids repeatedly comparing the full history window while
	// still disambiguating the ANSI-heavy prefixes common in terminal output.
	const anchorLength = Math.min(64, previous.length, next.length);
	const anchor = next.slice(0, anchorLength);
	let candidate = previous.indexOf(anchor, Math.max(0, previous.length - next.length));
	while (candidate !== -1) {
		const overlap = previous.length - candidate;
		if (overlap <= next.length && next.startsWith(previous.slice(candidate))) {
			return { data: next.slice(overlap), reset: false };
		}
		candidate = previous.indexOf(anchor, candidate + 1);
	}

	return { data: next, reset: true };
}

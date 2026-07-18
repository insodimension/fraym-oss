import { useEffect, useMemo, useState } from "react";

export interface LineStream {
	/** The revealed prefix (first `count` lines joined). */
	readonly text: string;
	/** Lines revealed so far. */
	readonly count: number;
	/** Total lines in the source. */
	readonly total: number;
	/** True while more lines remain. */
	readonly streaming: boolean;
}

/**
 * Reveal a multi-line string one whole line per tick — the reusable engine
 * behind every "stream a diff / file / output line-by-line as the model writes
 * it" surface (the Engine TUI behavior). Whole-line granularity keeps downstream
 * parsers (e.g. `parseNumberedDiff`, `parseUnifiedPatch`, Streamdown) parsing
 * valid input every frame.
 *
 * `nonce` re-arms the stream (a Replay button bumps it); `intervalMs` sets the
 * cadence. The first line is revealed instantly so consumers never flash empty.
 */
export function useLineStream(full: string, nonce: number, intervalMs: number): LineStream {
	const lines = useMemo(() => full.split("\n"), [full]);
	const [count, setCount] = useState(1);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `nonce` is an intentional re-arm trigger — bumping it restarts the stream; it is deliberately not read inside the effect.
	useEffect(() => {
		if (lines.length <= 1) {
			setCount(lines.length);
			return;
		}
		setCount(1); // reveal first line instantly, then tick the rest in.
		const id = setInterval(() => {
			setCount(prev => {
				const next = prev + 1;
				if (next >= lines.length) clearInterval(id);
				return Math.min(next, lines.length);
			});
		}, intervalMs);
		return () => clearInterval(id);
	}, [lines, nonce, intervalMs]);
	const text = useMemo(() => lines.slice(0, count).join("\n"), [lines, count]);
	return { text, count, total: lines.length, streaming: count < lines.length };
}

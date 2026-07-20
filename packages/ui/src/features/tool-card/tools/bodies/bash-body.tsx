// Bash-tool body surfaces — the exec-log primitive for the `bash` renderer
// (`renderBash` in ../bash-render.tsx). Reused later by eval / ssh / recipe.
//
// Two stacked pieces on the dark `.tool-body.term` surface, mirroring the TUI
// shell renderer (engine .../tools/bash.ts → createShellRenderer):
//   1. command row — a `prompt`-colored `$ cd … && NAME="v" ` prefix + the command,
//      rendered as a `ToolBodyTerm` line so it shares the EXACT grid/baseline as the
//      output (a block code element does not align next to an inline prompt).
//   2. output pane — the streamed stdout/stderr, ANSI-parsed into colored segments,
//      inside a capped scroll window that follows the tail while running (mirrors the
//      TUI's last-N-lines preview). Plus a dim `[Wall · Timeout]` row + truncation note.
// Dumb, prop-driven; all `call.output.details` derivation lives in the renderer.

// --- stats + truncation ----------------------------------------------------

export interface BashStatsRowProps {
	/** Wall time in seconds, pre-formatted (e.g. "0.42"). From `details.wallTimeMs`. */
	readonly wallSeconds?: string;
	readonly timeoutSeconds?: number;
	readonly requestedTimeoutSeconds?: number;
}

/** Dim, bracketed `[Wall: Xs · Timeout: Ns]` line below the output (TUI-faithful). */
export function BashStatsRow({ wallSeconds, timeoutSeconds, requestedTimeoutSeconds }: BashStatsRowProps) {
	const parts: string[] = [];
	if (wallSeconds != null) parts.push(`Wall: ${wallSeconds}s`);
	if (typeof timeoutSeconds === "number") {
		parts.push(
			requestedTimeoutSeconds != null && requestedTimeoutSeconds !== timeoutSeconds
				? `Timeout: ${timeoutSeconds}s (requested ${requestedTimeoutSeconds}s clamped)`
				: `Timeout: ${timeoutSeconds}s`,
		);
	}
	if (parts.length === 0) return null;
	return <span className="font-secondary text-fr-xs text-fr-text-3">[{parts.join(" · ")}]</span>;
}
/** Truncation footer: warns that output was truncated and points at the artifact spill. */
export function BashTruncationNote({ artifact }: { readonly artifact?: string }) {
	return (
		<span className="font-secondary text-fr-xs text-fr-text-3">
			⚠ output truncated{artifact ? ` · ${artifact}` : ""}
		</span>
	);
}

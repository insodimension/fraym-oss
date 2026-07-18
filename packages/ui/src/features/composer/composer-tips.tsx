import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

/**
 * Surface-agnostic tips shown beneath the composer, mirroring the Engine TUI's
 * welcome tip line (a violet "Tip" label + a dimmed body). The TUI sources its
 * tips from an embedded `tips.txt`; here they live inline so the library stays
 * free of bundler-specific text imports.
 *
 * The pool is curated for Fraym: terminal-only tricks (the `.`/`c` continue
 * shortcut, `Ctrl+D`, kitty/tmux splits, `engine stats`, keyboard chords) are
 * dropped because they live in the TUI input controller, not the engine. What
 * remains is verified to hold on every Fraym surface — engine-level behaviors
 * (the `ultrathink`/`orchestrate` keywords are processed in `AgentSession`, not
 * the editor) and the web/desktop composer's own affordances.
 */
export const COMPOSER_TIPS: readonly string[] = [
	"Type / to browse every command, skill, and prompt.",
	"Shift+Enter adds a newline; Enter sends your message.",
	"Drop the word ultrathink in your message for harder, multi-step reasoning.",
	"Say orchestrate to drive a multi-phase task with parallel subagents.",
	"Click the model name under the composer to switch models mid-session.",
	"Click the context ring to see how much of the window you have used.",
	"Click the permission chip to change what the agent is allowed to touch.",
	"Set a goal and the agent keeps working toward it across turns.",
	"Drag a pane out of the workspace to pop it into its own window.",
];

const DEFAULT_INTERVAL_MS = 16_000;

export interface ComposerTipsProps {
	/** Tip pool to rotate through. Defaults to {@link COMPOSER_TIPS}. */
	readonly tips?: readonly string[];
	/** Rotation cadence in ms. Rotation is skipped when 1 or fewer tips resolve. */
	readonly intervalMs?: number;
	readonly className?: string;
}

/**
 * One dim, rotating tip line for under the composer. The starting tip is
 * randomized per mount so different sessions open on different tips (matching the
 * TUI's stable per-instance pick), then it advances sequentially so the user
 * eventually sees the whole pool without repeats. Renders nothing for an empty
 * pool.
 */
export function ComposerTips({ tips = COMPOSER_TIPS, intervalMs = DEFAULT_INTERVAL_MS, className }: ComposerTipsProps) {
	const count = tips.length;
	// Random starting offset, chosen once per mount.
	const [start] = useState(() => (count > 0 ? Math.floor(Math.random() * count) : 0));
	const [step, setStep] = useState(0);

	useEffect(() => {
		if (count <= 1 || intervalMs <= 0) return;
		const id = setInterval(() => setStep(s => s + 1), intervalMs);
		return () => clearInterval(id);
	}, [count, intervalMs]);

	if (count === 0) return null;
	const tip = tips[(start + step) % count];

	return (
		<div
			data-slot="composer-tip"
			className={cn("select-none fr-overflow text-center text-fr-xs italic text-fr-text-3", className)}
		>
			<span className="font-medium text-fr-accent">Tip:</span> {tip}
		</div>
	);
}

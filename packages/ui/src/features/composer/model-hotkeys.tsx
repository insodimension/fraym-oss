"use client";
import { useEffect, useRef, useState } from "react";
import { useSessionOptional } from "../../hooks/use-session";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";

// TUI-parity model hotkeys for the composer (approved 2026-07-10):
//   Ctrl+P        cycle the SESSION model forward across the engine's
//                 `cycleOrder` roles (slow/default/smol by default)
//   Ctrl+Shift+P  cycle backward
//   Alt+T         cycle the session's model TEAM (Default → each
//                 modelProfiles name → back to Default)
// Feedback mirrors the TUI's segment track: a transient pill strip above the
// composer showing the role order with the landed role highlighted, or the
// team name after a swap. Optional driver capabilities degrade to a notice.

/** Transient feedback shown after a model hotkey fires. */
export type ModelHotkeyFeedback =
	| { readonly kind: "roles"; readonly order: readonly string[]; readonly role: string; readonly detail: string }
	| { readonly kind: "team"; readonly team: string | null }
	| { readonly kind: "info"; readonly detail: string };

const FEEDBACK_MS = 2000;

export function useModelHotkeys(): ModelHotkeyFeedback | null {
	const session = useSessionOptional();
	const profiles: readonly string[] = [];
	const [feedback, setFeedback] = useState<ModelHotkeyFeedback | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const driver = session?.driver ?? null;
	const sessionRef = session?.sessionRef ?? null;
	const activeTeam = session?.snapshot?.config?.activeTeam ?? null;

	useEffect(() => {
		if (!driver || !sessionRef) return;
		const show = (next: ModelHotkeyFeedback) => {
			setFeedback(next);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
		};
		const fail = (error: unknown) => {
			const message = error instanceof Error ? error.message : String(error);
			// A sidecar older than the extension methods answers with the raw
			// JSON-RPC "Internal error" / "Method not found" — translate it.
			const stale = /internal error|method not found/i.test(message);
			show({
				kind: "info",
				detail: stale ? "engine session predates model hotkeys — reload the session to enable them" : message,
			});
		};

		const onKeyDown = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			// Ctrl+P / Ctrl+Shift+P — TUI parity role cycling. In the TUI these are
			// EDITOR bindings, so they only fire with focus inside the composer —
			// which also leaves any global Ctrl+P binding intact
			// elsewhere. Capture phase + stopPropagation beats other listeners
			// when the composer owns the key (and suppresses browser print).
			const inComposer = event.target instanceof Element && event.target.closest('[data-slot="composer"]') !== null;
			if (inComposer && event.ctrlKey && !event.altKey && !event.metaKey && key === "p") {
				event.preventDefault();
				event.stopPropagation();
				if (!driver.cycleSessionRoleModel) {
					show({ kind: "info", detail: "role cycling needs a newer engine" });
					return;
				}
				driver
					.cycleSessionRoleModel(sessionRef, event.shiftKey ? "backward" : "forward")
					.then(result => {
						if (!result) show({ kind: "info", detail: "only one role model available" });
						else show({ kind: "roles", order: result.order, role: result.role, detail: result.modelId });
					})
					.catch(fail);
				return;
			}
			// Alt+T — cycle the session's model team.
			if (event.altKey && !event.ctrlKey && !event.metaKey && key === "t") {
				event.preventDefault();
				if (!driver.setSessionTeam) {
					show({ kind: "info", detail: "team switching needs a newer engine" });
					return;
				}
				const names = Object.keys(profiles ?? {}).sort();
				if (names.length === 0) {
					show({ kind: "info", detail: "no model teams configured — create one in Settings → Model" });
					return;
				}
				const cycle: readonly (string | null)[] = [null, ...names];
				const index = cycle.indexOf(activeTeam);
				const next = cycle[(Math.max(index, 0) + 1) % cycle.length] ?? null;
				driver
					.setSessionTeam(sessionRef, next)
					.then(result => show({ kind: "team", team: result.team }))
					.catch(fail);
			}
		};

		window.addEventListener("keydown", onKeyDown, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown, true);
			clearTimeout(timer.current);
		};
	}, [driver, sessionRef, activeTeam, profiles]);

	return feedback;
}

/** The transient pill strip above the composer — the TUI segment track's Fraym face. */
export function ModelHotkeyToast({ feedback }: { readonly feedback: ModelHotkeyFeedback | null }) {
	if (!feedback) return null;
	return (
		<div
			role="status"
			aria-live="polite"
			className="pointer-events-none absolute -top-9 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-fr-border-soft bg-fr-surface-2/95 px-2.5 py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] backdrop-blur-sm"
		>
			{feedback.kind === "roles" && (
				<>
					{feedback.order.map(role => (
						<span
							key={role}
							className={cn(
								"rounded-full px-1.5 py-px font-secondary text-fr-2xs transition-colors",
								role === feedback.role ? "bg-fr-accent-dim font-semibold text-fr-accent" : "text-fr-text-3",
							)}
						>
							{role}
						</span>
					))}
					<span className="max-w-[220px] fr-overflow font-secondary text-fr-2xs text-fr-text-2">
						{feedback.detail}
					</span>
				</>
			)}
			{feedback.kind === "team" && (
				<>
					<Icon name="layers" size={11} className="text-fr-accent" />
					<span className="font-secondary text-fr-2xs text-fr-text-2">
						team · <span className="font-semibold text-fr-text">{feedback.team ?? "Default"}</span>
					</span>
				</>
			)}
			{feedback.kind === "info" && (
				<span className="max-w-[280px] fr-overflow font-secondary text-fr-2xs text-fr-text-2">
					{feedback.detail}
				</span>
			)}
		</div>
	);
}

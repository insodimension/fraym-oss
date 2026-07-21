// PermissionApprovalCard — the docked surface for Engine's tool-permission gate.
// Deliberately NOT the AskPicker: a permission is an approval decision, not a
// question. The card leads with what the tool wants to do (the command / edit
// target in machine mono), lists the exact paths it would touch, and renders
// the engine's options as kind-styled actions — allow = accent, reject =
// danger — so the safe/destructive split is legible at a glance.
//
// Keyboard: Enter approves (the first allow_* option), Esc rejects (cancel →
// the engine's reject path), 1–9 pick any option by position.

import type { HostUiRequest as DriverHostUiRequest, HostUiResponse, PermissionOption } from "@fraym-ai/driver";
import { useEffect, useEffectEvent } from "react";
import { Button } from "../../elements/button";
import { Kbd } from "../../elements/kbd";
import { cn } from "../../lib/cn";

export type PermissionHostUiRequest = Extract<DriverHostUiRequest, { kind: "permission" }>;

export interface PermissionApprovalCardProps {
	readonly request: PermissionHostUiRequest;
	readonly onRespond: (response: HostUiResponse) => void;
	readonly className?: string;
}

const isAllow = (option: PermissionOption) => option.kind === "allow_once" || option.kind === "allow_always";

function optionVariant(option: PermissionOption): "default" | "outline" | "ghost" | "destructive" {
	switch (option.kind) {
		case "allow_once":
			return "default";
		case "allow_always":
			return "outline";
		case "reject_once":
			return "destructive";
		case "reject_always":
			return "ghost";
	}
}

export function PermissionApprovalCard({ request, onRespond, className }: PermissionApprovalCardProps) {
	const respond = (optionId: string) => onRespond({ requestId: request.requestId, optionId });
	const cancel = () => onRespond({ requestId: request.requestId, cancelled: true });
	// Engine order preserved within each side; rejects sit left of allows so the
	// primary (allow once) lands in the bottom-right hot corner.
	const rejects = request.options.filter(option => !isAllow(option));
	const allows = request.options.filter(isAllow);
	const primaryAllow = request.options.find(option => option.kind === "allow_once") ?? allows[0];

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			cancel();
			return;
		}
		const el = document.activeElement as HTMLElement | null;
		if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
		if (event.key === "Enter") {
			if (primaryAllow) {
				event.preventDefault();
				respond(primaryAllow.optionId);
			}
		} else if (/^[1-9]$/.test(event.key)) {
			const option = request.options[Number(event.key) - 1];
			if (option) {
				event.preventDefault();
				respond(option.optionId);
			}
		}
	});
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const locations =
		request.locations ?? request.paths?.map(path => ({ path }) as { path: string; line?: number }) ?? [];

	return (
		<div data-slot="permission-card" className={cn("flex flex-col gap-3", className)}>
			<div className="flex items-center gap-2 px-0.5">
				<span
					aria-hidden
					className="flex size-5 shrink-0 items-center justify-center rounded-full bg-fr-warn/15 text-fr-warn"
				>
					<svg viewBox="0 0 12 12" className="size-3">
						<path
							d="M6 1.2 10.6 3.4v2.8c0 2.6-1.9 4.3-4.6 4.6C3.3 10.5 1.4 8.8 1.4 6.2V3.4L6 1.2Z"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.2"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
				<span className="font-secondary text-fr-2xs font-semibold uppercase tracking-[0.06em] text-fr-text-3">
					Permission
				</span>
				<span className="rounded-[6px] bg-fr-surface-3 px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-text-2">
					{request.toolName}
				</span>
			</div>

			<div className="rounded-[10px] border border-fr-border-soft bg-fr-surface-2/50 px-3.5 py-2.5">
				<code className="block whitespace-pre-wrap break-all font-secondary text-fr-sm text-fr-text">
					{request.title}
				</code>
				{locations.length > 0 && (
					<ul className="mt-2 flex flex-col gap-0.5 border-t border-fr-border-soft pt-2">
						{locations.slice(0, 6).map(location => (
							<li
								key={`${location.path}:${location.line ?? ""}`}
								className="fr-overflow font-secondary text-fr-xs text-fr-text-2"
							>
								{location.path}
								{typeof location.line === "number" && <span className="text-fr-text-3">:{location.line}</span>}
							</li>
						))}
						{locations.length > 6 && (
							<li className="font-secondary text-fr-xs text-fr-text-3">+{locations.length - 6} more</li>
						)}
					</ul>
				)}
			</div>

			<div className="flex items-center justify-end gap-2 px-0.5">
				{[...rejects, ...allows].map(option => (
					<Button
						key={option.optionId}
						size="sm"
						variant={optionVariant(option)}
						className={cn(option.kind === "reject_always" && "text-fr-del hover:text-fr-del")}
						onClick={() => respond(option.optionId)}
					>
						{option.name}
						{option.kind === "reject_once" && <Kbd>Esc</Kbd>}
						{option === primaryAllow && <Kbd>⏎</Kbd>}
					</Button>
				))}
			</div>
		</div>
	);
}

"use client";

// SessionTaskDropZone — wraps a session pane so a Kanban card dragged onto it
// becomes work for that session. While a task drag hovers the pane, the whole
// surface (thread + composer) dims to a blurred dropzone; on drop a choice card
// offers two hand-offs, BOTH opening TaskHandoffDialog to review/edit the full
// brief (and, for queue, attach images) before anything is sent:
//   · SET AS GOAL — `/goal set <edited text>`. One message, no follow-up: the
//                   whole brief becomes the persistent objective, since a goal
//                   turn runs continuously and a second queued follow-up would
//                   never get a chance to drain (see task-handoff-dialog.tsx).
//   · QUEUE AS PROMPT — sends the brief; a `followUp` while the agent is
//                   mid-turn, or sent now when idle.
//
// The card's column-reorder DnD is untouched — this rides the dedicated task
// mime (task-drag.ts) and only fires for drops that leave the board.

import type { SessionAttachment } from "@fraym-ai/driver";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { hasTaskDragData, readTaskDragData, type TaskDragData } from "../features/task-board/task-drag";
import { TaskHandoffDialog } from "../features/task-board/task-handoff-dialog";
import { useSessionOptional } from "../hooks/use-session";
import { Icon } from "../icons";
import { cn } from "../lib/cn";

type DropPhase = "idle" | "dragging" | "choosing" | "composing";

export interface SessionTaskDropZoneProps {
	readonly children: ReactNode;
	/** No session yet (opening/disconnected) → the zone is inert and drops fall through. */
	readonly disabled?: boolean;
	readonly className?: string;
}

export function SessionTaskDropZone({ children, disabled, className }: SessionTaskDropZoneProps) {
	const session = useSessionOptional();
	const armed = !disabled && Boolean(session);
	const [phase, setPhase] = useState<DropPhase>("idle");
	const [pending, setPending] = useState<TaskDragData | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);

	// A drag that ends anywhere (dropped elsewhere, or cancelled) clears the hover
	// veil even when no dragleave reached us.
	useEffect(() => {
		if (phase !== "dragging") return;
		const clear = () => setPhase(current => (current === "dragging" ? "idle" : current));
		window.addEventListener("dragend", clear);
		window.addEventListener("drop", clear);
		return () => {
			window.removeEventListener("dragend", clear);
			window.removeEventListener("drop", clear);
		};
	}, [phase]);

	// Escape dismisses the choice card.
	useEffect(() => {
		if (phase !== "choosing") return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setPhase("idle");
			setPending(null);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [phase]);

	const dismiss = () => {
		setPhase("idle");
		setPending(null);
	};

	const [composeMode, setComposeMode] = useState<"goal" | "queue" | null>(null);

	const chooseMode = (mode: "goal" | "queue") => {
		setComposeMode(mode);
		setPhase("composing");
	};

	const closeCompose = () => {
		setPhase("idle");
		setPending(null);
		setComposeMode(null);
	};

	const confirmHandoff = (input: { text: string; attachments: readonly SessionAttachment[] }) => {
		const task = pending;
		const mode = composeMode;
		closeCompose();
		if (!task || !session || !mode) return;
		if (mode === "goal") {
			void session.sendMessage(`/goal set ${input.text}`);
			return;
		}
		void session.sendMessage({
			text: input.text,
			...(input.attachments.length > 0 ? { attachments: input.attachments } : {}),
			deliverAs: session.isStreaming ? "followUp" : undefined,
		});
	};

	return (
		<div
			ref={rootRef}
			data-slot="session-task-dropzone"
			className={cn("relative flex min-h-0 flex-1 flex-col", className)}
			onDragOver={
				armed
					? event => {
							if (!hasTaskDragData(event.dataTransfer)) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = "copy";
							if (phase === "idle") setPhase("dragging");
						}
					: undefined
			}
			onDragLeave={
				armed
					? event => {
							if (phase !== "dragging") return;
							const next = event.relatedTarget;
							if (next instanceof Node && rootRef.current?.contains(next)) return;
							setPhase("idle");
						}
					: undefined
			}
			onDrop={
				armed
					? event => {
							if (!hasTaskDragData(event.dataTransfer)) return;
							event.preventDefault();
							const task = readTaskDragData(event.dataTransfer);
							if (!task) {
								setPhase("idle");
								return;
							}
							setPending(task);
							setPhase("choosing");
						}
					: undefined
			}
		>
			{children}

			{phase === "dragging" ? (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-fr-bg/45 ring-2 ring-fr-accent-line/70 ring-inset backdrop-blur-[5px]"
				>
					<div className="flex flex-col items-center gap-2 rounded-[14px] border border-fr-accent-line bg-fr-surface/85 px-6 py-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)]">
						<span className="grid size-10 place-items-center rounded-full bg-fr-accent-dim text-fr-accent">
							<Icon name="send" size={18} strokeWidth={1.8} />
						</span>
						<span className="font-semibold text-fr-text text-fr-xs">Hand off to this session</span>
						<span className="font-secondary text-fr-2xs text-fr-text-3">
							Drop to set a goal or queue a prompt
						</span>
					</div>
				</div>
			) : null}

			{phase === "choosing" && pending ? (
				<div className="absolute inset-0 z-40">
					<button
						type="button"
						aria-label="Dismiss"
						className="absolute inset-0 cursor-default bg-fr-bg/55 backdrop-blur-[6px]"
						onClick={dismiss}
					/>
					<div
						role="dialog"
						aria-label="Hand off task to session"
						className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 w-[min(360px,90%)] rounded-[14px] border border-fr-border bg-fr-surface/95 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
					>
						<span className="font-secondary text-fr-2xs text-fr-text-3 uppercase tracking-fr-label">
							Hand off to this session
						</span>
						<p className="mt-1 line-clamp-2 font-semibold text-fr-sm text-fr-text">{pending.title}</p>
						<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
							{pending.section ? (
								<span className="rounded-[6px] bg-fr-surface-3 px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-text-2">
									{pending.section}
								</span>
							) : null}
							<span className="rounded-[6px] bg-fr-surface-3 px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-text-2">
								{pending.status}
							</span>
						</div>
						<div className="mt-3 flex flex-col gap-2">
							<HandoffOption
								icon="bolt"
								title="Set as goal"
								subtitle="Dedicate this session to it until done"
								onClick={() => chooseMode("goal")}
							/>
							<HandoffOption
								icon="send"
								title="Queue as prompt"
								subtitle={
									session?.isStreaming ? "Queue it after the current turn" : "Send it as the next message"
								}
								onClick={() => chooseMode("queue")}
							/>
						</div>
					</div>
				</div>
			) : null}

			{phase === "composing" && pending && composeMode ? (
				<TaskHandoffDialog
					tasks={[pending]}
					mode={composeMode}
					isStreaming={session?.isStreaming}
					onCancel={closeCompose}
					onConfirm={confirmHandoff}
				/>
			) : null}
		</div>
	);
}

function HandoffOption({
	icon,
	title,
	subtitle,
	onClick,
}: {
	readonly icon: "bolt" | "send";
	readonly title: string;
	readonly subtitle: string;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex items-center gap-3 rounded-[10px] border border-fr-border-soft bg-fr-surface-2/60 p-3 text-left transition-colors hover:border-fr-accent-line hover:bg-fr-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line"
		>
			<span className="grid size-8 shrink-0 place-items-center rounded-full bg-fr-accent-dim text-fr-accent">
				<Icon name={icon} size={15} strokeWidth={1.8} />
			</span>
			<span className="min-w-0">
				<span className="block font-semibold text-fr-text text-fr-xs">{title}</span>
				<span className="block text-fr-2xs text-fr-text-3">{subtitle}</span>
			</span>
		</button>
	);
}

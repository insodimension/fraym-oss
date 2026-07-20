"use client";

// TaskHandoffDialog — the edit-and-confirm step between "hand this task off" and
// the agent actually receiving it. Every "current session" hand-off (the drag
// dropzone's choice card, the multi-select context menu, the task-detail modal's
// "In this session" button) opens this instead of sending immediately: it shows
// the FULL brief the agent would read — not a truncated title — lets the user
// edit it or add their own instructions, and (queue mode only) attach images.
//
// Goal mode sends the edited text as a single `/goal set <text>` — the whole
// brief becomes the persistent objective, so there is no second follow-up
// message racing it. That second message is exactly what used to get stranded:
// a goal turn runs as one long continuous stream, so the generic queued-message
// drain (which only fires once the session is fully idle) never gets a turn to
// flush it — the brief sat in "Queued · sends after this turn" indefinitely.
// Folding everything into the one objective sidesteps that gap entirely, and
// is also why goal mode has no image attachment affordance here: the objective
// is replayed as plain text every continuation turn, and a second delivery path
// for images would reintroduce the same stranding risk.
import type { SessionAttachment } from "@fraym/driver";
import { useRef, useState } from "react";
import { Modal } from "../../elements/popover";
import { Icon } from "../../icons";
import { type ComposerImageAttachment, imageFilesFromTransfer, readImageAttachment } from "../composer/composer-core";
import { type TaskHandoffInput, taskGroupBrief } from "./task-handoff";

export interface TaskHandoffDialogProps {
	readonly tasks: readonly TaskHandoffInput[];
	readonly mode: "goal" | "queue";
	/** Queue mode only: whether it'll send now or wait for the running turn — copy hint. */
	readonly isStreaming?: boolean;
	readonly onCancel: () => void;
	readonly onConfirm: (input: { text: string; attachments: readonly SessionAttachment[] }) => void;
}

const COPY: Record<
	"goal" | "queue",
	{ readonly icon: "bolt" | "send"; readonly title: string; readonly blurb: string; readonly confirm: string }
> = {
	goal: {
		icon: "bolt",
		title: "Set as goal",
		blurb: "The agent pursues this objective turn after turn until it's done. Edit it however you like.",
		confirm: "Start goal",
	},
	queue: {
		icon: "send",
		title: "Queue as prompt",
		blurb: "Sent to the session as a normal message — edit it before it goes.",
		confirm: "Send",
	},
};

export function TaskHandoffDialog({ tasks, mode, isStreaming, onCancel, onConfirm }: TaskHandoffDialogProps) {
	const [text, setText] = useState(() => taskGroupBrief(tasks));
	const [attachments, setAttachments] = useState<ComposerImageAttachment[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const copy = COPY[mode];
	const trimmed = text.trim();
	const first = tasks[0];
	const heading = tasks.length > 1 ? `${tasks.length} tasks` : (first?.title ?? "Task");
	const allowImages = mode === "queue";

	const addFiles = async (files: readonly File[]) => {
		const images = files.filter(file => file.type.startsWith("image/"));
		if (images.length === 0) return;
		const next = await Promise.all(images.map((file, index) => readImageAttachment(file, `${Date.now()}-${index}`)));
		setAttachments(current => [...current, ...next]);
	};

	const confirm = () => {
		if (!trimmed) return;
		onConfirm({
			text: trimmed,
			attachments: attachments.map(att => ({
				kind: "image" as const,
				mimeType: att.mimeType,
				data: att.data,
				name: att.name,
			})),
		});
	};

	return (
		<Modal onClose={onCancel} aria-label={copy.title} className="w-[min(480px,calc(100vw-32px))]">
			<div className="p-5">
				<div className="mb-4 flex items-start gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-fr-surface-2 text-fr-accent">
						<Icon name={copy.icon} size={17} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-fr-base font-semibold text-fr-text">{copy.title}</div>
						<div className="mt-1 line-clamp-1 font-secondary text-fr-xs text-fr-text-3">{heading}</div>
					</div>
					<button
						type="button"
						className="text-fr-text-3 hover:text-fr-text"
						onClick={onCancel}
						aria-label="Close"
					>
						<Icon name="x" size={15} />
					</button>
				</div>
				<p className="mb-2 font-secondary text-fr-2xs text-fr-text-3">{copy.blurb}</p>
				<textarea
					value={text}
					onChange={event => setText(event.target.value)}
					onDragOver={allowImages ? event => event.preventDefault() : undefined}
					onDrop={
						allowImages
							? event => {
									const files = imageFilesFromTransfer(event.dataTransfer);
									if (files.length === 0) return;
									event.preventDefault();
									void addFiles(files);
								}
							: undefined
					}
					onPaste={
						allowImages
							? event => {
									const files = imageFilesFromTransfer(event.clipboardData);
									if (files.length === 0) return;
									event.preventDefault();
									void addFiles(files);
								}
							: undefined
					}
					className="min-h-[220px] w-full resize-none rounded-[12px] border border-fr-accent-line bg-fr-bg px-3 py-3 text-fr-sm leading-relaxed text-fr-text outline-none placeholder:text-fr-text-3 focus:border-fr-accent"
					autoFocus
				/>
				{allowImages ? (
					<div className="mt-3 flex flex-wrap items-center gap-2">
						{attachments.map((att, index) => (
							<div
								key={att.id}
								className="group relative size-14 shrink-0 overflow-hidden rounded-[7px] border border-fr-border bg-fr-surface-2"
							>
								<img
									src={`data:${att.mimeType};base64,${att.data}`}
									alt={`attachment ${index + 1}`}
									className="size-full object-cover"
								/>
								<button
									type="button"
									onClick={() => setAttachments(current => current.filter(a => a.id !== att.id))}
									aria-label={`Remove image ${index + 1}`}
									title={`Remove image ${index + 1}`}
									className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-fr-bg/80 text-fr-text-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-fr-text"
								>
									<Icon name="x" size={11} strokeWidth={2.5} />
								</button>
							</div>
						))}
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="flex size-14 shrink-0 items-center justify-center rounded-[7px] border border-fr-border border-dashed text-fr-text-3 hover:border-fr-accent-line hover:text-fr-accent"
							aria-label="Attach image"
							title="Attach image"
						>
							<Icon name="image" size={16} />
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							multiple
							className="hidden"
							onChange={event => {
								void addFiles(Array.from(event.target.files ?? []));
								event.target.value = "";
							}}
						/>
					</div>
				) : null}
				<div className="mt-3 flex items-center justify-between gap-2">
					<span className="font-secondary text-fr-2xs text-fr-text-3">
						{mode === "queue" && isStreaming ? "Queues after the current turn" : null}
					</span>
					<div className="flex gap-2">
						<button
							type="button"
							className="rounded-[9px] bg-fr-surface-2 px-4 py-2 text-fr-sm text-fr-text hover:bg-fr-surface-3"
							onClick={onCancel}
						>
							Cancel
						</button>
						<button
							type="button"
							disabled={!trimmed}
							className="rounded-[9px] bg-fr-accent px-4 py-2 text-fr-sm text-fr-accent-ink hover:bg-fr-accent-2 disabled:cursor-default disabled:bg-fr-surface-3 disabled:text-fr-text-3"
							onClick={confirm}
						>
							{copy.confirm}
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
}

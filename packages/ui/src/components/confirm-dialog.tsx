import type { ReactNode } from "react";
import { Button } from "../elements/button";
import { Modal } from "../elements/popover";
import { Icon, type IconName } from "../icons";
import { cn } from "../lib/cn";

export type ConfirmDialogIntent = "default" | "danger";

export interface ConfirmDialogProps {
	readonly title: string;
	readonly description?: ReactNode;
	readonly details?: ReactNode;
	readonly confirmLabel?: string;
	readonly cancelLabel?: string;
	readonly intent?: ConfirmDialogIntent;
	readonly icon?: IconName;
	readonly busy?: boolean;
	readonly onConfirm: () => void;
	readonly onClose: () => void;
}

export function ConfirmDialog({
	title,
	description,
	details,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	intent = "default",
	icon = intent === "danger" ? "trash" : "shield",
	busy = false,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	const danger = intent === "danger";
	return (
		<Modal role="alertdialog" aria-label={title} onClose={onClose} className="w-[min(440px,calc(100vw-32px))]">
			<div data-slot="confirm-dialog" className="p-5">
				<div className="flex items-start gap-3.5">
					<div
						className={cn(
							"flex size-10 shrink-0 items-center justify-center rounded-[10px] border",
							danger
								? "border-fr-del/35 bg-fr-del-bg text-fr-del"
								: "border-fr-border bg-fr-surface-2 text-fr-accent",
						)}
					>
						<Icon name={icon} size={20} strokeWidth={1.8} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-fr-lg font-semibold text-fr-text">{title}</div>
						{description && <div className="mt-1 text-fr-sm leading-5 text-fr-text-3">{description}</div>}
					</div>
				</div>
				{details && (
					<div className="mt-4 rounded-[10px] border border-fr-border-soft bg-fr-surface-2 px-3 py-2.5 text-fr-sm text-fr-text-2">
						{details}
					</div>
				)}
				<div className="mt-5 flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						disabled={busy}
						className={cn(
							danger &&
								"border-fr-del bg-fr-del text-white hover:border-fr-del hover:bg-[color-mix(in_srgb,var(--fr-del)_86%,white)]",
						)}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</Modal>
	);
}

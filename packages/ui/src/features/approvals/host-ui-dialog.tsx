// HostUiDialog renders non-permission, non-docked host-UI requests as a focused
// modal card: input / editor / notify. `select` still routes through the shared
// AskPicker (SelectRequestPicker) for modal callers; the live picker is the
// docked ConnectedSelectDialog. confirm/permission are also docked, not modal.
// Mount with `key={request.requestId}` so editable state resets per request.

import type { HostUiRequest as DriverHostUiRequest, HostUiResponse } from "@fraym-ai/driver";
import { useEffect, useState } from "react";
import { Button } from "../../elements/button";
import { Input } from "../../elements/input";
import { Textarea } from "../../elements/textarea";
import { cn } from "../../lib/cn";
import { AskFieldControl, readDialogField } from "./ask-field-control";
import { SelectRequestPicker } from "./select-request-picker";

export type DialogHostUiRequest = Extract<
	DriverHostUiRequest,
	{ kind: "confirm" | "input" | "select" | "editor" | "editorText" | "notify" }
>;

type NonSelectDialogRequest = Exclude<DialogHostUiRequest, { kind: "select" }>;

export interface HostUiDialogProps {
	readonly request: DialogHostUiRequest;
	readonly onRespond: (response: HostUiResponse) => void;
	readonly className?: string;
}

const LEVEL_TONE: Record<string, string> = {
	info: "text-fr-blue",
	warning: "text-fr-warn",
	error: "text-fr-del",
};

function initialDialogText(request: DialogHostUiRequest) {
	if (request.kind === "input" || request.kind === "editor") return request.initialValue ?? "";
	if (request.kind === "editorText") return request.text;
	return "";
}

function dialogTitle(request: DialogHostUiRequest) {
	if (request.kind === "notify") return "Notice";
	if (request.kind === "editorText") return "Editor";
	return request.title;
}

function DialogBody({
	request,
	text,
	onTextChange,
}: {
	readonly request: NonSelectDialogRequest;
	readonly text: string;
	readonly onTextChange: (text: string) => void;
}) {
	if (request.kind === "confirm") return <p className="mb-4 text-fr-base text-fr-text-2">{request.message}</p>;
	if (request.kind === "notify") {
		return <p className={cn("mb-4 text-fr-base", LEVEL_TONE[request.level ?? "info"])}>{request.message}</p>;
	}
	if (request.kind === "input") {
		return (
			<Input
				autoFocus
				value={text}
				placeholder={request.placeholder}
				onChange={event => onTextChange(event.target.value)}
				className="mb-4"
			/>
		);
	}
	return (
		<Textarea
			value={text}
			onChange={event => onTextChange(event.target.value)}
			className="mb-4 min-h-[160px] font-secondary"
		/>
	);
}

function DialogActions({
	request,
	text,
	onCancel,
	onRespond,
}: {
	readonly request: NonSelectDialogRequest;
	readonly text: string;
	readonly onCancel: () => void;
	readonly onRespond: HostUiDialogProps["onRespond"];
}) {
	return (
		<div className="flex justify-end gap-2">
			{request.kind !== "notify" && (
				<Button
					variant="outline"
					size="sm"
					onClick={
						request.kind === "confirm"
							? () => onRespond({ requestId: request.requestId, confirmed: false })
							: onCancel
					}
				>
					Cancel
				</Button>
			)}
			{request.kind === "confirm" && (
				<Button size="sm" onClick={() => onRespond({ requestId: request.requestId, confirmed: true })}>
					Confirm
				</Button>
			)}
			{(request.kind === "input" || request.kind === "editor" || request.kind === "editorText") && (
				<Button size="sm" onClick={() => onRespond({ requestId: request.requestId, value: text })}>
					Send response
				</Button>
			)}
			{request.kind === "notify" && (
				<Button size="sm" onClick={() => onRespond({ requestId: request.requestId, confirmed: true })}>
					Dismiss
				</Button>
			)}
		</div>
	);
}

export function HostUiDialog({ request, onRespond, className }: HostUiDialogProps) {
	const [text, setText] = useState(() => initialDialogText(request));
	const cancel = () => onRespond({ requestId: request.requestId, cancelled: true });
	const title = dialogTitle(request);
	// A typed FIELD on an `input` request swaps the plain text box for a native
	// control (text/number/slider/tags). AskFieldControl owns its own Esc, so the
	// dialog's Esc handler stands down when a field is present.
	const field = request.kind === "input" ? readDialogField(request.meta) : null;

	// Esc cancels every dialog kind. `confirm` parses a `cancelled` response as `false`.
	useEffect(() => {
		if (field) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onRespond({ requestId: request.requestId, cancelled: true });
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onRespond, request.requestId, field]);

	return (
		<div data-slot="host-ui-dialog" className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
			<button
				type="button"
				aria-label="Dismiss"
				className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
				onClick={cancel}
			/>
			<div
				role="dialog"
				aria-modal={true}
				aria-label={title}
				className={cn(
					"relative w-[min(560px,92vw)] animate-[fr-rise_0.18s_ease] rounded-[var(--fr-r)] border border-fr-border bg-fr-surface p-4 shadow-xl",
					className,
				)}
			>
				{request.kind === "select" ? (
					<SelectRequestPicker request={request} onRespond={onRespond} />
				) : request.kind === "input" && field ? (
					<AskFieldControl
						question={request.title}
						field={field}
						initialValue={request.initialValue}
						onSubmit={value => onRespond({ requestId: request.requestId, value })}
						onCancel={cancel}
					/>
				) : (
					<>
						<div className="mb-2 text-fr-base font-semibold text-fr-text">{title}</div>
						<DialogBody request={request} text={text} onTextChange={setText} />
						<DialogActions request={request} text={text} onCancel={cancel} onRespond={onRespond} />
					</>
				)}
			</div>
		</div>
	);
}

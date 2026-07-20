import type { SessionAttachment, SessionMessageInput } from "@fraym/driver";
import { useState } from "react";
import { useLiveContextPercent } from "../../hooks/use-live-context-percent";
import { useSession } from "../../hooks/use-session";
import { useIsSessionContinued } from "../../hooks/use-session-continuation";
import type { ComposerImageAttachment } from "../composer";
import {
	type ComposerAttachmentItem,
	ComposerCockpit,
	type ComposerCockpitSettings,
	type ComposerControl,
} from "./composer-cockpit";

export interface ConnectedComposerCockpitProps {
	readonly initialValue?: string;
	readonly placeholder?: string;
	readonly permissionLabel?: string;
	readonly toolbar?: readonly ComposerControl[];
	readonly sendActions?: readonly ComposerControl[];
	readonly settings?: ComposerCockpitSettings;
	readonly className?: string;
	readonly onControl?: (id: string) => void;
}

const CONNECTED_TOOLBAR: readonly ComposerControl[] = [
	{ id: "slash", label: "Slash", icon: "keyboard" },
	{ id: "history", label: "History", icon: "history" },
	{ id: "compact", label: "Compact", icon: "archive" },
	{ id: "stop", label: "Stop", icon: "x", tone: "del" },
];

const CONNECTED_SEND_ACTIONS: readonly ComposerControl[] = [
	{ id: "send", label: "Send", icon: "send", tone: "accent", active: true },
	{ id: "steer", label: "Steer", icon: "branch" },
	{ id: "follow-up", label: "Follow-up", icon: "plus" },
];

type ConnectedSession = ReturnType<typeof useSession>;
type SessionImageAttachment = Extract<SessionAttachment, { readonly kind: "image" }>;
type SessionFileAttachment = Extract<SessionAttachment, { readonly kind: "file" }>;

function formatModelLabel(session: ConnectedSession): string | undefined {
	return modelLabel(sessionModelId(session), sessionThinkingLevel(session));
}

function sessionModelId(session: ConnectedSession): string | undefined {
	return session.snapshot?.config?.modelId;
}

function sessionThinkingLevel(session: ConnectedSession): string | null | undefined {
	return session.thinkingLevel ?? session.snapshot?.config?.thinkingLevel;
}

function modelLabel(modelId: string | undefined, thinking: string | null | undefined): string | undefined {
	return hasModelLabel(modelId, thinking) ? formatModelWithThinking(modelName(modelId), thinking) : undefined;
}

function hasModelLabel(modelId: string | undefined, thinking: string | null | undefined): boolean {
	return Boolean(modelId) || Boolean(thinking);
}

function modelName(modelId: string | undefined): string {
	return modelId ?? "model";
}

function formatModelWithThinking(model: string, thinking: string | null | undefined): string {
	return thinking ? `${model} - ${thinking}` : model;
}

function attachmentPreview(attachment: SessionAttachment, queueId: string, index: number): ComposerAttachmentItem {
	return attachment.kind === "image"
		? imageAttachmentPreview(attachment, queueId, index)
		: fileAttachmentPreview(attachment, queueId, index);
}

function imageAttachmentPreview(
	attachment: SessionImageAttachment,
	queueId: string,
	index: number,
): ComposerAttachmentItem {
	return {
		id: `${queueId}:image:${index}`,
		name: attachment.name ?? "image",
		detail: attachment.mimeType,
		kind: "image",
	};
}

function fileAttachmentPreview(
	attachment: SessionFileAttachment,
	queueId: string,
	index: number,
): ComposerAttachmentItem {
	return {
		id: `${queueId}:file:${index}`,
		name: attachment.name,
		detail: fileAttachmentDetail(attachment),
		kind: "file",
	};
}

function fileAttachmentDetail(attachment: SessionFileAttachment): string | undefined {
	return attachment.sizeBytes ? `${Math.round(attachment.sizeBytes / 1024)} KB` : attachment.mimeType;
}

function queueDetail(text: string): string {
	return text.length > 34 ? `${text.slice(0, 34)}...` : text;
}

function queueLabel(mode: string): string {
	return mode === "steer" ? "steer" : "follow-up";
}

function queueTone(mode: string): "warn" | "blue" {
	return mode === "steer" ? "warn" : "blue";
}

function queueItems(session: ConnectedSession) {
	return (session.snapshot?.queuedMessages ?? []).map(message => ({
		id: message.id,
		label: queueLabel(message.mode),
		detail: queueDetail(message.text),
		tone: queueTone(message.mode),
	}));
}

function attachmentItems(session: ConnectedSession): ComposerAttachmentItem[] {
	return (session.snapshot?.queuedMessages ?? []).flatMap((message, messageIndex) =>
		(message.attachments ?? []).map((attachment, attachmentIndex) =>
			attachmentPreview(attachment, `${message.id}:${messageIndex}`, attachmentIndex),
		),
	);
}

function deliverAs(settings: ComposerCockpitSettings | undefined): "steer" | "followUp" | undefined {
	const behavior = settings?.sendBehavior;
	if (behavior === "steer") return "steer";
	if (behavior === "follow-up") return "followUp";
	return undefined;
}

function submitPayload(
	text: string,
	settings: ComposerCockpitSettings | undefined,
): string | { readonly text: string; readonly deliverAs: "steer" | "followUp" } {
	const mode = deliverAs(settings);
	return mode ? { text, deliverAs: mode } : text;
}

function modeLabel(session: ConnectedSession): "plan" | "goal" | undefined {
	return session.planMode?.enabled ? "plan" : session.goal ? "goal" : undefined;
}

function runControl(id: string, session: ConnectedSession): void {
	if (id === "compact") void session.compact();
	if (id === "stop") void session.interruptRunForQueuedMessage();
}

function permissionLabel(props: ConnectedComposerCockpitProps): string {
	return props.permissionLabel ?? "Default permissions";
}

function toolbar(props: ConnectedComposerCockpitProps): readonly ComposerControl[] {
	return props.toolbar ?? CONNECTED_TOOLBAR;
}

function sendActions(props: ConnectedComposerCockpitProps): readonly ComposerControl[] {
	return props.sendActions ?? CONNECTED_SEND_ACTIONS;
}

export function ConnectedComposerCockpit(props: ConnectedComposerCockpitProps) {
	const session = useSession();
	const contextPercent = useLiveContextPercent(session);
	const [value, setValue] = useState(props.initialValue ?? "");
	const settings = props.settings;
	const isContinued = useIsSessionContinued();

	const handleSubmit = async (text: string, attachments: readonly ComposerImageAttachment[]) => {
		if (isContinued) return;
		// Clear up front: the send promise resolves only when the turn ends, so
		// clearing after the await would leave sent text stuck in the field.
		setValue("");
		const base = submitPayload(text, settings);
		if (attachments.length === 0) {
			await session.sendMessage(base);
			return;
		}
		const images: SessionImageAttachment[] = attachments.map(att => ({
			kind: "image",
			mimeType: att.mimeType,
			data: att.data,
			name: att.name,
		}));
		const input: SessionMessageInput =
			typeof base === "string" ? { text: base, attachments: images } : { ...base, attachments: images };
		await session.sendMessage(input);
	};

	const handleControl = (id: string) => {
		props.onControl?.(id);
		runControl(id, session);
	};

	return (
		<ComposerCockpit
			value={value}
			onChange={setValue}
			onSubmit={handleSubmit}
			onStop={session.interruptRunForQueuedMessage}
			onControl={handleControl}
			onRemoveQueueItem={session.removeQueuedMessage}
			streaming={session.isStreaming}
			disabled={isContinued}
			placeholder={
				isContinued ? "This plan was continued in a new session — open it to keep working." : props.placeholder
			}
			modeLabel={modeLabel(session)}
			permissionLabel={permissionLabel(props)}
			modelLabel={formatModelLabel(session)}
			contextPercent={contextPercent}
			toolbar={toolbar(props)}
			sendActions={sendActions(props)}
			queue={queueItems(session)}
			attachments={attachmentItems(session)}
			settings={settings}
			className={props.className}
		/>
	);
}

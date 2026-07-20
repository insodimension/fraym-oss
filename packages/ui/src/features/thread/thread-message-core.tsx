// ThreadMessage — one turn in the Thread (user bubble, agent message, or a
// compaction divider). The agent branch is just `<MessageHeader>` + `<MessageBody>`;
// the body owns all inter-block rhythm via flex `gap`, and the inter-turn gap is
// owned by the parent `<Thread>`. No `showActivity` tail lives here — the single
// `<WorkingTail>` is pinned by `<Thread>`. See `docs/design/14-thread-architecture.md`.

import { Fragment, useState } from "react";
import { Badge } from "../../elements/badge";
import { MessageActions } from "../../elements/message-actions";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { useCommandTagResolver } from "../../registries/command-tag-registry";
import type { MessageBlockRendererMap } from "../../registries/message-block-registry";
import {
	type SurfaceRenderContext,
	type SurfaceRenderer,
	useSurfaceRendererMap,
} from "../../registries/surface-renderer-registry";
import { resolveUserContext, useUserContextMap } from "../../registries/user-context-registry";
import { type MessageBlock, type MessageData, MessageDivider, MessageHeader } from "../message/message";
import { renderTextWithImageMarkers, UserImageThumbnails } from "../message/messages/image-block";
import { MessageBody, useResolvedBlockRenderer } from "../message/messages/message-body";
import { useThreadMessageActions } from "./thread-message-actions";

// A user message that begins with a slash command ("/skill:foo args") renders the
// command as an inline tag instead of raw "/cmd" text — parity with the composer pill.
// Conservative shape match (no embedded "/", so a path like "/etc/hosts" stays plain
// text); the message renderer has no command list, so this is a heuristic, not a lookup.
const USER_COMMAND_TOKEN = /^(\/[a-zA-Z][\w-]*(?::[\w-]+)?)(?:\s+|$)([\s\S]*)$/;

const PASTED_TEXT_MARKER = /\[\[fraym-paste:(\d+)\]\]\n/g;

export type UserTextSegment =
	| { readonly type: "text"; readonly text: string }
	| { readonly type: "paste"; readonly text: string };

interface TextMessageBlock extends MessageBlock {
	readonly type: "text";
	readonly text: string;
}

interface ImageMessageBlock extends MessageBlock {
	readonly type: "image";
	readonly src: string;
}

function isTextMessageBlock(block: MessageBlock): block is TextMessageBlock {
	return block.type === "text" && typeof block.text === "string";
}

function isImageMessageBlock(block: MessageBlock): block is ImageMessageBlock {
	return block.type === "image" && typeof block.src === "string";
}

/** Decode the composer's durable, length-delimited pasted-text markers. Invalid
 * or truncated markers remain ordinary text: rendering must never drop input. */
export function splitUserPastedText(text: string): readonly UserTextSegment[] {
	const segments: UserTextSegment[] = [];
	let cursor = 0;
	for (const match of text.matchAll(PASTED_TEXT_MARKER)) {
		const markerIndex = match.index;
		if (markerIndex < cursor) continue;
		const length = Number(match[1]);
		const contentStart = markerIndex + match[0].length;
		const contentEnd = contentStart + length;
		if (!Number.isSafeInteger(length) || length < 0 || contentEnd > text.length) continue;
		if (markerIndex > cursor) segments.push({ type: "text", text: text.slice(cursor, markerIndex) });
		segments.push({ type: "paste", text: text.slice(contentStart, contentEnd) });
		cursor = contentEnd;
	}
	if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });
	return segments.length > 0 ? segments : [{ type: "text", text }];
}

function PastedTextDisclosure({ text }: { readonly text: string }) {
	const [expanded, setExpanded] = useState(false);
	const preview = text.slice(0, 160).replace(/\s+/g, " ").trim();
	return (
		<div
			data-slot="user-pasted-text"
			className="my-1 overflow-hidden rounded-[8px] border border-fr-border bg-fr-surface"
		>
			<button
				type="button"
				aria-expanded={expanded}
				onClick={() => setExpanded(value => !value)}
				className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
			>
				<Icon name="file" size={13} strokeWidth={1.7} className="shrink-0 text-fr-text-3" aria-hidden="true" />
				<span className="min-w-0 flex-1 fr-overflow">{expanded ? "Pasted text" : preview || "Pasted text"}</span>
				<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">
					{text.length.toLocaleString()} chars
				</span>
				<Icon
					name="caretD"
					size={11}
					strokeWidth={1.8}
					className={cn("shrink-0 text-fr-text-3 transition-transform duration-150", expanded && "rotate-180")}
					aria-hidden="true"
				/>
			</button>
			{expanded && (
				<pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap border-t border-fr-border-soft px-3 py-2.5 font-secondary text-fr-xs leading-5 text-fr-text-2">
					{text}
				</pre>
			)}
		</div>
	);
}

export function splitLeadingUserCommand(
	blocks: readonly MessageBlock[],
): { readonly label: string; readonly blocks: readonly MessageBlock[] } | null {
	const first = blocks[0];
	if (first?.type !== "text") return null;
	const match = USER_COMMAND_TOKEN.exec(String(first.text ?? ""));
	if (!match) return null;
	const rest = match[2] ?? "";
	const remaining: MessageBlock[] = [];
	if (rest.length > 0) remaining.push({ ...first, text: rest });
	remaining.push(...blocks.slice(1));
	return { label: match[1] ?? "", blocks: remaining };
}

export interface ThreadMessageProps {
	readonly message: MessageData;
	readonly isLast?: boolean;
	readonly isStreaming?: boolean;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	readonly components?: MessageBlockRendererMap;
	readonly className?: string;
}

const MESSAGE_SURFACE_CTX: SurfaceRenderContext = { respond: () => undefined };

/** Render an Engine custom message through a registered `msg:<customType>` surface.
 *  A renderer returning `null` suppresses the transcript row entirely — for
 *  messages presented by a docked surface instead (e.g. the usage-limit strip
 *  above the composer). */
function CustomThreadMessage({
	message,
	render,
	showHeader,
	showAvatar,
	className,
}: {
	readonly message: MessageData;
	readonly render: SurfaceRenderer;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	readonly className?: string;
}) {
	const text = message.blocks
		.map(block => (block.type === "text" && typeof block.text === "string" ? block.text : ""))
		.filter(Boolean)
		.join("\n");
	const surface = render(
		{ channel: "message", customType: message.customType ?? "", payload: message.payload, text },
		MESSAGE_SURFACE_CTX,
	);
	if (surface === null) return null;
	return (
		<div data-slot="thread-message" data-role="custom" className={cn("relative min-w-0", className)}>
			{showHeader && showAvatar && (
				<MessageHeader
					messageRole="agent"
					name={message.name ?? "Assistant"}
					meta={message.meta}
					showAvatar={showAvatar}
				/>
			)}
			{surface}
		</div>
	);
}

function UserThreadMessage({
	message,
	isLast,
	isStreaming,
	showAvatar,
	showHeader,
	components,
	className,
}: ThreadMessageProps) {
	const renderUserBlock = useResolvedBlockRenderer(message, isLast, isStreaming, components);
	const leadingCommand = splitLeadingUserCommand(message.blocks);
	// Pipeline faces (`/pipeline-<id>`, doc 38 §14) resolve back to the pipeline's title
	// + icon so the transcript badge matches the composer's pipeline pill; any other
	// slash token declines and the raw label is shown.
	const resolveCommandTag = useCommandTagResolver();
	const commandDisplay = leadingCommand ? resolveCommandTag(leadingCommand.label) : null;
	const allBlocks = leadingCommand ? leadingCommand.blocks : message.blocks;
	// Composer parity, durable: image thumbnails ride on top, and the numbered "Image N" pills
	// render INLINE at the `[Image #N]` markers the composer wrote into the text (the TUI's
	// mechanism — position lives in the text, so it survives the engine echo + reload).
	const imageBlocks = allBlocks.filter(isImageMessageBlock);
	const imageSrcs = imageBlocks.map(block => ({ src: block.src })).filter(image => image.src.length > 0);
	const nonImage = allBlocks.filter(block => !isImageMessageBlock(block));
	const textBlocks = nonImage.filter(isTextMessageBlock);
	const hasPastedText = textBlocks.some(block =>
		splitUserPastedText(block.text).some(segment => segment.type === "paste"),
	);
	const inline = (imageBlocks.length > 0 || hasPastedText) && textBlocks.length === nonImage.length;
	const inlineText = inline ? textBlocks.map(block => block.text).join("") : "";
	const inlineSegments = inline ? splitUserPastedText(inlineText) : [];
	const inlineKey = `u-${message.timestamp ?? "msg"}`;
	const { actions, overlay } = useThreadMessageActions(message);
	// Inserted context (registry contract): a machine/plugin-composed user message
	// — an autonomy loop tick, a skill wake-up, … — is CLAIMED by a registered
	// resolver and renders as its defined chip instead of a raw text wall. First
	// claim wins; unclaimed messages fall through to the ordinary bubble.
	const contextMap = useUserContextMap();
	const contextChip = resolveUserContext(contextMap, {
		text: allBlocks
			.filter(isTextMessageBlock)
			.map(block => block.text)
			.join(""),
		blocks: allBlocks,
		...(message.customType !== undefined ? { customType: message.customType } : {}),
	});
	// Engine-native `/loop` auto-resubmit rides the customType channel (set in
	// driver-acp's applyUserMessage); badge the bubble so it reads as a loop
	// iteration instead of an indistinguishable typed message.
	const isLoopResubmit = message.customType === "loop-resubmit";
	if (contextChip) {
		return (
			<div
				data-slot="thread-message"
				data-role="user"
				className={cn("group/msg flex justify-end max-[520px]:justify-start", className)}
			>
				<div className="flex min-w-0 max-w-[74%] flex-col items-end max-[520px]:max-w-full">
					{showHeader && showAvatar && (
						<MessageHeader
							messageRole="user"
							name={message.name ?? "You"}
							meta={message.meta}
							showAvatar={showAvatar}
						/>
					)}
					{contextChip}
					<MessageActions
						actions={actions}
						timestamp={message.timestamp}
						align="end"
						className="mt-1 px-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100"
					/>
					{overlay}
				</div>
			</div>
		);
	}
	return (
		<div
			data-slot="thread-message"
			data-role="user"
			className={cn("group/msg flex justify-end max-[520px]:justify-start", className)}
		>
			<div className="min-w-0 max-w-[74%] max-[520px]:max-w-full">
				{showHeader && showAvatar && (
					<MessageHeader
						messageRole="user"
						name={message.name ?? "You"}
						meta={message.meta}
						showAvatar={showAvatar}
					/>
				)}
				{isLoopResubmit && (
					<div className="mb-1 flex justify-end">
						<Badge tone="mute" variant="soft" title="Re-submitted automatically by loop mode">
							↻ Loop
						</Badge>
					</div>
				)}
				<div className="inline-block max-w-full break-words rounded-[14px] border border-fr-border-soft bg-fr-surface-2 px-3.5 py-2.5 text-sm text-fr-text max-[520px]:block max-[520px]:w-full [&_p]:m-0 [&_p]:text-pretty">
					{leadingCommand &&
						(commandDisplay ? (
							<span
								data-slot="user-command-tag"
								className="mr-1.5 inline-flex items-center gap-1 rounded-[8px] border border-fr-accent-line bg-fr-accent-dim py-0.5 pr-1.5 pl-0.5 align-baseline font-secondary text-fr-xs font-medium text-fr-accent"
							>
								{commandDisplay.icon && (
									<span
										aria-hidden
										className="grid size-4 shrink-0 place-items-center rounded-[6px] text-fr-accent-ink [background:var(--fr-accent-grad)]"
									>
										<Icon name={commandDisplay.icon} size={11} strokeWidth={2} />
									</span>
								)}
								<span className="max-w-[200px] fr-overflow">{commandDisplay.label}</span>
							</span>
						) : (
							<span
								data-slot="user-command-tag"
								className="mr-1.5 inline-flex items-center rounded-[6px] bg-fr-accent-dim px-1.5 py-0.5 align-baseline font-secondary text-fr-xs font-medium text-fr-accent"
							>
								{leadingCommand.label}
							</span>
						))}
					{inline ? (
						<>
							<UserImageThumbnails images={imageSrcs} />
							{inlineSegments.map((segment, index) =>
								segment.type === "paste" ? (
									<PastedTextDisclosure key={`paste-${index}`} text={segment.text} />
								) : segment.text ? (
									<p
										key={`text-${index}`}
										className={cn(
											"m-0 whitespace-pre-wrap text-pretty",
											(imageSrcs.length > 0 || index > 0) && "mt-2",
										)}
									>
										{renderTextWithImageMarkers(segment.text, `${inlineKey}-${index}`)}
									</p>
								) : null,
							)}
						</>
					) : (
						allBlocks.map((block, index) => <Fragment key={index}>{renderUserBlock(block, index)}</Fragment>)
					)}
				</div>
				<MessageActions
					actions={actions}
					timestamp={message.timestamp}
					align="end"
					className="mt-1 px-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100"
				/>
				{overlay}
			</div>
		</div>
	);
}

function AgentThreadMessage({
	message,
	isLast,
	isStreaming,
	showAvatar,
	showHeader,
	components,
	className,
}: ThreadMessageProps) {
	const { actions, overlay } = useThreadMessageActions(message);
	// Thread turns render eagerly — no `content-visibility` deferral (see theme.css:
	// it flashed blank placeholder boxes during streaming and idle scroll, now removed).
	return (
		<div data-slot="thread-message" data-role="agent" className={cn("group/msg relative min-w-0", className)}>
			{showHeader && showAvatar && (
				<MessageHeader
					messageRole="agent"
					name={message.name ?? "Assistant"}
					meta={message.meta}
					showAvatar={showAvatar}
				/>
			)}
			<MessageBody message={message} isLast={isLast} isStreaming={isStreaming} components={components} />
			{!isStreaming && (
				<MessageActions
					actions={actions}
					timestamp={message.timestamp}
					align="start"
					className="mt-1.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100"
				/>
			)}
			{overlay}
		</div>
	);
}

export function ThreadMessage({
	message,
	isLast,
	isStreaming,
	showHeader = true,
	showAvatar = true,
	components,
	className,
}: ThreadMessageProps) {
	const renderers = useSurfaceRendererMap();
	if (message.role === "divider") {
		return <MessageDivider message={message} />;
	}

	// A registered `msg:<customType>` surface renders an Engine custom message;
	// otherwise fall through to the normal message body (plain-text fallback).
	// Placement is a host-UI concept, so only the entry's render function matters here.
	const customEntry = message.customType ? renderers[`msg:${message.customType}`] : undefined;
	const customRender = typeof customEntry === "function" ? customEntry : customEntry?.render;
	if (customRender) {
		return (
			<CustomThreadMessage
				message={message}
				render={customRender}
				showHeader={showHeader}
				showAvatar={showAvatar}
				className={className}
			/>
		);
	}

	if (message.role === "user") {
		return (
			<UserThreadMessage
				message={message}
				isLast={isLast}
				isStreaming={isStreaming}
				showHeader={showHeader}
				showAvatar={showAvatar}
				components={components}
				className={className}
			/>
		);
	}

	return (
		<AgentThreadMessage
			message={message}
			isLast={isLast}
			isStreaming={isStreaming}
			showHeader={showHeader}
			showAvatar={showAvatar}
			components={components}
			className={className}
		/>
	);
}

// Thread — THE single driver-bound conversation composition.
//
// One implementation, one spacing system. `<Thread>` maps the session transcript
// into `<ThreadMessage>` turns inside a stick-to-bottom viewport, and pins the one
// `<WorkingTail>` (presence + working verb). All vertical rhythm is owned by flex
// `gap` on the `.fr-thread` container and its sub-containers (density-scaled
// tokens in theme.css) — blocks set zero outer margin. The shell injects chrome
// (presence node, empty state, content width) via props; the verber lane re-lands
// its phrase resolution by feeding `verb`. See `docs/design/14-thread-architecture.md`.

import type { SessionAttachment, SessionQueuedMessage } from "@fraym-ai/driver";
import { resolveWispPreset } from "@fraym-ai/vibr";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { undeliveredQueuedMessages } from "../../hooks/session-transcript";
import type { SessionNotice, SessionState, SessionTranscriptMessage, TranscriptBlock } from "../../hooks/session-types";
import { useSession } from "../../hooks/use-session";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import type { MessageBlockRendererMap } from "../../registries/message-block-registry";
import { useSettings } from "../../settings/use-settings";
import type { MessageBlock, MessageData } from "../message/message";
import { renderTextWithImageMarkers, UserImageThumbnails } from "../message/messages/image-block";
import { RetryNotice } from "../message/messages/message-blocks";
import { StreamWisp } from "../presence/stream-wisp";
import type { FraymDensity } from "../surface-kit";
import { type ThreadCollapseMode, useToolDisplaySettings } from "../tool-card/tool-display-settings";
import { toMessageBlock } from "./message-blocks";
import { MessageThreadViewport } from "./message-thread-viewport";
import { ThreadMessage } from "./thread-message";
import { WorkingTail } from "./working-tail";

const LOAD_MORE_CHUNK = 5;

/** How long the "Recovered after retrying" success line lingers in the rail before it
 *  self-dismisses. The storm is over and nothing is actionable, so the green confirmation
 *  is a brief acknowledgment — not a standing notice pinned above the working tail. */
const RETRY_SUCCESS_DISMISS_MS = 4000;

export interface ThreadProps {
	/** Presence node pinned in the tail (e.g. `<Presence avatar="nebula" />`). */
	readonly presence?: ReactNode;
	/** Working verb shown while streaming (verber-resolved by the caller). Defaults to the session's working status. */
	readonly verb?: string;
	/** Force the tail on/off. Defaults to `presence != null || isStreaming`. */
	readonly showPresence?: boolean;
	/** Slot shown above the transcript when present (e.g. an "opening session" placeholder). */
	readonly emptyState?: ReactNode;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	/** Per-type renderer overrides; take precedence over the block registry. */
	readonly components?: MessageBlockRendererMap;
	/** Fallback meta for agent messages that carry none (e.g. the model badge). */
	readonly agentMetaFallback?: string;
	/** Display name for assistant messages (realm persona, e.g. a branded agent name); defaults to "Assistant". */
	readonly assistantName?: string;
	/** Density driving the rhythm tokens; defaults to the tool-display setting. */
	readonly density?: FraymDensity;
	/** How agent turns condense: `worked` (Codex-style "Worked for Xs") or `simple` (block notice). Defaults to the tool-display setting. */
	readonly collapseMode?: ThreadCollapseMode;
	readonly className?: string;
	/** Classes for the centered content column (width / padding). */
	readonly contentClassName?: string;
}

function toVisibleMessageBlocks(entry: SessionTranscriptMessage, cap: boolean, max: number): readonly MessageBlock[] {
	if (!cap || entry.role !== "agent" || entry.blocks.length <= max) {
		return entry.blocks.map(toMessageBlock);
	}
	const hiddenBlocks = entry.blocks.length - max;
	return [
		{
			type: "notice",
			level: "info",
			message: `${hiddenBlocks} earlier blocks collapsed (streaming\u2026)`,
		},
		...entry.blocks.slice(-max).map(toMessageBlock),
	];
}
function trailingAnswerStart(blocks: readonly TranscriptBlock[]): number {
	for (let i = blocks.length - 1; i >= 0; i--) {
		const type = blocks[i]?.type;
		// The per-response token-usage footer trails its answer (mirrors message-body's
		// answerStartIndex); skip it so a turn ending in `tokenUsage` still has a trailing answer.
		if (type === "tokenUsage") continue;
		if (type !== "text") return i + 1;
	}
	return 0;
}

function hasWorkedCollapseShape(blocks: readonly TranscriptBlock[]): boolean {
	const split = trailingAnswerStart(blocks);
	if (split === 0 || split >= blocks.length) return false;
	return blocks.slice(split).some(block => block.type === "text" && block.text.trim().length > 0);
}

export function toThreadMessage(
	entry: SessionTranscriptMessage,
	agentMetaFallback: string | undefined,
	assistantName: string | undefined,
	mode: ThreadCollapseMode,
	cap: boolean,
	maxBlocks: number,
	/** This turn is the live, streaming tail (isLast && isStreaming). A live turn is
	 *  NEVER folded to "Worked for Xs": the journal marks every in-progress turn
	 *  final:true with a growing duration, so folding mid-run would collapse the moment
	 *  intermediate text appears, then re-expand as the next step streams. */
	live = false,
): MessageData {
	const base = {
		id: entry.id,
		role: entry.role,
		name: entry.role === "user" ? "You" : (assistantName ?? "Assistant"),
		meta: entry.role === "agent" ? (entry.meta ?? agentMetaFallback) : entry.meta,
		timestamp: entry.timestamp,
		customType: entry.customType,
		payload: entry.payload,
	};
	// Chrome-less divider (e.g. the compaction "done" marker, synthesized from the
	// neutral `compactionFinished` event). MessageDivider renders CompactionSplit
	// from these fields; blocks are unused.
	if (entry.role === "divider") {
		return {
			...base,
			blocks: [],
			variant: entry.variant,
			...(entry.toSessionId !== undefined ? { toSessionId: entry.toSessionId } : {}),
			...(entry.reason !== undefined ? { reason: entry.reason } : {}),
			...(entry.auto !== undefined ? { auto: entry.auto } : {}),
			...(entry.tokens !== undefined ? { tokens: entry.tokens } : {}),
			...(entry.summary !== undefined ? { summary: entry.summary } : {}),
		};
	}
	// `worked` mode is Codex-style: fold the work trace into "Worked for Xs" once a turn
	// is COMPLETE — settled (engine `final: true` or duration metadata) AND not the live
	// streaming tail. The journal stamps in-progress turns final:true with a growing
	// duration, so the `!live` guard is what stops a folded "Worked for Xs" from
	// flickering back to "Thinking" when the run takes another step. The shape check
	// (work + trailing answer) is layout safety: no disclosure unless there's something
	// to fold AND an answer to keep visible.
	if (mode === "worked" && entry.role === "agent") {
		const blocks = entry.blocks.map(toMessageBlock);
		const isSettled =
			!live && (entry.final === true || entry.durationMs !== undefined) && (entry.durationMs ?? 0) > 0;
		if (!isSettled || !hasWorkedCollapseShape(entry.blocks)) {
			// Worked mode never count-windows the turn (block windowing is the SIMPLE
			// strategy): stream the whole turn; it folds to "Worked for Xs" once settled.
			return { ...base, blocks };
		}
		return {
			...base,
			blocks,
			collapse: "worked",
			turnStartedAt: entry.timestamp,
			turnDurationMs: entry.durationMs,
		};
	}
	return { ...base, blocks: toVisibleMessageBlocks(entry, cap, maxBlocks) };
}

interface ThreadMessageTurnProps {
	readonly entry: SessionTranscriptMessage;
	readonly isLast: boolean;
	readonly isStreaming: boolean;
	readonly showHeader: boolean;
	readonly showAvatar: boolean;
	readonly components?: MessageBlockRendererMap;
	readonly agentMetaFallback?: string;
	readonly assistantName?: string;
	readonly collapseMode: ThreadCollapseMode;
	readonly maxBlocks: number;
}

const ThreadMessageTurn = memo(function ThreadMessageTurn({
	entry,
	isLast,
	isStreaming,
	showHeader,
	showAvatar,
	components,
	agentMetaFallback,
	assistantName,
	collapseMode,
	maxBlocks,
}: ThreadMessageTurnProps) {
	const message = useMemo(
		() => toThreadMessage(entry, agentMetaFallback, assistantName, collapseMode, true, maxBlocks, isStreaming),
		[entry, agentMetaFallback, assistantName, collapseMode, maxBlocks, isStreaming],
	);
	return (
		<ThreadMessage
			message={message}
			isLast={isLast}
			isStreaming={isStreaming}
			showHeader={showHeader}
			showAvatar={showAvatar}
			components={components}
		/>
	);
});

interface ThreadTranscriptProps {
	readonly transcript: readonly SessionTranscriptMessage[];
	readonly isStreaming: boolean;
	readonly showHeader: boolean;
	readonly showAvatar: boolean;
	readonly components?: MessageBlockRendererMap;
	readonly agentMetaFallback?: string;
	readonly assistantName?: string;
	readonly collapseMode: ThreadCollapseMode;
	readonly maxBlocks: number;
}

function ThreadTranscript({
	transcript,
	isStreaming,
	showHeader,
	showAvatar,
	components,
	agentMetaFallback,
	assistantName,
	collapseMode,
	maxBlocks,
}: ThreadTranscriptProps) {
	return transcript.map((entry, index) => {
		const isLast = index === transcript.length - 1;
		return (
			<ThreadMessageTurn
				key={entry.id}
				entry={entry}
				isLast={isLast}
				isStreaming={isLast && isStreaming}
				showHeader={showHeader}
				showAvatar={showAvatar}
				components={components}
				agentMetaFallback={agentMetaFallback}
				assistantName={assistantName}
				collapseMode={collapseMode}
				maxBlocks={maxBlocks}
			/>
		);
	});
}

function EarlierTurnsButton({ count, onLoad }: { readonly count: number; readonly onLoad: () => void }) {
	if (count <= 0) return null;
	return (
		<button
			type="button"
			onClick={onLoad}
			className="mx-auto flex items-center gap-1.5 rounded-full border border-fr-border-soft bg-fr-surface px-3 py-1 font-secondary text-fr-xs text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
		>
			<Icon name="caretR" size={11} strokeWidth={2.2} className="-rotate-90" />
			{count} earlier {count === 1 ? "turn" : "turns"} · scroll up or click to load
		</button>
	);
}

function NoticeDismiss({ onDismiss }: { readonly onDismiss: () => void }) {
	return (
		<button
			type="button"
			aria-label="Dismiss notice"
			onClick={onDismiss}
			className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full text-fr-text-3 opacity-0 transition-opacity hover:bg-fr-surface-3 hover:text-fr-text group-hover:opacity-100 focus-visible:opacity-100"
		>
			<Icon name="x" size={12} />
		</button>
	);
}

/** Provider auto-retry: ONE compact, collapsible row (not a card per attempt).
 *  `failed` opens by default (actionable); `started`/`succeeded` stay folded —
 *  a success reads as a single green "Recovered after retrying" line that then
 *  self-dismisses after a beat (transient, nothing actionable), so it never stays
 *  pinned above the working tail. The condensed provider error lives behind the caret. */
export function RetryNoticeRow({
	notice,
	onDismiss,
}: {
	readonly notice: SessionNotice;
	readonly onDismiss: () => void;
}) {
	const [open, setOpen] = useState(false);
	const retry = notice.retry;
	// Auto-expand once the storm ends in failure so the error is visible without a click. The
	// row's stable key means it never remounts, so this is the only point `open` flips on its
	// own; `started`/`succeeded` leave the user's toggle untouched.
	useEffect(() => {
		if (retry?.phase === "failed") setOpen(true);
	}, [retry?.phase]);
	// Auto-dismiss the success acknowledgment: once the storm RECOVERS nothing is actionable,
	// so "Recovered after retrying" leaves the rail after a beat instead of pinning above the
	// working tail forever. `failed` (actionable) and the in-flight rows persist. `onDismiss`
	// closes over the notice's live array index and is recreated on every parent render
	// (frequent while the tail streams), so a ref feeds the timer the latest dismisser without
	// re-arming it — the effect re-runs only when the phase actually flips.
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;
	useEffect(() => {
		if (retry?.phase !== "succeeded") return;
		const timer = setTimeout(() => onDismissRef.current(), RETRY_SUCCESS_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [retry?.phase]);
	if (!retry) return null;
	const detail = retry.detail?.trim();
	const expandable = Boolean(detail);
	const header = (
		<>
			<RetryNotice
				phase={retry.phase}
				attempt={retry.attempt}
				maxAttempts={retry.maxAttempts}
				message={notice.message}
				className="my-0"
			/>
			{expandable && (
				<Icon
					name="caretR"
					size={11}
					strokeWidth={2.2}
					className={cn("ml-auto shrink-0 text-fr-text-3 transition-transform", open && "rotate-90")}
				/>
			)}
		</>
	);
	return (
		<div
			data-slot="thread-notice-retry"
			className="group relative rounded-[9px] border border-fr-border-soft bg-fr-surface px-3 py-1 pr-8"
		>
			{expandable ? (
				<button
					type="button"
					onClick={() => setOpen(o => !o)}
					aria-expanded={open}
					className="flex w-full items-center gap-1.5 text-left"
				>
					{header}
				</button>
			) : (
				<div className="flex w-full items-center gap-1.5 text-left">{header}</div>
			)}
			{open && detail && (
				<div className="mt-1.5 whitespace-pre-wrap break-words border-t border-fr-border-soft pt-1.5 font-mono text-fr-2xs text-fr-text-3">
					{detail}
				</div>
			)}
			<NoticeDismiss onDismiss={onDismiss} />
		</div>
	);
}

export function PlainNoticeRow({
	notice,
	onDismiss,
}: {
	readonly notice: SessionNotice;
	readonly onDismiss: () => void;
}) {
	// Self-dismiss transient notices (those carrying a `ttlMs`, e.g. a TTSR rule
	// injection) so they don't pin above the working tail. `onDismiss` closes over
	// the notice's live array index and is recreated every parent render, so a ref
	// feeds the timer the latest dismisser without re-arming — the effect re-runs
	// only when the notice identity/message/ttl changes (mirrors RetryNoticeRow).
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;
	// biome-ignore lint/correctness/useExhaustiveDependencies: notice id/message changes intentionally reset the TTL timer.
	useEffect(() => {
		if (notice.ttlMs === undefined) return;
		const timer = setTimeout(() => onDismissRef.current(), notice.ttlMs);
		return () => clearTimeout(timer);
	}, [notice.id, notice.message, notice.ttlMs]);
	return (
		<div
			data-slot="thread-notice"
			className={cn(
				"group relative rounded-[9px] border px-3 py-2 pr-8 text-fr-sm",
				notice.level === "error" && "border-fr-del bg-fr-del-bg text-fr-del",
				notice.level === "warning" && "border-fr-warn bg-[rgba(224,177,91,0.12)] text-fr-warn",
				notice.level === "info" && "border-fr-border-soft bg-fr-surface text-fr-text-2",
			)}
		>
			{notice.message}
			<NoticeDismiss onDismiss={onDismiss} />
		</div>
	);
}

function ThreadNotices({ notices }: { readonly notices: SessionState["notices"] }) {
	const session = useSession();
	if (notices.length === 0) return null;
	return (
		<div data-slot="thread-notices" className="flex flex-col gap-[var(--fr-thread-beat)] [&>*]:my-0">
			{notices.map((notice, index) => {
				const key = notice.id ?? `notice-${index}`;
				const onDismiss = () => session.dismissNotice(index);
				return notice.retry ? (
					<RetryNoticeRow key={key} notice={notice} onDismiss={onDismiss} />
				) : (
					<PlainNoticeRow key={key} notice={notice} onDismiss={onDismiss} />
				);
			})}
		</div>
	);
}

type SessionImageAttachment = Extract<SessionAttachment, { readonly kind: "image" }>;

/** Image attachments riding along with a queued message — the same data a sent
 *  message carries — surfaced through the SAME {@link ImageBlock} so a queued
 *  bubble shows images exactly like a sent one. Pure → unit-tested. */
export function queuedImageAttachments(message: SessionQueuedMessage): readonly SessionImageAttachment[] {
	return (message.attachments ?? []).filter((a): a is SessionImageAttachment => a.kind === "image");
}

/** Display text for a queued bubble. The engine prefixes a synthetic "[Image]"
 *  hint for thumbnail-less clients (the TUI); we render the real thumbnail, so
 *  strip the redundant marker — an image-only message collapses to no text and
 *  shows just the thumbnail. Pure → unit-tested. */
export function queuedDisplayText(message: SessionQueuedMessage): string {
	const text = message.text;
	if (queuedImageAttachments(message).length === 0) return text;
	if (text === "[Image]") return "";
	return text.startsWith("[Image] ") ? text.slice("[Image] ".length) : text;
}

/** Messages the user queued while the agent is working — dimmed, dashed "ghost"
 *  user bubbles at the bottom of the thread (next up after the current turn),
 *  each removable. They mirror Engine's live steering/follow-up queue
 *  (`snapshot.queuedMessages`); deleting one retracts it for real. */
export function PendingQueuedMessages({
	messages,
	onRemove,
}: {
	readonly messages: readonly SessionQueuedMessage[];
	readonly onRemove?: (id: string) => void;
}) {
	if (messages.length === 0) return null;
	return (
		<div data-slot="pending-queue" className="flex flex-col gap-2">
			{messages.map(message => (
				<QueuedMessageBubble key={message.id} message={message} onRemove={onRemove} />
			))}
		</div>
	);
}

/** One queued "ghost" bubble: image attachments (the same ImageBlock thumbnail a
 *  sent message uses) above the text, then the queue-mode footer. */
function QueuedMessageBubble({
	message,
	onRemove,
}: {
	readonly message: SessionQueuedMessage;
	readonly onRemove?: (id: string) => void;
}) {
	const images = queuedImageAttachments(message);
	const text = queuedDisplayText(message);
	return (
		<div
			data-slot="message"
			data-role="user"
			data-pending="true"
			className="flex justify-end max-[520px]:justify-start"
		>
			<div className="flex min-w-0 max-w-[74%] items-start gap-1 max-[520px]:max-w-full">
				<button
					type="button"
					aria-label="Remove queued message"
					onClick={onRemove ? () => onRemove(message.id) : undefined}
					disabled={!onRemove}
					className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-del focus-visible:bg-fr-surface-2 disabled:opacity-40"
				>
					<Icon name="x" size={13} />
				</button>
				<div className="min-w-0">
					<div className="inline-block max-w-full break-words rounded-[14px] border border-dashed border-fr-border bg-fr-surface px-3.5 py-2.5 text-sm text-fr-text-2 max-[520px]:block max-[520px]:w-full">
						{images.length > 0 && (
							<UserImageThumbnails images={images.map(a => ({ src: `data:${a.mimeType};base64,${a.data}` }))} />
						)}
						{(text || images.length > 0) && (
							<p className={cn("m-0 whitespace-pre-wrap text-pretty", text && images.length > 0 && "mt-2")}>
								{renderTextWithImageMarkers(text, `q-${message.id}`)}
							</p>
						)}
					</div>
					<div className="mt-1 pr-1 text-right text-fr-2xs text-fr-text-3 max-[520px]:text-left">
						{message.mode === "steer" ? "Queued · steers this turn" : "Queued · sends after this turn"}
					</div>
				</div>
			</div>
		</div>
	);
}

/** The id of the newest user turn, or null — the send signal for stick-to-bottom. */
export function lastUserMessageId(transcript: readonly SessionTranscriptMessage[]): string | null {
	for (let i = transcript.length - 1; i >= 0; i--) {
		const entry = transcript[i];
		if (entry?.role === "user") return entry.id;
	}
	return null;
}

interface ThreadFrameProps {
	readonly className?: string;
	readonly components?: MessageBlockRendererMap;
	readonly contentClassName?: string;
	readonly collapseMode: ThreadCollapseMode;
	readonly density: FraymDensity;
	readonly emptyState?: ReactNode;
	readonly hiddenTurns: number;
	readonly isStreaming: boolean;
	readonly loadMoreTurns: () => void;
	readonly maxBlocks: number;
	readonly notices: SessionState["notices"];
	readonly showAvatar: boolean;
	readonly showHeader: boolean;
	readonly tailPresence?: ReactNode;
	readonly tailShow: boolean;
	readonly tailStreaming: boolean;
	readonly tailReconnecting: boolean;
	readonly tailVerb: string;
	readonly transcript: readonly SessionTranscriptMessage[];
	readonly agentMetaFallback?: string;
	readonly assistantName?: string;
	readonly streamWisp?: ReactNode;
	readonly pendingTurns?: ReactNode;
	readonly pinKey: string;
}

function ThreadFrame({
	className,
	components,
	contentClassName,
	collapseMode,
	density,
	emptyState,
	hiddenTurns,
	isStreaming,
	loadMoreTurns,
	maxBlocks,
	notices,
	showAvatar,
	showHeader,
	tailPresence,
	tailShow,
	tailStreaming,
	tailReconnecting,
	tailVerb,
	transcript,
	agentMetaFallback,
	assistantName,
	streamWisp,
	pendingTurns,
	pinKey,
}: ThreadFrameProps) {
	return (
		<MessageThreadViewport
			className={className}
			hasMoreTop={hiddenTurns > 0}
			onLoadMoreTop={loadMoreTurns}
			pinKey={pinKey}
			// The assistant-turn jump is fixed at the source: the live turn opts out of the
			// content-visibility placeholder (no phantom 180px box) so it mounts at its true
			// height and the auto-scroll absorbs the growth without overshooting the band.
			// This widened pinned band stays as defense-in-depth — the tail (presence + verb)
			// is ~60-80px tall, and the default 80px at-bottom threshold sat right at that edge
			// — and the bottom pad lets the tail + composer breathe (content rides a little
			// higher instead of flush at the edge).
			threshold={140}
			contentClassName="pb-6"
		>
			{streamWisp}
			<div className={cn("mx-auto w-full", contentClassName)}>
				<div
					data-slot="thread"
					data-density={density}
					className="fr-thread flex flex-col gap-[var(--fr-thread-turn)] [&>*]:my-0"
				>
					{emptyState}
					<EarlierTurnsButton count={hiddenTurns} onLoad={loadMoreTurns} />
					<ThreadTranscript
						transcript={transcript}
						isStreaming={isStreaming}
						showHeader={showHeader}
						showAvatar={showAvatar}
						components={components}
						agentMetaFallback={agentMetaFallback}
						assistantName={assistantName}
						collapseMode={collapseMode}
						maxBlocks={maxBlocks}
					/>
					<ThreadNotices notices={notices} />
					<WorkingTail
						presence={tailPresence}
						verb={tailVerb}
						streaming={tailStreaming}
						reconnecting={tailReconnecting}
						show={tailShow}
					/>
					{pendingTurns}
				</div>
			</div>
		</MessageThreadViewport>
	);
}

function useVisibleThreadTranscript(transcript: readonly SessionTranscriptMessage[], maxTurns: number) {
	const [extraTurns, setExtraTurns] = useState(0);
	const total = transcript.length;
	// Fold (window away) only the VERY early turns, keeping `maxTurns` of recent context
	// (config-driven). `slice(-N)` is STABLE while a run streams — a run is ONE growing
	// message, so the turn count doesn't change mid-reply and the visible set never
	// re-folds while the agent types (what made the DOM jump up and down). The set only
	// shifts when a NEW exchange begins: at rest, pinned at the bottom, where the
	// viewport's height-shrink guard keeps that shift invisible. `extraTurns` accumulates
	// the user's "load older" expansions on top of the configured window, so editing the
	// setting takes effect live without discarding what was already revealed.
	const visibleTurns = maxTurns + extraTurns;
	const visibleTranscript = visibleTurns >= total ? transcript : transcript.slice(-visibleTurns);
	const hiddenTurns = total - visibleTranscript.length;
	const loadMoreTurns = useCallback(() => setExtraTurns(extra => extra + LOAD_MORE_CHUNK), []);
	return { hiddenTurns, loadMoreTurns, transcript: visibleTranscript };
}

function renderTailPresence(
	streamWispOn: boolean,
	presence: ReactNode | undefined,
	wispAnchorRef: React.RefObject<HTMLSpanElement | null>,
	hidden = false,
) {
	if (!streamWispOn || presence == null) return presence;
	// Keep the anchor span laid out (StreamWisp measures it as the wisp's home);
	// fade only the inner avatar so a settled wisp can take over the tile.
	return (
		<span ref={wispAnchorRef} className="inline-flex">
			<span
				className={cn("inline-flex transition-opacity duration-500", hidden && "opacity-0")}
				aria-hidden={hidden}
			>
				{presence}
			</span>
		</span>
	);
}

/** Stable id for the live, in-progress compaction divider. The divider is
 *  DERIVED from `session.isCompacting` at render (not a transcript entry), so it
 *  survives journal refreshes and session switches — `isCompacting` is
 *  rehydrated from the snapshot on reopen, and the durable "done" divider
 *  replaces it when compaction finishes. */
const ACTIVE_COMPACTION_DIVIDER_ID = "compaction:active";

function activeCompactionDivider(reason: string | null): SessionTranscriptMessage {
	return {
		id: ACTIVE_COMPACTION_DIVIDER_ID,
		role: "divider",
		blocks: [],
		variant: "compacting",
		auto: reason !== "manual",
	};
}

function useThreadFrameProps(props: ThreadProps): ThreadFrameProps {
	const {
		presence,
		verb,
		showPresence,
		emptyState,
		showHeader = true,
		showAvatar = true,
		components,
		agentMetaFallback,
		assistantName,
		density,
		collapseMode,
		className,
		contentClassName,
	} = props;
	const session = useSession();
	const settings = useToolDisplaySettings();
	const { config } = useSettings();
	const streamWispOn = config.streamWisp;
	// "auto" follows the avatar's kin; explicit picks are honored only while
	// compatible — the registry clamps incompatible avatar/preset pairs.
	const streamWispPreset = resolveWispPreset(config.streamWispPreset, config.avatar);
	const wispAnchorRef = useRef<HTMLSpanElement>(null);
	const wispOwnsTile = false;
	const resolvedDensity = density ?? settings.density;
	const resolvedCollapseMode = collapseMode ?? settings.collapseMode;
	const resolvedMaxBlocks = settings.maxVisibleBlocks ?? 10;
	const { hiddenTurns, loadMoreTurns, transcript } = useVisibleThreadTranscript(
		session.transcript,
		settings.maxVisibleTurns ?? 12,
	);
	// Synthesize the in-progress "compacting" divider at the tail from live state,
	// so it cannot drift from `isCompacting` (which both the live event and a
	// reopened snapshot set). The journal never carries this marker.
	const visibleTranscript = useMemo(
		() => (session.isCompacting ? [...transcript, activeCompactionDivider(session.compactionReason)] : transcript),
		[transcript, session.isCompacting, session.compactionReason],
	);

	const tailReconnecting = session.reconnecting;
	const tailVerb = verb ?? session.workingStatus?.message ?? (session.vibrVerb || "Thinking");
	const tailShow = showPresence ?? (presence != null || session.isStreaming || tailReconnecting);
	const tailPresence = renderTailPresence(streamWispOn, presence, wispAnchorRef, wispOwnsTile);
	const queuedMessages = session.snapshot?.queuedMessages;
	// Flips only when the user sends (fresh turn → new user id) or steers (queued
	// count changes) — never on agent/stream growth. Drives the viewport snap so a
	// send always brings the user turn + working tail into view without scrolling.
	const sendPinKey = `${lastUserMessageId(session.transcript) ?? ""}#${queuedMessages?.length ?? 0}`;
	// A steered message lands in the transcript immediately but lingers in the
	// pending queue until the turn-boundary refresh — drop the already-delivered
	// ones so it never renders as both a sent bubble AND a "Queued …" bubble.
	const visibleQueued = undeliveredQueuedMessages(queuedMessages ?? [], session.transcript);
	const pendingTurns =
		visibleQueued.length > 0 ? (
			<PendingQueuedMessages messages={visibleQueued} onRemove={session.removeQueuedMessage} />
		) : undefined;

	return {
		className,
		components,
		contentClassName,
		collapseMode: resolvedCollapseMode,
		density: resolvedDensity,
		emptyState,
		hiddenTurns,
		isStreaming: session.isStreaming,
		loadMoreTurns,
		maxBlocks: resolvedMaxBlocks,
		notices: session.notices,
		showAvatar,
		showHeader,
		tailPresence,
		tailShow,
		tailReconnecting,
		tailStreaming: session.isStreaming && !session.isCompacting && !tailReconnecting,
		tailVerb,
		transcript: visibleTranscript,
		agentMetaFallback,
		assistantName,
		streamWisp: streamWispOn && <StreamWisp anchorRef={wispAnchorRef} preset={streamWispPreset} />,
		pendingTurns,
		pinKey: sendPinKey,
	};
}

export function Thread(props: ThreadProps) {
	return <ThreadFrame {...useThreadFrameProps(props)} />;
}

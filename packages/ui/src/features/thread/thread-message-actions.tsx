// Thread message actions — builds the hover action list for one transcript turn.
//
// Copy is a pure client clipboard op. Branch / Fork mirror Engine's `/branch` / `/fork` session-tree
// ops, wired over the driver: Branch rewinds THIS session in place to just before a USER message
// (navigateSessionTree drops that turn + everything after and returns its text to the composer);
// Fork spins off a NEW session (forkSession) — from a user message it keeps everything before it
// (text prefilled), from an agent message everything up to and including it. Each is gated by a
// ConfirmDialog. The hook returns the actions plus an `overlay` node (the confirm dialog when
// open) the message component renders.

import type { SessionRef } from "@fraym/driver";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { ConfirmDialog } from "../../components/confirm-dialog";
import type { MessageAction } from "../../elements/message-actions";
import { useSessionNavigation } from "../../hooks/session-navigation";
import { useSessionOptional } from "../../hooks/use-session";
import { editorImagesToAttachments, seedSessionComposerDraft } from "../composer/session-composer-draft";
import type { MessageBlock, MessageData } from "../message/message";

const COPIED_RESET_MS = 1600;

/** Plain-text projection of a turn for the clipboard: text blocks joined, work-trace blocks skipped. */
export function messagePlainText(blocks: readonly MessageBlock[]): string {
	const parts: string[] = [];
	for (const block of blocks) {
		if (block.type !== "text") continue;
		const text = typeof block.text === "string" ? block.text.trim() : "";
		if (text) parts.push(text);
	}
	return parts.join("\n\n");
}

function htmlEscape(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Image `data:`/URL srcs in render order — copied as `<img>` in `text/html` so a composer paste
 *  re-attaches the images (and other apps see them too). */
function messageImageSrcs(blocks: readonly MessageBlock[]): string[] {
	return blocks
		.filter(block => block.type === "image" && typeof block.src === "string")
		.map(block => block.src as string);
}

/** Copy a turn: with images, write `text/plain` (the text) + `text/html` (`<img>` + the text) so the
 *  composer can re-attach them; fall back to plain text where the rich clipboard isn't available. */
async function copyMessageToClipboard(text: string, imageSrcs: readonly string[]): Promise<void> {
	if (typeof navigator === "undefined" || !navigator.clipboard) return;
	if (imageSrcs.length > 0 && typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
		const imgs = imageSrcs.map(src => `<img src="${htmlEscape(src)}" alt="image">`).join("");
		const body = text ? `<div>${htmlEscape(text).replace(/\n/g, "<br>")}</div>` : "";
		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					"text/plain": new Blob([text], { type: "text/plain" }),
					"text/html": new Blob([`${imgs}${body}`], { type: "text/html" }),
				}),
			]);
			return;
		} catch {
			// Rich write rejected (permissions / unsupported type) — fall back to text-only.
		}
	}
	await navigator.clipboard.writeText(text);
}

function useCopyMessageAction(message: MessageData): MessageAction | null {
	const [copied, setCopied] = useState(false);
	const text = messagePlainText(message.blocks);
	const imageSrcs = useMemo(() => messageImageSrcs(message.blocks), [message.blocks]);
	const hasContent = Boolean(text) || imageSrcs.length > 0;
	const onClick = useCallback(() => {
		if (!hasContent) return;
		void copyMessageToClipboard(text, imageSrcs).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), COPIED_RESET_MS);
		}, undefined);
	}, [hasContent, text, imageSrcs]);
	return useMemo<MessageAction | null>(
		() =>
			hasContent
				? {
						id: "copy",
						icon: copied ? "check" : "copy",
						label: "Copy",
						activeLabel: "Copied",
						active: copied,
						onClick,
					}
				: null,
		[hasContent, copied, onClick],
	);
}

/** The composer draft store key — MUST match the shell's `sessionRefKey`
 *  (`${workspaceId}:${sessionId}`) so a Branch/Fork prefill lands in the right composer. */
function composerKeyFor(ref: SessionRef): string {
	return `${ref.workspaceId}:${ref.sessionId}`;
}

interface BranchForkActions {
	readonly actions: readonly MessageAction[];
	readonly overlay: ReactNode;
}

/** Branch (user messages) + Fork (user & agent messages) hover actions, each gated by a confirm
 *  dialog. Inert when there's no session driver (e.g. static/preview render) or no entry id. */
function useBranchForkActions(message: MessageData): BranchForkActions {
	const session = useSessionOptional();
	const navigation = useSessionNavigation();
	const [pending, setPending] = useState<"branch" | "fork" | null>(null);
	const [busy, setBusy] = useState(false);

	const driver = session?.driver ?? null;
	const sessionRef = session?.sessionRef ?? null;
	const reload = session?.reload;
	const entryId = message.id;
	const role = message.role;
	const canBranch = Boolean(driver && sessionRef && entryId && role === "user");
	const canFork = Boolean(driver?.forkSession && sessionRef && entryId && (role === "user" || role === "agent"));

	const runBranch = useCallback(async () => {
		if (!driver || !sessionRef || !entryId) return;
		setBusy(true);
		try {
			const result = await driver.navigateSessionTree(sessionRef, entryId);
			await reload?.();
			const images = editorImagesToAttachments(result.editorImages);
			if (result.editorText || images.length > 0)
				seedSessionComposerDraft(composerKeyFor(sessionRef), result.editorText ?? "", images);
		} finally {
			setBusy(false);
			setPending(null);
		}
	}, [driver, sessionRef, entryId, reload]);

	const runFork = useCallback(async () => {
		if (!driver?.forkSession || !sessionRef || !entryId) return;
		setBusy(true);
		try {
			const result = await driver.forkSession(sessionRef, entryId);
			const images = editorImagesToAttachments(result.editorImages);
			if (result.editorText || images.length > 0)
				seedSessionComposerDraft(composerKeyFor(result.snapshot.ref), result.editorText ?? "", images);
			navigation.openSession?.(result.snapshot.ref);
		} finally {
			setBusy(false);
			setPending(null);
		}
	}, [driver, sessionRef, entryId, navigation]);

	const actions = useMemo<readonly MessageAction[]>(() => {
		const list: MessageAction[] = [];
		if (canBranch) {
			list.push({ id: "branch", icon: "history", label: "Branch here", onClick: () => setPending("branch") });
		}
		if (canFork) {
			list.push({ id: "fork", icon: "git-branch", label: "Fork here", onClick: () => setPending("fork") });
		}
		return list;
	}, [canBranch, canFork]);

	const overlay = useMemo<ReactNode>(() => {
		if (pending === "branch") {
			return (
				<ConfirmDialog
					title="Branch from here?"
					description="Rewinds this session to just before this message — this message and everything after it drop off the active branch, and its text returns to the composer to edit and resend. The old path stays reachable from the session tree."
					confirmLabel="Branch"
					icon="history"
					busy={busy}
					onConfirm={() => void runBranch()}
					onClose={() => setPending(null)}
				/>
			);
		}
		if (pending === "fork") {
			return (
				<ConfirmDialog
					title="Fork from here?"
					description={
						role === "user"
							? "Creates a NEW session with everything before this message; its text lands in the composer. This session is left untouched."
							: "Creates a NEW session with the conversation up to and including this message. This session is left untouched."
					}
					confirmLabel="Fork"
					icon="git-branch"
					busy={busy}
					onConfirm={() => void runFork()}
					onClose={() => setPending(null)}
				/>
			);
		}
		return null;
	}, [pending, busy, role, runBranch, runFork]);

	return { actions, overlay };
}

export interface ThreadMessageActions {
	readonly actions: readonly MessageAction[];
	/** Confirm-dialog overlay for a pending Branch/Fork; the message component renders it. */
	readonly overlay: ReactNode;
}

/** Ordered hover actions for a transcript turn: Branch (user messages) and Fork (user + agent
 *  messages) when a session driver is available, then Copy LAST (rightmost) — it's the most-used
 *  action, so it sits at the end of the row nearest the pointer's resting edge. */
export function useThreadMessageActions(message: MessageData): ThreadMessageActions {
	const copy = useCopyMessageAction(message);
	const { actions: branchFork, overlay } = useBranchForkActions(message);
	const actions = useMemo(() => (copy ? [...branchFork, copy] : [...branchFork]), [copy, branchFork]);
	return { actions, overlay };
}

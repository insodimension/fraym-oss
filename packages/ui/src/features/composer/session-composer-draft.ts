import { useEffect, useRef, useState } from "react";
import type { ComposerImageAttachment, ComposerPasteAttachment } from "./composer-core";

/**
 * Per-session composer drafts — unsent text + image attachments, keyed by session.
 *
 * Session composers are remounted when the active session changes, which used to
 * drop any unsent draft (you'd lose a half-written message + attached image just by
 * glancing at another session). This module-level store outlives those remounts, so
 * each session keeps its own draft and switching back restores it. It is cleared on a
 * successful send and is in-memory only (not persisted across reloads — the bug it
 * fixes is losing a draft on a session switch, not across an app restart).
 */
export interface SessionComposerDraft {
	readonly text: string;
	readonly attachments: readonly ComposerImageAttachment[];
	readonly pasteAttachments: readonly ComposerPasteAttachment[];
}

const EMPTY: SessionComposerDraft = { text: "", attachments: [], pasteAttachments: [] };
const drafts = new Map<string, SessionComposerDraft>();

/**
 * Programmatic composer seeds (branch/fork prefill). The seed is written straight into the
 * shared `drafts` store — the SAME store the pane composer persists to and reads on mount — so
 * whichever composer is bound to `key` (docked frame or split pane) picks it up from ONE place.
 * That avoids the one-shot race an earlier design hit: multiple composers subscribed and the
 * first to read a destructive "pending" seed stole it from the others. Listeners still fire so an
 * ALREADY-mounted composer (branch: same session, key unchanged) repaints now, not on next mount.
 */
type ComposerSeedListener = (key: string) => void;
const seedListeners = new Set<ComposerSeedListener>();

/** Seed the composer for `key` with branch/fork prefill `text` + image `attachments` (tray
 *  thumbnails) — writes the shared draft and notifies live composers. Empty `text` AND no
 *  `attachments` clears the seeded draft. */
export function seedSessionComposerDraft(
	key: string,
	text: string,
	attachments: readonly ComposerImageAttachment[] = [],
): void {
	if (text || attachments.length > 0) drafts.set(key, { text, attachments, pasteAttachments: [] });
	else drafts.delete(key);
	for (const listener of seedListeners) listener(key);
}

/** Map engine branch/fork `editorImages` ({@link data}/{@link mimeType}) to composer
 *  attachments, minting stable draft-local ids + display names (the engine ships neither,
 *  and {@link ComposerImageAttachment} requires both). */
export function editorImagesToAttachments(
	images: readonly { readonly data: string; readonly mimeType: string }[] | undefined,
): ComposerImageAttachment[] {
	return (images ?? []).map((img, i) => ({
		id: `branch-img-${i}-${crypto.randomUUID()}`,
		name: `image ${i + 1}`,
		mimeType: img.mimeType,
		data: img.data,
	}));
}

/** Peek the shared draft text for `key` without consuming it — the frame composer reads this as
 *  a fallback when its own (render-cheap) ref map has no entry, so a seed reaches it too. */
export function peekSessionComposerDraftText(key: string): string | undefined {
	return drafts.get(key)?.text;
}

/** Drop the shared draft for `key` (the frame calls this when the user submits/clears so a
 *  consumed seed does not linger and re-appear behind the emptied field). Notifies listeners
 *  (like an empty-text {@link seedSessionComposerDraft}) so EVERY bound `useSessionComposerDraft`
 *  re-syncs its cached draft to the now-empty store. Without this, the docked composer's separate
 *  attachments-hook instance keeps the seed's stale `text` in its ref and re-persists it on the
 *  same-tick `setAttachments([])`/`setPasteAttachments([])` that fires on submit — resurrecting the
 *  just-sent branch/fork prefill so it reappears on every session switch. */
export function clearSessionComposerDraft(key: string): void {
	drafts.delete(key);
	for (const listener of seedListeners) listener(key);
}

/** Subscribe to composer seeds (branch/fork prefill). Returns an unsubscribe. */
export function subscribeSessionComposerSeed(listener: ComposerSeedListener): () => void {
	seedListeners.add(listener);
	return () => seedListeners.delete(listener);
}

// A structured badge + pre-armed skills that mark a thread's PURPOSE as a
// first-class UI component (a composer pill + skill chips), without dumping
// priming text into the editable draft. Submission injects the same structured
// context into the actual prompt. It stays pinned for the thread's life until
// explicitly cleared.

export interface ComposerSeededContext {
	/** Leading badge pill: what the thread is for (e.g. "New loop", "Editing foo"). */
	readonly badge?: { readonly label: string; readonly icon: string };
	/** Skills pre-armed on the thread, shown as chips (e.g. the autonomy skill). */
	readonly skills?: readonly string[];
}

/** Materialize visible composer context into the submitted prompt. Skill tokens
 * already typed by the user are not duplicated. */
export function applyComposerSeededContext(value: string, context: ComposerSeededContext | undefined): string {
	const missingSkills = (context?.skills ?? []).filter(skill => !value.includes(`/skill:${skill}`));
	const skillPrefix = missingSkills.map(skill => `/skill:${skill}`).join(" ");
	const purposePrefix = context?.badge?.label ? `${context.badge.label}:` : "";
	return [skillPrefix, purposePrefix, value].filter(Boolean).join(" ");
}

const seededContexts = new Map<string, ComposerSeededContext>();

/** Pin a structured context (badge + pre-armed skills) to `key`'s composer, or clear it
 *  (null / empty). Notifies live composers via the shared seed channel. */
export function seedSessionComposerContext(key: string, context: ComposerSeededContext | null): void {
	const empty = !context || (!context.badge && !context.skills?.length);
	if (empty) seededContexts.delete(key);
	else seededContexts.set(key, context);
	for (const listener of seedListeners) listener(key);
}

/** The pinned context for `key`, or undefined. */
export function peekSessionComposerContext(key: string): ComposerSeededContext | undefined {
	return seededContexts.get(key);
}

/** Bind a composer to `key`'s pinned context, re-reading on key change or a seed
 *  fire (mirrors {@link useSessionComposerDraft}). */
export function useSessionComposerContext(key: string): ComposerSeededContext | undefined {
	const [context, setContext] = useState<ComposerSeededContext | undefined>(() => seededContexts.get(key));
	useEffect(() => {
		setContext(seededContexts.get(key));
		return subscribeSessionComposerSeed(changed => {
			if (changed === key) setContext(seededContexts.get(key));
		});
	}, [key]);
	return context;
}

// The composer-draft key of the currently-focused session — where a file dropped ANYWHERE outside
// an explicit drop zone routes (see the global file-drop guard). The active session's composer
// mount registers itself here; "" is the no-session start surface.
let activeDraftKey: string | null = null;

/** Register (or clear) the composer that owns keyboard/drop focus — the drop-anywhere target. */
export function setActiveComposerDraftKey(key: string | null): void {
	activeDraftKey = key;
}

/** The active composer-draft key, or null when no composer is mounted. */
export function getActiveComposerDraftKey(): string | null {
	return activeDraftKey;
}

/** Append dropped/picked attachments to a session's draft and notify live composers so the tray
 *  repaints. Reuses the seed-listener channel {@link useSessionComposerDraft} already subscribes to.
 *  Used by the global drop guard's route-to-active-composer (the composer's own drop path writes
 *  through its controlled `onAttachmentsChange` instead). */
export function appendComposerAttachments(
	key: string,
	images: readonly ComposerImageAttachment[],
	pasteAttachments: readonly ComposerPasteAttachment[],
): void {
	if (images.length === 0 && pasteAttachments.length === 0) return;
	const current = drafts.get(key) ?? EMPTY;
	const appendOffset = current.text.length;
	drafts.set(key, {
		text: current.text,
		attachments: [
			...current.attachments,
			...images.map(image =>
				typeof image.inlineOffset === "number" ? image : { ...image, inlineOffset: appendOffset },
			),
		],
		pasteAttachments: [...current.pasteAttachments, ...pasteAttachments],
	});
	for (const listener of seedListeners) listener(key);
}

export interface SessionComposerDraftHandle {
	readonly text: string;
	readonly attachments: readonly ComposerImageAttachment[];
	readonly pasteAttachments: readonly ComposerPasteAttachment[];
	readonly setText: (text: string) => void;
	readonly setAttachments: (attachments: readonly ComposerImageAttachment[]) => void;
	readonly setPasteAttachments: (pasteAttachments: readonly ComposerPasteAttachment[]) => void;
	readonly clear: () => void;
}

/**
 * Bind a `Composer` to the persisted draft for `key` (a session ref key, or "" for
 * the no-session surface). Writes persist to the store immediately; the draft re-syncs
 * when `key` changes (session switch) so each session shows its own unsent text/images.
 */
export function useSessionComposerDraft(key: string): SessionComposerDraftHandle {
	const [draft, setDraft] = useState<SessionComposerDraft>(() => drafts.get(key) ?? EMPTY);
	// Mirror the live draft in a ref so multiple setters firing in ONE tick (submit clears
	// `attachments` AND `pasteAttachments`) each read the latest value. Spreading the stale
	// render `draft` made the second setter clobber the first — an attached image survived send.
	const draftRef = useRef(draft);
	// Re-sync during render (the React-endorsed pattern) when the session changes — this
	// covers both a keyed remount and an in-place key change.
	const [trackedKey, setTrackedKey] = useState(key);
	if (trackedKey !== key) {
		setTrackedKey(key);
		// Session switch (incl. onto a freshly-forked, seeded session): read this session's draft —
		// a branch/fork seed was written straight into `drafts`, so it shows here on mount.
		const next = drafts.get(key) ?? EMPTY;
		draftRef.current = next;
		setDraft(next);
	}
	const update = (next: SessionComposerDraft) => {
		draftRef.current = next;
		// Don't retain empty drafts — keeps the store from growing one entry per visited session.
		if (!next.text && next.attachments.length === 0 && next.pasteAttachments.length === 0) drafts.delete(key);
		else drafts.set(key, next);
		setDraft(next);
	};
	// A programmatic seed (branch prefill) for THIS session lands in `drafts` even though `key`
	// did not change — the render-time re-sync above only fires on a key change, so re-read the
	// shared draft here to repaint the live field.
	useEffect(() => {
		return subscribeSessionComposerSeed(seededKey => {
			if (seededKey !== key) return;
			const next = drafts.get(key) ?? EMPTY;
			draftRef.current = next;
			setDraft(next);
		});
	}, [key]);
	return {
		text: draft.text,
		attachments: draft.attachments,
		pasteAttachments: draft.pasteAttachments,
		setText: text => update({ ...draftRef.current, text }),
		setAttachments: attachments => update({ ...draftRef.current, attachments }),
		setPasteAttachments: pasteAttachments => update({ ...draftRef.current, pasteAttachments }),
		clear: () => update(EMPTY),
	};
}

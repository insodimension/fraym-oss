import { useEffect, useRef, useState } from "react";
import type { ComposerImageAttachment, ComposerPasteAttachment } from "./composer-core";
export interface SessionComposerDraft { readonly text: string; readonly attachments: readonly ComposerImageAttachment[]; readonly pasteAttachments: readonly ComposerPasteAttachment[] }
const empty: SessionComposerDraft = { text: "", attachments: [], pasteAttachments: [] };
const drafts = new Map<string, SessionComposerDraft>();
const listeners = new Set<(key: string) => void>();
export function seedSessionComposerDraft(key: string, text: string, attachments: readonly ComposerImageAttachment[] = []): void { if (text || attachments.length) drafts.set(key, { text, attachments, pasteAttachments: [] }); else drafts.delete(key); listeners.forEach((listener) => listener(key)); }
export function editorImagesToAttachments(images: readonly { readonly data: string; readonly mimeType: string }[] | undefined): ComposerImageAttachment[] { return (images ?? []).map((image, index) => ({ id: crypto.randomUUID(), name: `image ${index + 1}`, mimeType: image.mimeType, data: image.data })); }
export function peekSessionComposerDraftText(key: string) { return drafts.get(key)?.text; }
export function clearSessionComposerDraft(key: string) { drafts.delete(key); listeners.forEach((listener) => listener(key)); }
export function subscribeSessionComposerSeed(listener: (key: string) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export interface ComposerSeededContext { readonly badge?: { readonly label: string; readonly icon: string }; readonly skills?: readonly string[] }
const contexts = new Map<string, ComposerSeededContext>();
export function applyComposerSeededContext(value: string, context: ComposerSeededContext | undefined): string { const skills = (context?.skills ?? []).filter((skill) => !value.includes(`/skill:${skill}`)).map((skill) => `/skill:${skill}`); return [...skills, context?.badge?.label ? `${context.badge.label}:` : "", value].filter(Boolean).join(" "); }
export function seedSessionComposerContext(key: string, context: ComposerSeededContext | null) { if (!context || (!context.badge && !context.skills?.length)) contexts.delete(key); else contexts.set(key, context); listeners.forEach((listener) => listener(key)); }
export function peekSessionComposerContext(key: string) { return contexts.get(key); }
export function useSessionComposerContext(key: string) { const [context, setContext] = useState(() => contexts.get(key)); useEffect(() => subscribeSessionComposerSeed((changed) => { if (changed === key) setContext(contexts.get(key)); }), [key]); return context; }
let activeKey: string | null = null;
export function setActiveComposerDraftKey(key: string | null) { activeKey = key; }
export function getActiveComposerDraftKey() { return activeKey; }
export function appendComposerAttachments(key: string, images: readonly ComposerImageAttachment[], pasteAttachments: readonly ComposerPasteAttachment[]) { if (!images.length && !pasteAttachments.length) return; const current = drafts.get(key) ?? empty; drafts.set(key, { ...current, attachments: [...current.attachments, ...images], pasteAttachments: [...current.pasteAttachments, ...pasteAttachments] }); listeners.forEach((listener) => listener(key)); }
export interface SessionComposerDraftHandle extends SessionComposerDraft { readonly setText: (text: string) => void; readonly setAttachments: (attachments: readonly ComposerImageAttachment[]) => void; readonly setPasteAttachments: (attachments: readonly ComposerPasteAttachment[]) => void; readonly clear: () => void }
export function useSessionComposerDraft(key: string): SessionComposerDraftHandle { const [draft, setDraft] = useState(() => drafts.get(key) ?? empty); const ref = useRef(draft); const update = (next: SessionComposerDraft) => { ref.current = next; if (!next.text && !next.attachments.length && !next.pasteAttachments.length) drafts.delete(key); else drafts.set(key, next); setDraft(next); }; useEffect(() => { const next = drafts.get(key) ?? empty; ref.current = next; setDraft(next); return subscribeSessionComposerSeed((changed) => { if (changed === key) { const seeded = drafts.get(key) ?? empty; ref.current = seeded; setDraft(seeded); } }); }, [key]); return { ...draft, setText: (text) => update({ ...ref.current, text }), setAttachments: (attachments) => update({ ...ref.current, attachments }), setPasteAttachments: (pasteAttachments) => update({ ...ref.current, pasteAttachments }), clear: () => update(empty) }; }

import type { ReactNode } from "react";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";
import { MessageSurface, surfaceText } from "./surface-messages";
export type AdvisorNoteSeverity = "nit" | "concern" | "blocker";
export interface AdvisorNoteField { readonly severity: AdvisorNoteSeverity; readonly message: string; readonly path?: string; readonly line?: number }
export interface AdvisorNoteFields { readonly notes: readonly AdvisorNoteField[] }
export function parseAdvisorBatchText(raw: string): AdvisorNoteField[] { return raw.split(/\r?\n/).filter(Boolean).map((line) => { const match = line.match(/^\s*(nit|concern|blocker)\s*:?\s*(.*)$/i); return { severity: (match?.[1]?.toLowerCase() as AdvisorNoteSeverity) ?? "concern", message: match?.[2] ?? line }; }); }
export function resolveAdvisorNotes(input: SurfaceRenderInput): AdvisorNoteFields | null { const notes = parseAdvisorBatchText(surfaceText(input)); return notes.length ? { notes } : null; }
export function AdvisorNoteSurface({ fields }: { readonly fields: AdvisorNoteFields }) { return <MessageSurface detail={<ul>{fields.notes.map((note) => <li key={`${note.severity}:${note.path ?? ""}:${note.line ?? ""}:${note.message}`}><strong>{note.severity}</strong> {note.message}</li>)}</ul>} label="Review" tone={fields.notes.some((note) => note.severity === "blocker") ? "danger" : "warning"} />; }
export function renderAdvisorNote(input: SurfaceRenderInput): ReactNode { const fields = resolveAdvisorNotes(input); return fields ? <AdvisorNoteSurface fields={fields} /> : null; }

// AdvisorNoteSurface — compact transcript card for Engine's batched `advisor`
// custom message (a second model reviewing the turn and injecting notes).
// The persisted text is one `<advisory severity="..." guidance="...">` element
// per note; we show a tidy severity-tagged list instead of the raw envelope.
// Registered as the `msg:advisor` surface renderer.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

export type AdvisorNoteSeverity = "nit" | "concern" | "blocker";

export interface AdvisorNoteField {
	readonly note: string;
	readonly severity?: AdvisorNoteSeverity;
	/** Catalog displayName of the model that produced this note (Engine `AdvisorNote.model`). */
	readonly model?: string;
}

export interface AdvisorNoteFields {
	readonly notes: readonly AdvisorNoteField[];
}

const KNOWN_SEVERITIES: ReadonlySet<string> = new Set(["nit", "concern", "blocker"]);

function toSeverity(value: unknown): AdvisorNoteSeverity | undefined {
	return typeof value === "string" && KNOWN_SEVERITIES.has(value) ? (value as AdvisorNoteSeverity) : undefined;
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

const ADVISORY_ELEMENT = /<advisory(?:\s+severity="([^"]*)")?(?:\s+guidance="[^"]*")?\s*>\n?([\s\S]*?)\n?<\/advisory>/g;

/** Reverse of Engine's `escapeXmlText` (used by `formatAdvisorBatchContent` to build the
 *  `<advisory>` body): decode `&lt;`/`&gt;`/`&amp;`, with `&amp;` LAST so a literal
 *  `&lt;` typed in the note round-trips. Only the text-fallback needs this — the
 *  structured `payload.notes` path carries raw, unescaped notes. */
function decodeAdvisoryEntities(value: string): string {
	return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

/** Parse the `<advisory severity="...">note</advisory>` envelope (text fallback when `payload.notes` is absent). */
export function parseAdvisorBatchText(raw: string): AdvisorNoteField[] {
	const notes: AdvisorNoteField[] = [];
	for (const match of raw.matchAll(ADVISORY_ELEMENT)) {
		const note = decodeAdvisoryEntities((match[2] ?? "").trim());
		if (!note) continue;
		notes.push({ note, severity: toSeverity(match[1]) });
	}
	return notes;
}

/** Resolve a surface input into normalized advisor-note fields. Prefers the structured `payload.notes` (Engine `AdvisorMessageDetails`), falls back to parsing the envelope text. Returns null for non-message inputs or no notes. */
export function resolveAdvisorNotes(input: SurfaceRenderInput): AdvisorNoteFields | null {
	if (input.channel !== "message") return null;
	const payload: Record<string, unknown> =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : {};
	const payloadNotes = Array.isArray(payload.notes) ? payload.notes : null;
	if (payloadNotes && payloadNotes.length > 0) {
		const notes = payloadNotes.map<AdvisorNoteField>(entry => {
			const rec: Record<string, unknown> =
				entry !== null && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
			const model = str(rec.model).trim();
			return { note: str(rec.note).trim(), severity: toSeverity(rec.severity), ...(model ? { model } : {}) };
		});
		return { notes };
	}
	const notes = parseAdvisorBatchText(input.text ?? "");
	return notes.length > 0 ? { notes } : null;
}

const SEVERITY_TONE: Record<AdvisorNoteSeverity, "mute" | "warn" | "del"> = {
	nit: "mute",
	concern: "warn",
	blocker: "del",
};

/** The model that produced every note in the batch, when it's the same model
 *  throughout (the common case: one advisor, or a roster that happens to
 *  agree). A mixed batch renders no header model — per-note attribution isn't
 *  carried by this surface (unlike the TUI's `[advisor-name]` label), so
 *  naming just one model would misattribute the others. */
function sharedModel(notes: readonly AdvisorNoteField[]): string | undefined {
	const models = new Set(notes.flatMap(n => (n.model ? [n.model] : [])));
	return models.size === 1 ? [...models][0] : undefined;
}

export function AdvisorNoteSurface({ fields }: { readonly fields: AdvisorNoteFields }) {
	const model = sharedModel(fields.notes);
	return (
		<div data-slot="advisor-note" className="flex min-w-0 flex-col gap-1.5 py-0.5">
			<div
				data-slot="advisor-note-head"
				className="flex min-w-0 items-center gap-2 font-secondary text-fr-text-3 text-fr-xs"
			>
				<span aria-hidden className="shrink-0 text-fr-blue text-fr-xs leading-none">
					{"\u2756"}
				</span>
				<span className="shrink-0 font-medium text-fr-text-2">Advisor</span>
				{model && <span className="min-w-0 fr-overflow text-fr-text-3">{model}</span>}
			</div>
			{fields.notes.map((entry, index) => (
				<div
					key={`${entry.note}-${index}`}
					data-slot="advisor-note-entry"
					className="flex min-w-0 items-start gap-2 border-fr-border-soft border-l-2 pl-2 font-secondary text-fr-xs"
				>
					{entry.severity && (
						<Badge variant="soft" tone={SEVERITY_TONE[entry.severity]} className="mt-0.5 shrink-0">
							{entry.severity}
						</Badge>
					)}
					<span className="min-w-0 whitespace-pre-wrap text-fr-text-2">{entry.note}</span>
				</div>
			))}
		</div>
	);
}

/** `msg:advisor` surface renderer — compact, severity-tagged advisor-note card. */
export function renderAdvisorNote(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	const fields = resolveAdvisorNotes(input);
	if (fields === null) return null;
	return <AdvisorNoteSurface fields={fields} />;
}

// BackgroundTanDispatchSurface — compact transcript breadcrumb for Engine's
// `background-tan-dispatch` custom message (a `/tan` background agent was
// just kicked off). The persisted `content` is a `<system-notice>` block for
// the model only; the user sees one line, mirroring the TUI's
// `createBackgroundTanDispatchBlock` ("Tangent dispatched [task] <id> — <work>").
// Registered as the `msg:background-tan-dispatch` surface renderer.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

const WORK_PREVIEW_LENGTH = 56;

function previewWork(work: string): string {
	const singleLine = work.trim().replace(/\s+/g, " ");
	if (singleLine.length <= WORK_PREVIEW_LENGTH) return singleLine;
	return `${singleLine.slice(0, WORK_PREVIEW_LENGTH - 1)}…`;
}

export interface BackgroundTanDispatchFields {
	readonly jobId: string;
	readonly work?: string;
}

/** Resolve a surface input into normalized dispatch fields. Payload-first (structured `details`); returns null for non-message inputs or a missing job id. */
export function resolveBackgroundTanDispatch(input: SurfaceRenderInput): BackgroundTanDispatchFields | null {
	if (input.channel !== "message") return null;
	const payload =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : {};
	const jobId = typeof payload.jobId === "string" ? payload.jobId : undefined;
	if (!jobId) return null;
	const work = typeof payload.work === "string" ? payload.work.trim() : undefined;
	return { jobId, work: work || undefined };
}

export function BackgroundTanDispatchSurface({ fields }: { readonly fields: BackgroundTanDispatchFields }) {
	return (
		<div
			data-slot="background-tan-dispatch"
			className="flex min-w-0 items-center gap-2 py-0.5 font-secondary text-fr-text-3 text-fr-xs"
		>
			<span className="shrink-0 text-fr-text-2">Tangent dispatched</span>
			<Badge variant="code" tone="mute" className="shrink-0">
				task
			</Badge>
			<span className="min-w-0 shrink-0 fr-overflow font-medium text-fr-text">{fields.jobId}</span>
			{fields.work && <span className="min-w-0 fr-overflow text-fr-text-3">— {previewWork(fields.work)}</span>}
		</div>
	);
}

/** `msg:background-tan-dispatch` surface renderer — a one-line "kicked off" breadcrumb. */
export function renderBackgroundTanDispatch(input: SurfaceRenderInput): ReactNode {
	const fields = resolveBackgroundTanDispatch(input);
	if (fields === null) return null;
	return <BackgroundTanDispatchSurface fields={fields} />;
}

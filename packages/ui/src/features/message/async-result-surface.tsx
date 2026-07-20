// AsyncResultSurface — compact transcript breadcrumb for Engine's `async-result`
// custom message (a background `task`/`bash` job finished and its result was
// folded back into the model's context). The persisted message text is the full
// `<system-notice>` + `<task-result>` envelope — model-only noise. The user sees
// one settled line per job, mirroring the TUI's "✓ Background job completed
// [task] <id> (<duration>)" breadcrumb (`agent-hub.ts` #appendCustomMessage).
//
// Registered as the `msg:async-result` surface renderer. The transcript message
// only carries `text` (live + snapshot), so we parse the envelope rather than
// depend on a structured payload that snapshot hydration drops.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import { cn } from "../../lib/cn";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

interface AsyncJobLine {
	readonly id?: string;
	readonly type: string;
	readonly duration?: string;
	readonly failed: boolean;
}

/** Pull completed-job descriptors out of the rendered `async-result` notice text. */
export function parseAsyncResultJobs(raw: string): AsyncJobLine[] {
	const out: AsyncJobLine[] = [];
	// Task jobs deliver a `<task-result id=… status=… duration=…>` envelope per job.
	const taskResultRe = /<task-result\b([^>]*)>/g;
	for (let m = taskResultRe.exec(raw); m !== null; m = taskResultRe.exec(raw)) {
		const attrs = m[1] ?? "";
		out.push({
			id: /\bid="([^"]*)"/.exec(attrs)?.[1],
			type: "task",
			duration: /\bduration="([^"]*)"/.exec(attrs)?.[1],
			failed: /\bstatus="(failed|aborted)"/.test(attrs),
		});
	}
	if (out.length > 0) return out;
	// Bash batches carry no envelope — read the `── Job <id> (<label>) ──` headers.
	const multiRe = /\u2500{2,}\s+Job\s+(\S+)/g;
	for (let m = multiRe.exec(raw); m !== null; m = multiRe.exec(raw)) {
		out.push({ id: m[1], type: "job", failed: false });
	}
	if (out.length > 0) return out;
	// Single job: "Background job <id> has completed."
	const single = /Background job (\S+) has completed/.exec(raw);
	if (single) return [{ id: single[1], type: "job", failed: false }];
	return [{ type: "job", failed: false }];
}

function AsyncResultRow({ job }: { readonly job: AsyncJobLine }) {
	return (
		<div
			data-slot="async-result-row"
			className="flex min-w-0 items-center gap-2 font-secondary text-fr-xs text-fr-text-3"
		>
			<span
				aria-hidden
				className={cn("shrink-0 text-fr-xs leading-none", job.failed ? "text-fr-del" : "text-fr-add")}
			>
				{job.failed ? "\u2716" : "\u2713"}
			</span>
			<span className="shrink-0 text-fr-text-2">Background job {job.failed ? "failed" : "completed"}</span>
			<Badge variant="code" tone="mute" className="shrink-0">
				{job.type}
			</Badge>
			{job.id && <span className="min-w-0 fr-overflow font-medium text-fr-text">{job.id}</span>}
			{job.duration && <span className="shrink-0 tabular-nums text-fr-text-3">{job.duration}</span>}
		</div>
	);
}

export function AsyncResultSurface({ text }: { readonly text: string }) {
	const jobs = parseAsyncResultJobs(text);
	return (
		<div data-slot="async-result" className="flex min-w-0 flex-col gap-1 py-0.5">
			{jobs.map((job, index) => (
				<AsyncResultRow key={job.id ?? `job-${index}`} job={job} />
			))}
		</div>
	);
}

/** `msg:async-result` surface renderer — a settled one-line breadcrumb per job. */
export function renderAsyncResult(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	return <AsyncResultSurface text={input.text ?? ""} />;
}

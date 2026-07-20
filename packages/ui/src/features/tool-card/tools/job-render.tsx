import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import { Spinner } from "../../../elements/spinner";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { cn } from "../../../lib/cn";
import { asText, readField, readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { EditErrorBody } from "./bodies/edit-diff-body";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface JobSnapshot {
	id: string;
	type: "bash" | "task";
	status: "running" | "completed" | "failed" | "cancelled";
	label: string;
	durationMs: number;
	resultText?: string;
	errorText?: string;
}

interface CancelOutcome {
	id: string;
	status: string;
}

interface JobCounts {
	completed: number;
	failed: number;
	cancelled: number;
	running: number;
}

type BadgeTone = "accent" | "add" | "blue" | "warn" | "mute" | "del";
type JobViewStatus = "pending" | "success" | "error" | "warn";

// ─── Defensive parse ─────────────────────────────────────────────────────────────

function parseJobs(details: unknown): JobSnapshot[] {
	const raw = readField(details, "jobs");
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((j): j is Record<string, unknown> => typeof j === "object" && j !== null)
		.map(j => ({
			id: readStringField(j, "id") ?? "",
			type: (readStringField(j, "type") as JobSnapshot["type"]) ?? "bash",
			status: (readStringField(j, "status") as JobSnapshot["status"]) ?? "completed",
			label: readStringField(j, "label") ?? "",
			durationMs: (() => {
				const d = readField(j, "durationMs");
				return typeof d === "number" ? d : 0;
			})(),
			resultText: readStringField(j, "resultText"),
			errorText: readStringField(j, "errorText"),
		}));
}

function parseCancelled(details: unknown): CancelOutcome[] {
	const raw = readField(details, "cancelled");
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
		.map(c => ({
			id: readStringField(c, "id") ?? "",
			status: readStringField(c, "status") ?? "",
		}));
}

// ─── Job list helpers ─────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { running: 0, failed: 1, cancelled: 2, completed: 3 };

function sortJobs(jobs: JobSnapshot[]): JobSnapshot[] {
	return [...jobs].sort((a, b) => {
		const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
		if (diff !== 0) return diff;
		return b.durationMs - a.durationMs;
	});
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const m = Math.floor(ms / 60_000);
	const s = Math.floor((ms % 60_000) / 1000);
	return `${m}m ${s}s`;
}

function JobStatusGlyph({ status }: { readonly status: JobSnapshot["status"] }) {
	// Running jobs get the orbiting dot-matrix loader (the Engine TUI "Working…" spinner),
	// matching every other in-flight tool affordance; terminal states settle to a glyph.
	if (status === "running") return <Spinner kind="dots" size="xs" className="shrink-0" />;
	const glyph = status === "completed" ? "\u2713" : status === "failed" ? "\u2716" : "\u2014";
	const tone = status === "completed" ? "text-fr-add" : status === "failed" ? "text-fr-del" : "text-fr-text-3";
	return (
		<span aria-hidden className={cn("text-fr-xs leading-none", tone)}>
			{glyph}
		</span>
	);
}

function countJobs(jobs: readonly JobSnapshot[]): JobCounts {
	const counts: JobCounts = { completed: 0, failed: 0, cancelled: 0, running: 0 };
	for (const job of jobs) counts[job.status]++;
	return counts;
}

function jobCountLabel(action: "poll" | "cancel", count: number): string {
	return `${action} ${count} job${count !== 1 ? "s" : ""}`;
}

function listActionTone(pollCount: number, cancelCount: number): BadgeTone {
	if (cancelCount > 0) return "del";
	if (pollCount > 0) return "blue";
	return "mute";
}

function jobAction(input: Record<string, unknown> | undefined): { label: string; tone: BadgeTone } {
	const pollCount = Array.isArray(input?.poll) ? input.poll.length : 0;
	const cancelCount = Array.isArray(input?.cancel) ? input.cancel.length : 0;
	if (input?.list === true) return { label: "list", tone: listActionTone(pollCount, cancelCount) };
	if (pollCount > 0 && cancelCount > 0) return { label: "cancel+poll", tone: "del" };
	if (pollCount > 0) return { label: jobCountLabel("poll", pollCount), tone: "blue" };
	if (cancelCount > 0) return { label: jobCountLabel("cancel", cancelCount), tone: "del" };
	return { label: "all jobs", tone: "mute" };
}

function jobBadges(action: ReturnType<typeof jobAction>, counts: JobCounts): ReactNode[] {
	const badges: ReactNode[] = [
		<Badge key="action" variant="code" tone={action.tone}>
			{action.label}
		</Badge>,
	];
	if (counts.completed > 0)
		badges.push(
			<Badge key="done" variant="code" tone="add">
				{counts.completed} done
			</Badge>,
		);
	if (counts.failed > 0)
		badges.push(
			<Badge key="failed" variant="code" tone="del">
				{counts.failed} failed
			</Badge>,
		);
	if (counts.cancelled > 0)
		badges.push(
			<Badge key="cancelled" variant="code" tone="warn">
				{counts.cancelled} cancelled
			</Badge>,
		);
	if (counts.running > 0)
		badges.push(
			<Badge key="running" variant="code" tone="accent">
				{counts.running} running
			</Badge>,
		);
	return badges;
}

function jobStatus(
	isError: boolean,
	isRunning: boolean,
	counts: JobCounts,
	jobCount: number,
): { status: JobViewStatus; stat?: string } {
	const hasFailed = counts.failed > 0;
	const hasRunning = counts.running > 0;
	const hasCancelledOnly =
		counts.cancelled > 0 && counts.completed === 0 && counts.failed === 0 && counts.running === 0;

	if (isError || hasFailed) return { status: "error", stat: "failed" };
	if (hasRunning || isRunning) return { status: "pending", stat: `waiting on ${counts.running}/${jobCount}` };
	if (hasCancelledOnly) return { status: "warn", stat: "cancelled" };
	return { status: "success" };
}

function jobPreviewLines(job: JobSnapshot): string[] {
	const preview = job.errorText?.trim() || job.resultText?.trim();
	if (!preview) return [];
	const previewLines = preview.split("\n");
	const shown = previewLines.slice(0, 2).map(line => `  ${line}`);
	return previewLines.length > 2 ? [...shown, "  \u2026"] : shown;
}

function JobRow({ job }: { readonly job: JobSnapshot }) {
	const idText = job.id.length > 14 ? `${job.id.slice(0, 11)}\u2026` : job.id;
	const preview = jobPreviewLines(job);
	return (
		<div className="min-w-0">
			<div className="flex min-w-0 items-center gap-2 font-secondary text-fr-xs">
				<span className="flex size-3.5 shrink-0 items-center justify-center" title={job.status}>
					<JobStatusGlyph status={job.status} />
				</span>
				<span className="shrink-0 font-medium text-fr-text">{idText}</span>
				<Badge variant="code" tone="mute" className="shrink-0">
					{job.type}
				</Badge>
				<span className="min-w-0 flex-1 fr-overflow text-fr-text-3">{job.label || "(no label)"}</span>
				<span className="shrink-0 tabular-nums text-fr-text-3">{formatDuration(job.durationMs)}</span>
			</div>
			{preview.length > 0 && (
				<pre className="mt-0.5 overflow-hidden whitespace-pre-wrap pl-6 font-primary text-fr-2xs text-fr-text-3">
					{preview.map(line => line.trimStart()).join("\n")}
				</pre>
			)}
		</div>
	);
}

function CancelRow({ outcome }: { readonly outcome: CancelOutcome }) {
	const ok = outcome.status === "cancelled";
	return (
		<div className="flex min-w-0 items-center gap-2 font-secondary text-fr-xs">
			<span aria-hidden className={cn("text-fr-xs leading-none", ok ? "text-fr-add" : "text-fr-text-3")}>
				{ok ? "\u2713" : "\u2014"}
			</span>
			<span className="shrink-0 font-medium text-fr-text">{outcome.id}</span>
			<span className="min-w-0 flex-1 fr-overflow text-fr-text-3">{outcome.status}</span>
		</div>
	);
}

function jobBody({
	isError,
	jobs,
	cancelled,
	output,
}: {
	readonly isError: boolean;
	readonly jobs: readonly JobSnapshot[];
	readonly cancelled: readonly CancelOutcome[];
	readonly output: unknown;
}): ReactNode {
	if (isError) {
		const text = readResultContentText(output) ?? asText(output) ?? "request failed";
		return <EditErrorBody message={text} />;
	}
	if (jobs.length === 0 && cancelled.length === 0) {
		const fallback = readResultContentText(output) ?? asText(output) ?? "No jobs to process.";
		return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">{fallback}</div>;
	}
	return (
		<ToolBodySection title="Jobs" padContent maxHeight={400}>
			<div className="flex min-w-0 flex-col gap-1">
				{sortJobs([...jobs]).map((job, index) => (
					<JobRow key={job.id || `job-${index}`} job={job} />
				))}
				{cancelled.length > 0 && (
					<>
						{jobs.length > 0 && <div className="my-0.5 h-px bg-fr-border-soft" />}
						{cancelled.map((outcome, index) => (
							<CancelRow key={outcome.id || `cancel-${index}`} outcome={outcome} />
						))}
					</>
				)}
			</div>
		</ToolBodySection>
	);
}

// ─── Renderer ──────────────────────────────────────────────────────────────────

const renderJob: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readField(call.output, "details") as unknown;
	const isError = readField(call.output, "isError") === true;
	const isRunning = call.status === "running";

	const input = call.input as Record<string, unknown> | undefined;
	const jobs = parseJobs(details);
	const cancelled = parseCancelled(details);
	const counts = countJobs(jobs);
	const action = jobAction(input);
	const { status, stat } = jobStatus(isError, isRunning, counts, jobs.length);
	const body = jobBody({ isError, jobs, cancelled, output: call.output });
	return {
		kind: "task",
		label: "Job",
		badges: jobBadges(action, counts),
		status,
		stat,
		bodyVariant: (jobs.length === 0 && cancelled.length === 0) || isError ? "term" : undefined,
		body,
	};
};

export { renderJob };

// `github` tool renderer — GitHub operations at TUI parity (mirrors
// engine .../tools/gh-renderer.ts → githubToolRenderer). The TUI renderer has two
// paths: a structured Actions run-watch view when `details.watch` is present,
// and a status-line + text fallback for all other ops (repo_view, search_*,
// pr_create, pr_checkout, pr_push). `renderCall` and `renderResult` are merged
// (`mergeCallAndResult: true`).
//
// Self-contained defensive parse (no coupling to the monolith), mirroring the
// web-search-render/browser-render pattern.
//
// Registered for `github` in default-tool-renderers.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField, toTermLines } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodyCard, ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { readNumberField } from "./renderer-utils";

// ─── Types (local; mirrors Engine's GhToolDetails) ──────────────────────────

interface GhRunWatchJobDetails {
	id: number;
	name: string;
	status?: string | undefined;
	conclusion?: string | undefined;
	durationSeconds?: number | undefined;
	url?: string | undefined;
}

interface GhRunWatchRunDetails {
	id: number;
	workflowName?: string | undefined;
	displayTitle?: string | undefined;
	branch?: string | undefined;
	headSha?: string | undefined;
	status?: string | undefined;
	conclusion?: string | undefined;
	url?: string | undefined;
	jobs: GhRunWatchJobDetails[];
}

interface GhRunWatchFailedLogDetails {
	runId: number;
	workflowName?: string | undefined;
	jobName: string;
	available?: boolean | undefined;
	tail?: string | undefined;
}

interface GhRunWatchViewDetails {
	mode: "run" | "commit";
	state: "watching" | "completed";
	repo: string;
	headSha?: string | undefined;
	note?: string | undefined;
	run?: GhRunWatchRunDetails | undefined;
	runs?: GhRunWatchRunDetails[] | undefined;
	failedLogs?: GhRunWatchFailedLogDetails[] | undefined;
}

function readArrayField<T>(value: unknown, key: string): T[] | undefined {
	const v = readField(value, key);
	return Array.isArray(v) ? (v as T[]) : undefined;
}

function readOp(call: ActiveToolCall): string {
	const inputOp = readStringField(call.input, "op");
	if (inputOp) return inputOp;
	const outputDetails = readField(call.output, "details");
	const detailsOp = readStringField(outputDetails, "op");
	return detailsOp ?? "repo_view";
}

function readOutputText(output: unknown): string {
	if (typeof output === "string") return output;
	const content = readArrayField<{ type: string; text?: string }>(output, "content");
	if (!content) return "";
	return content
		.filter(part => part.type === "text")
		.map(part => part.text ?? "")
		.filter(Boolean)
		.join("\n");
}

function readWatchDetails(details: unknown): GhRunWatchViewDetails | undefined {
	if (!details || typeof details !== "object") return undefined;
	const watch = readField(details, "watch");
	if (!watch || typeof watch !== "object") return undefined;
	return {
		mode: readStringField(watch, "mode") === "commit" ? "commit" : "run",
		state: readStringField(watch, "state") === "completed" ? "completed" : "watching",
		repo: readStringField(watch, "repo") ?? "",
		headSha: readStringField(watch, "headSha"),
		note: readStringField(watch, "note"),
		run: (() => {
			const r = readField(watch, "run");
			if (!r || typeof r !== "object") return undefined;
			const jobs = readArrayField<Record<string, unknown>>(r, "jobs") ?? [];
			return {
				id: readNumberField(r, "id") ?? 0,
				workflowName: readStringField(r, "workflowName"),
				displayTitle: readStringField(r, "displayTitle"),
				branch: readStringField(r, "branch"),
				headSha: readStringField(r, "headSha"),
				status: readStringField(r, "status"),
				conclusion: readStringField(r, "conclusion"),
				url: readStringField(r, "url"),
				jobs: jobs.map(j => ({
					id: readNumberField(j, "id") ?? 0,
					name: readStringField(j, "name") ?? "",
					status: readStringField(j, "status"),
					conclusion: readStringField(j, "conclusion"),
					durationSeconds: readNumberField(j, "durationSeconds"),
					url: readStringField(j, "url"),
				})),
			};
		})(),
		runs: (() => {
			const raw = readArrayField<Record<string, unknown>>(watch, "runs");
			if (!raw) return undefined;
			return raw.map(r => {
				const jobs = readArrayField<Record<string, unknown>>(r, "jobs") ?? [];
				return {
					id: readNumberField(r, "id") ?? 0,
					workflowName: readStringField(r, "workflowName"),
					displayTitle: readStringField(r, "displayTitle"),
					branch: readStringField(r, "branch"),
					headSha: readStringField(r, "headSha"),
					status: readStringField(r, "status"),
					conclusion: readStringField(r, "conclusion"),
					url: readStringField(r, "url"),
					jobs: jobs.map(j => ({
						id: readNumberField(j, "id") ?? 0,
						name: readStringField(j, "name") ?? "",
						status: readStringField(j, "status"),
						conclusion: readStringField(j, "conclusion"),
						durationSeconds: readNumberField(j, "durationSeconds"),
						url: readStringField(j, "url"),
					})),
				};
			});
		})(),
		failedLogs: (() => {
			const raw = readArrayField<Record<string, unknown>>(watch, "failedLogs");
			if (!raw) return undefined;
			return raw.map(f => ({
				runId: readNumberField(f, "runId") ?? 0,
				workflowName: readStringField(f, "workflowName"),
				jobName: readStringField(f, "jobName") ?? "",
				available:
					typeof readField(f, "available") === "boolean" ? (readField(f, "available") as boolean) : undefined,
				tail: readStringField(f, "tail"),
			}));
		})(),
	};
}

// ─── Head / Badges ────────────────────────────────────────────────────────

const OP_LABELS: Record<string, string> = {
	repo_view: "repo_view",
	pr_create: "pr_create",
	pr_checkout: "pr_checkout",
	pr_push: "pr_push",
	search_issues: "search_issues",
	search_prs: "search_prs",
	search_code: "search_code",
	search_commits: "search_commits",
	search_repos: "search_repos",
	run_watch: "run_watch",
};

function opBadge(op: string): ReactNode {
	const label = OP_LABELS[op] ?? op;
	return (
		<Badge variant="code" tone="accent">
			{label}
		</Badge>
	);
}

function pushGithubTextBadge(
	badges: ReactNode[],
	key: string,
	value: string | undefined,
	tone: "mute" | "blue" = "mute",
): void {
	if (!value) return;
	badges.push(
		<Badge key={key} variant="code" tone={tone}>
			{value}
		</Badge>,
	);
}

function pushGithubPrBadge(badges: ReactNode[], input: unknown): void {
	const pr = readField(input, "pr");
	if (!pr) return;
	const prStr = Array.isArray(pr) ? pr.join(", ") : String(pr);
	pushGithubTextBadge(badges, "pr", prStr, "blue");
}

function pushGithubQueryBadge(badges: ReactNode[], input: unknown): void {
	const query = readStringField(input, "query");
	if (!query) return;
	const truncated = query.length > 40 ? `${query.slice(0, 40)}…` : query;
	pushGithubTextBadge(badges, "query", truncated, "blue");
}

function buildGithubBadges(call: ActiveToolCall, op: string): ReactNode[] {
	const badges: ReactNode[] = [];
	const details = readField(call.output, "details");
	const input = call.input;

	badges.push(opBadge(op));
	pushGithubTextBadge(badges, "repo", readStringField(details, "repo") ?? readStringField(input, "repo"));
	pushGithubTextBadge(badges, "branch", readStringField(details, "branch") ?? readStringField(input, "branch"));
	pushGithubPrBadge(badges, input);
	pushGithubQueryBadge(badges, input);

	return badges;
}

// ─── Watch Body ───────────────────────────────────────────────────────────

const SUCCESS_CONCLUSIONS = new Set(["success", "neutral", "skipped"]);
const FAILURE_CONCLUSIONS = new Set(["failure", "timed_out", "cancelled", "action_required", "startup_failure"]);
const RUNNING_STATUSES = new Set(["in_progress"]);
const PENDING_STATUSES = new Set(["queued", "requested", "waiting", "pending"]);

function jobStatusIcon(conclusion?: string, status?: string): string {
	if (conclusion && SUCCESS_CONCLUSIONS.has(conclusion)) return "✓";
	if (conclusion && FAILURE_CONCLUSIONS.has(conclusion)) return "✕";
	if (status && RUNNING_STATUSES.has(status)) return "●";
	if (status && PENDING_STATUSES.has(status)) return "○";
	return "○";
}

function jobStatusClass(conclusion?: string, status?: string): string {
	if (conclusion && SUCCESS_CONCLUSIONS.has(conclusion)) return "text-fr-add";
	if (conclusion && FAILURE_CONCLUSIONS.has(conclusion)) return "text-fr-del";
	if (status && RUNNING_STATUSES.has(status)) return "text-fr-warn";
	return "text-fr-text-3";
}

function formatDuration(seconds?: number): string {
	if (seconds === undefined) return "";
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Render a single run block: header + job list. */
function RunBlock({ run }: { readonly run: GhRunWatchRunDetails }) {
	const runLabel = run.workflowName ?? run.displayTitle ?? "GitHub Actions";
	const runMeta = [run.branch ?? run.headSha ?? "", `#${run.id}`].filter(Boolean).join("  ");
	return (
		<div className="mb-2">
			<div className="font-secondary text-fr-text text-fr-xs">
				{runLabel}
				{runMeta && <span className="ml-2 text-fr-text-3">{runMeta}</span>}
			</div>
			{run.jobs.length === 0 ? (
				<div className="text-fr-text-3 text-fr-xs pl-3">waiting for workflow jobs...</div>
			) : (
				<div className="pl-3 mt-0.5 space-y-0.5">
					{run.jobs.map(job => (
						<div key={job.id} className="flex items-center gap-1.5 text-fr-xs font-secondary">
							<span className={jobStatusClass(job.conclusion, job.status)}>
								{jobStatusIcon(job.conclusion, job.status)}
							</span>
							<span className={jobStatusClass(job.conclusion, job.status)}>{job.name}</span>
							{job.durationSeconds !== undefined && (
								<span className="ml-auto text-fr-text-3">{formatDuration(job.durationSeconds)}</span>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/** Render failed log tails. */
function FailedLogsSection({ failedLogs }: { readonly failedLogs: GhRunWatchFailedLogDetails[] }) {
	if (failedLogs.length === 0) return null;
	return (
		<div className="mt-1 pt-1 border-t border-fr-border">
			<div className="text-fr-xs font-secondary text-fr-del mb-1">failed logs</div>
			{failedLogs.map((entry, i) => (
				<div key={`log-${entry.runId}-${i}`} className="mb-1">
					<div className="text-fr-xs text-fr-del">
						{entry.workflowName ? `${entry.workflowName}  #${entry.runId}` : `run #${entry.runId}`}
					</div>
					<div className="text-fr-del font-secondary text-fr-xs pl-2">
						{entry.jobName}
						{!entry.available ? (
							<span className="text-fr-text-3 pl-1">log tail unavailable</span>
						) : entry.tail ? (
							<span className="block text-fr-text-3 whitespace-pre-wrap">
								{entry.tail.split("\n").slice(-10).join("\n")}
							</span>
						) : null}
					</div>
				</div>
			))}
		</div>
	);
}

/** Structured watch body for `run_watch` op with `details.watch` data. */
function WatchBody({ watch }: { readonly watch: GhRunWatchViewDetails }) {
	const headerText =
		watch.mode === "run" && watch.run
			? watch.state === "watching"
				? `watching run #${watch.run.id} on ${watch.repo}`
				: `run #${watch.run.id} on ${watch.repo}`
			: watch.state === "watching"
				? `watching ${watch.headSha ?? "this commit"} on ${watch.repo}`
				: `workflow runs for ${watch.headSha ?? "this commit"} on ${watch.repo}`;

	return (
		<div>
			<div className="text-fr-xs font-secondary text-fr-text-3 mb-1">{headerText}</div>
			{watch.note && <div className="text-fr-xs text-fr-text-3 mb-1">{watch.note}</div>}
			{watch.mode === "run" && watch.run ? (
				<RunBlock run={watch.run} />
			) : watch.runs && watch.runs.length > 0 ? (
				watch.runs.map((run, i) => (
					<div key={run.id}>
						{i > 0 && <div className="h-1" />}
						<RunBlock run={run} />
					</div>
				))
			) : (
				<div className="text-fr-xs text-fr-text-3">waiting for workflow runs...</div>
			)}
			{watch.failedLogs && watch.failedLogs.length > 0 && <FailedLogsSection failedLogs={watch.failedLogs} />}
		</div>
	);
}

// ─── Renderer ─────────────────────────────────────────────────────────────

const GITHUB_BODY_MAX_HEIGHT = 240;

const renderGithub: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const op = readOp(call);
	const details = readField(call.output, "details");
	const isError = readField(call.output, "isError") === true;
	const running = call.status === "running";
	const watch = running ? readWatchDetails(call.output) : readWatchDetails(details);
	const text = readOutputText(call.output);

	// Status
	const status = isError ? "error" : running ? "pending" : "success";
	const stat = isError ? "failed" : running ? "running" : "done";

	// Build badges
	const badges = buildGithubBadges(call, op);

	// Build body
	let body: ReactNode;

	if (isError) {
		body = <EditErrorBody message={text || "request failed"} />;
	} else if (watch && op === "run_watch") {
		// Structured watch display
		body = (
			<ToolBodyCard>
				<ToolBodySection padContent>
					<WatchBody watch={watch} />
				</ToolBodySection>
			</ToolBodyCard>
		);
	} else if (running) {
		body = <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">Running…</div>;
	} else if (text) {
		body = (
			<ToolBodyCard>
				<ToolBodySection padContent maxHeight={GITHUB_BODY_MAX_HEIGHT}>
					<ToolBodyTerm lines={toTermLines(text)} />
				</ToolBodySection>
			</ToolBodyCard>
		);
	} else {
		body = <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">no output</div>;
	}

	return {
		kind: "github",
		label: "GitHub",
		badges,
		status,
		stat,
		body,
	};
};

export { renderGithub };

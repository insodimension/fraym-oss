// job tool fixtures — async background job snapshots for 5 variations.
// Each variation produces realistic JobToolDetails-shaped data.

export type JobVariation = "poll" | "cancel" | "list" | "idle" | "error";

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

interface JobToolDetails {
	jobs: JobSnapshot[];
	cancelled?: CancelOutcome[];
}

// ─── Poll · waited for 3 jobs, all settled ─────────────────────────────

export const POLL_INPUT = { poll: ["job-abc123", "job-def456", "job-ghi789"] };

export const POLL_DETAILS: JobToolDetails = {
	jobs: [
		{
			id: "job-abc123",
			type: "bash",
			status: "completed",
			label: "Load raw data",
			durationMs: 824,
			resultText: "Loaded 1000 rows\nTransformed to parquet.",
		},
		{
			id: "job-def456",
			type: "task",
			status: "completed",
			label: "Validate output",
			durationMs: 4200,
			resultText: "All validations passed. 0 errors, 12 warnings.",
		},
		{
			id: "job-ghi789",
			type: "bash",
			status: "failed",
			label: "Run data pipeline",
			durationMs: 1100,
			errorText: "Error: pipeline crashed at stage 3 (ETL transform).",
		},
	],
};

export const POLL_OUTPUT = "3 jobs settled";

// ─── Cancel · cancelled one, one not found ─────────────────────────────

export const CANCEL_INPUT = { cancel: ["job-cancel-1", "job-cancel-2"] };

export const CANCEL_DETAILS: JobToolDetails = {
	jobs: [
		{
			id: "job-cancel-1",
			type: "bash",
			status: "cancelled",
			label: "Long-running ETL pipeline",
			durationMs: 12000,
		},
	],
	cancelled: [
		{ id: "job-cancel-1", status: "cancelled" },
		{ id: "job-cancel-2", status: "not_found" },
	],
};

export const CANCEL_OUTPUT =
	"## Cancelled (2)\n\n- Cancelled background job job-cancel-1.\n- Background job not found: job-cancel-2";

// ─── List · snapshot with mixed statuses ───────────────────────────────

export const LIST_INPUT = { list: true };

export const LIST_DETAILS: JobToolDetails = {
	jobs: [
		{
			id: "job-running-1",
			type: "bash",
			status: "running",
			label: "Train model on full dataset",
			durationMs: 34000,
		},
		{
			id: "job-failed-1",
			type: "task",
			status: "failed",
			label: "Validate dataset schema",
			durationMs: 5200,
			errorText: "Validation failed: missing required column 'price'.",
		},
		{
			id: "job-done-1",
			type: "bash",
			status: "completed",
			label: "Ingest CSV data",
			durationMs: 1800,
			resultText: "Ingested 5000 records.",
		},
		{
			id: "job-done-2",
			type: "bash",
			status: "completed",
			label: "Backup database",
			durationMs: 3200,
			resultText: "Backup complete. 1.2GB written.",
		},
	],
};

export const LIST_OUTPUT =
	"## Completed (3)\n\n### job-done-1 [bash] — completed\nLabel: Ingest CSV data\n```\nIngested 5000 records.\n```\n### job-done-2 [bash] — completed\nLabel: Backup database\n```\nBackup complete. 1.2GB written.\n```\n\n## Still Running (1)\n\n- `job-running-1` [bash] — Train model on full dataset";

// ─── Idle · no jobs found ──────────────────────────────────────────────

export const IDLE_INPUT = { poll: ["job-nonexistent"] };

export const IDLE_DETAILS: JobToolDetails = { jobs: [] };

export const IDLE_OUTPUT = "No matching jobs found for IDs: job-nonexistent";

// ─── Error · tool error ────────────────────────────────────────────────

export const ERROR_INPUT = { poll: ["job-bad"] };
export const ERROR_TEXT = "Async execution is disabled; no background jobs are available.";

// ─── Derived maps ──────────────────────────────────────────────────────

export const JOB_INPUT: Record<string, Record<string, unknown>> = {
	poll: POLL_INPUT,
	cancel: CANCEL_INPUT,
	list: LIST_INPUT,
	idle: IDLE_INPUT,
	error: ERROR_INPUT,
};

export const JOB_DETAILS: Record<string, Record<string, unknown>> = {
	poll: POLL_DETAILS as unknown as Record<string, unknown>,
	cancel: CANCEL_DETAILS as unknown as Record<string, unknown>,
	list: LIST_DETAILS as unknown as Record<string, unknown>,
	idle: IDLE_DETAILS as unknown as Record<string, unknown>,
	error: {},
};

export const JOB_OUTPUT_TEXT: Record<string, string | undefined> = {
	poll: POLL_OUTPUT,
	cancel: CANCEL_OUTPUT,
	list: LIST_OUTPUT,
	idle: IDLE_OUTPUT,
	error: ERROR_TEXT,
};

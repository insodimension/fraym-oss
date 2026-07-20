import { type MouseEvent as ReactMouseEvent, useEffect, useState } from "react";
import { PopoverHeading, PopoverPanel } from "../../elements/popover";
import { Icon } from "../../icons";
import { BodyPortal } from "../../lib/body-portal";
import { cn } from "../../lib/cn";
import { ActivityDot } from "../activity-state";

// JobsBadge — the "working in background" affordance for a session whose
// turn has ended but whose sidecar keeps running background bash/task jobs
// (board mr2qifam4rlmzr). The per-session rail dot renders this same signal via
// `ActivityDot` (`background` state); JobsBadge reuses that dot and is the
// IN-THREAD counterpart: a
// small trigger (badge count while jobs run) that opens a popover listing
// each job with a Stop action, so "stopping from the UI kills the jobs" is
// finally true — today there is no UI path to cancel a background job at all.

export type JobKind = "bash" | "task";
export type JobLifecycle = "running" | "completed" | "failed" | "cancelled";

/** One background job row, driver-neutral (mirrors `@fraym/driver`'s `JobDescriptor`). */
export interface JobsBadgeJob {
	readonly id: string;
	readonly type: JobKind;
	readonly status: JobLifecycle;
	readonly label: string;
	readonly startTime: number;
}

export interface JobsBadgeProps {
	/** Whether the session currently has background work (badge dot + shimmer). */
	readonly hasBackgroundWork: boolean;
	/** Running + recent jobs. `null` while not yet fetched (popover fetches lazily on open). */
	readonly jobs: { readonly running: readonly JobsBadgeJob[]; readonly recent: readonly JobsBadgeJob[] } | null;
	/** Popover opened — fetch/refresh the job list. */
	readonly onOpen?: () => void;
	/** Stop one running job. */
	readonly onCancel: (jobId: string) => void;
	/** Job ids currently mid-cancel (disables their Stop button, shows a spinner state). */
	readonly cancellingIds?: ReadonlySet<string>;
	readonly className?: string;
}

const JOB_ICON: Record<JobKind, "terminal" | "bot"> = { bash: "terminal", task: "bot" };

function elapsed(startTime: number): string {
	const ms = Date.now() - startTime;
	const s = Math.max(0, Math.round(ms / 1000));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	return `${m}m ${s % 60}s`;
}

function JobRow({
	job,
	cancelling,
	onCancel,
}: {
	readonly job: JobsBadgeJob;
	readonly cancelling: boolean;
	readonly onCancel?: (jobId: string) => void;
}) {
	const running = job.status === "running";
	return (
		<div data-slot="jobs-badge-row" className="flex items-center gap-2 px-2.5 py-1.5">
			<Icon
				name={JOB_ICON[job.type]}
				size={13}
				className={cn("shrink-0", running ? "text-fr-warn" : "text-fr-text-3")}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="fr-overflow font-secondary text-fr-xs text-fr-text" title={job.label}>
					{job.label}
				</span>
				<span className="text-fr-2xs text-fr-text-3">
					{running ? `running · ${elapsed(job.startTime)}` : job.status}
				</span>
			</div>
			{running && onCancel && (
				<button
					type="button"
					disabled={cancelling}
					onClick={() => onCancel(job.id)}
					className="shrink-0 rounded-[6px] px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-text-3 transition-colors hover:bg-fr-del/15 hover:text-fr-del disabled:opacity-50"
				>
					{cancelling ? "…" : "Stop"}
				</button>
			)}
		</div>
	);
}

/** Badge trigger + anchored popover listing background jobs, each with a Stop action. */
export function JobsBadge({ hasBackgroundWork, jobs, onOpen, onCancel, cancellingIds, className }: JobsBadgeProps) {
	const [open, setOpen] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);

	// Escape closes; a click INSIDE the portaled panel must never close it (a
	// global pointerdown listener would catch a click on Stop before its own
	// onClick fires) - so close-on-outside-click uses a full-screen backdrop
	// button rendered BEHIND the panel (DockSwitchMenu's pattern), not a
	// document listener.
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.isComposing) return;
			event.preventDefault();
			setOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open]);

	if (!hasBackgroundWork && !open) return null;

	const runningCount = jobs?.running.length ?? 0;

	const toggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
		const next = !open;
		setOpen(next);
		setRect(next ? event.currentTarget.getBoundingClientRect() : null);
		if (next) onOpen?.();
	};

	return (
		<>
			<button
				type="button"
				onClick={toggle}
				aria-label={
					runningCount > 0
						? `${runningCount} background job${runningCount > 1 ? "s" : ""} running`
						: "Background jobs"
				}
				aria-expanded={open}
				className={cn(
					"relative flex h-6 items-center gap-1 rounded-full border border-fr-border-soft bg-fr-surface px-2 font-secondary text-fr-2xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text",
					className,
				)}
			>
				<ActivityDot state="background" />
				{runningCount > 0 ? runningCount : ""}
			</button>
			{open && rect && (
				<>
					<BodyPortal>
						<button
							type="button"
							aria-label="Close background jobs"
							className="fixed inset-0 z-40"
							onClick={() => setOpen(false)}
						/>
					</BodyPortal>
					<PopoverPanel
						data-slot="jobs-badge-panel"
						width={260}
						anchorRect={rect}
						place="below"
						className="max-h-[320px] overflow-y-auto"
					>
						<PopoverHeading>Background jobs</PopoverHeading>
						{jobs === null && <div className="px-2.5 py-2 text-fr-2xs text-fr-text-3">Loading…</div>}
						{jobs !== null && jobs.running.length === 0 && jobs.recent.length === 0 && (
							<div className="px-2.5 py-2 text-fr-2xs text-fr-text-3">No background jobs.</div>
						)}
						{jobs?.running.map(job => (
							<JobRow
								key={job.id}
								job={job}
								cancelling={cancellingIds?.has(job.id) ?? false}
								onCancel={onCancel}
							/>
						))}
						{jobs && jobs.recent.length > 0 && (
							<>
								<div className="mx-2 my-[5px] h-px bg-fr-border-soft" />
								{jobs.recent.map(job => (
									<JobRow key={job.id} job={job} cancelling={false} />
								))}
							</>
						)}
					</PopoverPanel>
				</>
			)}
		</>
	);
}

import type { JobsSnapshot, SessionDriver, SessionRef } from "@fraym-ai/driver";
import { useCallback, useState } from "react";

export interface JobsState {
	readonly jobs: JobsSnapshot | null;
	/** Fetch/refresh the job list — call on popover open. */
	readonly refresh: () => void;
	/** Stop one running job. */
	readonly cancel: (jobId: string) => void;
	/** Job ids currently mid-cancel. */
	readonly cancellingIds: ReadonlySet<string>;
}

/**
 * On-demand background-job inventory + cancel, for {@link JobsBadge}. Mirrors
 * {@link useTools}: pulled when the popover opens, not pushed on every job
 * tick (the badge's own count comes from `hasBackgroundWork`/`snapshot`
 * live events — this hook only serves the expanded list). `cancel` is
 * optimistic-free: it awaits the driver, then refetches so Stop reflects the
 * server's actual terminal state rather than assuming success.
 */
export function useJobs(
	driver: SessionDriver | null | undefined,
	sessionRef: SessionRef | null | undefined,
): JobsState {
	const [jobs, setJobs] = useState<JobsSnapshot | null>(null);
	const [cancellingIds, setCancellingIds] = useState<ReadonlySet<string>>(new Set());

	const refresh = useCallback(() => {
		if (!driver?.getJobs || !sessionRef) return;
		void driver.getJobs(sessionRef).then(result => setJobs(result ?? null));
	}, [driver, sessionRef]);

	const cancel = useCallback(
		(jobId: string) => {
			if (!driver?.cancelJob || !sessionRef) return;
			setCancellingIds(prev => new Set(prev).add(jobId));
			void driver
				.cancelJob(sessionRef, jobId)
				.catch(() => false)
				.finally(() => {
					setCancellingIds(prev => {
						const next = new Set(prev);
						next.delete(jobId);
						return next;
					});
					refresh();
				});
		},
		[driver, sessionRef, refresh],
	);

	return { jobs, refresh, cancel, cancellingIds };
}

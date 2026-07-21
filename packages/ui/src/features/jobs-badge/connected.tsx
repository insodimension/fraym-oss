import type { JobDescriptor } from "@fraym-ai/driver";
import { useMemo } from "react";
import { useJobs } from "../../hooks/use-jobs";
import { useSessionOptional } from "../../hooks/use-session";
import { JobsBadge, type JobsBadgeJob } from "./jobs-badge";

function toBadgeJob(job: JobDescriptor): JobsBadgeJob {
	return { id: job.id, type: job.type, status: job.status, label: job.label, startTime: job.startTime };
}

/**
 * In-thread background-jobs affordance bound to the active session. Reads the
 * live `hasBackgroundWork` signal from the session context and pulls the job
 * list on demand via {@link useJobs} (mirrors {@link ConnectedContextBreakdown}).
 * The underlying {@link JobsBadge} renders nothing until the session actually has
 * background work, so this is safe to mount unconditionally in the thread header.
 */
export function ConnectedJobsBadge({ className }: { readonly className?: string }) {
	const session = useSessionOptional();
	const { jobs, refresh, cancel, cancellingIds } = useJobs(session?.driver, session?.sessionRef);
	const mapped = useMemo(
		() => (jobs ? { running: jobs.running.map(toBadgeJob), recent: jobs.recent.map(toBadgeJob) } : null),
		[jobs],
	);
	return (
		<JobsBadge
			hasBackgroundWork={session?.hasBackgroundWork ?? false}
			jobs={mapped}
			onOpen={refresh}
			onCancel={cancel}
			cancellingIds={cancellingIds}
			className={className}
		/>
	);
}

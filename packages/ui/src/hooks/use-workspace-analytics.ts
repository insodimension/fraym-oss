import type {
	AnalyticsBenchResult,
	AnalyticsDriver,
	AnalyticsRange,
	AnalyticsSnapshot,
	WorkspaceRef,
} from "@fraym/driver";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface WorkspaceAnalyticsState {
	readonly available: boolean;
	readonly loading: boolean;
	readonly refreshing: boolean;
	readonly range: AnalyticsRange;
	readonly setRange: (range: AnalyticsRange) => void;
	readonly snapshot: AnalyticsSnapshot | null;
	readonly error: string | null;
	readonly refresh: () => Promise<void>;
	/** "Test my models now" — a real, billed API call per model, only ever fired by an explicit click. */
	readonly runBenchmark: (models: readonly string[], runs?: number) => Promise<readonly AnalyticsBenchResult[]>;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function useWorkspaceAnalytics(
	driver: AnalyticsDriver | null | undefined,
	workspace: WorkspaceRef | null | undefined,
	initialRange: AnalyticsRange = "30d",
): WorkspaceAnalyticsState {
	const available = Boolean(driver && workspace);
	// The load/refresh effect keys on the workspace IDENTITY (id + path), not the
	// object: the catalog mints a fresh `WorkspaceRef` on every poll (live git
	// enrichment), and an object-keyed effect re-fired `refreshWorkspaceAnalytics`
	// — a full engine session-store re-ingest — on every churn. That fed the
	// 2026-07-16 control-sidecar OOM storm (P0). The ref keeps the latest object
	// for the actual calls without widening the dependency.
	const workspaceRef = useRef(workspace);
	workspaceRef.current = workspace;
	const workspaceKey = workspace ? `${workspace.workspaceId}\u0000${workspace.path}` : null;
	const [range, setRange] = useState<AnalyticsRange>(initialRange);
	const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => setRange(initialRange), [initialRange]);

	useEffect(() => {
		let cancelled = false;
		const target = workspaceRef.current;
		if (!driver || !target || workspaceKey === null) {
			setSnapshot(null);
			setLoading(false);
			setRefreshing(false);
			setError(null);
			return;
		}
		setLoading(true);
		setRefreshing(true);
		setError(null);
		const query = { range };
		const workspace = target;
		void (async () => {
			try {
				const cached = await driver.getWorkspaceAnalytics(workspace, query);
				if (!cancelled) {
					setSnapshot(cached);
					setLoading(false);
				}
				const fresh = await driver.refreshWorkspaceAnalytics(workspace, query);
				if (!cancelled) setSnapshot(fresh);
			} catch (cause) {
				if (!cancelled) setError(errorMessage(cause));
			} finally {
				if (!cancelled) setLoading(false);
				if (!cancelled) setRefreshing(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [driver, range, workspaceKey]);

	const refresh = useCallback(async () => {
		const workspace = workspaceRef.current;
		if (!driver || !workspace) return;
		setRefreshing(true);
		setError(null);
		try {
			setSnapshot(await driver.refreshWorkspaceAnalytics(workspace, { range }));
		} catch (cause) {
			setError(errorMessage(cause));
		} finally {
			setRefreshing(false);
		}
	}, [driver, range]);

	const runBenchmark = useCallback(
		async (models: readonly string[], runs?: number): Promise<readonly AnalyticsBenchResult[]> => {
			if (!driver) throw new Error("Analytics driver unavailable — cannot run a speed test.");
			return driver.runBenchmark(models, runs);
		},
		[driver],
	);

	return useMemo(
		() => ({ available, loading, refreshing, range, setRange, snapshot, error, refresh, runBenchmark }),
		[available, error, loading, range, refresh, refreshing, runBenchmark, snapshot],
	);
}

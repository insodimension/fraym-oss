import type { UsageDriver, UsageSnapshot } from "@fraym/driver";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface UsageState {
	readonly available: boolean;
	readonly loading: boolean;
	readonly refreshing: boolean;
	readonly snapshot: UsageSnapshot | null;
	readonly error: string | null;
	readonly lastFetchedAt: number | null;
	readonly refresh: () => Promise<void>;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

interface UsageSetters {
	readonly setSnapshot: (snapshot: UsageSnapshot | null) => void;
	readonly setLoading: (loading: boolean) => void;
	readonly setRefreshing: (refreshing: boolean) => void;
	readonly setError: (error: string | null) => void;
	readonly setLastFetchedAt: (time: number | null) => void;
}

type CommitUsageSnapshot = (snapshot: UsageSnapshot) => void;

function useUsageCommit(setters: Pick<UsageSetters, "setSnapshot" | "setLastFetchedAt">): CommitUsageSnapshot {
	return useCallback(
		(next: UsageSnapshot) => {
			setters.setSnapshot(next);
			setters.setLastFetchedAt(next.fetchedAt ?? Date.now());
		},
		[setters],
	);
}

function resetUsageState(setters: UsageSetters): void {
	setters.setSnapshot(null);
	setters.setLoading(false);
	setters.setRefreshing(false);
	setters.setError(null);
	setters.setLastFetchedAt(null);
}

function useUsageInitialLoad(
	driver: UsageDriver | null | undefined,
	sessionId: string | undefined,
	commit: CommitUsageSnapshot,
	setters: UsageSetters,
) {
	useEffect(() => {
		let cancelled = false;
		if (!driver) {
			resetUsageState(setters);
			return;
		}

		setters.setLoading(true);
		setters.setRefreshing(true);
		setters.setError(null);
		void (async () => {
			try {
				const cached = await driver.getUsage({ sessionId });
				if (!cancelled) {
					commit(cached);
					setters.setLoading(false);
				}
				const fresh = await driver.refreshUsage({ sessionId });
				if (!cancelled) commit(fresh);
			} catch (cause) {
				if (!cancelled) setters.setError(errorMessage(cause));
			} finally {
				if (!cancelled) setters.setLoading(false);
				if (!cancelled) setters.setRefreshing(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [commit, driver, sessionId, setters]);
}

function useUsageRefresh(
	driver: UsageDriver | null | undefined,
	sessionId: string | undefined,
	commit: CommitUsageSnapshot,
	setters: UsageSetters,
) {
	return useCallback(async () => {
		if (!driver) return;
		setters.setRefreshing(true);
		setters.setError(null);
		try {
			commit(await driver.refreshUsage({ force: true, sessionId }));
		} catch (cause) {
			setters.setError(errorMessage(cause));
		} finally {
			setters.setRefreshing(false);
		}
	}, [commit, driver, sessionId, setters]);
}

function isDocumentVisible(): boolean {
	return typeof document === "undefined" || document.visibilityState === "visible";
}

function useUsagePolling(
	driver: UsageDriver | null | undefined,
	sessionId: string | undefined,
	pollMs: number,
	commit: CommitUsageSnapshot,
	setters: UsageSetters,
) {
	useEffect(() => {
		let cancelled = false;
		let interval: ReturnType<typeof setInterval> | null = null;
		let inFlight = false;
		if (!driver || pollMs <= 0) return;

		const clearPoll = () => {
			if (!interval) return;
			clearInterval(interval);
			interval = null;
		};
		const refreshQuietly = async () => {
			if (cancelled || !isDocumentVisible() || inFlight) return;
			inFlight = true;
			setters.setRefreshing(true);
			try {
				const fresh = await driver.refreshUsage({ sessionId });
				if (!cancelled) {
					commit(fresh);
					setters.setError(null);
				}
			} catch (cause) {
				if (!cancelled) setters.setError(errorMessage(cause));
			} finally {
				inFlight = false;
				if (!cancelled) setters.setRefreshing(false);
			}
		};
		const startPoll = () => {
			if (interval || !isDocumentVisible()) return;
			interval = setInterval(() => void refreshQuietly(), pollMs);
		};
		const handleVisibilityChange = () => {
			if (isDocumentVisible()) {
				void refreshQuietly();
				startPoll();
			} else {
				clearPoll();
			}
		};

		startPoll();
		if (typeof document !== "undefined") document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			cancelled = true;
			clearPoll();
			if (typeof document !== "undefined") document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [commit, driver, pollMs, sessionId, setters]);
}

export function useUsage(
	driver: UsageDriver | null | undefined,
	options: { readonly pollMs?: number; readonly sessionId?: string } = {},
): UsageState {
	const available = Boolean(driver);
	const pollMs = options.pollMs ?? 60000;
	const { sessionId } = options;
	const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
	const setters = useMemo(() => ({ setSnapshot, setLoading, setRefreshing, setError, setLastFetchedAt }), []);
	const commit = useUsageCommit(setters);
	useUsageInitialLoad(driver, sessionId, commit, setters);
	const refresh = useUsageRefresh(driver, sessionId, commit, setters);
	useUsagePolling(driver, sessionId, pollMs, commit, setters);

	return useMemo(
		() => ({ available, loading, refreshing, snapshot, error, lastFetchedAt, refresh }),
		[available, error, lastFetchedAt, loading, refresh, refreshing, snapshot],
	);
}

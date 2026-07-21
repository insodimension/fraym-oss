import type { UsageFreshness, UsageSnapshot } from "@fraym-ai/driver";
import { Card, CardContent, IconButton, Shimmer } from "../../elements";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { UsageAccountCard } from "./usage-account-card";
import { usageSnapshotHasData } from "./usage-selectors";
import { relativeTime } from "./usage-staleness";

export interface UsagePanelProps {
	readonly snapshot: UsageSnapshot | null;
	readonly available?: boolean;
	readonly loading?: boolean;
	readonly refreshing?: boolean;
	readonly error?: string | null;
	readonly onRefresh?: () => void;
	readonly className?: string;
}

function UsagePanelHeader({
	snapshot,
	refreshing,
	onRefresh,
}: Pick<UsagePanelProps, "snapshot" | "refreshing" | "onRefresh">) {
	return (
		<div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 className="text-fr-2xl font-semibold tracking-tight text-fr-text">Usage &amp; limits</h1>
				<p className="mt-1 text-fr-base text-fr-text-2">Live quota windows across your connected providers.</p>
			</div>
			<div className="flex flex-col items-start gap-1.5 sm:items-end">
				<div className="flex items-center gap-2">
					<UsageFreshnessBadge
						freshness={snapshot?.freshness}
						fallbackFetchedAt={snapshot?.fetchedAt}
						onRefresh={onRefresh}
					/>
					<IconButton onClick={onRefresh} disabled={!onRefresh || refreshing} aria-label="Refresh usage limits">
						<Icon name="history" size={15} className={cn(refreshing && "animate-spin")} />
					</IconButton>
				</div>
				<div className="text-fr-2xs text-fr-text-3">Refreshes automatically every few minutes.</div>
			</div>
		</div>
	);
}

function UsagePanelBody({
	snapshot,
	available,
	error,
	showLoading,
	hasData,
}: {
	readonly snapshot: UsageSnapshot | null;
	readonly available: boolean;
	readonly error?: string | null;
	readonly showLoading?: boolean;
	readonly hasData: boolean;
}) {
	if (showLoading) return <UsageSkeletonGrid />;
	if (error) return <EmptyUsageState title="Usage unavailable" description={error} />;
	if (!available)
		return <EmptyUsageState title="No usage driver connected" description="Connect a provider to see live limits." />;
	if (!snapshot || snapshot.accounts.length === 0 || !hasData) {
		return (
			<EmptyUsageState
				title="No limits reported"
				description="Your providers did not report any usage windows yet."
			/>
		);
	}
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			{snapshot.accounts.map(account => (
				<UsageAccountCard key={account.id} account={account} />
			))}
		</div>
	);
}

export function UsagePanel({
	snapshot,
	available = true,
	loading,
	refreshing,
	error,
	onRefresh,
	className,
}: UsagePanelProps) {
	const hasData = usageSnapshotHasData(snapshot);
	const showLoading = loading && !hasData;

	return (
		<div className={cn("mx-auto max-w-[760px]", className)}>
			<UsagePanelHeader snapshot={snapshot} refreshing={refreshing} onRefresh={onRefresh} />
			<UsagePanelBody
				snapshot={snapshot}
				available={available}
				error={error}
				showLoading={showLoading}
				hasData={hasData}
			/>
		</div>
	);
}

function UsageFreshnessBadge({
	freshness,
	fallbackFetchedAt,
	onRefresh,
}: {
	readonly freshness: UsageFreshness | null | undefined;
	readonly fallbackFetchedAt?: number;
	readonly onRefresh?: () => void;
}) {
	const status = freshness?.status ?? "unavailable";
	const fetchedAt = freshness?.fetchedAt ?? fallbackFetchedAt;
	const label = freshnessLabel(status, fetchedAt);

	return (
		<button
			type="button"
			disabled={!onRefresh}
			onClick={onRefresh}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-[8px] border border-fr-border-soft px-2.5 py-1 text-fr-xs text-fr-text-2",
				onRefresh && "transition-colors hover:bg-fr-surface hover:text-fr-text",
				freshnessButtonClass(status),
			)}
			title={freshness?.source}
		>
			<span className={cn("size-1.5 rounded-full bg-fr-text-3", freshnessDotClass(status))} />
			{label}
		</button>
	);
}

function freshnessLabel(status: UsageFreshness["status"] | "unavailable", fetchedAt?: number): string {
	if (status === "ready") return fetchedAt ? `Updated ${relativeTime(fetchedAt)}` : "Ready";
	if (status === "syncing") return "Syncing";
	if (status === "stale") return "Stale";
	return "Unavailable";
}

function freshnessButtonClass(status: UsageFreshness["status"] | "unavailable"): string | false {
	if (status === "ready") return "border-fr-accent-line";
	if (status === "unavailable") return "opacity-70";
	return false;
}

function freshnessDotClass(status: UsageFreshness["status"] | "unavailable"): string | false {
	if (status === "ready") return "bg-fr-accent";
	if (status === "syncing") return "animate-[fr-breathe_1.6s_infinite] bg-fr-warn";
	if (status === "stale") return "bg-fr-warn";
	return false;
}

function EmptyUsageState({
	title,
	description,
	className,
}: {
	readonly title: string;
	readonly description: string;
	readonly className?: string;
}) {
	return (
		<div className={cn("rounded-xl border border-fr-border-soft p-6 text-center", className)}>
			<div className="text-fr-sm font-medium text-fr-text">{title}</div>
			<div className="mt-1 text-fr-xs leading-5 text-fr-text-3">{description}</div>
		</div>
	);
}

function UsageSkeletonGrid() {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			{[0, 1, 2].map(index => (
				<Card key={index}>
					<CardContent className="space-y-2.5 py-3">
						<Shimmer className="block text-fr-sm">Loading provider</Shimmer>
						<Shimmer className="block text-fr-xs">Loading quota window</Shimmer>
						<Shimmer className="block text-fr-xs">Loading reset details</Shimmer>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

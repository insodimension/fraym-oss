import type { AnalyticsRange, AnalyticsSnapshot } from "@fraym-ai/driver";
import { useState } from "react";
import { AnalyticsProfileSections, AnalyticsWorkspaceSummaryCard } from "../../features/analytics";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";

export interface ProfileStat {
	readonly value: string;
	readonly label: string;
}

export interface ProfilePaneProps {
	readonly name?: string;
	readonly handle?: string;
	readonly plan?: string;
	readonly initials?: string;
	readonly avatarUrl?: string;
	readonly stats?: readonly ProfileStat[];
	readonly activityCells?: readonly number[];
	readonly analytics?: AnalyticsSnapshot | null;
	readonly analyticsAvailable?: boolean;
	readonly analyticsLoading?: boolean;
	readonly analyticsError?: string | null;
	readonly analyticsRange?: AnalyticsRange;
	readonly onAnalyticsRangeChange?: (range: AnalyticsRange) => void;
	readonly onAnalyticsRefresh?: () => void;
	readonly activityTitle?: string;
	readonly activityCaption?: string;
	readonly showHero?: boolean;
	readonly showActions?: boolean;
	readonly className?: string;
}

function profileAnalyticsState({
	stats,
	analytics,
	analyticsAvailable,
	analyticsLoading,
	analyticsError,
	analyticsRange,
}: Pick<
	ProfilePaneProps,
	"stats" | "analytics" | "analyticsAvailable" | "analyticsLoading" | "analyticsError" | "analyticsRange"
>) {
	const range = profileAnalyticsRange(analyticsRange, analytics);
	const analyticsForRange = profileAnalyticsForRange(range, analytics);
	const overviewError = profileAnalyticsError(analyticsError, analyticsAvailable, stats);
	const overviewLoading = profileAnalyticsLoading(analyticsLoading, analyticsForRange, range, analytics);
	return { range, analyticsForRange, overviewError, overviewLoading };
}

function profileAnalyticsRange(range: AnalyticsRange | undefined, analytics: AnalyticsSnapshot | null | undefined) {
	return range ?? analytics?.range ?? "30d";
}

function profileAnalyticsForRange(range: AnalyticsRange, analytics: AnalyticsSnapshot | null | undefined) {
	return analytics?.range === range ? analytics : null;
}

function profileAnalyticsError(
	error: string | null | undefined,
	available: boolean | undefined,
	stats: readonly ProfileStat[] | undefined,
) {
	if (error) return error;
	return !available && !stats?.length ? "Analytics driver is not connected." : null;
}

function profileAnalyticsLoading(
	loading: boolean | undefined,
	analyticsForRange: AnalyticsSnapshot | null,
	range: AnalyticsRange,
	analytics: AnalyticsSnapshot | null | undefined,
) {
	return Boolean(loading && (!analyticsForRange || analytics?.range !== range));
}

function profileInitials(name: string): string {
	return name.trim()[0]?.toUpperCase() ?? "U";
}

function ProfileHero({
	name,
	handle,
	plan,
	initials,
	avatarUrl,
}: {
	readonly name: string;
	readonly handle: string;
	readonly plan?: string;
	readonly initials: string;
	readonly avatarUrl?: string;
}) {
	const [avatarFailed, setAvatarFailed] = useState(false);
	const showImage = Boolean(avatarUrl) && !avatarFailed;
	return (
		<div className="flex flex-col items-center gap-2 px-0 pb-2 pt-3.5">
			{showImage ? (
				<img
					src={avatarUrl}
					alt=""
					className="size-16 rounded-full object-cover"
					onError={() => setAvatarFailed(true)}
				/>
			) : (
				<div className="flex size-16 items-center justify-center rounded-full bg-[linear-gradient(160deg,#5b9bff,#3a6ad0)] text-fr-2xl font-semibold tracking-fr-tight text-white">
					{initials}
				</div>
			)}
			<div className="mt-1 text-fr-2xl font-semibold tracking-[-0.02em]">{name}</div>
			<div className="text-fr-base text-fr-text-3">
				{handle}
				{plan?.trim() && (
					<>
						{" "}
						<span className="mx-0.5 opacity-50">·</span> <span className="text-fr-accent">{plan}</span>
					</>
				)}
			</div>
		</div>
	);
}

export function ProfilePane({
	name = "Local User",
	handle = "local profile",
	plan,
	initials,
	avatarUrl,
	stats,
	activityCells,
	analytics,
	analyticsAvailable = false,
	analyticsLoading = false,
	analyticsError = null,
	analyticsRange,
	onAnalyticsRangeChange,
	onAnalyticsRefresh,
	activityTitle = "Token activity",
	activityCaption,
	showHero = true,
	showActions = true,
	className,
}: ProfilePaneProps) {
	const { range, analyticsForRange, overviewError, overviewLoading } = profileAnalyticsState({
		stats,
		analytics,
		analyticsAvailable,
		analyticsLoading,
		analyticsError,
		analyticsRange,
	});
	const resolvedInitials = initials ?? profileInitials(name);

	return (
		<div data-slot="profile-pane" className={cn("relative mx-auto max-w-[980px]", className)}>
			{showActions && <ProfileActions />}

			{showHero && (
				<ProfileHero name={name} handle={handle} plan={plan} initials={resolvedInitials} avatarUrl={avatarUrl} />
			)}

			<AnalyticsWorkspaceSummaryCard
				className="my-6"
				range={range}
				onRangeChange={onAnalyticsRangeChange}
				stats={stats}
				snapshot={analytics}
				available={analyticsAvailable}
				loading={overviewLoading}
				error={overviewError}
				activityTitle={activityTitle}
				activityCaption={activityCaption}
				cells={activityCells}
			/>
			{analyticsForRange && <AnalyticsProfileSections snapshot={analyticsForRange} onRefresh={onAnalyticsRefresh} />}
		</div>
	);
}

function ProfileActions() {
	return (
		<div className="mb-1.5 flex justify-end gap-2.5">
			<span className="flex items-center gap-[5px] text-fr-xs text-fr-text-3">
				<Icon name="shield" size={12} strokeWidth={1.8} />
				Private
			</span>
			<button type="button" className="flex items-center gap-[5px] text-xs text-fr-text-2 hover:text-fr-text">
				<Icon name="diff" size={13} strokeWidth={1.8} />
				Edit
			</button>
		</div>
	);
}

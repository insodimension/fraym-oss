import type { UsageLimitView } from "@fraym/driver";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { UsageMeter } from "./usage-meter";

export interface UsageGlanceProps {
	readonly limits: readonly UsageLimitView[];
	readonly className?: string;
	readonly title?: string;
	readonly onViewAll?: () => void;
}

export function UsageGlance({ limits, className, title, onViewAll }: UsageGlanceProps) {
	if (limits.length === 0) return null;

	return (
		<div className={cn("min-w-0", className)}>
			<div className="mb-2 flex items-center gap-2 text-fr-xs font-semibold text-fr-text">
				<span className="min-w-0 flex-1 fr-overflow">{title ?? "Plan usage"}</span>
				{onViewAll && (
					<button
						type="button"
						onClick={onViewAll}
						className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-fr-text-3 transition-colors hover:bg-fr-surface hover:text-fr-text"
						aria-label="View all usage limits"
					>
						<Icon name="arrowR" size={14} />
					</button>
				)}
			</div>
			<div className="flex flex-col gap-2.5">
				{limits.map(limit => (
					<UsageMeter key={limit.id} limit={limit} compact />
				))}
			</div>
		</div>
	);
}

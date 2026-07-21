import type { UsageAccountView } from "@fraym-ai/driver";
import { ProviderBrandIcon } from "../../components";
import { Badge, Card, CardContent } from "../../elements";
import { UsageMeter } from "./usage-meter";
import { usageDataAgeLabel } from "./usage-staleness";

export interface UsageAccountCardProps {
	readonly account: UsageAccountView;
	readonly className?: string;
}

export function UsageAccountCard({ account, className }: UsageAccountCardProps) {
	const staleLabel = usageDataAgeLabel(account.fetchedAt);
	return (
		<Card className={className}>
			<div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
				<ProviderBrandIcon
					providerId={account.provider}
					providerName={account.label || account.provider}
					size="sm"
				/>
				<div className="min-w-0 flex-1">
					<div className="fr-overflow text-fr-sm font-semibold text-fr-text">{account.label}</div>
					{account.accountId && <div className="fr-overflow text-fr-2xs text-fr-text-3">{account.accountId}</div>}
				</div>
				{staleLabel && (
					<Badge
						tone="warn"
						variant="soft"
						title="This account's usage could not be refreshed; showing the last report we got."
					>
						{staleLabel}
					</Badge>
				)}
				{account.inUse && (
					<Badge tone="add" variant="soft" title="In use by this session">
						In use
					</Badge>
				)}
				{account.planType && (
					<Badge tone="accent" variant="solid" className="max-w-[120px] fr-overflow">
						{account.planType}
					</Badge>
				)}
			</div>
			<CardContent>
				{account.limits.length > 0 ? (
					<div className="flex flex-col gap-3">
						{account.limits.map(limit => (
							<UsageMeter key={limit.id} limit={limit} />
						))}
					</div>
				) : (
					<div className="text-fr-xs text-fr-text-3">No active limits reported.</div>
				)}
			</CardContent>
		</Card>
	);
}

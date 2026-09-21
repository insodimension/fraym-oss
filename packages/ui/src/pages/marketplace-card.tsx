import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** A catalog grid responsive to its available space, including embedded settings. */
export function MarketplaceGrid({ children }: { readonly children: ReactNode }) {
	return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3">{children}</div>;
}

export interface MarketplaceCardProps {
	readonly icon: ReactNode;
	readonly name: ReactNode;
	readonly badge?: ReactNode;
	/** Resolved background class for the decorative status dot. */
	readonly statusDot?: string;
	readonly status?: ReactNode;
	readonly action: ReactNode;
	/** Optional detail action, separate from the card's primary action. */
	readonly onOpen?: () => void;
	readonly rootProps?: Record<`data-${string}`, string>;
	readonly identityProps?: Record<`data-${string}`, string>;
}

/** Connection-manager card: brand tile, identity and status, then one action. */
export function MarketplaceCard({
	icon,
	name,
	badge,
	statusDot,
	status,
	action,
	onOpen,
	rootProps = {},
	identityProps = {},
}: MarketplaceCardProps) {
	const identity = (
		<>
			{icon}
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex min-w-0 flex-wrap items-center gap-2">
					<span className="truncate text-fr-base font-semibold text-fr-text">{name}</span>
					{badge}
				</span>
				{status != null && (
					<span className="flex min-w-0 items-center gap-1.5 text-fr-xs text-fr-text-2">
						{statusDot && <span className={cn("size-1.5 shrink-0 rounded-full", statusDot)} aria-hidden="true" />}
						<span data-slot="marketplace-card-status" className="min-w-0 truncate">{status}</span>
					</span>
				)}
			</span>
		</>
	);
	return (
		<div
			data-slot="marketplace-card"
			className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-fr-border-soft bg-fr-surface p-[13px] transition-colors hover:border-fr-border"
			{...rootProps}
		>
			{onOpen ? (
				<button type="button" data-slot="marketplace-card-open" onClick={onOpen}
					className="flex min-w-0 flex-1 basis-36 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line"
					{...identityProps}>
					{identity}
				</button>
			) : (
				<span data-slot="marketplace-card-open" className="flex min-w-0 flex-1 basis-36 items-center gap-3" {...identityProps}>
					{identity}
				</span>
			)}
			<div className="shrink-0">{action}</div>
		</div>
	);
}

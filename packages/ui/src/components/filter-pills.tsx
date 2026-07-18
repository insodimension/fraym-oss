// Generic pill-style filter/segmented-control row — the same visual language
// used for the provider "All / Connected / OAuth / API key / No auth" filter
// row and the Plugins page category filter. Any caller with a small closed
// set of mutually-exclusive string options renders through this, so every
// pill row in the product looks identical.

import { cn } from "../lib/cn";

export interface MarketplaceFilter<T extends string = string> {
	readonly id: T;
	readonly label: string;
	/** Optional native tooltip explaining this option. */
	readonly title?: string;
}

/** Pill-style filter row; `active` is matched against each filter's `id`. */
export function MarketplaceFilterPills<T extends string>({
	filters,
	active,
	onChange,
	disabled = false,
}: {
	readonly filters: readonly MarketplaceFilter<T>[];
	readonly active: T;
	readonly onChange: (id: T) => void;
	readonly disabled?: boolean;
}) {
	return (
		<div role="radiogroup" className="flex flex-wrap gap-2">
			{filters.map(option => (
				<button
					key={option.id}
					type="button"
					role="radio"
					aria-checked={active === option.id}
					title={option.title}
					disabled={disabled}
					className={cn(
						"rounded-[20px] border px-[13px] py-[5px] text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
						active === option.id
							? "border-transparent bg-fr-text text-fr-bg"
							: "border-fr-border-soft text-fr-text-2 hover:border-fr-border",
					)}
					onClick={() => onChange(option.id)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

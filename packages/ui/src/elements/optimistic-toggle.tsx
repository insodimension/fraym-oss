import { useEffect, useState } from "react";
import { Spinner } from "./spinner";
import { Toggle, type ToggleProps } from "./toggle";

export interface OptimisticToggleProps extends Omit<ToggleProps, "onCheckedChange"> {
	/** Fired with the next value. May return a promise — the toggle flips
	 *  immediately, shows a labor spinner until it settles, and reverts on
	 *  rejection. Runtime promises are awaited even when typed `void`. */
	readonly onCheckedChange?: (checked: boolean) => unknown;
}

/**
 * A {@link Toggle} that flips INSTANTLY on click and shows an inline labor
 * spinner while an async handler settles. The plain Toggle is fully controlled
 * by `checked` (the engine snapshot), which for a plugin enable/disable lags
 * several seconds behind the RPC + `reloadPlugins()` round-trip — so a click
 * reads as dead until the snapshot returns. This holds an optimistic local
 * value so the switch moves now, reverts if the handler rejects, and reconciles
 * to the authoritative `checked` the moment it arrives (from this op or any
 * background refresh).
 */
export function OptimisticToggle({
	checked = false,
	onCheckedChange,
	disabled,
	className,
	...props
}: OptimisticToggleProps) {
	const [optimistic, setOptimistic] = useState<boolean | null>(null);
	const [pending, setPending] = useState(false);
	// Authoritative value caught up (our op resolved, or a background refresh) →
	// drop the override and follow the truth.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `checked` is an intentional trigger — the effect reads nothing but must re-run whenever the authoritative value changes to clear the optimistic override; removing it would make this mount-only and break reconciliation.
	useEffect(() => {
		setOptimistic(null);
	}, [checked]);
	const shown = optimistic ?? checked;

	const handleChange = (next: boolean) => {
		if (!onCheckedChange) return;
		setOptimistic(next);
		setPending(true);
		// `Promise.resolve` unwraps a real thenable even when the handler is typed
		// `void`, so pending tracks the true RPC. `finally` clears the override:
		// on success `checked` is already `next` (snapshot applied before resolve);
		// on failure `checked` is unchanged, so shown reverts to the old value.
		Promise.resolve(onCheckedChange(next))
			.catch(() => undefined)
			.finally(() => {
				setPending(false);
				setOptimistic(null);
			});
	};

	return (
		<span className="inline-flex items-center gap-2">
			{pending && <Spinner kind="dots" size="xs" className="text-fr-accent" />}
			<Toggle {...props} checked={shown} disabled={disabled} onCheckedChange={handleChange} className={className} />
		</span>
	);
}

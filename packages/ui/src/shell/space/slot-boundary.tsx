import { Component, type ErrorInfo, type ReactNode } from "react";
import type { SlotContract } from "./slot-contracts/slot-contract";

interface SpaceSlotBoundaryProps {
	/** Which slot this boundary guards (crash provenance in the console). */
	readonly slot: SlotContract;
	readonly children: ReactNode;
	/** The self-heal filling — the Fraym default implementation's render, when
	 *  the crashed filling was NOT already the default. Absent → the notice. */
	readonly fallback?: ReactNode;
}

interface SpaceSlotBoundaryState {
	readonly crashed: boolean;
}

/** The shell obligation (doc 44 §12.1): a crash boundary around every kind
 *  implementation AND every workspace surface. A broken filling never takes
 *  the shell down — the slot self-heals to the Fraym default (when one is
 *  available and wasn't the crasher) or renders an honest notice. Remount to
 *  retry by keying the boundary (mount sites key workspace-surface boundaries
 *  on `activeSurface`, so navigating away and back retries the surface). */
export class SpaceSlotBoundary extends Component<SpaceSlotBoundaryProps, SpaceSlotBoundaryState> {
	override state: SpaceSlotBoundaryState = { crashed: false };

	static getDerivedStateFromError(): SpaceSlotBoundaryState {
		return { crashed: true };
	}

	override componentDidCatch(error: Error, info: ErrorInfo) {
		console.error(
			`[spaces] ${this.props.slot} slot implementation crashed — self-healing`,
			error,
			info.componentStack,
		);
	}

	override render(): ReactNode {
		if (!this.state.crashed) return this.props.children;
		if (this.props.fallback !== undefined) return this.props.fallback;
		return (
			<div
				data-slot="space-slot-crash"
				className="flex h-full min-h-0 flex-1 items-center justify-center p-4 text-fr-xs text-fr-text-3"
			>
				This {this.props.slot === "workspace-surface" ? "surface" : `${this.props.slot} implementation`} crashed.
				Navigate away and back to retry.
			</div>
		);
	}
}

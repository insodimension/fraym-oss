import { cn, DiffViewer, Icon, type OpenDiffPayload } from "../compat/session-ui";

// Shared side-panel overlay that hosts a full DiffViewer for an OpenDiffPayload.
// Used by both showcase hosts (the isolated `edit` entry and the Demo Dock); the
// only difference is anchoring — the entry floats over the viewport (`fixed`),
// the dock floats inside its own panel (`absolute`).

type Placement = "fixed" | "absolute";

const PLACEMENT_CLASS: Record<Placement, string> = {
	fixed: "fixed w-[540px] max-w-[92vw]",
	absolute: "absolute w-[480px] max-w-[88%]",
};

export interface DiffPanelOverlayProps {
	readonly payload: OpenDiffPayload;
	readonly onClose: () => void;
	readonly placement: Placement;
}

export function DiffPanelOverlay({ payload, onClose, placement }: DiffPanelOverlayProps) {
	return (
		<div
			className={cn(
				"inset-y-0 right-0 z-50 flex flex-col border-l border-fr-border bg-fr-bg shadow-2xl",
				PLACEMENT_CLASS[placement],
			)}
		>
			<div className="flex flex-none items-center gap-2 border-b border-fr-border-soft px-3 py-2">
				<Icon name="diff" size={14} className="text-fr-accent" />
				<span className="truncate font-secondary text-fr-sm text-fr-text">{payload.path ?? "Full diff"}</span>
				<button
					type="button"
					onClick={onClose}
					className="ml-auto rounded p-1 text-fr-text-3 transition-colors hover:text-fr-text-2"
				>
					<Icon name="x" size={14} />
				</button>
			</div>
			<div className="min-h-0 flex-1 overflow-auto p-3">
				<DiffViewer files={payload.files} showToolbar />
			</div>
		</div>
	);
}

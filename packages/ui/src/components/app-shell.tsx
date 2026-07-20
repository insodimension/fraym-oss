import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

/** The session rail's three layout states: full (264px) · icon-only (56px) · gone (0). */
export type RailMode = "expanded" | "compact" | "hidden";

export interface AppShellProps {
	readonly rail: React.ReactNode;
	readonly main: React.ReactNode;
	readonly dock?: React.ReactNode;
	readonly dockOpen?: boolean;
	readonly railMode?: RailMode;
	readonly dockWidth?: number;
	/** Collapses the rail — REQUIRED for the phone-width drawer's scrim tap.
	 *  Without it the scrim never renders and the drawer can only be closed
	 *  from the top-bar toggle. */
	readonly onCollapseRail?: () => void;
	readonly className?: string;
}

const DOCK_OVERLAY_CLASSES =
	"max-[1240px]:[&_[data-slot=right-dock]]:fixed max-[1240px]:[&_[data-slot=right-dock]]:inset-y-0 max-[1240px]:[&_[data-slot=right-dock]]:right-0 max-[1240px]:[&_[data-slot=right-dock]]:z-[45] max-[1240px]:[&_[data-slot=right-dock]]:w-[var(--fr-dock-w-active)] max-[1240px]:[&_[data-slot=right-dock]]:max-w-[100vw] max-[1240px]:[&_[data-slot=right-dock]]:shadow-[-20px_0_60px_rgba(0,0,0,.5)]";

// Phone-width (≤760px viewport or a narrow embedded frame) rail behavior lives
// in theme.css beside the dock's narrow-frame rules: an EXPANDED rail floats
// over the single-column layout as a left drawer above [data-slot=rail-scrim]
// (tap to close); compact/hidden stay off-canvas. Before that split, theme.css
// force-hid the rail unconditionally and the top-bar toggle was a silent no-op
// on phones — sessions were unreachable (first live mobile session, 2026-07-10).

// The rail track is ALWAYS present at var(--fr-rail-w) (re-targeted per
// data-rail-mode: 264 / 56 / 0 in theme.css) so the column width morphs smoothly
// instead of the track count changing — which can't animate. Only the dock track
// is added or removed.
function gridColumns(dockOpen: boolean): string {
	if (dockOpen) {
		return `grid-cols-[var(--fr-rail-w)_minmax(0,1fr)_var(--fr-dock-w-active)] max-[1240px]:grid-cols-[var(--fr-rail-w)_minmax(0,1fr)] ${DOCK_OVERLAY_CLASSES}`;
	}
	return "grid-cols-[var(--fr-rail-w)_minmax(0,1fr)]";
}

function dockWidthStyle(dockWidth: number | undefined): CSSProperties | undefined {
	if (!dockWidth) return undefined;
	return {
		"--fr-dock-w": `${dockWidth}px`,
		"--fr-dock-w-active": "var(--fr-dock-w-live, var(--fr-dock-w))",
	} as CSSProperties;
}

export function AppShell({
	rail,
	main,
	dock,
	dockOpen = false,
	railMode = "expanded",
	dockWidth,
	onCollapseRail,
	className,
}: AppShellProps) {
	return (
		<div
			data-slot="app-shell"
			data-dock-open={dockOpen ? "" : undefined}
			data-rail-mode={railMode}
			style={dockWidthStyle(dockWidth)}
			className={cn(
				"relative grid h-full min-h-0 w-full min-w-0 overflow-hidden grid-rows-[minmax(0,1fr)] max-[760px]:grid-cols-[minmax(0,1fr)]",
				gridColumns(dockOpen),
				className,
			)}
		>
			{railMode === "expanded" && onCollapseRail ? (
				<button type="button" aria-label="Close sidebar" data-slot="rail-scrim" onClick={onCollapseRail} />
			) : null}
			{railMode !== "hidden" && rail}
			<div
				data-slot="workspace-main"
				className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,1fr)]"
			>
				{main}
			</div>
			{dock}
		</div>
	);
}

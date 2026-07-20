import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { useWorkbenchDock } from "../workbench-dock";
import { dockTabForRenderKind, RENDER_KIND_META } from "./command-dock";

/**
 * Inline footprint for a slash command whose result is shown in the dock panel:
 * a compact, clickable chip ("Usage ↗") that (re)opens the matching panel. Keeps
 * a record in the transcript without dumping the full view inline. Binds to the
 * neutral render-kind, never the command name (LAW 2).
 */
export function CommandChip({ renderKind, command }: { readonly renderKind: string; readonly command?: string }) {
	const dock = useWorkbenchDock();
	const tab = dockTabForRenderKind(renderKind);
	const meta = RENDER_KIND_META[renderKind];
	const label = meta?.label ?? command ?? renderKind;
	return (
		<button
			type="button"
			disabled={!tab}
			onClick={() => {
				if (tab) dock.openCommandTab?.(renderKind);
			}}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-md border border-fr-border-soft bg-fr-surface px-2 py-1",
				"font-secondary text-fr-xs text-fr-text-2",
				tab ? "hover:bg-fr-surface-2 hover:text-fr-text" : "cursor-default opacity-70",
			)}
			title={tab ? `Open ${label} panel` : undefined}
		>
			{meta?.icon && <Icon name={meta.icon} size={12} />}
			<span>{label}</span>
			{tab && <Icon name="arrowUpRight" size={11} className="text-fr-text-3" />}
		</button>
	);
}

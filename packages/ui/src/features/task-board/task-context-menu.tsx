"use client";

// TaskContextMenu — the right-click menu over a board selection. Starts an agent
// on the selected task(s) three ways, all through the shared TaskSessionActions:
// in the open session, in one new session for the group, or one new session per
// task. Pure presentation; the board owns selection + placement and wires picks.

import { PopoverPanel, Scrim } from "../../elements/popover";
import { Icon, type IconName } from "../../icons";

export type TaskContextAction = "current" | "new" | "new-each";

export interface TaskContextMenuProps {
	/** Viewport coordinates of the right-click. */
	readonly x: number;
	readonly y: number;
	readonly count: number;
	/** A hand-off (session creation) is in flight — rows are inert. */
	readonly busy?: boolean;
	readonly onPick: (action: TaskContextAction) => void;
	readonly onClose: () => void;
}

interface ActionRow {
	readonly action: TaskContextAction;
	readonly icon: IconName;
	readonly title: string;
	readonly sub: string;
}

export function TaskContextMenu({ x, y, count, busy, onPick, onClose }: TaskContextMenuProps) {
	const rows: ActionRow[] = [
		{ action: "current", icon: "arrowR", title: "In this session", sub: "Hand it to the session you're in" },
		{
			action: "new",
			icon: "plus",
			title: "In a new session",
			sub: count === 1 ? "Spin up a fresh agent for it" : `One fresh agent for all ${count}`,
		},
	];
	if (count > 1) {
		rows.push({
			action: "new-each",
			icon: "layers",
			title: "Split across sessions",
			sub: `${count} agents, one per task`,
		});
	}
	return (
		<>
			<Scrim
				onClick={onClose}
				onContextMenu={event => {
					event.preventDefault();
					onClose();
				}}
			/>
			<PopoverPanel
				width={264}
				role="menu"
				data-slot="task-context-menu"
				style={{ left: x, top: y }}
				onContextMenu={event => event.preventDefault()}
			>
				<div className="px-2.5 pt-2 pb-1.5 fr-eyebrow text-fr-text-3">
					{`Run ${count} ${count === 1 ? "task" : "tasks"}`}
				</div>
				<div className="flex flex-col gap-0.5">
					{rows.map(row => (
						<button
							key={row.action}
							type="button"
							role="menuitem"
							disabled={busy}
							onClick={() => {
								if (busy) return;
								onPick(row.action);
								onClose();
							}}
							className="group flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-fr-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line disabled:cursor-default disabled:opacity-50"
						>
							<span className="grid size-8 shrink-0 place-items-center rounded-full bg-fr-accent-dim text-fr-accent">
								<Icon name={row.icon} size={15} strokeWidth={1.8} />
							</span>
							<span className="min-w-0">
								<span className="block font-semibold text-fr-text text-fr-xs">{row.title}</span>
								<span className="block text-fr-2xs text-fr-text-3">{row.sub}</span>
							</span>
						</button>
					))}
				</div>
			</PopoverPanel>
		</>
	);
}

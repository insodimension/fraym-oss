// MessageActions — the hover-revealed action row under a chat message.
//
// Presentational only: it renders a compact row of icon affordances plus a
// short local timestamp. The Thread supplies the action list (copy, branch,
// …) and gates visibility (hover/focus reveal lives at the call site). User
// rows trail under the right-aligned bubble (`align="end"`, time → actions);
// agent rows lead at the turn's end (`align="start"`, actions → time).

import { Icon, type IconName } from "../icons";
import { cn } from "../lib/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

/** Short local clock label (e.g. "2:42 PM"); `null` when the timestamp is unparseable. */
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function formatMessageTime(timestamp: string): string | null {
	const ms = new Date(timestamp).getTime();
	if (Number.isNaN(ms)) return null;
	return TIME_FORMAT.format(ms);
}

export interface MessageAction {
	/** Stable key + identity (e.g. "copy", "branch"). */
	readonly id: string;
	/** Glyph from the shared icon set. */
	readonly icon: IconName;
	/** Tooltip + accessible label. */
	readonly label: string;
	readonly onClick: () => void;
	/** Tooltip + label shown while `active` (e.g. "Copied"). Falls back to `label`. */
	readonly activeLabel?: string;
	/** Lights the glyph accent + swaps to `activeLabel` (e.g. just-copied confirmation). */
	readonly active?: boolean;
	readonly disabled?: boolean;
}

export interface MessageActionsProps {
	readonly actions: readonly MessageAction[];
	/** ISO timestamp; rendered as a short local time. Omitted/unparseable → no time chip. */
	readonly timestamp?: string;
	/** Row flow: `start` leads with actions (agent), `end` leads with the time (user). */
	readonly align?: "start" | "end";
	readonly className?: string;
}

function MessageActionButton({ action }: { readonly action: MessageAction }) {
	const label = action.active ? (action.activeLabel ?? action.label) : action.label;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					data-slot="message-action"
					data-action={action.id}
					aria-label={label}
					disabled={action.disabled}
					onClick={action.onClick}
					className={cn(
						"flex size-[26px] items-center justify-center rounded-[7px] text-fr-text-3 transition-colors",
						"hover:bg-fr-surface-2 hover:text-fr-text-2",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fr-border",
						"disabled:pointer-events-none disabled:opacity-40",
						action.active && "text-fr-accent hover:text-fr-accent",
					)}
				>
					<Icon name={action.icon} size={15} />
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export function MessageActions({ actions, timestamp, align = "start", className }: MessageActionsProps) {
	const time = timestamp ? formatMessageTime(timestamp) : null;
	if (actions.length === 0 && !time) return null;
	const timeChip = time ? (
		<span data-slot="message-time" className="select-none font-secondary text-fr-2xs text-fr-text-3 tabular-nums">
			{time}
		</span>
	) : null;
	const buttons = actions.map(action => <MessageActionButton key={action.id} action={action} />);
	return (
		<TooltipProvider delayDuration={250}>
			<div
				data-slot="message-actions"
				className={cn("flex items-center gap-1", align === "end" ? "justify-end" : "justify-start", className)}
			>
				{align === "end" ? (
					<>
						{timeChip}
						{buttons}
					</>
				) : (
					<>
						{buttons}
						{timeChip}
					</>
				)}
			</div>
		</TooltipProvider>
	);
}

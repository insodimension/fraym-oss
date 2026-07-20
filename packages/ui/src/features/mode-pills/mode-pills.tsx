import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";

// Closeable mode pills — the canonical surface for ACTIVE session modes
// (plan, goal, loop, collab, and lifecycle modes like ephemeral/self-prune).
// Codex-style: a strip of small tonal pills pinned above the composer input,
// each one optionally exiting its mode via a (×). This is deliberately SEPARATE
// from the permission-mode dropdown (`PermissionMenu`) — permission is a single
// exclusive policy; modes are an additive set the user toggles on and off.

/** Tone names that map to a `--fr-<tone>` color token in theme.css. */
export type ModePillTone = "accent" | "add" | "blue" | "warn" | "del" | "mute";

// Soft tints mirror the Badge `soft` variant so a mode pill reads as the same
// family as the rest of the chip system.
const PILL_TONE: Record<ModePillTone, string> = {
	accent: "bg-fr-accent-dim text-fr-accent",
	add: "bg-fr-add-bg text-fr-add",
	blue: "bg-fr-blue/15 text-fr-blue",
	warn: "bg-fr-warn/15 text-fr-warn",
	del: "bg-fr-del-bg text-fr-del",
	mute: "bg-fr-surface-3 text-fr-text-2",
};

/** A single active session mode rendered as a pill. */
export interface ModePillItem {
	/** Stable mode id (e.g. "plan", "goal", "loop", "collab", "ephemeral"). */
	readonly id: string;
	/** Pill label. */
	readonly label: string;
	/** Optional leading icon. */
	readonly icon?: IconName;
	/** Tonal color; defaults to "accent". */
	readonly tone?: ModePillTone;
	/** Click the pill body — e.g. open the mode's settings/detail. When set, the
	 *  body becomes a button; when absent the body is inert text. */
	readonly onSelect?: (id: string) => void;
	/** Exit the mode. Its presence renders the (×) affordance; absence makes the
	 *  pill non-closeable (e.g. a mode owned by the host, not user-dismissable). */
	readonly onClose?: (id: string) => void;
	/** Dim and block interactions while keeping the pill visible (e.g. a mode
	 *  mid-transition). */
	readonly disabled?: boolean;
	/** Accessible label for the (×); defaults to `Exit ${label}`. */
	readonly closeLabel?: string;
}

export interface ModePillsProps {
	/** Active modes to render; an empty list renders nothing. */
	readonly modes: readonly ModePillItem[];
	/** Accessible group label for the strip. */
	readonly "aria-label"?: string;
	readonly className?: string;
}

function ModePill({ id, label, icon, tone = "accent", onSelect, onClose, disabled, closeLabel }: ModePillItem) {
	const body = (
		<>
			{icon && <Icon name={icon} size={12} className="shrink-0" />}
			<span className="min-w-0 fr-overflow">{label}</span>
		</>
	);
	return (
		<span
			data-slot="mode-pill"
			data-mode={id}
			data-tone={tone}
			className={cn(
				"group inline-flex h-[22px] max-w-full items-center gap-1.5 rounded-full pl-2 text-xs",
				onClose ? "pr-1" : "pr-2.5",
				PILL_TONE[tone],
				disabled && "opacity-50",
			)}
		>
			{onSelect && !disabled ? (
				<button
					type="button"
					data-slot="mode-pill-body"
					onClick={() => onSelect(id)}
					className="inline-flex min-w-0 items-center gap-1.5 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
				>
					{body}
				</button>
			) : (
				<span className="inline-flex min-w-0 items-center gap-1.5">{body}</span>
			)}
			{onClose && (
				<button
					type="button"
					data-slot="mode-pill-close"
					aria-label={closeLabel ?? `Exit ${label}`}
					disabled={disabled}
					onClick={() => onClose(id)}
					className="grid size-[18px] shrink-0 place-items-center rounded-full opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-70 group-hover:hover:opacity-100 disabled:cursor-default disabled:opacity-40"
				>
					<Icon name="x" size={11} strokeWidth={2.5} />
				</button>
			)}
		</span>
	);
}

/** A horizontal, wrapping strip of closeable mode pills. */
export function ModePills({ modes, className, "aria-label": ariaLabel = "Active modes" }: ModePillsProps) {
	if (modes.length === 0) return null;
	return (
		<div
			role="group"
			aria-label={ariaLabel}
			data-slot="mode-pills"
			className={cn("flex flex-wrap items-center gap-1.5", className)}
		>
			{modes.map(mode => (
				<ModePill key={mode.id} {...mode} />
			))}
		</div>
	);
}

"use client";

// Shared status/priority vocabulary + small presentational chrome for the
// TaskBoard feature. Imported by BOTH the board/list lenses (task-board-core)
// and the task-detail modal so status colors, labels, pills, and chips stay in
// lockstep across every surface — and no surface re-declares the ladder.

import type { ReactElement, ReactNode } from "react";
import { Badge, type SelectOption } from "../../elements";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";

/** Board column order — the locked status ladder (archived/unknown stay hidden). */
export const TASK_BOARD_STATUSES = ["backlog", "todo", "doing", "blocked", "review", "done"] as const;
export type TaskStatus = (typeof TASK_BOARD_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
	backlog: "Backlog",
	todo: "To do",
	doing: "Doing",
	blocked: "Blocked",
	review: "Review",
	done: "Done",
};

export type BadgeTone = "accent" | "add" | "blue" | "warn" | "mute" | "del";

// Status is semantic, not decoration — the column dot and the read-only badge
// map onto the design system's signal tokens:
//   doing = accent, blocked = danger (del), review = warning (warn),
//   done = success (add); the early lanes stay graphite (mute).
export const STATUS_BADGE_TONE: Record<TaskStatus, BadgeTone> = {
	backlog: "mute",
	todo: "mute",
	doing: "accent",
	blocked: "del",
	review: "warn",
	done: "add",
};

/** Background classes for the per-status column dot. */
export const STATUS_DOT: Record<TaskStatus, string> = {
	backlog: "bg-fr-text-3",
	todo: "bg-fr-text-2",
	doing: "bg-fr-accent",
	blocked: "bg-fr-del",
	review: "bg-fr-warn",
	done: "bg-fr-add",
};

// Priority urgency → ink tone: only the urgent tiers carry color (P0 danger,
// P1 warning); P2/P3 stay graphite so cards don't turn into a badge rainbow.
const PRIORITY_TEXT: Record<number, string> = {
	0: "text-fr-del",
	1: "text-fr-warn",
	2: "text-fr-text-2",
	3: "text-fr-text-3",
};

export const PRIORITY_OPTIONS: readonly SelectOption[] = [
	{ value: "", label: "—" },
	{ value: "0", label: "P0" },
	{ value: "1", label: "P1" },
	{ value: "2", label: "P2" },
	{ value: "3", label: "P3" },
];

const KNOWN_STATUSES: readonly string[] = TASK_BOARD_STATUSES;

export function isKnownStatus(status: string): status is TaskStatus {
	return KNOWN_STATUSES.includes(status);
}

/** Status `<select>` options — always includes the row's current value so an
 *  archived/unknown status still renders rather than blanking the control. */
export function statusOptions(current: string): readonly SelectOption[] {
	const base = TASK_BOARD_STATUSES.map(status => ({ value: status, label: STATUS_LABELS[status] }));
	return isKnownStatus(current) ? base : [{ value: current, label: current }, ...base];
}

/** Priority as quiet mono ink ("P1") — tone-colored text, never a boxed badge. */
export function PriorityPill({ priority }: { readonly priority?: number }): ReactElement {
	if (priority === undefined) return <span className="text-fr-2xs text-fr-text-3">—</span>;
	return (
		<span
			className={cn(
				"font-secondary text-fr-2xs font-medium tabular-nums",
				PRIORITY_TEXT[priority] ?? "text-fr-text-3",
			)}
		>
			P{priority}
		</span>
	);
}

export function StatusBadge({ status }: { readonly status: string }): ReactElement {
	const label = isKnownStatus(status) ? STATUS_LABELS[status] : status;
	const tone = isKnownStatus(status) ? STATUS_BADGE_TONE[status] : "mute";
	return (
		<Badge variant="soft" tone={tone}>
			{label}
		</Badge>
	);
}

/** A small hairline metadata chip (icon + text) — milestone, due, section. */
export function MetaChip({
	icon,
	tone = "mute",
	className,
	children,
}: {
	readonly icon?: IconName;
	readonly tone?: "mute" | "accent";
	readonly className?: string;
	readonly children: ReactNode;
}): ReactElement {
	return (
		<span
			className={cn(
				"inline-flex max-w-full items-center gap-1 rounded-[5px] border px-1.5 py-0.5 font-secondary text-fr-2xs",
				tone === "accent"
					? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
					: "border-fr-border-soft bg-fr-surface-2 text-fr-text-2",
				className,
			)}
		>
			{icon ? <Icon name={icon} size={10} strokeWidth={2} className="shrink-0" /> : null}
			<span className="fr-overflow">{children}</span>
		</span>
	);
}

/** Assignee as an initial-avatar + name chip. */
export function AssigneeChip({ name }: { readonly name: string }): ReactElement {
	const initial = name.trim().charAt(0).toUpperCase() || "?";
	return (
		<span className="inline-flex min-w-0 items-center gap-1.5 text-fr-2xs text-fr-text-2" title={name}>
			<span
				aria-hidden
				className="flex size-4 shrink-0 items-center justify-center rounded-full bg-fr-surface-3 font-secondary text-fr-2xs font-medium text-fr-text-2"
			>
				{initial}
			</span>
			<span className="fr-overflow">{name}</span>
		</span>
	);
}

/** Tag chips (`#tag`) — flat mono metadata on one quiet line, so they read as
 *  secondary to the title rather than competing with it. Renders nothing when
 *  there are no tags. `max` caps the visible tags (rest collapse into "+N") so
 *  cards stay one row tall. */
export function TagChips({
	tags,
	className,
	max,
}: {
	readonly tags: readonly string[];
	readonly className?: string;
	readonly max?: number;
}): ReactElement | null {
	if (tags.length === 0) return null;
	const shown = max !== undefined && tags.length > max ? tags.slice(0, max) : tags;
	const overflow = tags.length - shown.length;
	return (
		<span
			className={cn(
				"flex flex-wrap items-center gap-x-2 gap-y-0.5 font-secondary text-fr-2xs text-fr-text-2",
				className,
			)}
		>
			{shown.map(tag => (
				<span key={tag} className="fr-overflow">
					<span className="text-fr-text-3">#</span>
					{tag}
				</span>
			))}
			{overflow > 0 ? (
				<span
					title={tags
						.slice(shown.length)
						.map(tag => `#${tag}`)
						.join(" ")}
					className="text-fr-text-3"
				>
					+{overflow}
				</span>
			) : null}
		</span>
	);
}

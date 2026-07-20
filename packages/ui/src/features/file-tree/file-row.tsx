"use client";

// FileRow — THE single row primitive for every file list in the app: the folder
// tree AND the Source Control changes list both render it, so they read as one
// system (same mono filename, same FileTypeIcon, same 24px rhythm, same git
// decoration, same hover/selected states). fr-tokens only. Per DESIGN.md, file
// names are mono (the "machine data" role).

import type { ReactNode, Ref } from "react";
import { FileTypeIcon } from "../../elements/file-type-icon";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";

/** Git decoration: the single-letter badge + its fr-token text tone. */
export interface FileRowBadge {
	readonly letter: string;
	readonly tone: string;
	readonly title?: string;
}

export interface FileRowProps {
	readonly path: string;
	readonly isDirectory?: boolean;
	/** Indent level (tree). */
	readonly depth?: number;
	readonly selected?: boolean;
	/** Git status decoration; when set, tints the name + shows the trailing letter. */
	readonly badge?: FileRowBadge;
	readonly deleted?: boolean;
	/** Leading slot (a caret in the tree); a spacer is rendered when omitted. */
	readonly leading?: ReactNode;
	/** Show the parent directory after the name (flat lists like Source Control). */
	readonly showDir?: boolean;
	readonly additions?: number;
	readonly deletions?: number;
	/** Trailing hover actions (stage / unstage / discard). */
	readonly actions?: ReactNode;
	readonly rowRef?: Ref<HTMLDivElement>;
	readonly onClick?: () => void;
	readonly className?: string;
}

export function FileRow({
	path,
	isDirectory = false,
	depth = 0,
	selected = false,
	badge,
	deleted = false,
	leading,
	showDir = false,
	additions,
	deletions,
	actions,
	rowRef,
	onClick,
	className,
}: FileRowProps) {
	const name = path.split(/[\\/]/).pop() ?? path;
	const dir = showDir ? path.slice(0, path.length - name.length).replace(/\/$/, "") : "";
	const nameTone = selected || badge ? "text-fr-text" : "text-fr-text-2";
	const hasStat = (additions ?? 0) > 0 || (deletions ?? 0) > 0;
	return (
		<div
			ref={rowRef}
			role="button"
			tabIndex={0}
			data-slot="file-row"
			data-path={path}
			data-selected={selected || undefined}
			onClick={onClick}
			onKeyDown={event => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onClick?.();
				}
			}}
			style={{ paddingLeft: depth * 12 + 4 }}
			className={cn(
				"group/row relative flex h-[24px] w-full cursor-pointer items-center gap-1.5 rounded-[6px] pr-1.5 text-left transition-colors duration-[100ms]",
				selected ? "bg-fr-accent-dim" : "hover:bg-fr-surface",
				className,
			)}
		>
			{leading ?? (showDir ? null : <span className="w-[13px] shrink-0" />)}
			{isDirectory ? (
				// Folders are navigation chrome, not content — a quiet graphite glyph
				// (the material theme's per-name COLORED folders read as a rainbow
				// against the tonal system; file glyphs keep their brand colors for
				// type recognition, matching the mention pills and transcript).
				<span className="flex size-4 shrink-0 items-center justify-center">
					<Icon name="folder" size={14} strokeWidth={1.7} className="text-fr-text-3" />
				</span>
			) : (
				<FileTypeIcon path={path} size={16} className="shrink-0 opacity-90 saturate-[.6]" />
			)}
			<span className="flex min-w-0 flex-1 items-baseline gap-1.5" title={path}>
				<span
					className={cn(
						"fr-overflow font-primary text-fr-sm",
						// Basename is sacred: full in flat lists (Source Control), still
						// truncatable when it's the only content (deep tree rows).
						dir ? "min-w-0 shrink" : "min-w-0 flex-1",
						deleted && "line-through",
						nameTone,
					)}
				>
					{name}
				</span>
				{dir && (
					// Directory tail, dimmed and truncated from the LEFT (`…/site/x/src`)
					// so many same-named files stay distinguishable by their nearest dirs.
					// Exempt from the `.fr-overflow` text-overflow policy on purpose: fade
					// is a right-edge-only mask, but this is `dir="rtl"` so the visual
					// truncation edge is the LEFT — the mask direction would be backwards.
					<span
						dir="rtl"
						className="min-w-0 shrink-[20] grow basis-0 truncate text-left font-primary text-fr-2xs text-fr-text-3"
					>
						<bdi>{dir}</bdi>
					</span>
				)}
			</span>
			{hasStat && (
				<span className="shrink-0 font-secondary text-fr-2xs tabular-nums">
					{(additions ?? 0) > 0 && <span className="text-fr-add">+{additions}</span>}
					{(additions ?? 0) > 0 && (deletions ?? 0) > 0 && " "}
					{(deletions ?? 0) > 0 && <span className="text-fr-del">−{deletions}</span>}
				</span>
			)}
			{actions && (
				<span
					className={cn(
						"absolute inset-y-0 right-0 flex items-center gap-0.5 bg-gradient-to-l from-60% to-transparent pl-4 pr-1.5 opacity-0 transition-opacity duration-[var(--fr-motion-fast)] group-hover/row:opacity-100",
						selected ? "from-fr-accent-dim" : "from-fr-surface",
					)}
				>
					{actions}
				</span>
			)}
			{badge && (
				<span
					title={badge.title}
					className={cn("w-3.5 shrink-0 text-center font-secondary text-fr-2xs font-semibold", badge.tone)}
				>
					{badge.letter}
				</span>
			)}
		</div>
	);
}

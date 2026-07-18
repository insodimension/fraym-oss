// ToolBodyCard / ToolBodySection — the shared "framed file card" for tool bodies.
//
// One consistent frame for read / write / edit / bash: a bordered card with an
// optional toolbar, a per-section header (icon + title + meta + right stat), a
// capped scroll content area that follows the tail while streaming, and an optional
// footer. Generalizes the DiffViewer FileBlock so every tool body is a sibling.
//
// Outer `ToolBodyCard` provides the border (+ optional toolbar); one or more
// `ToolBodySection`s sit inside. Single-content tools (read/write/bash) use one
// section; multi-file edit uses a toolbar + N sections. The card is variant-agnostic:
// the tool head's `ToolCard` wrapper is the rail/line, this is the framed content.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { type OpenTarget, useToolOpenCommands } from "./tool-open-target";

export interface ToolBodyCardProps {
	/** Optional strip above the sections (e.g. edit's `1 file` + Unified/Split toggle). */
	readonly toolbar?: ReactNode | undefined;
	readonly children: ReactNode;
	readonly className?: string | undefined;
}

function useFollowTail(
	scrollRef: React.RefObject<HTMLDivElement | null>,
	followTail: boolean | undefined,
	tailKey: unknown,
	expanded: boolean,
): void {
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll to the tail as content grows.
	useEffect(() => {
		if (followTail && !expanded && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [followTail, tailKey, expanded]);
}

function useOverflowState(
	scrollRef: React.RefObject<HTMLDivElement | null>,
	maxHeight: number | undefined,
	tailKey: unknown,
): boolean {
	const [overflows, setOverflows] = useState(false);
	// Surface the expand toggle once content exceeds the cap; re-measure as it grows / streams.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure on content (tailKey) change.
	useEffect(() => {
		const el = scrollRef.current;
		if (!el || maxHeight == null) return;
		const measure = () => setOverflows(el.scrollHeight > maxHeight + 4);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [maxHeight, tailKey]);
	return overflows;
}

function useOpenTarget(openTarget: OpenTarget | undefined): readonly [boolean, () => void] {
	const dock = useToolOpenCommands();
	const canOpen =
		(openTarget?.kind === "file" && typeof dock.openFile === "function") ||
		(openTarget?.kind === "diff" && typeof dock.openDiff === "function");
	const handleOpen = () => {
		if (openTarget?.kind === "file") dock.openFile?.({ path: openTarget.path, selector: openTarget.selector });
		else if (openTarget?.kind === "diff") dock.openDiff?.({ path: openTarget.path, files: openTarget.files });
	};
	return [canOpen, handleOpen] as const;
}

interface ToolBodySectionHeaderProps {
	readonly icon?: IconName | null | undefined;
	readonly title?: ReactNode | undefined;
	readonly meta?: ReactNode | undefined;
	readonly stat?: ReactNode | undefined;
}

function ToolBodySectionHeader({ icon, title, meta, stat }: ToolBodySectionHeaderProps) {
	if (title == null && stat == null) return null;
	return (
		<div className="flex items-center gap-[9px] bg-fr-surface px-3 py-[9px] font-secondary text-xs">
			{icon ? <Icon name={icon} size={13} strokeWidth={1.8} className="shrink-0 text-fr-text-3" /> : null}
			{title != null ? <span className="min-w-0 fr-overflow text-fr-text">{title}</span> : null}
			{meta}
			{stat != null ? <span className="ml-auto flex shrink-0 items-center gap-2 text-fr-xs">{stat}</span> : null}
		</div>
	);
}

interface ToolBodySectionFooterProps {
	readonly footer?: ReactNode | undefined;
	readonly showToggle: boolean;
	readonly expanded: boolean;
	readonly onToggle: () => void;
	readonly canOpen: boolean;
	readonly onOpen: () => void;
}

function ToolBodySectionFooter({
	footer,
	showToggle,
	expanded,
	onToggle,
	canOpen,
	onOpen,
}: ToolBodySectionFooterProps) {
	if (!showToggle && !canOpen && !footer) return null;
	return (
		<div className="flex items-center justify-between gap-3 border-t border-fr-border-soft bg-fr-surface px-3 py-1.5 font-secondary text-fr-xs text-fr-text-3">
			<div className="min-w-0 fr-overflow">{footer}</div>
			<div className="flex shrink-0 items-center gap-0.5">
				{showToggle ? (
					<button
						type="button"
						onClick={onToggle}
						data-slot="tool-body-expand"
						aria-expanded={expanded}
						className="flex items-center gap-1 px-2 py-0.5 transition-colors hover:text-fr-text-2"
					>
						<Icon
							name="caretR"
							size={11}
							strokeWidth={2.2}
							className={cn("transition-transform", expanded ? "-rotate-90" : "rotate-90")}
						/>
						{expanded ? "Show less" : "Show all"}
					</button>
				) : null}
				{canOpen ? (
					<button
						type="button"
						onClick={onOpen}
						data-slot="tool-body-open"
						className="flex items-center gap-1 px-2 py-0.5 transition-colors hover:text-fr-text-2"
					>
						<Icon name="arrowUpRight" size={11} strokeWidth={1.8} />
						Open
					</button>
				) : null}
			</div>
		</div>
	);
}

/** Outer bordered frame. Holds an optional toolbar + one or more `ToolBodySection`s. */
export function ToolBodyCard({ toolbar, children, className }: ToolBodyCardProps) {
	return (
		<div
			data-slot="tool-body-card"
			className={cn(
				"min-w-0 max-w-full animate-[fr-rise_0.25s_ease] overflow-hidden rounded-[var(--fr-r)] border border-fr-border",
				className,
			)}
		>
			{toolbar ? (
				<div className="flex items-center gap-2 border-b border-fr-border-soft bg-fr-surface-2 px-3 py-1.5 text-fr-xs text-fr-text-3">
					{toolbar}
				</div>
			) : null}
			{children}
		</div>
	);
}

export interface ToolBodySectionProps {
	/** Header icon (default `file`). Pass `null` to omit the icon but keep the header. */
	readonly icon?: IconName | null | undefined;
	/** Header primary text (path or command). Omit (with no `stat`) to drop the header row. */
	readonly title?: ReactNode | undefined;
	/** Inline chips after the title (new / deleted / failed). */
	readonly meta?: ReactNode | undefined;
	/** Right-aligned stat (e.g. `+26 −9`, `11 lines`, wall time). */
	readonly stat?: ReactNode | undefined;
	/** Optional footer row (e.g. "Open full diff/output") — caller supplies full styling. */
	readonly footer?: ReactNode | undefined;
	/** When set + a matching dock opener is in context, render an "Open ↗" affordance. */
	readonly openTarget?: OpenTarget | undefined;
	/** Cap (px) for the content scroll window. */
	readonly maxHeight?: number | undefined;
	/** Auto-scroll to the tail as content grows (streaming). */
	readonly followTail?: boolean | undefined;
	/** Re-arm follow-tail when this value changes (e.g. the streamed text/lines). */
	readonly tailKey?: unknown | undefined;
	/** Pad the content area (for plain text / terminal output). Code/diff with own gutters: false. */
	readonly padContent?: boolean | undefined;
	readonly children: ReactNode;
	readonly className?: string | undefined;
}

/** One section: header (icon + title + meta + stat) → capped scroll content → footer. */
export function ToolBodySection({
	icon = "file",
	title,
	meta,
	stat,
	footer,
	openTarget,
	maxHeight,
	followTail,
	tailKey,
	padContent,
	children,
	className,
}: ToolBodySectionProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [expanded, setExpanded] = useState(false);
	useFollowTail(scrollRef, followTail, tailKey, expanded);
	const overflows = useOverflowState(scrollRef, maxHeight, tailKey);

	const capped = maxHeight != null && !expanded;
	const showToggle = maxHeight != null && overflows;
	const hasHeader = title != null || stat != null;
	const [canOpen, handleOpen] = useOpenTarget(openTarget);
	return (
		<div data-slot="tool-body-section" className={className}>
			<ToolBodySectionHeader icon={icon} title={title} meta={meta} stat={stat} />
			<div
				ref={scrollRef}
				className={cn(
					"overflow-auto bg-[var(--fr-diff-bg)] font-secondary text-xs leading-[1.65]",
					hasHeader && "border-t border-fr-border-soft",
					padContent && "px-3 py-1.5",
				)}
				style={capped ? { maxHeight, scrollbarGutter: "stable" } : undefined}
			>
				{children}
			</div>
			<ToolBodySectionFooter
				footer={footer}
				showToggle={showToggle}
				expanded={expanded}
				onToggle={() => setExpanded(e => !e)}
				canOpen={canOpen}
				onOpen={handleOpen}
			/>
		</div>
	);
}

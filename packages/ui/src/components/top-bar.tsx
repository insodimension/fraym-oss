import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface TopBarProps {
	/** Optional node rendered at the FAR LEFT, before the breadcrumb — the home of
	 *  chrome controls that must stay reachable regardless of sidebar state (e.g.
	 *  the rail toggle: when the rail is compact/hidden its own toggle is gone,
	 *  so the workspace top bar carries an always-visible one). */
	readonly leadingSlot?: React.ReactNode;
	readonly repo?: string;
	readonly title?: string;
	/** Optional node rendered immediately after the title, inside the breadcrumb
	 *  (e.g. a surface-identity badge). Stays pinned while the title truncates. */
	readonly titleSlot?: React.ReactNode;
	readonly branch?: string;
	readonly rightSlot?: React.ReactNode;
	readonly className?: string;
	readonly titleProps?: HTMLAttributes<HTMLDivElement>;
}

export function TopBar({ repo, title, titleSlot, branch, rightSlot, className, titleProps, leadingSlot }: TopBarProps) {
	const { className: titleClassName, ...restTitleProps } = titleProps ?? {};
	return (
		<header
			data-slot="top-bar"
			className={cn("flex h-[52px] shrink-0 items-center gap-3 border-b border-fr-border-soft px-4", className)}
		>
			{leadingSlot && <div className="-ml-1 flex shrink-0 items-center">{leadingSlot}</div>}
			{/* .crumb */}
			<div {...restTitleProps} className={cn("flex min-w-0 items-center gap-2 text-fr-base", titleClassName)}>
				{repo && <span className="shrink-0 whitespace-nowrap font-secondary text-xs text-fr-text-2">{repo}</span>}
				{repo && title && <span className="shrink-0 text-fr-text-3">/</span>}
				{title && <span className="fr-overflow font-medium">{title}</span>}
				{titleSlot}
			</div>
			{/* .branch-chip */}
			{branch && (
				<span
					data-slot="top-bar-branch"
					className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-fr-border bg-fr-surface px-[9px] py-1 font-secondary text-fr-xs text-fr-text-2 max-[520px]:hidden"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="opacity-80"
					>
						<circle cx="6" cy="6" r="2.5" />
						<circle cx="6" cy="18" r="2.5" />
						<circle cx="18" cy="9" r="2.5" />
						<path d="M6 8.5v7M18 11.5c0 3-3 3.5-6 4" />
					</svg>
					{branch}
				</span>
			)}
			{/* .top-actions */}
			{rightSlot && <div className="relative ml-auto flex shrink-0 items-center gap-1.5">{rightSlot}</div>}
		</header>
	);
}

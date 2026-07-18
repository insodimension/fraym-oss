import type { ReactNode } from "react";
import { Icon } from "../icons";
import { cn } from "../lib/cn";

export interface CollapsibleProps {
	readonly title: ReactNode;
	readonly open: boolean;
	readonly onToggle: () => void;
	readonly leading?: ReactNode;
	/** Optional trailing count/badge rendered before the caret. */
	readonly count?: ReactNode;
	/** Optional controls rendered outside the trigger, e.g. a hover-revealed add button. */
	readonly actions?: ReactNode;
	/** Right-click handler for the header trigger (e.g. the session rail's project menu). */
	readonly onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly children: ReactNode;
	readonly className?: string;
	readonly triggerClassName?: string;
	readonly contentClassName?: string;
}

function CollapsibleCount({ count }: { readonly count?: ReactNode }) {
	if (count === undefined) return null;
	return (
		<span className="rounded-full bg-fr-surface-2 px-2 py-0.5 font-secondary text-fr-2xs tabular-nums text-fr-text-3">
			{count}
		</span>
	);
}

function CollapsibleCaret({ open }: { readonly open: boolean }) {
	return (
		<Icon
			data-slot="collapsible-caret"
			name="caretR"
			size={13}
			strokeWidth={2.2}
			className={cn("text-fr-text-3 transition-transform duration-150", open && "rotate-90")}
		/>
	);
}

function CollapsibleTrigger({
	title,
	open,
	onToggle,
	leading,
	count,
	actions,
	triggerClassName,
	onContextMenu,
}: Pick<
	CollapsibleProps,
	"title" | "open" | "onToggle" | "leading" | "count" | "actions" | "triggerClassName" | "onContextMenu"
>) {
	return (
		<button
			type="button"
			aria-expanded={open}
			onClick={onToggle}
			onContextMenu={onContextMenu}
			data-slot="collapsible-trigger"
			className={cn(
				"group flex min-w-0 flex-1 items-center justify-between gap-2 py-3 text-left text-fr-base font-medium text-fr-text-2 transition-colors hover:text-fr-text",
				triggerClassName,
				actions && "pr-8",
			)}
		>
			<span className="flex min-w-0 items-center gap-2">
				{leading}
				<span className="min-w-0 fr-overflow">{title}</span>
			</span>
			<span className="flex shrink-0 items-center gap-2">
				<CollapsibleCount count={count} />
				<CollapsibleCaret open={open} />
			</span>
		</button>
	);
}

function CollapsibleHeader(
	props: Pick<
		CollapsibleProps,
		"title" | "open" | "onToggle" | "leading" | "count" | "actions" | "triggerClassName" | "onContextMenu"
	>,
) {
	return (
		<div data-slot="collapsible-header" className="relative flex items-center gap-1">
			<CollapsibleTrigger {...props} />
			{props.actions && (
				// z-[2]: callers may raise the trigger itself (session-rail's threaded
				// style sets `relative z-[1]` to clear its connector line); the actions
				// overlay must stay above it or its buttons become unclickable and
				// clicks fall through to the collapse trigger.
				<div data-slot="collapsible-actions" className="absolute inset-y-0 right-0 z-[2] flex items-center">
					{props.actions}
				</div>
			)}
		</div>
	);
}

/**
 * Controlled disclosure section: a header button with a rotating caret and an
 * optional trailing count; content mounts only while open. Modeled on the
 * Kitchen Sink rail's tier nav so collapsible lists read consistently.
 */
export function Collapsible({
	title,
	open,
	onToggle,
	leading,
	count,
	actions,
	onContextMenu,
	children,
	className,
	triggerClassName,
	contentClassName,
}: CollapsibleProps) {
	return (
		<div
			data-slot="collapsible"
			data-state={open ? "open" : "closed"}
			className={cn("group/collapsible flex flex-col", className)}
		>
			<CollapsibleHeader
				title={title}
				open={open}
				onToggle={onToggle}
				leading={leading}
				count={count}
				actions={actions}
				{...(triggerClassName !== undefined ? { triggerClassName } : {})}
				{...(onContextMenu !== undefined ? { onContextMenu } : {})}
			/>
			{open && (
				<div data-slot="collapsible-content" className={contentClassName}>
					{children}
				</div>
			)}
		</div>
	);
}

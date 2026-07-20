// SessionTreeView — depth-indented render of Engine's session checkpoint/branch tree
// (`SessionState.tree`). The dock wires `onNavigate` to `SessionDriver.navigateSessionTree`.

import type { SessionTreeNodeKind, SessionTreeNodeSnapshot, SessionTreeSnapshot } from "@fraym/driver";
import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import { cn } from "../../lib/cn";

export interface SessionTreeViewProps {
	readonly tree: SessionTreeSnapshot;
	readonly onNavigate?: (nodeId: string) => void;
	readonly className?: string;
}

const KIND_CHIP_LABEL: Readonly<Partial<Record<SessionTreeNodeKind, string>>> = {
	thinking_level_change: "thinking",
	model_change: "model",
	compaction: "compaction",
	branch_summary: "branch",
	label: "label",
	session_info: "session",
	custom: "custom",
	custom_message: "custom",
};

function kindChip(node: SessionTreeNodeSnapshot): string | undefined {
	if (node.kind === "message") return undefined;
	if ((node.kind === "custom" || node.kind === "custom_message") && node.customType) return node.customType;
	return KIND_CHIP_LABEL[node.kind] ?? node.kind;
}

function roleTone(node: SessionTreeNodeSnapshot): string {
	if (node.role === "user") return "bg-fr-accent";
	if (node.role === "assistant") return "bg-fr-blue";
	return "bg-fr-text-3";
}

function NodeRow({
	node,
	depth,
	leafId,
	onNavigate,
}: {
	readonly node: SessionTreeNodeSnapshot;
	readonly depth: number;
	readonly leafId: string | null;
	readonly onNavigate?: (nodeId: string) => void;
}) {
	const isCurrent = node.id === leafId;
	const isBranch = node.children.length > 1;
	const chip = kindChip(node);
	return (
		<button
			type="button"
			onClick={() => onNavigate?.(node.id)}
			disabled={!onNavigate}
			style={{ paddingLeft: 6 + depth * 14 }}
			className={cn(
				"flex w-full items-start gap-2 rounded-[6px] py-1.5 pr-2 text-left text-fr-sm",
				onNavigate && "hover:bg-fr-surface-2",
				isCurrent && "bg-fr-accent-dim",
			)}
		>
			<span className={cn("mt-1.5 size-[7px] shrink-0 rounded-full", roleTone(node))} />
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					{chip ? (
						<Badge tone="mute" variant="code">
							{chip}
						</Badge>
					) : null}
					<span className={cn("fr-overflow", isCurrent ? "text-fr-text" : "text-fr-text-2")}>
						{node.label ?? node.title}
					</span>
					{isBranch ? (
						<Badge tone="blue" variant="code">
							{node.children.length} branches
						</Badge>
					) : null}
					{isCurrent ? (
						<Badge tone="accent" variant="code">
							current
						</Badge>
					) : null}
				</span>
				{node.preview ? (
					<span className="mt-0.5 block fr-overflow text-fr-xs text-fr-text-3">{node.preview}</span>
				) : null}
			</span>
		</button>
	);
}

export function SessionTreeView({ tree, onNavigate, className }: SessionTreeViewProps) {
	const renderNode = (node: SessionTreeNodeSnapshot, depth: number): ReactNode[] => [
		<NodeRow key={node.id} node={node} depth={depth} leafId={tree.leafId} onNavigate={onNavigate} />,
		...node.children.flatMap(child => renderNode(child, depth + 1)),
	];
	return (
		<div data-slot="session-tree" className={cn("flex flex-col", className)}>
			{tree.roots.flatMap(root => renderNode(root, 0))}
		</div>
	);
}

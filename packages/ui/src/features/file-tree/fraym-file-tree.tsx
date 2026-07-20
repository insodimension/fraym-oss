// FraymFileTree — a Fraym-native, hand-rolled file tree (no @pierre/trees widget).
// Built for full control over density, tokens, git decorations, and reveal-in-tree,
// the same reason Synara and Happier hand-roll theirs. Colors are fr-tokens only;
// file glyphs reuse the shared FileTypeIcon sprite. Rows are flattened from the
// path set so reveal/scroll and (later) virtualization are trivial.

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";
import { FileRow } from "./file-row";
import type { FileTreeGitStatusEntry, FileTreeStatus } from "./file-tree";

interface TreeNode {
	readonly name: string;
	readonly path: string;
	readonly kind: "dir" | "file";
	readonly children: TreeNode[];
}

interface FlatRow {
	readonly node: TreeNode;
	readonly depth: number;
}

// Status → single-letter badge + text tone. fr-tokens only, no hardcoded colors.
const STATUS_BADGE: Record<FileTreeStatus, { readonly letter: string; readonly tone: string }> = {
	modified: { letter: "M", tone: "text-fr-warn" },
	added: { letter: "A", tone: "text-fr-add" },
	deleted: { letter: "D", tone: "text-fr-del" },
	renamed: { letter: "R", tone: "text-fr-blue" },
	untracked: { letter: "U", tone: "text-fr-add" },
	ignored: { letter: "·", tone: "text-fr-text-3" },
};

function buildTree(paths: readonly string[]): TreeNode {
	const root: TreeNode = { name: "", path: "", kind: "dir", children: [] };
	for (const path of paths) {
		const segments = path.split("/").filter(Boolean);
		let node = root;
		segments.forEach((segment, index) => {
			const isFile = index === segments.length - 1 && !path.endsWith("/");
			const childPath = segments.slice(0, index + 1).join("/");
			let child = node.children.find(candidate => candidate.name === segment);
			if (!child) {
				child = { name: segment, path: childPath, kind: isFile ? "file" : "dir", children: [] };
				node.children.push(child);
			}
			node = child;
		});
	}
	return root;
}

function sortChildren(node: TreeNode): void {
	node.children.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	for (const child of node.children) sortChildren(child);
}

function flatten(node: TreeNode, expanded: ReadonlySet<string>, depth: number, out: FlatRow[]): void {
	for (const child of node.children) {
		out.push({ node: child, depth });
		if (child.kind === "dir" && expanded.has(child.path)) flatten(child, expanded, depth + 1, out);
	}
}

function ancestorDirs(path: string): string[] {
	const segments = path.split("/").filter(Boolean);
	const dirs: string[] = [];
	for (let index = 0; index < segments.length - 1; index += 1) dirs.push(segments.slice(0, index + 1).join("/"));
	return dirs;
}

export interface FraymFileTreeProps {
	readonly paths: readonly string[];
	readonly gitStatus?: readonly FileTreeGitStatusEntry[];
	readonly selectedPath?: string;
	readonly onSelect?: (path: string) => void;
	/** Show the filter box above the tree. */
	readonly search?: boolean;
	/** Directories at or below this depth start expanded (default 1 = top level). */
	readonly defaultExpandedDepth?: number;
	readonly className?: string;
}

export function FraymFileTree({
	paths,
	gitStatus,
	selectedPath,
	onSelect,
	search = true,
	defaultExpandedDepth = 1,
	className,
}: FraymFileTreeProps) {
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => {
		const seed = new Set<string>();
		for (const path of paths) {
			for (const dir of ancestorDirs(path)) {
				if (dir.split("/").length <= defaultExpandedDepth) seed.add(dir);
			}
		}
		return seed;
	});
	const scrollRef = useRef<HTMLDivElement>(null);
	const selectedRef = useRef<HTMLDivElement>(null);

	const statusByPath = useMemo(() => {
		const map: Record<string, FileTreeStatus> = {};
		for (const entry of gitStatus ?? []) map[entry.path] = entry.status;
		return map;
	}, [gitStatus]);

	const tree = useMemo(() => {
		const root = buildTree(paths);
		sortChildren(root);
		return root;
	}, [paths]);

	const trimmedQuery = query.trim().toLowerCase();
	const matched = useMemo(() => {
		if (!trimmedQuery) return null;
		const hits = new Set<string>();
		for (const path of paths) {
			if (path.toLowerCase().includes(trimmedQuery)) {
				hits.add(path);
				for (const dir of ancestorDirs(path)) hits.add(dir);
			}
		}
		return hits;
	}, [paths, trimmedQuery]);

	// Reveal-in-tree: whenever the selection changes, expand its ancestors so the
	// row is actually visible, then scroll it into view.
	useEffect(() => {
		if (!selectedPath) return;
		const dirs = ancestorDirs(selectedPath);
		if (dirs.length) {
			setExpanded(prev => {
				if (dirs.every(dir => prev.has(dir))) return prev;
				const next = new Set(prev);
				for (const dir of dirs) next.add(dir);
				return next;
			});
		}
	}, [selectedPath]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: selectedPath/expanded are intentional re-run triggers — the effect body only reads the stable selectedRef, but must re-scroll whenever selection or expansion changes.
	useEffect(() => {
		selectedRef.current?.scrollIntoView({ block: "nearest" });
	}, [selectedPath, expanded]);

	const rows = useMemo(() => {
		const effectiveExpanded = matched ?? expanded;
		const out: FlatRow[] = [];
		flatten(tree, effectiveExpanded, 0, out);
		return matched ? out.filter(row => matched.has(row.node.path)) : out;
	}, [tree, expanded, matched]);

	const toggle = (path: string) => {
		setExpanded(prev => {
			const next = new Set(prev);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	};

	return (
		<div data-slot="fraym-file-tree" className={cn("flex min-h-0 flex-col bg-fr-rail", className)}>
			{search && (
				<div
					data-slot="file-tree-search"
					className="flex h-9 shrink-0 items-center border-b border-fr-border-soft px-1.5"
				>
					<div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[7px] border border-fr-border-soft bg-fr-surface px-2 py-1 focus-within:border-fr-accent-line">
						<Icon name="search" size={12} strokeWidth={1.9} className="shrink-0 text-fr-text-3" />
						<input
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder="Search files"
							className="min-w-0 flex-1 bg-transparent font-primary text-fr-sm text-fr-text placeholder:text-fr-text-3 focus:outline-none"
						/>
						{query && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => setQuery("")}
								className="shrink-0 text-fr-text-3 hover:text-fr-text"
							>
								<Icon name="x" size={12} strokeWidth={2} />
							</button>
						)}
					</div>
				</div>
			)}
			<div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-1 pb-2">
				{rows.length === 0 ? (
					<p className="px-2 py-6 text-center font-secondary text-fr-xs text-fr-text-3">No files</p>
				) : (
					rows.map(({ node, depth }) => {
						const isDir = node.kind === "dir";
						const isOpen = isDir && (matched ? true : expanded.has(node.path));
						const status = statusByPath[node.path];
						return (
							<FileRow
								key={node.path}
								path={node.path}
								isDirectory={isDir}
								depth={depth}
								selected={node.path === selectedPath}
								badge={status ? STATUS_BADGE[status] : undefined}
								deleted={status === "deleted"}
								leading={
									isDir ? (
										<Icon
											name="caretR"
											size={13}
											strokeWidth={2}
											className="fr-tree-caret shrink-0 text-fr-text-3"
											data-open={isOpen || undefined}
										/>
									) : undefined
								}
								rowRef={node.path === selectedPath ? selectedRef : undefined}
								onClick={() => (isDir ? toggle(node.path) : onSelect?.(node.path))}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}

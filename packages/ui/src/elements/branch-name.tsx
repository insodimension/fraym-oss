// Tail-preserving branch display. Branch names distinguish by their TAIL
// (`…/env-card-v2` vs `-v3`), so under width pressure the muted prefix
// collapses FIRST (higher flex-shrink), then the leaf's HEAD ellipsizes while
// its last characters stay visible (a pure-CSS middle ellipsis). The full name
// always rides the title tooltip. Used by the Environment card; adoptable by
// any surface that renders branch names in constrained width.

import { cn } from "../lib/cn";

export interface BranchNameProps {
	readonly name: string;
	readonly className?: string;
}

export function BranchName({ name, className }: BranchNameProps) {
	const slash = name.lastIndexOf("/");
	const prefix = slash >= 0 ? name.slice(0, slash + 1) : "";
	const leaf = slash >= 0 ? name.slice(slash + 1) : name;
	// Long leaf: render the tail in a non-shrinking span so the head's
	// `truncate` produces a middle ellipsis at any width; seamless when space
	// is ample (the two spans join without a gap).
	const splitAt = leaf.length > 16 ? leaf.length - 8 : leaf.length;
	const head = leaf.slice(0, splitAt);
	const tail = leaf.slice(splitAt);
	return (
		<span className={cn("flex min-w-0 items-baseline", className)} title={name}>
			{prefix && <span className="min-w-4 shrink-[4] fr-overflow font-normal text-fr-text-3">{prefix}</span>}
			<span className="min-w-0 shrink fr-overflow">{head}</span>
			{tail && <span className="shrink-0">{tail}</span>}
		</span>
	);
}

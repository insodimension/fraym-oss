// SearchResultsBody — the `search`/`grep` results body at TUI parity. Renders the
// parsed `details.displayContent` (see search-display.ts) as a directory-grouped,
// line-numbered match list inside the shared `ToolBodyCard` frame (consistent with
// read/write/edit/bash): dim `dir/` group headers, per-file headers (📄 path #hash +
// shown-match count), MATCH lines emphasized vs context dimmed, `⋯` gap rows, and a
// dim truncation/missing-paths footer. Dumb + prop-driven. See docs/design/tools/search.md.

import { Fragment } from "react";
import { Icon } from "../../../../icons";
import { cn } from "../../../../lib/cn";
import { ToolBodyCard, ToolBodySection } from "../../tool-body-card";
import type { SearchFileGroup, SearchLine } from "./search-display";

/** Per-card output height cap (px) — matches the read/write/bash caps; the list scrolls within. */
const SEARCH_BODY_MAX_HEIGHT = 240;

export interface SearchResultsBodyProps {
	readonly groups: readonly SearchFileGroup[];
	/** Dim truncation reasons (e.g. `first 20 files (skip to paginate)`). */
	readonly truncationReasons?: readonly string[];
	/** `artifact://…` reference for the full spilled output. */
	readonly artifact?: string;
	/** Non-fatal skipped paths whose base directory was missing on disk. */
	readonly missingPaths?: readonly string[];
	readonly className?: string;
}

/** One code-frame row: right-aligned line number + content, match emphasized / context dim. */
function MatchRow({ ln }: { readonly ln: SearchLine }) {
	if (ln.gap) {
		return (
			<div className="select-none pl-[3.25rem] leading-tight text-fr-text-3" aria-hidden>
				⋯
			</div>
		);
	}
	return (
		<div className={cn("flex gap-2", ln.isMatch ? "text-fr-text" : "text-fr-text-3")}>
			<span
				className={cn(
					"w-10 shrink-0 select-none text-right tabular-nums",
					ln.isMatch ? "text-fr-blue" : "text-fr-text-3",
				)}
			>
				{ln.line ?? ""}
			</span>
			<span className="min-w-0 whitespace-pre-wrap break-all">{ln.text}</span>
		</div>
	);
}

function FileBlock({ group }: { readonly group: SearchFileGroup }) {
	const matchCount = group.lines.reduce((n, ln) => n + (ln.isMatch ? 1 : 0), 0);
	return (
		<div className="min-w-0">
			<div className="flex items-center gap-2 text-fr-text-2">
				<Icon name="file" size={12} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
				<span className="fr-overflow" style={{ color: "var(--fr-code-path)" }}>
					{group.file || "(results)"}
				</span>
				{group.hash ? <span className="shrink-0 text-fr-text-3">#{group.hash}</span> : null}
				{matchCount > 0 ? <span className="ml-auto shrink-0 text-fr-text-3">{matchCount}</span> : null}
			</div>
			<div className="mt-0.5 grid gap-0.5 border-l border-fr-border-soft pl-2">
				{group.lines.map((ln, i) => (
					<MatchRow key={`${ln.gap ? "gap" : (ln.line ?? "x")}-${ln.isMatch ? "m" : "c"}-${i}`} ln={ln} />
				))}
			</div>
		</div>
	);
}

function SearchFooter({
	truncationReasons,
	artifact,
	missingPaths,
}: Pick<SearchResultsBodyProps, "truncationReasons" | "artifact" | "missingPaths">) {
	const reasons = [...(truncationReasons ?? [])];
	if (artifact) reasons.push(artifact);
	const hasTrunc = reasons.length > 0;
	const hasMissing = (missingPaths?.length ?? 0) > 0;
	if (!hasTrunc && !hasMissing) return null;
	const parts: string[] = [];
	if (hasTrunc) parts.push(`⚠ truncated: ${reasons.join(", ")}`);
	if (hasMissing) parts.push(`⚠ skipped missing: ${missingPaths?.join(", ")}`);
	return <span className="font-secondary text-fr-xs text-fr-text-3">{parts.join(" · ")}</span>;
}

export function SearchResultsBody({
	groups,
	truncationReasons,
	artifact,
	missingPaths,
	className,
}: SearchResultsBodyProps) {
	if (groups.length === 0) {
		return <SearchEmptyBody missingPaths={missingPaths} />;
	}
	let lastDir: string | undefined;
	return (
		<ToolBodyCard className={className}>
			<ToolBodySection
				maxHeight={SEARCH_BODY_MAX_HEIGHT}
				padContent
				footer={
					<SearchFooter truncationReasons={truncationReasons} artifact={artifact} missingPaths={missingPaths} />
				}
			>
				<div className="grid gap-2 font-secondary text-fr-xs">
					{groups.map((group, i) => {
						const dirChanged = group.dir !== undefined && group.dir !== lastDir;
						lastDir = group.dir;
						return (
							<Fragment key={`${group.dir ?? ""}/${group.file}#${group.hash ?? ""}-${i}`}>
								{dirChanged ? <div className="text-fr-text-3">{group.dir}/</div> : null}
								<FileBlock group={group} />
							</Fragment>
						);
					})}
				</div>
			</ToolBodySection>
		</ToolBodyCard>
	);
}

/** Resolved-but-empty state (0 matches), optionally with a missing-paths note. */
export function SearchEmptyBody({ missingPaths }: { readonly missingPaths?: readonly string[] }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			No matches found.
			{missingPaths && missingPaths.length > 0 ? (
				<div className="mt-1">⚠ skipped missing: {missingPaths.join(", ")}</div>
			) : null}
		</div>
	);
}

/** Pending/running state — search is a single grep call (no incremental body). */
export function SearchPendingBody({ paths }: { readonly paths?: readonly string[] }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			Searching{paths && paths.length > 0 ? ` ${paths.join(", ")}` : ""}…
		</div>
	);
}

/** Legacy/plain fallback when the engine returned text without structured detail counts. */
export function SearchPlainBody({ lines }: { readonly lines: readonly string[] }) {
	return (
		<ToolBodyCard>
			<ToolBodySection maxHeight={SEARCH_BODY_MAX_HEIGHT} padContent>
				<div className="grid gap-0.5 font-secondary text-fr-xs text-fr-text-2">
					{lines.map((line, i) => (
						<div key={`${i}-${line}`} className="whitespace-pre-wrap break-all">
							{line}
						</div>
					))}
				</div>
			</ToolBodySection>
		</ToolBodyCard>
	);
}

// FindListBody — the `find` tool's file-listing body at TUI parity (mirrors engine
// .../tools/find.ts → findToolRenderer → renderFileList). Renders `details.files` as a
// flat path list inside the shared `ToolBodyCard` frame (consistent with read/write/edit/
// bash/search): a `folder` icon + accent for directories (trailing `/`), a `file` icon for
// files, the full relative path per row. A dim truncation/missing-paths footer. The list
// follows the tail while streaming (find emits a growing file list). Dumb + prop-driven.
// See docs/design/tools/find.md.

import { Icon, type IconName } from "../../../../icons";
import { cn } from "../../../../lib/cn";
import { ToolBodyCard, ToolBodySection } from "../../tool-body-card";

/** Per-card list height cap (px) — matches the read/write/bash/search caps; the list scrolls within.
 *  The TUI shows the first 8 then `… N more`; Fraym shows the full list in a capped scroll window
 *  (same divergence read/write/bash/search took). */
const FIND_BODY_MAX_HEIGHT = 240;

export interface FindListBodyProps {
	/** Relative paths; a trailing `/` marks a directory (mirrors the TUI `entry.endsWith("/")`). */
	readonly files: readonly string[];
	/** Dim truncation reasons (e.g. `limit 1000 results`, `line limit`). */
	readonly truncationReasons?: readonly string[];
	/** `artifact://…` reference for the full spilled output. */
	readonly artifact?: string;
	/** Non-fatal skipped paths whose base directory was missing on disk. */
	readonly missingPaths?: readonly string[];
	/** Auto-scroll to the tail as the list grows (streaming). */
	readonly followTail?: boolean;
	readonly className?: string;
}

/** One listing row: file/folder icon + relative path. Directories are accent-colored. */
function FileRow({ path }: { readonly path: string }) {
	const isDirectory = path.endsWith("/");
	const icon: IconName = isDirectory ? "folder" : "file";
	return (
		<div className="flex items-center gap-2">
			<Icon
				name={icon}
				size={12}
				strokeWidth={1.8}
				className={cn("shrink-0", isDirectory ? "text-fr-accent" : "text-fr-text-3")}
			/>
			<span
				className="fr-overflow"
				style={isDirectory ? { color: "var(--fr-accent)" } : { color: "var(--fr-code-path)" }}
			>
				{path}
			</span>
		</div>
	);
}

function FindFooter({
	truncationReasons,
	artifact,
	missingPaths,
}: Pick<FindListBodyProps, "truncationReasons" | "artifact" | "missingPaths">) {
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

export function FindListBody({
	files,
	truncationReasons,
	artifact,
	missingPaths,
	followTail,
	className,
}: FindListBodyProps) {
	if (files.length === 0) {
		return <FindEmptyBody missingPaths={missingPaths} />;
	}
	return (
		<ToolBodyCard className={className}>
			<ToolBodySection
				maxHeight={FIND_BODY_MAX_HEIGHT}
				padContent
				followTail={followTail}
				tailKey={files.length}
				footer={
					<FindFooter truncationReasons={truncationReasons} artifact={artifact} missingPaths={missingPaths} />
				}
			>
				<div className="grid gap-0.5 font-secondary text-fr-xs text-fr-text-2">
					{files.map((path, i) => (
						<FileRow key={`${path}-${i}`} path={path} />
					))}
				</div>
			</ToolBodySection>
		</ToolBodyCard>
	);
}

/** Resolved-but-empty state (0 files), optionally with a missing-paths note. */
export function FindEmptyBody({ missingPaths }: { readonly missingPaths?: readonly string[] }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			No files found.
			{missingPaths && missingPaths.length > 0 ? (
				<div className="mt-1">⚠ skipped missing: {missingPaths.join(", ")}</div>
			) : null}
		</div>
	);
}

/** Pending/running state with no results yet — the body fills as matches stream in. */
export function FindPendingBody({ paths }: { readonly paths?: readonly string[] }) {
	return (
		<div className="px-3 py-2 font-secondary text-fr-xs text-fr-text-3">
			Finding{paths && paths.length > 0 ? ` ${paths.join(", ")}` : ""}…
		</div>
	);
}

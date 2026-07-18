// Edit-tool body surfaces for edit / apply_patch / ast_edit / write results.
// Composes the dep-free DiffViewer (now with the Engine numbered-diff parser); the
// adapter that maps a tool call → these props lives in the renderer registry
// (`renderEdit` in default-renderers.tsx). See docs/design/tools/edit.md.

import { RollingNumber } from "../../../../elements/rolling-number";
import { DiffViewer, type DiffViewerFile } from "./diff-viewer";

export interface EditDiffBodyProps {
	/** Pre-parsed files (what `renderEdit` builds from `details`). */
	readonly files?: readonly DiffViewerFile[] | undefined;
	readonly maxHeight?: number | undefined;
	readonly followTail?: boolean | undefined;
	readonly className?: string | undefined;
}

export function EditDiffBody({ files, maxHeight, followTail, className }: EditDiffBodyProps) {
	const hasFiles = files && files.length > 0 && files.some(f => f.lines.length > 0);
	if (!hasFiles) {
		return <div className="font-secondary text-fr-xs text-fr-text-3">No diff available.</div>;
	}
	return (
		<DiffViewer
			files={files}
			maxHeight={maxHeight}
			followTail={followTail}
			// Neutralize the viewer's own outer margin inside the tool-card body.
			className={className ?? "my-0"}
		/>
	);
}

/** Red error box for failed edits (no-match / fuzzy / ambiguous / hash-conflict / parse). */
export function EditErrorBody({ message }: { readonly message: string }) {
	return (
		<div className="whitespace-pre-wrap rounded-[6px] bg-fr-del-bg px-2.5 py-1.5 font-secondary text-fr-xs text-fr-del">
			{message}
		</div>
	);
}

/** No-op edit: the tool ran but produced an empty diff. */
export function EditNoChanges() {
	return <div className="font-secondary text-fr-xs text-fr-text-3">No changes.</div>;
}

/** Post-edit LSP diagnostics list (mirrors the TUI diagnostics footer). */
export function EditDiagnostics({
	summary,
	messages,
}: {
	readonly summary?: string | undefined;
	readonly messages: readonly string[];
}) {
	if (messages.length === 0) return null;
	return (
		<div className="mt-2 border-t border-fr-border-soft pt-1.5 font-secondary text-fr-2xs text-fr-text-3">
			{summary && <div className="mb-1 text-fr-warn">{summary}</div>}
			<ul className="flex flex-col gap-0.5">
				{messages.map(m => (
					<li key={m} className="whitespace-pre-wrap text-fr-text-2">
						{m}
					</li>
				))}
			</ul>
		</div>
	);
}

/** Footer shown while a MULTI-FILE edit streams: the count of files still resolving.
 *  The bare "streaming…" state is intentionally NOT rendered — the head stat already
 *  says it and the stream wisp carries the live activity, so a second animated footer dot
 *  was pure duplication. Single-file edits show nothing here. */
export function EditStreamingFooter({ pending }: { readonly pending?: number }) {
	if (!pending || pending <= 0) return null;
	return (
		<div className="mt-1.5 font-secondary text-fr-2xs text-fr-text-3">
			{`${pending} more file${pending === 1 ? "" : "s"} pending…`}
		</div>
	);
}

/** Borderless +A / −M diff-stat for the card head — colored text with rolling-digit counts. */
export function EditDiffStat({
	added,
	deleted,
	animate,
}: {
	readonly added: number;
	readonly deleted: number;
	readonly animate?: boolean | undefined;
}) {
	return (
		<span className="inline-flex items-center gap-1.5 font-secondary text-fr-2xs leading-none">
			{added > 0 ? (
				<span className="inline-flex items-center text-fr-add">
						+<RollingNumber value={added} {...(animate === undefined ? {} : { animate })} />
				</span>
			) : null}
			{deleted > 0 ? (
				<span className="inline-flex items-center text-fr-del">
						−<RollingNumber value={deleted} {...(animate === undefined ? {} : { animate })} />
				</span>
			) : null}
		</span>
	);
}

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import { FileTypeIcon } from "./file-type-icon";
import { PopoverDivider, PopoverPanel, PopoverRow, Scrim } from "./popover";

/**
 * Click-to-open handler for file mentions rendered in message text. Provided by the
 * host (the workspace frame, wired to the Files dock); `null` when there is no host,
 * in which case mentions render as their original `@path` text / code span — zero
 * behavior change for non-message surfaces (kitchen-sink, previews).
 */
export type FileMentionOpen = (path: string) => void;

interface FileMentionContextValue {
	readonly openFile: FileMentionOpen;
	/** Reveal a mention's path in the OS's native file manager (Finder / Explorer / …).
	 *  `null` on hosts with no local filesystem access (web) — hides the pill's
	 *  "Reveal in Finder" row entirely rather than showing a dead menu item. */
	readonly onReveal: ((path: string) => void) | null;
}

const FileMentionContext = createContext<FileMentionContextValue | null>(null);

export function FileMentionProvider({
	openFile,
	onReveal = null,
	children,
}: {
	readonly openFile: FileMentionOpen;
	readonly onReveal?: ((path: string) => void) | null;
	readonly children: ReactNode;
}) {
	const value = useMemo<FileMentionContextValue>(() => ({ openFile, onReveal }), [openFile, onReveal]);
	return <FileMentionContext.Provider value={value}>{children}</FileMentionContext.Provider>;
}

export function useFileMentionOpen(): FileMentionOpen | null {
	return useContext(FileMentionContext)?.openFile ?? null;
}

export function useFileMentionReveal(): ((path: string) => void) | null {
	return useContext(FileMentionContext)?.onReveal ?? null;
}

/** Join an absolute workspace root with a workspace-relative mention path into an
 *  absolute OS path, for host "reveal in file manager" calls. Mention paths always
 *  use `/` separators (the driver contract); the root keeps whatever separator style
 *  the host reports (native on Windows), which the join mirrors in its result. */
export function joinWorkspacePath(root: string, relative: string): string {
	const cleanRoot = root.replace(/[/\\]+$/, "");
	const cleanRelative = relative.replace(/^[/\\]+/, "").replace(/\/$/, "");
	if (!cleanRelative) return cleanRoot;
	const sep = cleanRoot.includes("\\") && !cleanRoot.includes("/") ? "\\" : "/";
	return `${cleanRoot}${sep}${cleanRelative.split("/").join(sep)}`;
}

/** OS-aware label for "reveal in native file manager", matching the convention each
 *  platform's own apps use (VS Code, Finder, Explorer). */
export function revealLabel(): string {
	if (typeof navigator === "undefined") return "Open Containing Folder";
	const platform = `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`;
	if (/Mac/i.test(platform)) return "Reveal in Finder";
	if (/Win/i.test(platform)) return "Show in Explorer";
	return "Open Containing Folder";
}

// Extensions that mark a bare/backticked token as a file reference in agent prose.
const FILE_EXTENSIONS: Record<string, true> = {
	ts: true,
	tsx: true,
	mts: true,
	cts: true,
	js: true,
	jsx: true,
	mjs: true,
	cjs: true,
	json: true,
	jsonc: true,
	json5: true,
	md: true,
	mdx: true,
	markdown: true,
	css: true,
	scss: true,
	sass: true,
	less: true,
	pcss: true,
	html: true,
	htm: true,
	vue: true,
	svelte: true,
	astro: true,
	py: true,
	rs: true,
	go: true,
	rb: true,
	c: true,
	h: true,
	cpp: true,
	cc: true,
	cxx: true,
	hpp: true,
	swift: true,
	zig: true,
	wasm: true,
	sh: true,
	bash: true,
	zsh: true,
	yml: true,
	yaml: true,
	toml: true,
	txt: true,
	graphql: true,
	gql: true,
	sql: true,
	db: true,
	sqlite: true,
	svg: true,
	png: true,
	jpg: true,
	jpeg: true,
	gif: true,
	webp: true,
	ico: true,
	bmp: true,
	avif: true,
	ttf: true,
	otf: true,
	woff: true,
	woff2: true,
	zip: true,
	tar: true,
	gz: true,
	tgz: true,
	lock: true,
	env: true,
};

/**
 * Whether a backticked token in agent prose looks like a workspace file path: no
 * whitespace/code punctuation, not a URL, and it either contains a `/` or ends in a
 * recognized file extension. Conservative on purpose — avoids linkifying property
 * accesses like `arr.map` while catching `DEV.md` / `apps/foo.ts`.
 */
export function looksLikeFilePath(token: string): boolean {
	const value = token.trim();
	if (value.length === 0 || value.length > 200) return false;
	if (/[\s`'"()[\]{}<>|*?;,=]/.test(value)) return false;
	if (value.startsWith("http://") || value.startsWith("https://")) return false;
	if (value.includes("/")) return true;
	const dot = value.lastIndexOf(".");
	return dot > 0 && FILE_EXTENSIONS[value.slice(dot + 1).toLowerCase()] === true;
}

function basename(path: string): string {
	const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
	const slash = trimmed.lastIndexOf("/");
	return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

/**
 * Right-click menu for a {@link FileMentionPill}: "Open" (same as click) plus an
 * OS-aware "Reveal in Finder/Explorer" row, only when the host wired a reveal
 * handler. Replaces the browser's own context menu on the pill (Back/Refresh/Save
 * as/…), which showed by default since nothing called `preventDefault`.
 */
function FileMentionContextMenu({
	x,
	y,
	openLabel,
	onOpen,
	onReveal,
	onClose,
}: {
	readonly x: number;
	readonly y: number;
	readonly openLabel: string;
	readonly onOpen: () => void;
	readonly onReveal: (() => void) | null;
	readonly onClose: () => void;
}) {
	return (
		<>
			<Scrim
				onClick={onClose}
				onContextMenu={event => {
					event.preventDefault();
					onClose();
				}}
			/>
			<PopoverPanel
				width={200}
				data-slot="file-mention-context-menu"
				style={{ left: x, top: y }}
				onContextMenu={event => event.preventDefault()}
			>
				<PopoverRow
					icon={<Icon name="file" size={15} />}
					label={openLabel}
					onClick={() => {
						onOpen();
						onClose();
					}}
				/>
				{onReveal && (
					<>
						<PopoverDivider />
						<PopoverRow
							icon={<Icon name="folder" size={15} />}
							label={revealLabel()}
							onClick={() => {
								onReveal();
								onClose();
							}}
						/>
					</>
				)}
			</PopoverPanel>
		</>
	);
}

/**
 * Inline file pill (file-type icon + name). Clickable when a host open-handler is
 * present (opens the path in the Files dock), otherwise renders `fallback` verbatim.
 * Right-click opens "Open" + "Reveal in Finder/Explorer" (the latter only when the
 * host wired a reveal handler — desktop only, absent in web).
 */
export function FileMentionPill({
	path,
	label,
	fallback,
}: {
	readonly path: string;
	readonly label?: string;
	readonly fallback: ReactNode;
}) {
	const openFile = useFileMentionOpen();
	const onReveal = useFileMentionReveal();
	const [menuAt, setMenuAt] = useState<{ readonly x: number; readonly y: number } | null>(null);
	if (!openFile) return <>{fallback}</>;
	const isDirectory = path.endsWith("/");
	return (
		<>
			<button
				type="button"
				data-slot="file-mention-pill"
				title={path}
				onClick={() => openFile(path)}
				onContextMenu={event => {
					event.preventDefault();
					setMenuAt({ x: event.clientX, y: event.clientY });
				}}
				className={cn(
					"mx-px inline-flex max-w-full translate-y-px items-center gap-1 rounded-[6px] bg-fr-accent-dim px-1.5 py-0.5",
					"align-baseline font-secondary text-[0.85em] font-medium text-fr-accent transition-colors hover:bg-fr-accent-line",
				)}
			>
				<FileTypeIcon path={path} isDirectory={isDirectory} size={12} />
				<span className="fr-overflow">{label ?? basename(path)}</span>
			</button>
			{menuAt && (
				<FileMentionContextMenu
					x={menuAt.x}
					y={menuAt.y}
					openLabel={isDirectory ? "Open folder" : "Open"}
					onOpen={() => openFile(path)}
					onReveal={onReveal ? () => onReveal(path) : null}
					onClose={() => setMenuAt(null)}
				/>
			)}
		</>
	);
}

// `@`-mention: `@` at start or after whitespace, path containing a `.` or `/` (so a
// bare `@username` stays plain text). Captures the path (may end `/` for a directory).
const MENTION_PATTERN = /(^|\s)@([^\s@]*[./][^\s@]*)/g;

/**
 * Split plain text into nodes, turning `@path` file mentions into clickable pills
 * (or their original `@path` text without a host). Shared by the markdown leaf
 * renderer and the queued-message bubble so display matches the composer.
 */
export function renderTextWithMentions(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	MENTION_PATTERN.lastIndex = 0;
	let match = MENTION_PATTERN.exec(text);
	while (match) {
		const path = match[2] ?? "";
		const at = match.index + (match[1]?.length ?? 0); // index of the `@`
		if (at > lastIndex) nodes.push(text.slice(lastIndex, at));
		nodes.push(<FileMentionPill key={`${keyPrefix}-m-${match.index}`} path={path} fallback={`@${path}`} />);
		lastIndex = match.index + match[0].length;
		match = MENTION_PATTERN.exec(text);
	}
	if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
	return nodes;
}

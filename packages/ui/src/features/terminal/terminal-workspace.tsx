import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { TerminalSessionSnapshot } from "@fraym-ai/driver";
import { useEffect, useRef } from "react";
import { Button, IconButton } from "../../elements";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { terminalHistoryUpdate } from "./terminal-history";

export interface TerminalWorkspaceProps {
	readonly session: TerminalSessionSnapshot | null;
	readonly opening?: boolean;
	readonly error?: string | null;
	readonly className?: string;
	readonly onOpen?: () => void;
	readonly onNew?: () => void;
	readonly onWrite?: (data: string) => void;
	readonly onResize?: (cols: number, rows: number) => void;
	readonly onClose?: () => void;
}

function cssVar(element: HTMLElement, name: string, fallback: string): string {
	const value = window.getComputedStyle(element).getPropertyValue(name).trim();
	return value || fallback;
}

function useLatest<T>(value: T) {
	const ref = useRef(value);
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}

function XtermViewport({
	session,
	onWrite,
	onResize,
}: Pick<TerminalWorkspaceProps, "session" | "onWrite" | "onResize">) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const terminalRef = useRef<Terminal | null>(null);
	const fitRef = useRef<FitAddon | null>(null);
	const writtenRef = useRef("");
	const sessionKeyRef = useRef("");
	const lastSizeRef = useRef({ cols: 0, rows: 0 });
	const onWriteRef = useLatest(onWrite);
	const onResizeRef = useLatest(onResize);
	const historyRef = useLatest(session?.history ?? "");

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		let disposed = false;
		let cleanup: (() => void) | undefined;
		let fitFrame = 0;

		const init = async () => {
			// Resolve a concrete mono stack (NOT a `var()`): the WebGL renderer rasterizes
			// glyphs through a canvas 2D context, and `ctx.font` does not resolve CSS custom
			// properties — a `var(...)` family would silently fall back to a default font.
			const monoStack = cssVar(host, "--fr-font-mono", "ui-monospace, SFMono-Regular, Consolas, monospace");
			// xterm measures the character cell ONCE at open(); make sure the webfont is loaded
			// first, otherwise it locks the fallback's wider metrics and over-spaces every glyph.
			const firstFamily = monoStack.split(",")[0]?.trim();
			if (firstFamily && document.fonts) {
				try {
					await Promise.all([
						document.fonts.load(`12px ${firstFamily}`),
						document.fonts.load(`600 12px ${firstFamily}`),
					]);
					await document.fonts.ready;
				} catch {
					// FontFaceSet rejects generic-only families; measure with whatever is available.
				}
			}
			if (disposed || !hostRef.current) return;

			const terminal = new Terminal({
				allowProposedApi: false,
				convertEol: true,
				cursorBlink: true,
				fontFamily: monoStack,
				fontSize: 12,
				lineHeight: 1.35,
				scrollback: 5000,
				theme: {
					background: cssVar(host, "--fr-bg", "#0b0b0d"),
					foreground: cssVar(host, "--fr-text", "#e8e8ea"),
					cursor: cssVar(host, "--fr-accent", "#8b7cf6"),
					selectionBackground: cssVar(host, "--fr-accent-dim", "#27213f"),
					black: "#151518",
					red: cssVar(host, "--fr-del", "#ff6b7a"),
					green: cssVar(host, "--fr-add", "#63d471"),
					yellow: "#f4cf65",
					blue: cssVar(host, "--fr-blue", "#72a7ff"),
					magenta: cssVar(host, "--fr-accent", "#8b7cf6"),
					cyan: "#67d8ef",
					white: cssVar(host, "--fr-text", "#e8e8ea"),
				},
			});
			const fit = new FitAddon();
			terminal.loadAddon(fit);
			terminal.open(host);
			// GPU renderer for crisp glyphs; degrade to the DOM renderer if WebGL2 is unavailable.
			try {
				const webgl = new WebglAddon();
				webgl.onContextLoss(() => webgl.dispose());
				terminal.loadAddon(webgl);
			} catch {
				// WebGL2 context unavailable -> DOM renderer stays active.
			}
			terminalRef.current = terminal;
			fitRef.current = fit;
			sessionKeyRef.current = `${session?.ref.workspaceId ?? ""}:${session?.ref.terminalId ?? ""}`;
			// Replay any history that streamed in while the font was still loading.
			const initialHistory = historyRef.current;
			if (initialHistory) {
				terminal.write(initialHistory);
				writtenRef.current = initialHistory;
			}
			const dataDisposable = terminal.onData(data => onWriteRef.current?.(data));
			const fitTerminal = () => {
				try {
					const proposed = fit.proposeDimensions();
					if (!proposed) return;
					if (terminal.cols !== proposed.cols || terminal.rows !== proposed.rows) {
						terminal.resize(proposed.cols, proposed.rows);
					}
					const size = { cols: proposed.cols, rows: proposed.rows };
					const last = lastSizeRef.current;
					if (size.cols !== last.cols || size.rows !== last.rows) {
						lastSizeRef.current = size;
						onResizeRef.current?.(size.cols, size.rows);
					}
				} catch {
					// Fit can throw while the host is temporarily display:none during dock transitions.
				}
			};
			const scheduleFit = () => {
				if (fitFrame) cancelAnimationFrame(fitFrame);
				fitFrame = requestAnimationFrame(() => {
					fitFrame = 0;
					fitTerminal();
				});
			};
			const resizeObserver = new ResizeObserver(scheduleFit);
			resizeObserver.observe(host);
			scheduleFit();
			// Take keyboard focus so the user can type immediately (xterm only
			// receives keys while its helper textarea is focused); a click refocuses
			// via the host's onMouseDown below.
			terminal.focus();
			cleanup = () => {
				resizeObserver.disconnect();
				if (fitFrame) cancelAnimationFrame(fitFrame);
				dataDisposable.dispose();
				terminal.dispose();
				terminalRef.current = null;
				fitRef.current = null;
				writtenRef.current = "";
				sessionKeyRef.current = "";
				lastSizeRef.current = { cols: 0, rows: 0 };
			};
		};

		void init();
		return () => {
			disposed = true;
			cleanup?.();
		};
	}, [historyRef, onResizeRef, onWriteRef, session?.ref.terminalId, session?.ref.workspaceId]);

	useEffect(() => {
		const terminal = terminalRef.current;
		if (!terminal) return;
		const history = session?.history ?? "";
		const sessionKey = `${session?.ref.workspaceId ?? ""}:${session?.ref.terminalId ?? ""}`;
		if (sessionKey !== sessionKeyRef.current) {
			sessionKeyRef.current = sessionKey;
			terminal.reset();
			if (history) terminal.write(history);
			writtenRef.current = history;
			return;
		}
		const update = terminalHistoryUpdate(writtenRef.current, history);
		if (update.reset) terminal.reset();
		if (update.data) terminal.write(update.data);
		writtenRef.current = history;
	}, [session?.history, session?.ref.terminalId, session?.ref.workspaceId]);

	return (
		<div
			ref={hostRef}
			data-slot="terminal-xterm"
			className="h-full min-h-0 w-full overflow-hidden"
			onMouseDown={() => terminalRef.current?.focus()}
		/>
	);
}

function terminalStatus(session: TerminalSessionSnapshot | null, opening?: boolean): string {
	if (opening) return "starting";
	return session?.status ?? "idle";
}

export function TerminalWorkspace({
	session,
	opening = false,
	error,
	className,
	onOpen,
	onNew,
	onWrite,
	onResize,
	onClose,
}: TerminalWorkspaceProps) {
	const canWrite = session?.status === "running";
	return (
		<div
			data-slot="terminal-workspace"
			className={cn(
				"flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-fr-border-soft bg-fr-bg",
				className,
			)}
		>
			<div className="flex h-10 shrink-0 items-center gap-2 border-b border-fr-border-soft px-2">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Icon name="terminal" size={14} className="shrink-0 text-fr-text-3" />
					<span className="fr-overflow text-fr-sm font-medium text-fr-text">{session?.title ?? "Terminal"}</span>
					<span className="shrink-0 font-secondary text-fr-2xs text-fr-text-3">
						{terminalStatus(session, opening)}
					</span>
				</div>
				{error ? <span className="max-w-[220px] fr-overflow text-fr-2xs text-fr-del">{error}</span> : null}
				<IconButton title="New terminal" onClick={onNew} disabled={opening}>
					<Icon name="plus" size={14} />
				</IconButton>
				<IconButton title="Close terminal" onClick={onClose} disabled={!session}>
					<Icon name="x" size={14} />
				</IconButton>
			</div>
			<div className="relative min-h-0 flex-1 bg-fr-bg p-2">
				{session ? (
					<XtermViewport session={session} onWrite={canWrite ? onWrite : undefined} onResize={onResize} />
				) : (
					<div className="flex h-full min-h-[220px] items-center justify-center">
						<Button variant="outline" size="sm" onClick={onOpen} disabled={opening}>
							<Icon name="terminal" size={13} />
							{opening ? "Opening" : "Open terminal"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

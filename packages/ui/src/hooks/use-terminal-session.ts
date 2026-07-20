import type { TerminalDriver, TerminalSessionSnapshot, WorkspaceRef } from "@fraym/driver";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface TerminalSessionState {
	readonly available: boolean;
	readonly session: TerminalSessionSnapshot | null;
	readonly terminals: readonly TerminalSessionSnapshot[];
	readonly opening: boolean;
	readonly error: string | null;
	readonly openTerminal: () => void;
	readonly newTerminal: () => void;
	readonly write: (data: string) => void;
	readonly resize: (cols: number, rows: number) => void;
	readonly close: () => void;
}

export interface UseTerminalSessionOptions {
	readonly enabled?: boolean;
	readonly autoOpen?: boolean;
	/** Scope terminals to this chat session. When it changes, the hook drops the
	 *  previous session's bound terminal and re-lists for the new one — so a PTY
	 *  opened in session A never surfaces in session B (same workspace). */
	readonly sessionId?: string;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function preferredTerminal(terminals: readonly TerminalSessionSnapshot[]): TerminalSessionSnapshot | null {
	return terminals.find(terminal => terminal.status === "running") ?? terminals[0] ?? null;
}

export function useTerminalSession(
	driver: TerminalDriver | null | undefined,
	workspace: WorkspaceRef | null | undefined,
	options: UseTerminalSessionOptions = {},
): TerminalSessionState {
	const enabled = options.enabled ?? true;
	const autoOpen = options.autoOpen ?? true;
	const sessionId = options.sessionId;
	const available = Boolean(driver);
	const [terminals, setTerminals] = useState<readonly TerminalSessionSnapshot[]>([]);
	const [session, setSession] = useState<TerminalSessionSnapshot | null>(null);
	const [opening, setOpening] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const terminalWorkspaceId = session?.ref.workspaceId;
	const terminalId = session?.ref.terminalId;

	const openTerminal = useCallback(() => {
		if (!enabled || !available || !workspace || !driver) return;
		setOpening(true);
		setError(null);
		void driver
			.openTerminal(workspace, sessionId ? { sessionId } : undefined)
			.then(next => {
				setSession(next);
				setTerminals(current => [next, ...current.filter(item => item.ref.terminalId !== next.ref.terminalId)]);
			})
			.catch(nextError => setError(errorMessage(nextError)))
			.finally(() => setOpening(false));
	}, [available, driver, enabled, sessionId, workspace]);

	useEffect(() => {
		if (!enabled || !available || !workspace || !driver) return;
		let cancelled = false;
		setError(null);
		// Scope changed (session switch / workspace change): drop the previous
		// scope's bound terminal at once so its PTY never flashes for the new
		// session while the re-list is in flight.
		setSession(null);
		setTerminals([]);
		void driver
			.listTerminals(workspace)
			.then(all => {
				if (cancelled) return;
				// Only this session's terminals (workspace-level terminals carry no
				// sessionId and belong to the no-session scope).
				const scoped = all.filter(item => (item.sessionId ?? undefined) === (sessionId ?? undefined));
				setTerminals(scoped);
				const next = preferredTerminal(scoped);
				if (next) setSession(next);
				else if (autoOpen) openTerminal();
			})
			.catch(nextError => {
				if (!cancelled) setError(errorMessage(nextError));
			});
		return () => {
			cancelled = true;
		};
	}, [autoOpen, available, driver, enabled, openTerminal, sessionId, workspace]);

	useEffect(() => {
		if (!enabled || !available || !terminalWorkspaceId || !terminalId || !driver) return;
		return driver.subscribeTerminal({ workspaceId: terminalWorkspaceId, terminalId }, event => {
			if (event.error) setError(event.error);
			if (event.snapshot) {
				setSession(event.snapshot);
				setTerminals(current => [
					event.snapshot as TerminalSessionSnapshot,
					...current.filter(item => item.ref.terminalId !== event.snapshot?.ref.terminalId),
				]);
			}
		});
	}, [available, driver, enabled, terminalId, terminalWorkspaceId]);

	const write = useCallback(
		(data: string) => {
			if (!driver || !session || session.status !== "running") return;
			void driver.writeTerminal(session.ref, data).catch(nextError => setError(errorMessage(nextError)));
		},
		[driver, session],
	);

	const resize = useCallback(
		(cols: number, rows: number) => {
			if (!driver || !session || session.status !== "running") return;
			if (cols === session.cols && rows === session.rows) return;
			// Terminal subscription snapshots are authoritative. Applying a late resize RPC
			// response here can roll history backward and make xterm replay stale output.
			void driver.resizeTerminal(session.ref, cols, rows).catch(nextError => setError(errorMessage(nextError)));
		},
		[driver, session],
	);

	const close = useCallback(() => {
		if (!driver || !session) return;
		void driver.closeTerminal(session.ref).catch(nextError => setError(errorMessage(nextError)));
	}, [driver, session]);

	return useMemo(
		() => ({
			available,
			session,
			terminals,
			opening,
			error,
			openTerminal,
			newTerminal: openTerminal,
			write,
			resize,
			close,
		}),
		[available, close, error, openTerminal, opening, resize, session, terminals, write],
	);
}

import type { FraymDrivers, SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import { Fraym, type FraymProps, ThemeProvider } from "@fraym/ui";
import { type ComponentProps, useCallback, useEffect, useState } from "react";

type ManagedProps =
	| "drivers"
	| "workspace"
	| "workspaces"
	| "sessionRef"
	| "sessionCatalog"
	| "isCreatingSession"
	| "onSessionSelect"
	| "onNewSession"
	| "onRefreshSessions"
	| "onRenameSession"
	| "onToggleArchiveSession"
	| "onPinSession"
	| "onDeleteSession";

export interface FraymHostProps extends Omit<FraymProps, ManagedProps> {
	readonly drivers: FraymDrivers;
	readonly workspace: WorkspaceRef;
	readonly workspaces?: readonly WorkspaceRef[];
	readonly storageKey?: string;
	readonly themeMode?: ComponentProps<typeof ThemeProvider>["defaultMode"];
}

export function FraymHost({ drivers, workspace, workspaces, storageKey, themeMode = "dark", ...fraym }: FraymHostProps) {
	const activeKey = storageKey ?? `fraym-host-active-session:${workspace.workspaceId}`;
	const driver = drivers.session;
	const [catalog, setCatalog] = useState<readonly SessionSnapshot[]>([]);
	const [sessionRef, setSessionRef] = useState<SessionRef | null>(null);
	const [creating, setCreating] = useState(false);

	const refresh = useCallback(() => {
		void driver.listSessions(workspace).then(setCatalog);
	}, [driver, workspace]);

	useEffect(() => {
		let alive = true;
		void driver.listSessions(workspace).then(async (sessions) => {
			if (!alive) return;
			const storedId = localStorage.getItem(activeKey);
			const active = sessions.find((snapshot) => snapshot.ref.sessionId === storedId) ?? sessions[0];
			if (active) {
				setCatalog(sessions);
				setSessionRef(active.ref);
				return;
			}
			const created = await driver.createSession(workspace);
			if (!alive) return;
			setSessionRef(created.ref);
			const next = await driver.listSessions(workspace);
			if (alive) setCatalog(next);
		});
		return () => {
			alive = false;
		};
	}, [driver, workspace, activeKey]);

	useEffect(() => {
		// Only persist a selection that belongs to the active workspace, so a
		// workspace switch never writes the old session id into the new key.
		if (sessionRef !== null && sessionRef.workspaceId === workspace.workspaceId) {
			localStorage.setItem(activeKey, sessionRef.sessionId);
		}
	}, [sessionRef, activeKey, workspace.workspaceId]);

	const newSession = useCallback(() => {
		setCreating(true);
		void driver
			.createSession(workspace)
			.then((snapshot) => {
				setSessionRef(snapshot.ref);
				refresh();
			})
			.finally(() => setCreating(false));
	}, [driver, workspace, refresh]);

	return (
		<ThemeProvider defaultMode={themeMode}>
			<Fraym
				{...fraym}
				drivers={drivers}
				workspace={workspace}
				workspaces={workspaces ?? [workspace]}
				sessionRef={sessionRef}
				sessionCatalog={catalog}
				isCreatingSession={creating}
				onSessionSelect={setSessionRef}
				onNewSession={newSession}
				onRefreshSessions={refresh}
				onRenameSession={(ref, title) => {
					void driver.renameSession(ref, title).then(refresh);
				}}
				onToggleArchiveSession={(ref, archived) => {
					const change = archived ? driver.archiveSession(ref) : driver.unarchiveSession(ref);
					void change.then(refresh);
				}}
				onPinSession={(ref, pinned) => {
					const change = pinned ? driver.pinSession(ref) : driver.unpinSession(ref);
					void change.then(refresh);
				}}
				onDeleteSession={(ref) => {
					void driver.deleteSession(ref).then(() => {
						setSessionRef((current) => (current?.sessionId === ref.sessionId ? null : current));
						refresh();
					});
				}}
			/>
		</ThemeProvider>
	);
}

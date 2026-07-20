import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { SessionRef, SessionSnapshot } from "@fraym/driver";
import { Fraym, ThemeProvider } from "@fraym/ui";
import { resourceDriver } from "./local-resource-driver";
import { createLocalSessionDriver } from "./local-session-driver";
import { MODELS_SETTINGS_PANEL } from "./models-panel";
import { loadConnection, PROVIDERS, workspace } from "./providers";

import "@fraym/ui/theme.css";
import "@fraym/ui/fonts.css";
import "./styles.css";

const K_ACTIVE_SESSION = "fraym-aisdk-active-session";


const connection = loadConnection();
const driver = createLocalSessionDriver({
  workspace,
  defaultModel: connection
    ? { provider: connection.provider, modelId: connection.model }
    : { provider: "openrouter", modelId: PROVIDERS.openrouter.defaultModel },
});

function App() {
  const [catalog, setCatalog] = useState<readonly SessionSnapshot[]>([]);
  const [sessionRef, setSessionRef] = useState<SessionRef | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    void driver.listSessions(workspace).then(setCatalog);
  }, []);

  useEffect(() => {
    void driver.listSessions(workspace).then(async (sessions) => {
      const storedId = localStorage.getItem(K_ACTIVE_SESSION);
      const stored = sessions.find((snapshot) => snapshot.ref.sessionId === storedId);
      const active = stored ?? sessions[0];
      if (active) {
        setCatalog(sessions);
        setSessionRef(active.ref);
        return;
      }
      // First run: the shell always operates ON a session (submit is a no-op
      // without one), so boot with a fresh empty session like the product does.
      const created = await driver.createSession(workspace);
      setSessionRef(created.ref);
      setCatalog(await driver.listSessions(workspace));
    });
  }, []);

  useEffect(() => {
    if (sessionRef !== null) {
      localStorage.setItem(K_ACTIVE_SESSION, sessionRef.sessionId);
    }
  }, [sessionRef]);

  const newSession = useCallback(() => {
    setCreating(true);
    void driver
      .createSession(workspace)
      .then((snapshot) => {
        setSessionRef(snapshot.ref);
        refresh();
      })
      .finally(() => setCreating(false));
  }, [refresh]);

  const settingsPanels = useMemo(() => [MODELS_SETTINGS_PANEL], []);

  return (
    <Fraym
      drivers={{ session: driver, resources: resourceDriver }}
      workspace={workspace}
      workspaces={[workspace]}
      sessionRef={sessionRef}
      sessionCatalog={catalog}
      settingsPanels={settingsPanels}
      productLabel="Fraym"
      version="aisdk-web"
      planLabel="browser-local"
      userName="Local profile"
      userEmail="keys stay in this browser"
      enabledModes={["code"]}
      dockTabs={["insights"]}
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
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(
  <ThemeProvider defaultMode="dark">
    <App />
  </ThemeProvider>,
);

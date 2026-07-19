import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type AiSdkDriver, createAiSdkDriver } from "@fraym/driver-aisdk";
import type { AgentEvent, AgentEventStream } from "@fraym/driver";
import { Code, Icon, SessionThread, type SessionThreadProps, ToolDisplaySettingsProvider, cn } from "@fraym/ui";
import {
  applyTheme,
  type Connection,
  type Density,
  loadAutoExpand,
  loadConnection,
  loadDensity,
  loadDrafts,
  loadTheme,
  persistAutoExpand,
  persistConnection,
  persistDensity,
  persistTheme,
  PROVIDERS,
  type ProviderDraft,
  type ProviderId,
  type ThemeMode,
} from "./providers";
import {
  createReplayingStream,
  deleteSessionEvents,
  loadSessionEvents,
  loadSessionList,
  messagesFromEvents,
  relativeAge,
  saveSessionEvents,
  saveSessionList,
  type SessionMeta,
  sessionTitleFromEvents,
} from "./session-store";
import { SettingsView } from "./settings-view";
import type { ToolDefaultOpen } from "@fraym/ui";

import "@fraym/ui/theme.css";
import "@fraym/ui/fonts.css";
import "./styles.css";

const K_ACTIVE_SESSION = "fraym-aisdk-active-session";
const PERSIST_DELAY_MS = 400;

interface SessionRuntime {
  readonly connKey: string;
  readonly driver: AiSdkDriver;
  readonly stream: AgentEventStream;
}

function newSessionMeta(): SessionMeta {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "New session", createdAt: now, updatedAt: now };
}

interface SidebarProps {
  readonly sessions: readonly SessionMeta[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  readonly onNew: () => void;
  readonly onDelete: (id: string) => void;
  readonly onOpenSettings: () => void;
}

function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, onOpenSettings }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-fr-border-soft bg-fr-rail">
      <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-1">
        <span className="text-fr-base font-semibold tracking-[-0.01em]">Fraym</span>
        <span className="rounded-md border border-fr-border px-1.5 py-0.5 font-mono text-[10px] text-fr-text-3">
          aisdk-web
        </span>
      </div>
      <div className="px-2.5 pt-2">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-fr-base font-medium text-fr-text hover:bg-fr-surface"
          onClick={onNew}
        >
          <Icon name="plus" size={15} strokeWidth={2} />
          New session
          <span className="ml-auto font-mono text-[10px] text-fr-text-3">Ctrl+N</span>
        </button>
      </div>
      <div className="fr-eyebrow px-5 pt-4 pb-1.5">Sessions</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2.5 py-[7px]",
              session.id === activeId ? "bg-fr-surface-2" : "hover:bg-fr-surface",
            )}
          >
            <button
              type="button"
              className={cn(
                "min-w-0 flex-1 truncate text-left text-fr-sm",
                session.id === activeId ? "text-fr-text" : "text-fr-text-2",
              )}
              onClick={() => onSelect(session.id)}
            >
              {session.title}
            </button>
            <span className="shrink-0 font-mono text-[10px] text-fr-text-3 group-hover:hidden">
              {relativeAge(session.updatedAt)}
            </span>
            <button
              type="button"
              aria-label="Delete session"
              className="hidden shrink-0 text-fr-text-3 hover:text-fr-text group-hover:block"
              onClick={() => onDelete(session.id)}
            >
              <Icon name="x" size={12} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <div className="relative border-t border-fr-border-soft p-2.5">
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute bottom-full left-2.5 z-20 mb-1.5 w-[210px] rounded-xl border border-fr-border bg-fr-surface p-1.5 shadow-lg">
              <div className="px-2.5 py-1.5">
                <div className="text-fr-sm font-medium text-fr-text">Local profile</div>
                <div className="text-xs text-fr-text-3">Keys stay in this browser</div>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-fr-sm text-fr-text-2 hover:bg-fr-surface-2 hover:text-fr-text"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
              >
                <Icon name="gear" size={14} strokeWidth={1.8} />
                Settings
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-fr-surface"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fr-surface-2 text-xs font-semibold text-fr-text-2">
            L
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-fr-sm font-medium text-fr-text">Local profile</span>
            <span className="block truncate text-xs text-fr-text-3">Fraym · aisdk</span>
          </span>
          <Icon name="caretD" size={13} strokeWidth={2} className="text-fr-text-3" />
        </button>
      </div>
    </aside>
  );
}

function App() {
  const [connection, setConnection] = useState<Connection | null>(loadConnection);
  const [drafts, setDrafts] = useState<Record<ProviderId, ProviderDraft>>(loadDrafts);
  const [view, setView] = useState<"app" | "settings">("app");
  const [pane, setPane] = useState("general");
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const initial = loadTheme();
    applyTheme(initial);
    return initial;
  });
  const [density, setDensity] = useState<Density>(loadDensity);
  const [autoExpand, setAutoExpand] = useState<ToolDefaultOpen>(loadAutoExpand);

  const [sessions, setSessions] = useState<readonly SessionMeta[]>(() => {
    const loaded = loadSessionList();
    return loaded.length > 0 ? loaded : [newSessionMeta()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = localStorage.getItem(K_ACTIVE_SESSION);
    return stored !== null && sessions.some((session) => session.id === stored) ? stored : (sessions[0]?.id ?? "");
  });

  const eventsRef = useRef(new Map<string, AgentEvent[]>());
  const runtimesRef = useRef(new Map<string, SessionRuntime>());
  const persistTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    saveSessionList(sessions);
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(K_ACTIVE_SESSION, activeId);
  }, [activeId]);

  const sessionEvents = (id: string): AgentEvent[] => {
    let events = eventsRef.current.get(id);
    if (events === undefined) {
      events = [...loadSessionEvents(id)];
      eventsRef.current.set(id, events);
    }
    return events;
  };

  const schedulePersist = (id: string) => {
    const timers = persistTimersRef.current;
    clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        saveSessionEvents(id, sessionEvents(id));
      }, PERSIST_DELAY_MS),
    );
  };

  const recordEvent = (id: string, event: AgentEvent) => {
    const events = sessionEvents(id);
    events.push(event);
    schedulePersist(id);
    if (event.type === "user.message" || event.type === "session.done" || event.type === "session.error") {
      const title = sessionTitleFromEvents(events);
      setSessions((current) =>
        current.map((session) => (session.id === id ? { ...session, title, updatedAt: Date.now() } : session)),
      );
    }
  };

  const runtime = useMemo<SessionRuntime | null>(() => {
    if (connection === null) {
      return null;
    }
    const info = PROVIDERS[connection.provider];
    const connKey = `${connection.provider}|${connection.apiKey}|${connection.model}`;
    const cached = runtimesRef.current.get(activeId);
    if (cached !== undefined && cached.connKey === connKey) {
      return cached;
    }
    const events = sessionEvents(activeId);
    const provider = createOpenAICompatible({ name: connection.provider, baseURL: info.baseURL, apiKey: connection.apiKey });
    const driver = createAiSdkDriver({
      model: provider(connection.model),
      system: "You are a helpful coding agent.",
      sessionId: activeId,
      initialMessages: messagesFromEvents(events),
    });
    driver.subscribe((event) => recordEvent(activeId, event));
    const created: SessionRuntime = { connKey, driver, stream: createReplayingStream(driver, events) };
    runtimesRef.current.set(activeId, created);
    return created;
  }, [activeId, connection]);

  const newSession = () => {
    const meta = newSessionMeta();
    setSessions((current) => [meta, ...current]);
    setActiveId(meta.id);
    setView("app");
  };

  const deleteSession = (id: string) => {
    deleteSessionEvents(id);
    eventsRef.current.delete(id);
    runtimesRef.current.delete(id);
    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== id);
      const next = remaining.length > 0 ? remaining : [newSessionMeta()];
      const fallback = next[0];
      if (id === activeId && fallback !== undefined) {
        setActiveId(fallback.id);
      }
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        newSession();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const updateDraft = (id: ProviderId, patch: Partial<ProviderDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const activateProvider = (id: ProviderId) => {
    const apiKey = drafts[id].apiKey.trim();
    if (apiKey.length === 0) {
      return;
    }
    const model = drafts[id].model.trim() || PROVIDERS[id].defaultModel;
    const next: Connection = { provider: id, apiKey, model };
    persistConnection(next);
    setConnection(next);
  };

  const changeTheme = (next: ThemeMode) => {
    persistTheme(next);
    applyTheme(next);
    setTheme(next);
  };

  const changeDensity = (next: Density) => {
    persistDensity(next);
    setDensity(next);
  };

  const changeAutoExpand = (next: ToolDefaultOpen) => {
    persistAutoExpand(next);
    setAutoExpand(next);
  };

  if (view === "settings") {
    return (
      <SettingsView
        autoExpand={autoExpand}
        connection={connection}
        density={density}
        drafts={drafts}
        onAutoExpandChange={changeAutoExpand}
        onBack={() => setView("app")}
        onDensityChange={changeDensity}
        onDraftChange={updateDraft}
        onPaneChange={setPane}
        onThemeChange={changeTheme}
        onUseProvider={activateProvider}
        pane={pane}
        theme={theme}
      />
    );
  }

  const active = sessions.find((session) => session.id === activeId) ?? sessions[0];
  if (active === undefined) {
    return null;
  }
  const sessionProps: SessionThreadProps | null = runtime === null || connection === null
    ? null
    : {
        source: runtime.stream,
        title: active.title,
        model: connection.model,
        contextUsage: 0,
        onStop: runtime.driver.cancel,
        onSubmit: (value) => {
          void runtime.driver.prompt(value).catch(() => undefined);
        },
      };

  return (
    <div className="grid h-dvh grid-cols-[240px_minmax(0,1fr)] bg-fr-bg text-fr-text">
      <Sidebar
        activeId={activeId}
        onDelete={deleteSession}
        onNew={newSession}
        onOpenSettings={() => {
          setPane("models");
          setView("settings");
        }}
        onSelect={setActiveId}
        sessions={sessions}
      />
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-fr-border-soft px-4">
          <span className="font-mono text-xs text-fr-text-3">aisdk</span>
          <span className="text-fr-text-3">/</span>
          <span className="truncate text-fr-sm font-medium text-fr-text">{active.title}</span>
          <div className="ml-auto flex items-center gap-2">
            {connection === null ? (
              <span className="fr-eyebrow">Not connected</span>
            ) : (
              <>
                <span className="fr-eyebrow">{PROVIDERS[connection.provider].label}</span>
                <Code>{connection.model}</Code>
              </>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          {sessionProps === null || runtime === null ? (
            <div className="grid h-full place-content-center gap-2 px-6 text-center">
              <span className="fr-eyebrow">No model</span>
              <p className="max-w-[42ch] text-fr-base text-fr-text-2">
                The whole agent loop runs in your browser. Open Settings → Models, add an API key, and start a session
                — no backend.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-[920px] flex-col px-5 py-4">
              <ToolDisplaySettingsProvider settings={{ density, defaultOpen: autoExpand }}>
                <SessionThread key={`${activeId}:${runtime.connKey}`} className="min-h-0 flex-1" {...sessionProps} />
              </ToolDisplaySettingsProvider>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(<App />);

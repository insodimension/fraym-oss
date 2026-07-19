import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAiSdkDriver } from "@fraym/driver-aisdk";
import {
  Button,
  Code,
  Segmented,
  SessionThread,
  type SessionThreadProps,
  SettingsGroup,
  type SettingsNavItem,
  SettingsPage,
  SettingsRow,
  SettingsSub,
  SettingsTitle,
  type ToolDefaultOpen,
  ToolDisplaySettingsProvider,
} from "@fraym/ui";

import "@fraym/ui/theme.css";
import "@fraym/ui/fonts.css";
import "./styles.css";

type ProviderId = "openai" | "openrouter";

interface ProviderInfo {
  readonly label: string;
  readonly monogram: string;
  readonly baseURL: string;
  readonly defaultModel: string;
  readonly keyPlaceholder: string;
}

const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    label: "OpenAI",
    monogram: "OA",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyPlaceholder: "sk-...",
  },
  openrouter: {
    label: "OpenRouter",
    monogram: "OR",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    keyPlaceholder: "sk-or-...",
  },
};

const PROVIDER_IDS: readonly ProviderId[] = ["openai", "openrouter"];

const K_ACTIVE = "fraym-aisdk-provider";
const K_THEME = "fraym-aisdk-theme";
const K_DENSITY = "fraym-aisdk-density";
const K_AUTO_EXPAND = "fraym-aisdk-auto-expand";

type ThemeMode = "dark" | "light";
type Density = "compact" | "comfortable" | "spacious";

const THEME_OPTIONS: readonly ThemeMode[] = ["dark", "light"];
const DENSITY_OPTIONS: readonly Density[] = ["compact", "comfortable", "spacious"];
const AUTO_EXPAND_OPTIONS: readonly ToolDefaultOpen[] = ["none", "running", "failed", "all"];

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.fraymTheme = theme;
}

function loadTheme(): ThemeMode {
  return localStorage.getItem(K_THEME) === "light" ? "light" : "dark";
}

function loadDensity(): Density {
  const stored = localStorage.getItem(K_DENSITY);
  return stored === "compact" || stored === "spacious" ? stored : "comfortable";
}

function loadAutoExpand(): ToolDefaultOpen {
  const stored = localStorage.getItem(K_AUTO_EXPAND);
  return stored === "running" || stored === "failed" || stored === "all" ? stored : "none";
}

interface ProviderDraft {
  readonly apiKey: string;
  readonly model: string;
}

interface Connection {
  readonly provider: ProviderId;
  readonly apiKey: string;
  readonly model: string;
}

function loadDrafts(): Record<ProviderId, ProviderDraft> {
  // Earlier builds stored one free-form key; treat it as an OpenRouter key.
  const legacyKey = localStorage.getItem("fraym-aisdk-api-key") ?? "";
  return {
    openai: {
      apiKey: localStorage.getItem("fraym-aisdk-openai-key") ?? "",
      model: localStorage.getItem("fraym-aisdk-openai-model") ?? PROVIDERS.openai.defaultModel,
    },
    openrouter: {
      apiKey: localStorage.getItem("fraym-aisdk-openrouter-key") ?? legacyKey,
      model: localStorage.getItem("fraym-aisdk-openrouter-model") ?? PROVIDERS.openrouter.defaultModel,
    },
  };
}

function loadConnection(): Connection | null {
  const stored = localStorage.getItem(K_ACTIVE);
  if (stored !== "openai" && stored !== "openrouter") {
    return null;
  }
  const apiKey = localStorage.getItem(`fraym-aisdk-${stored}-key`) ?? "";
  if (apiKey.length === 0) {
    return null;
  }
  return {
    provider: stored,
    apiKey,
    model: localStorage.getItem(`fraym-aisdk-${stored}-model`) ?? PROVIDERS[stored].defaultModel,
  };
}

const SETTINGS_NAV: readonly SettingsNavItem[] = [
  { id: "general", label: "General", icon: "gear" },
  { id: "appearance", label: "Appearance", icon: "sun" },
  { id: "models", label: "Models", icon: "spark" },
];

interface ProviderCardProps {
  readonly id: ProviderId;
  readonly draft: ProviderDraft;
  readonly active: boolean;
  readonly onDraftChange: (id: ProviderId, patch: Partial<ProviderDraft>) => void;
  readonly onUse: (id: ProviderId) => void;
}

function ProviderCard({ id, draft, active, onDraftChange, onUse }: ProviderCardProps) {
  const info = PROVIDERS[id];
  const hasKey = draft.apiKey.trim().length > 0;
  return (
    <div className="rounded-xl border border-fr-border bg-fr-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-fr-border bg-fr-surface-2 font-secondary text-xs font-semibold text-fr-text-2">
          {info.monogram}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-fr-base font-medium text-fr-text">{info.label}</div>
          <div className="flex items-center gap-1.5 text-xs text-fr-text-2">
            <span className={active ? "size-1.5 rounded-full bg-fr-ok" : "size-1.5 rounded-full bg-fr-warn"} />
            {active ? "Active" : hasKey ? "Key entered" : "Not connected"}
          </div>
        </div>
        <code className="hidden text-xs text-fr-text-3 sm:block">{info.baseURL}</code>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs text-fr-text-2">
          API key
          <input
            autoComplete="off"
            className="h-9 rounded-lg border border-fr-border bg-fr-surface-2 px-3 font-mono text-xs text-fr-text outline-none focus:border-fr-accent-line"
            onChange={(event) => onDraftChange(id, { apiKey: event.currentTarget.value })}
            placeholder={info.keyPlaceholder}
            spellCheck={false}
            type="password"
            value={draft.apiKey}
          />
        </label>
        <label className="grid gap-1.5 text-xs text-fr-text-2">
          Model
          <input
            className="h-9 rounded-lg border border-fr-border bg-fr-surface-2 px-3 font-mono text-xs text-fr-text outline-none focus:border-fr-accent-line"
            onChange={(event) => onDraftChange(id, { model: event.currentTarget.value })}
            placeholder={info.defaultModel}
            spellCheck={false}
            type="text"
            value={draft.model}
          />
        </label>
      </div>
      <div className="mt-3">
        <Button disabled={!hasKey} onClick={() => onUse(id)} size="sm" variant={active ? "outline" : "default"}>
          {active ? "Save" : `Use ${info.label}`}
        </Button>
      </div>
    </div>
  );
}

function App() {
  const [connection, setConnection] = useState<Connection | null>(loadConnection);
  const [view, setView] = useState<"chat" | "settings">("chat");
  const [pane, setPane] = useState("general");
  const [version, setVersion] = useState(0);
  const [drafts, setDrafts] = useState<Record<ProviderId, ProviderDraft>>(loadDrafts);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const initial = loadTheme();
    applyTheme(initial);
    return initial;
  });
  const [density, setDensity] = useState<Density>(loadDensity);
  const [autoExpand, setAutoExpand] = useState<ToolDefaultOpen>(loadAutoExpand);

  const driver = useMemo(() => {
    if (connection === null) {
      return null;
    }
    const info = PROVIDERS[connection.provider];
    const provider = createOpenAICompatible({ name: connection.provider, baseURL: info.baseURL, apiKey: connection.apiKey });
    return createAiSdkDriver({ model: provider(connection.model), system: "You are a helpful coding agent." });
  }, [connection]);

  const updateDraft = (id: ProviderId, patch: Partial<ProviderDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const activateProvider = (id: ProviderId) => {
    const apiKey = drafts[id].apiKey.trim();
    if (apiKey.length === 0) {
      return;
    }
    const model = drafts[id].model.trim() || PROVIDERS[id].defaultModel;
    localStorage.setItem(K_ACTIVE, id);
    localStorage.setItem(`fraym-aisdk-${id}-key`, apiKey);
    localStorage.setItem(`fraym-aisdk-${id}-model`, model);
    setConnection({ provider: id, apiKey, model });
    setVersion((current) => current + 1);
  }

  const changeTheme = (next: ThemeMode) => {
    localStorage.setItem(K_THEME, next);
    applyTheme(next);
    setTheme(next);
  };

  const changeDensity = (next: Density) => {
    localStorage.setItem(K_DENSITY, next);
    setDensity(next);
  };

  const changeAutoExpand = (next: ToolDefaultOpen) => {
    localStorage.setItem(K_AUTO_EXPAND, next);
    setAutoExpand(next);
  };

  const sessionProps: SessionThreadProps | null = driver === null || connection === null
    ? null
    : {
        source: driver,
        title: connection.model,
        model: connection.model,
        contextUsage: 0,
        onStop: driver.cancel,
        onSubmit: (value) => {
          void driver.prompt(value).catch(() => undefined);
        },
      };

  if (view === "settings") {
    return (
      <div className="h-dvh">
        <SettingsPage activePane={pane} navItems={SETTINGS_NAV} onBack={() => setView("chat")} onPaneChange={setPane}>
          {pane === "general" && (
            <div>
              <SettingsTitle>General</SettingsTitle>
              <SettingsSub>How tool cards and the thread render.</SettingsSub>
              <SettingsGroup heading="Tools">
                <SettingsRow desc="How compact tool cards and the thread render" name="Density">
                  <Segmented onChange={changeDensity} options={DENSITY_OPTIONS} value={density} />
                </SettingsRow>
                <SettingsRow desc="Which tool calls open automatically — none, while running, on failure, or all" name="Auto-expand">
                  <Segmented onChange={changeAutoExpand} options={AUTO_EXPAND_OPTIONS} value={autoExpand} />
                </SettingsRow>
              </SettingsGroup>
            </div>
          )}
          {pane === "appearance" && (
            <div>
              <SettingsTitle>Appearance</SettingsTitle>
              <SettingsSub>Theme for this browser.</SettingsSub>
              <SettingsGroup heading="Theme">
                <SettingsRow desc="Dark or light, applied live" name="Theme">
                  <Segmented onChange={changeTheme} options={THEME_OPTIONS} value={theme} />
                </SettingsRow>
              </SettingsGroup>
            </div>
          )}
          {pane === "models" && (
            <div>
              <SettingsTitle>Models</SettingsTitle>
              <SettingsSub>
                Add an API key for a provider, then use it to start a session. Keys live only in this browser
                (localStorage) and are sent straight to the provider.
              </SettingsSub>
              <SettingsGroup>
                <div className="grid gap-3">
                  {PROVIDER_IDS.map((id) => (
                    <ProviderCard
                      active={connection?.provider === id}
                      draft={drafts[id]}
                      id={id}
                      key={id}
                      onDraftChange={updateDraft}
                      onUse={activateProvider}
                    />
                  ))}
                </div>
              </SettingsGroup>
            </div>
          )}
        </SettingsPage>
      </div>
    );
  }

  return (
    <main>
      <header className="web-hero">
        <span className="web-eyebrow">Fraym</span>
        <h1>AI SDK agent</h1>
        <p>The whole agent loop runs in your browser. Pick a provider under Settings → Models, add its API key, and the conversation surface talks to it directly — no backend.</p>
      </header>

      <section aria-label="Connection" className="web-source-panel">
        <div className="web-source-tabs" role="group">
          {connection === null ? (
            <span className="web-eyebrow">Not connected</span>
          ) : (
            <>
              <span className="web-eyebrow">{PROVIDERS[connection.provider].label}</span>
              <Code>{connection.model}</Code>
            </>
          )}
        </div>
        <Button onClick={() => setView("settings")} size="sm" variant="ghost">
          Settings
        </Button>
      </section>

      {sessionProps === null ? (
        <section className="web-acp-pending">
          <span className="web-eyebrow">No model</span>
          <p>Open Settings → Models and add a key to start a session.</p>
        </section>
      ) : (
        <ToolDisplaySettingsProvider settings={{ density, defaultOpen: autoExpand }}>
          <SessionThread key={version} {...sessionProps} />
        </ToolDisplaySettingsProvider>
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(<App />);

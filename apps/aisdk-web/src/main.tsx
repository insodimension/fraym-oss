import { type FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAiSdkDriver } from "@fraym/driver-aisdk";
import { Button, Code, SessionThread, type SessionThreadProps } from "@fraym/ui";

import "@fraym/ui/theme.css";
import "@fraym/ui/fonts.css";
import "./styles.css";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const K_BASE = "fraym-aisdk-base-url";
const K_KEY = "fraym-aisdk-api-key";
const K_MODEL = "fraym-aisdk-model";

interface Connection {
  readonly baseURL: string;
  readonly apiKey: string;
  readonly model: string;
}

function loadConnection(): Connection | null {
  const apiKey = localStorage.getItem(K_KEY) ?? "";
  if (apiKey.length === 0) {
    return null;
  }
  return {
    baseURL: localStorage.getItem(K_BASE) ?? DEFAULT_BASE_URL,
    apiKey,
    model: localStorage.getItem(K_MODEL) ?? DEFAULT_MODEL,
  };
}

function App() {
  const [connection, setConnection] = useState<Connection | null>(loadConnection);
  const [showSettings, setShowSettings] = useState(connection === null);
  const [version, setVersion] = useState(0);
  const [baseURL, setBaseURL] = useState(connection?.baseURL ?? DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(connection?.apiKey ?? "");
  const [model, setModel] = useState(connection?.model ?? DEFAULT_MODEL);

  const driver = useMemo(() => {
    if (connection === null) {
      return null;
    }
    const provider = createOpenAICompatible({ name: "byo", baseURL: connection.baseURL, apiKey: connection.apiKey });
    return createAiSdkDriver({ model: provider(connection.model), system: "You are a helpful coding agent." });
  }, [connection]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    const key = apiKey.trim();
    if (key.length === 0) {
      return;
    }
    const next: Connection = { baseURL: baseURL.trim() || DEFAULT_BASE_URL, apiKey: key, model: model.trim() || DEFAULT_MODEL };
    localStorage.setItem(K_BASE, next.baseURL);
    localStorage.setItem(K_KEY, next.apiKey);
    localStorage.setItem(K_MODEL, next.model);
    setConnection(next);
    setVersion((current) => current + 1);
    setShowSettings(false);
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

  return (
    <main data-fraym-theme="dark">
      <header className="web-hero">
        <span className="web-eyebrow">Fraym</span>
        <h1>AI SDK agent</h1>
        <p>The whole agent loop runs in your browser. Point the same conversation surface at any CORS-enabled OpenAI-compatible endpoint — OpenRouter, Groq, or a local Ollama / LM Studio.</p>
      </header>

      <section aria-label="Model settings" className="web-source-panel">
        <div aria-label="Connection" className="web-source-tabs" role="group">
          {connection === null ? <span className="web-eyebrow">Not connected</span> : <Code>{connection.model}</Code>}
        </div>
        <Button aria-pressed={showSettings} onClick={() => setShowSettings((current) => !current)} size="sm" variant="ghost">
          Settings
        </Button>
      </section>

      {showSettings ? (
        <form className="web-connection web-connection--stack" onSubmit={save}>
          <div className="web-connection__field">
            <label htmlFor="ai-base">Base URL</label>
            <input id="ai-base" onChange={(event) => setBaseURL(event.currentTarget.value)} spellCheck={false} type="url" value={baseURL} />
          </div>
          <div className="web-connection__field">
            <label htmlFor="ai-key">API key</label>
            <input autoComplete="off" id="ai-key" onChange={(event) => setApiKey(event.currentTarget.value)} placeholder="sk-or-..." spellCheck={false} type="password" value={apiKey} />
          </div>
          <div className="web-connection__field">
            <label htmlFor="ai-model">Model</label>
            <input id="ai-model" onChange={(event) => setModel(event.currentTarget.value)} spellCheck={false} type="text" value={model} />
          </div>
          <Button disabled={apiKey.trim().length === 0} size="sm" type="submit" variant="default">
            {connection === null ? "Connect" : "Save"}
          </Button>
          <p className="web-connection__help">Your key is stored only in this browser (localStorage) and sent straight to the endpoint — there is no backend.</p>
        </form>
      ) : sessionProps === null ? (
        <section className="web-acp-pending">
          <span className="web-eyebrow">No model</span>
          <p>Open settings and add a key to start a session.</p>
        </section>
      ) : (
        <SessionThread key={version} {...sessionProps} />
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(<App />);

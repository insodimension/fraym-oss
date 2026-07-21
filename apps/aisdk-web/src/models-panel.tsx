import type { EngineModelRecord } from "@fraym-ai/driver";
import { Button, type FraymSettingsPanel, SettingsGroup, SettingsSub, SettingsTitle } from "@fraym-ai/ui";
import { useEffect, useState } from "react";
import { resourceDriver } from "./local-resource-driver";
import {
  loadConnection,
  persistConnection,
  PROVIDER_IDS,
  PROVIDERS,
  type ProviderId,
} from "./providers";

// The Models settings pane: the provider surface of the browser-only host.
// Two fixed providers, each with an API key + model saved in localStorage;
// the active provider is what new sessions stream through.

interface DraftState {
  readonly apiKey: string;
  readonly model: string;
}

function loadDraft(id: ProviderId): DraftState {
  return {
    apiKey: localStorage.getItem(`fraym-aisdk-${id}-key`) ?? "",
    model: localStorage.getItem(`fraym-aisdk-${id}-model`) ?? PROVIDERS[id].defaultModel,
  };
}

function ProviderCard({ id, models }: { readonly id: ProviderId; readonly models: readonly EngineModelRecord[] }) {
  const info = PROVIDERS[id];
  const [draft, setDraft] = useState<DraftState>(() => loadDraft(id));
  const [active, setActive] = useState(() => loadConnection()?.provider === id);
  const hasKey = draft.apiKey.trim().length > 0;
  const catalog = models.filter((model) => model.providerId === id);

  const use = () => {
    const apiKey = draft.apiKey.trim();
    if (apiKey.length === 0) {
      return;
    }
    const model = draft.model.trim() || info.defaultModel;
    persistConnection({ provider: id, apiKey, model });
    setActive(true);
    window.dispatchEvent(new CustomEvent("aisdk-provider-changed", { detail: { provider: id, model } }));
  };

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
            onChange={(event) => setDraft({ ...draft, apiKey: event.currentTarget.value })}
            placeholder={info.keyPlaceholder}
            spellCheck={false}
            type="password"
            value={draft.apiKey}
          />
        </label>
        <label className="grid gap-1.5 text-xs text-fr-text-2">
          Model
          {catalog.length > 0 ? (
            <select
              className="h-9 rounded-lg border border-fr-border bg-fr-surface-2 px-2 font-mono text-xs text-fr-text outline-none focus:border-fr-accent-line"
              onChange={(event) => setDraft({ ...draft, model: event.currentTarget.value })}
              value={draft.model || info.defaultModel}
            >
              {catalog.map((model) => (
                <option key={model.modelId} value={model.modelId}>
                  {model.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="h-9 rounded-lg border border-fr-border bg-fr-surface-2 px-3 font-mono text-xs text-fr-text outline-none focus:border-fr-accent-line"
              onChange={(event) => setDraft({ ...draft, model: event.currentTarget.value })}
              placeholder={info.defaultModel}
              spellCheck={false}
              type="text"
              value={draft.model}
            />
          )}
        </label>
      </div>
      <div className="mt-3">
        <Button disabled={!hasKey} onClick={use} size="sm" variant={active ? "outline" : "default"}>
          {active ? "Save" : `Use ${info.label}`}
        </Button>
      </div>
    </div>
  );
}

function ModelsPane() {
  const [models, setModels] = useState<readonly EngineModelRecord[]>([]);
  useEffect(() => {
    let alive = true;
    void resourceDriver.getResourceSnapshot().then(
      (snapshot) => {
        if (alive) setModels(snapshot.models);
      },
      () => {
        // Offline / fetch failure: the cards fall back to free-text model input.
      },
    );
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div>
      <SettingsTitle>Models</SettingsTitle>
      <SettingsSub>
        Add an API key for a provider, then use it to start a session. Keys live only in this browser (localStorage)
        and are sent straight to the provider — no backend.
      </SettingsSub>
      <SettingsGroup>
        <div className="grid gap-3">
          {PROVIDER_IDS.map((id) => (
            <ProviderCard id={id} key={id} models={models} />
          ))}
        </div>
      </SettingsGroup>
    </div>
  );
}

export const MODELS_SETTINGS_PANEL: FraymSettingsPanel = {
  id: "models",
  label: "Models",
  icon: "spark",
  render: () => <ModelsPane />,
};

import {
  Button,
  Segmented,
  SettingsGroup,
  type SettingsNavItem,
  SettingsPage,
  SettingsRow,
  SettingsSub,
  SettingsTitle,
  type ToolDefaultOpen,
} from "@fraym/ui";
import {
  AUTO_EXPAND_OPTIONS,
  type Connection,
  DENSITY_OPTIONS,
  type Density,
  PROVIDER_IDS,
  PROVIDERS,
  type ProviderDraft,
  type ProviderId,
  THEME_OPTIONS,
  type ThemeMode,
} from "./providers";

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

export interface SettingsViewProps {
  readonly pane: string;
  readonly onPaneChange: (pane: string) => void;
  readonly onBack: () => void;
  readonly connection: Connection | null;
  readonly drafts: Record<ProviderId, ProviderDraft>;
  readonly onDraftChange: (id: ProviderId, patch: Partial<ProviderDraft>) => void;
  readonly onUseProvider: (id: ProviderId) => void;
  readonly theme: ThemeMode;
  readonly onThemeChange: (theme: ThemeMode) => void;
  readonly density: Density;
  readonly onDensityChange: (density: Density) => void;
  readonly autoExpand: ToolDefaultOpen;
  readonly onAutoExpandChange: (mode: ToolDefaultOpen) => void;
}

export function SettingsView({
  pane,
  onPaneChange,
  onBack,
  connection,
  drafts,
  onDraftChange,
  onUseProvider,
  theme,
  onThemeChange,
  density,
  onDensityChange,
  autoExpand,
  onAutoExpandChange,
}: SettingsViewProps) {
  return (
    <div className="h-dvh">
      <SettingsPage activePane={pane} navItems={SETTINGS_NAV} onBack={onBack} onPaneChange={onPaneChange}>
        {pane === "general" && (
          <div>
            <SettingsTitle>General</SettingsTitle>
            <SettingsSub>How tool cards and the thread render.</SettingsSub>
            <SettingsGroup heading="Tools">
              <SettingsRow desc="How compact tool cards and the thread render" name="Density">
                <Segmented onChange={onDensityChange} options={DENSITY_OPTIONS} value={density} />
              </SettingsRow>
              <SettingsRow desc="Which tool calls open automatically — none, while running, on failure, or all" name="Auto-expand">
                <Segmented onChange={onAutoExpandChange} options={AUTO_EXPAND_OPTIONS} value={autoExpand} />
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
                <Segmented onChange={onThemeChange} options={THEME_OPTIONS} value={theme} />
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
                    onDraftChange={onDraftChange}
                    onUse={onUseProvider}
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

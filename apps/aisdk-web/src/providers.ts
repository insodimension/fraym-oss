import type { ToolDefaultOpen } from "@fraym/ui";

// Provider catalog + browser-persisted app preferences for the AI SDK host.

export type ProviderId = "openai" | "openrouter";

export interface ProviderInfo {
  readonly label: string;
  readonly monogram: string;
  readonly baseURL: string;
  readonly defaultModel: string;
  readonly keyPlaceholder: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
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

export const PROVIDER_IDS: readonly ProviderId[] = ["openai", "openrouter"];

const K_ACTIVE_PROVIDER = "fraym-aisdk-provider";
const K_THEME = "fraym-aisdk-theme";
const K_DENSITY = "fraym-aisdk-density";
const K_AUTO_EXPAND = "fraym-aisdk-auto-expand";

export type ThemeMode = "dark" | "light";
export type Density = "compact" | "comfortable" | "spacious";

export const THEME_OPTIONS: readonly ThemeMode[] = ["dark", "light"];
export const DENSITY_OPTIONS: readonly Density[] = ["compact", "comfortable", "spacious"];
export const AUTO_EXPAND_OPTIONS: readonly ToolDefaultOpen[] = ["none", "running", "failed", "all"];

export interface ProviderDraft {
  readonly apiKey: string;
  readonly model: string;
}

export interface Connection {
  readonly provider: ProviderId;
  readonly apiKey: string;
  readonly model: string;
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.fraymTheme = theme;
}

export function persistTheme(theme: ThemeMode): void {
  localStorage.setItem(K_THEME, theme);
}

export function loadTheme(): ThemeMode {
  return localStorage.getItem(K_THEME) === "light" ? "light" : "dark";
}

export function persistDensity(density: Density): void {
  localStorage.setItem(K_DENSITY, density);
}

export function loadDensity(): Density {
  const stored = localStorage.getItem(K_DENSITY);
  return stored === "compact" || stored === "spacious" ? stored : "comfortable";
}

export function persistAutoExpand(mode: ToolDefaultOpen): void {
  localStorage.setItem(K_AUTO_EXPAND, mode);
}

export function loadAutoExpand(): ToolDefaultOpen {
  const stored = localStorage.getItem(K_AUTO_EXPAND);
  return stored === "running" || stored === "failed" || stored === "all" ? stored : "none";
}

export function loadDrafts(): Record<ProviderId, ProviderDraft> {
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

export function persistConnection(connection: Connection): void {
  localStorage.setItem(K_ACTIVE_PROVIDER, connection.provider);
  localStorage.setItem(`fraym-aisdk-${connection.provider}-key`, connection.apiKey);
  localStorage.setItem(`fraym-aisdk-${connection.provider}-model`, connection.model);
}

export function loadConnection(): Connection | null {
  const stored = localStorage.getItem(K_ACTIVE_PROVIDER);
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

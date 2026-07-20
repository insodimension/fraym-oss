// A browser-local EngineResourceDriver: the model/provider catalog surfaces
// (composer model menu, Models pane, model settings) fed by the providers' own
// LIVE model-list APIs — OpenRouter's public /models and OpenAI's keyed
// /v1/models — instead of anything hardcoded. Everything engine-only
// (plugins, marketplaces, skills, OAuth login) is an honest no-op: the
// snapshot advertises none of it, so the UI never offers it.
import type {
  EngineMarketplaceEntry,
  EngineModelRecord,
  EngineProviderRecord,
  EngineResourceDriver,
  EngineResourceSnapshot,
  PluginConnectState,
  WorkspaceRef,
} from "@fraym/driver";
import { PROVIDER_IDS, PROVIDERS, type ProviderId, workspace } from "./providers";

interface OpenRouterModel {
  readonly id: string;
  readonly name?: string;
  readonly context_length?: number;
  readonly top_provider?: { readonly max_completion_tokens?: number };
  readonly architecture?: { readonly input_modalities?: readonly string[] };
  readonly supported_parameters?: readonly string[];
  readonly pricing?: { readonly prompt?: string; readonly completion?: string };
}

function apiKeyOf(provider: ProviderId): string {
  return (localStorage.getItem(`fraym-aisdk-${provider}-key`) ?? "").trim();
}

async function fetchOpenRouterModels(): Promise<readonly EngineModelRecord[]> {
  const response = await fetch(`${PROVIDERS.openrouter.baseURL}/models`);
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { readonly data?: readonly OpenRouterModel[] };
  const available = apiKeyOf("openrouter").length > 0;
  return (payload.data ?? []).map((model) => {
    const modalities = model.architecture?.input_modalities ?? ["text"];
    const parameters = model.supported_parameters ?? [];
    const promptCost = Number(model.pricing?.prompt ?? "0") * 1_000_000;
    const completionCost = Number(model.pricing?.completion ?? "0") * 1_000_000;
    return {
      providerId: "openrouter",
      providerName: "OpenRouter",
      modelId: model.id,
      label: model.name ?? model.id,
      available,
      authType: "api_key" as const,
      reasoning: parameters.includes("reasoning"),
      supportsImages: modalities.includes("image"),
      ...(model.context_length ? { contextWindow: model.context_length } : {}),
      ...(model.top_provider?.max_completion_tokens
        ? { maxOutputTokens: model.top_provider.max_completion_tokens }
        : {}),
      inputModalities: [...modalities],
      supportsTools: parameters.includes("tools"),
      ...(promptCost > 0 || completionCost > 0
        ? { cost: { input: promptCost, output: completionCost, cacheRead: 0, cacheWrite: 0 } }
        : {}),
    };
  });
}

const OPENAI_CHAT_MODEL_RE = /^(gpt-|o\d|chatgpt-)/;
const OPENAI_NON_CHAT_RE = /(embedding|whisper|tts|audio|image|dall-e|moderation|transcribe|realtime|search)/;

async function fetchOpenAiModels(): Promise<readonly EngineModelRecord[]> {
  const apiKey = apiKeyOf("openai");
  if (apiKey.length === 0) {
    return [];
  }
  const response = await fetch(`${PROVIDERS.openai.baseURL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { readonly data?: readonly { readonly id: string }[] };
  return (payload.data ?? [])
    .filter((model) => OPENAI_CHAT_MODEL_RE.test(model.id) && !OPENAI_NON_CHAT_RE.test(model.id))
    .map((model) => ({
      providerId: "openai",
      providerName: "OpenAI",
      modelId: model.id,
      label: model.id,
      available: true,
      authType: "api_key" as const,
      reasoning: /^o\d|gpt-5/.test(model.id),
      supportsImages: /gpt-4o|gpt-4\.|gpt-5|o\d/.test(model.id),
    }));
}

function providerRecords(): readonly EngineProviderRecord[] {
  return PROVIDER_IDS.map((id) => ({
    id,
    name: PROVIDERS[id].label,
    hasAuth: apiKeyOf(id).length > 0,
    authType: "api_key" as const,
    authSource: "external" as const,
    oauthSupported: false,
    apiKeySetupSupported: true,
  }));
}

export class LocalResourceDriver implements EngineResourceDriver {
  readonly #workspace: WorkspaceRef;
  #snapshot: EngineResourceSnapshot | null = null;
  #listeners = new Set<() => void>();

  constructor(workspace: WorkspaceRef) {
    this.#workspace = workspace;
  }

  #settings(): EngineResourceSnapshot["settings"] {
    const provider = localStorage.getItem("fraym-aisdk-provider") ?? undefined;
    const modelId = provider ? (localStorage.getItem(`fraym-aisdk-${provider}-model`) ?? undefined) : undefined;
    return {
      ...(provider ? { defaultProvider: provider } : {}),
      ...(modelId ? { defaultModelId: modelId } : {}),
      enableSkillCommands: false,
      enabledModelPatterns: [],
    };
  }

  async #build(): Promise<EngineResourceSnapshot> {
    const [openRouter, openAi] = await Promise.all([
      fetchOpenRouterModels().catch(() => []),
      fetchOpenAiModels().catch(() => []),
    ]);
    const snapshot: EngineResourceSnapshot = {
      workspace: this.#workspace,
      providers: providerRecords(),
      models: [...openAi, ...openRouter],
      skills: [],
      extensions: [],
      mcpServers: [],
      plugins: [],
      permissions: [],
      settings: this.#settings(),
    };
    this.#snapshot = snapshot;
    return snapshot;
  }

  /** Rebuild + notify — the Models pane calls this after a key change. */
  async refreshAndNotify(): Promise<void> {
    await this.#build();
    for (const listener of this.#listeners) {
      listener();
    }
  }

  async getResourceSnapshot(): Promise<EngineResourceSnapshot> {
    return this.#snapshot ?? (await this.#build());
  }

  async refreshResources(): Promise<EngineResourceSnapshot> {
    return this.#build();
  }

  subscribeResourcesChanged(listener: () => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  getLastSnapshot(): EngineResourceSnapshot | null {
    return this.#snapshot;
  }

  async #current(): Promise<EngineResourceSnapshot> {
    return this.getResourceSnapshot();
  }

  async login(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async logout(_workspace: WorkspaceRef, providerId: string): Promise<EngineResourceSnapshot> {
    localStorage.removeItem(`fraym-aisdk-${providerId}-key`);
    return this.#build();
  }

  async setProviderApiKey(
    _workspace: WorkspaceRef,
    providerId: string,
    apiKey: string,
  ): Promise<EngineResourceSnapshot> {
    localStorage.setItem(`fraym-aisdk-${providerId}-key`, apiKey.trim());
    return this.#build();
  }

  async pinProviderAccount(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setProviderAccountPolicy(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setProviderAccountPriorityOrder(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async removeProviderAccount(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setDefaultModel(
    _workspace: WorkspaceRef,
    selection: { readonly provider: string; readonly modelId: string },
  ): Promise<EngineResourceSnapshot> {
    localStorage.setItem("fraym-aisdk-provider", selection.provider);
    localStorage.setItem(`fraym-aisdk-${selection.provider}-model`, selection.modelId);
    return this.#build();
  }

  async setDefaultThinkingLevel(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setEnableSkillCommands(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setScopedModelPatterns(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setSkillEnabled(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setExtensionEnabled(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setMcpServerEnabled(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async listMarketplaces(): Promise<readonly EngineMarketplaceEntry[]> {
    return [];
  }

  async addMarketplace(): Promise<readonly EngineMarketplaceEntry[]> {
    return [];
  }

  async removeMarketplace(): Promise<readonly EngineMarketplaceEntry[]> {
    return [];
  }

  async updateMarketplace(): Promise<readonly EngineMarketplaceEntry[]> {
    return [];
  }

  async listAvailablePlugins() {
    return [];
  }

  async listInstalledPlugins() {
    return [];
  }

  async installPlugin(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async uninstallPlugin(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setPluginEnabled(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setPluginToolLoading(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async setPluginProjectScope(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async checkPluginUpdates() {
    return [];
  }

  async upgradePlugin(): Promise<EngineResourceSnapshot> {
    return this.#current();
  }

  async pluginConnectStatus(): Promise<PluginConnectState> {
    return { status: "not-connected" };
  }

  async pluginConnect(): Promise<PluginConnectState> {
    return { status: "not-connected" };
  }

  async pluginDisconnect(): Promise<PluginConnectState> {
    return { status: "not-connected" };
  }

  async pluginInstallRequirement(): Promise<PluginConnectState> {
    return { status: "not-connected" };
  }

  async pluginOAuthConnect(): Promise<PluginConnectState> {
    return { status: "not-connected" };
  }
}

/** The app-wide catalog driver - one instance, shared by the shell mount and
 * the Models settings pane. */
export const resourceDriver = new LocalResourceDriver(workspace);

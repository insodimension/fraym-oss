// Connections marketplace view-model — pure, UI-agnostic helpers shared by the
// Connections manager page, the provider cards, and their tests. Derives the
// per-provider connection state + actions from the engine resource contract,
// plus deterministic monogram tiles (no brand-asset dependency) and
// search/filter predicates for the ~45-provider grid.

import type { EngineProviderAuthSource, EngineProviderRecord } from "@fraym/driver";
import { providerBrand } from "./provider-brand";

export { providerMonogram } from "./provider-brand";

/**
 * UI connection status for a provider:
 * - `connected`  — authed via a user-managed source (oauth / auth file); can disconnect.
 * - `managed`    — authed via env / external; read-only (logout would no-op).
 * - `available`  — needs auth and supports at least one connect path.
 * - `ready`      — `authType: none`; no auth required.
 * - `unavailable`— needs auth but exposes no connect path.
 */
export type ProviderConnectionStatus = "connected" | "managed" | "available" | "ready" | "unavailable";

export type ProviderActionKind = "connect-oauth" | "add-api-key" | "disconnect" | "none";

export interface ProviderAction {
	readonly kind: ProviderActionKind;
	readonly label: string;
}

export interface ProviderConnectionView {
	readonly status: ProviderConnectionStatus;
	/** Short human label for the status pill, e.g. "Connected · OAuth". */
	readonly statusLabel: string;
	readonly primaryAction: ProviderAction;
	readonly secondaryAction?: ProviderAction;
	/** True only when the credential is user-managed and can be removed via `logout`. */
	readonly canDisconnect: boolean;
}

const CONNECTED_SOURCE_LABEL: Record<EngineProviderAuthSource, string> = {
	none: "Not connected",
	oauth: "Connected · OAuth",
	auth_file: "Connected · API key",
	env: "Connected · environment",
	external: "Connected · external",
};

const READY_CONNECTION: ProviderConnectionView = {
	status: "ready",
	statusLabel: "No auth required",
	primaryAction: { kind: "none", label: "Ready" },
	canDisconnect: false,
};

const UNAVAILABLE_CONNECTION: ProviderConnectionView = {
	status: "unavailable",
	statusLabel: "Unavailable",
	primaryAction: { kind: "none", label: "Unavailable" },
	canDisconnect: false,
};

function availableConnection(statusLabel: string, canOauth: boolean, canApiKey: boolean): ProviderConnectionView {
	const oauthLabel = statusLabel === "Auth failed" ? "Sign in again" : "Connect";
	if (canOauth && canApiKey) {
		return {
			status: "available",
			statusLabel,
			primaryAction: { kind: "connect-oauth", label: oauthLabel },
			secondaryAction: { kind: "add-api-key", label: "Use API key" },
			canDisconnect: false,
		};
	}
	if (canOauth) {
		return {
			status: "available",
			statusLabel,
			primaryAction: { kind: "connect-oauth", label: oauthLabel },
			canDisconnect: false,
		};
	}
	if (canApiKey) {
		return {
			status: "available",
			statusLabel,
			primaryAction: { kind: "add-api-key", label: "Add API key" },
			canDisconnect: false,
		};
	}
	return UNAVAILABLE_CONNECTION;
}

function hasAuthFailedAccount(provider: EngineProviderRecord): boolean {
	const explicitFailure = provider.accounts?.some(account => account.diagnostics?.state === "auth_failed") ?? false;
	const staleOauthAccount = !provider.hasAuth && provider.oauthSupported && (provider.accounts?.length ?? 0) > 0;
	return explicitFailure || staleOauthAccount;
}

function connectedConnection(provider: EngineProviderRecord, canOauth: boolean): ProviderConnectionView {
	const userManaged = provider.authSource === "oauth" || provider.authSource === "auth_file";
	if (userManaged) {
		return {
			status: "connected",
			statusLabel: CONNECTED_SOURCE_LABEL[provider.authSource],
			primaryAction: { kind: "disconnect", label: "Disconnect" },
			canDisconnect: true,
		};
	}
	return {
		status: "managed",
		statusLabel: CONNECTED_SOURCE_LABEL[provider.authSource],
		primaryAction: canOauth
			? { kind: "connect-oauth", label: "Connect" }
			: { kind: "none", label: "Managed externally" },
		secondaryAction:
			canOauth && provider.apiKeySetupSupported ? { kind: "add-api-key", label: "Use API key" } : undefined,
		canDisconnect: false,
	};
}

/**
 * Derive the connection status + context-aware actions for a provider record.
 * `apiKeyOnly` (from the deployment gate) hides the OAuth path so a curated
 * deployment can pin a provider to API-key connection only — matching the
 * provider detail page, which already honors the same gate.
 */
export function deriveConnectionView(provider: EngineProviderRecord, apiKeyOnly = false): ProviderConnectionView {
	if (provider.authType === "none") return READY_CONNECTION;
	const canOauth = provider.oauthSupported && !apiKeyOnly;
	// Provider-level auth failure (e.g. a present API key rejected with 401/403)
	// surfaces "Auth failed" + reconnect even though a credential is present.
	if (provider.authFailed) {
		return availableConnection("Auth failed", canOauth, provider.apiKeySetupSupported);
	}
	if (!provider.hasAuth && hasAuthFailedAccount(provider)) {
		return availableConnection("Auth failed", canOauth, provider.apiKeySetupSupported);
	}
	if (provider.hasAuth) return connectedConnection(provider, canOauth);
	return availableConnection("Not connected", canOauth, provider.apiKeySetupSupported);
}

export interface ProviderTile {
	readonly bg: string;
	readonly fg: string;
}

/** Deterministic monogram-tile colors for a provider id (curated override or hashed palette pick). */
export function providerTile(id: string): ProviderTile {
	const brand = providerBrand(id);
	return { bg: brand.tileBg, fg: brand.tileFg };
}

/** Curated "popular" providers surfaced as featured cards above the long-tail grid. */
export const POPULAR_PROVIDER_IDS: readonly string[] = [
	"openai",
	"openai-codex",
	"google",
	"google-vertex",
	"openrouter",
	"groq",
	"mistral",
	"deepseek",
	"xai",
];

export function isPopularProvider(id: string): boolean {
	return POPULAR_PROVIDER_IDS.includes(id);
}

export type ConnectionFilter = "all" | "connected" | "oauth" | "api_key" | "no_auth";

export interface ConnectionFilterOption {
	readonly id: ConnectionFilter;
	readonly label: string;
}

export const CONNECTION_FILTERS: readonly ConnectionFilterOption[] = [
	{ id: "all", label: "All" },
	{ id: "connected", label: "Connected" },
	{ id: "oauth", label: "OAuth" },
	{ id: "api_key", label: "API key" },
	{ id: "no_auth", label: "No auth" },
];

/** Whether a provider matches a filter chip. */
export function matchesConnectionFilter(provider: EngineProviderRecord, filter: ConnectionFilter): boolean {
	switch (filter) {
		case "all":
			return true;
		case "connected":
			return provider.hasAuth;
		case "oauth":
			return provider.oauthSupported;
		case "api_key":
			return provider.apiKeySetupSupported;
		case "no_auth":
			return provider.authType === "none";
	}
}

/** Case-insensitive name/id search predicate. */
export function matchesProviderQuery(provider: EngineProviderRecord, query: string): boolean {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return true;
	return provider.name.toLowerCase().includes(trimmed) || provider.id.toLowerCase().includes(trimmed);
}

export interface PartitionedProviders {
	readonly connected: readonly EngineProviderRecord[];
	readonly popular: readonly EngineProviderRecord[];
	readonly rest: readonly EngineProviderRecord[];
}

/**
 * Split providers for the hybrid layout: connected first, then not-yet-connected
 * popular providers as featured cards, then the long tail. A provider appears in
 * exactly one bucket.
 */
export function partitionProviders(providers: readonly EngineProviderRecord[]): PartitionedProviders {
	const connected: EngineProviderRecord[] = [];
	const popular: EngineProviderRecord[] = [];
	const rest: EngineProviderRecord[] = [];
	for (const provider of providers) {
		if (provider.hasAuth) {
			connected.push(provider);
		} else if (isPopularProvider(provider.id)) {
			popular.push(provider);
		} else {
			rest.push(provider);
		}
	}
	return { connected, popular, rest };
}

// ── Custom (runtime-configured) providers ───────────────────────────────────

/** Model-discovery mechanism a custom (OpenAI-compatible) gateway uses to list its
 *  models:
 *  - `openai-models-list` — `GET /v1/models`, KEY-SCOPED (only the models the key
 *    allows; the right default for a tier'd gateway).
 *  - `litellm` — LiteLLM `/v1/model/info` (key-scoped, with context/pricing/reasoning).
 *  - `proxy` — new-api / one-api aggregator discovery. */
export type CustomProviderDiscoveryType = "openai-models-list" | "litellm" | "proxy";

/** Normalize a persisted discovery value into the current union. The pre-v16.3.4
 *  fork type `model-group` was superseded by upstream's `litellm` (`/v1/model/info`)
 *  in the engine schema; map it forward so a provider saved with the old value stays
 *  editable and re-saves as `litellm`. Unknown values fall back to `litellm`. */
export function normalizeCustomProviderDiscovery(value: unknown): CustomProviderDiscoveryType {
	if (value === "openai-models-list" || value === "proxy") return value;
	return "litellm";
}

/** The engine-config gateway payload the custom-provider form produces and the save
 *  path persists into `models.providers[id]`. */
export interface CustomProviderSaveConfig {
	readonly baseUrl: string;
	/** Wire format (e.g. `openai-completions`), set when the discovery type requires it. */
	readonly api?: string;
	readonly discovery: CustomProviderDiscoveryType;
	readonly apiKey?: string;
	readonly auth?: "oauth";
	readonly oauth?: {
		readonly deviceAuthorizationUrl: string;
		readonly tokenUrl: string;
		readonly clientId: string;
		readonly scope?: string;
	};
	readonly usage?: { readonly url: string };
}

/** Engine-config gateway plumbing for a custom provider (a subset of
 *  `models.providers[id]` — only the fields the in-app form owns). */
export interface CustomProviderConfig {
	readonly baseUrl?: string;
	/** How the gateway's model list is fetched (defaults to key-scoped). */
	readonly discovery?: CustomProviderDiscoveryType;
	readonly apiKey?: string;
	/** Present when the gateway authenticates via the OAuth device-grant flow. */
	readonly auth?: "oauth";
	/** Standard OAuth 2.0 Device Authorization Grant config (set when `auth === "oauth"`),
	 *  consumed by Engine's RFC 8628 device-grant runner. */
	readonly oauth?: {
		readonly deviceAuthorizationUrl: string;
		readonly tokenUrl: string;
		readonly clientId: string;
		readonly scope?: string;
	};
	/** Live usage/quota endpoint; the engine fetches it for the "Usage & limits" view. */
	readonly usage?: { readonly url: string };
}

/** Slugify a custom-provider display name into a stable provider id (lowercase
 *  kebab); empty/punctuation-only names fall back to a generic id. */
export function slugifyProviderId(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "custom-provider";
}

/** Derive a provider id from a name, kept unique against existing ids by
 *  suffixing `-2`, `-3`, … so two "My Gateway" entries don't collide. */
export function uniqueProviderId(name: string, existingIds: Iterable<string>): string {
	const base = slugifyProviderId(name);
	const taken = existingIds instanceof Set ? existingIds : new Set(existingIds);
	if (!taken.has(base)) return base;
	let suffix = 2;
	while (taken.has(`${base}-${suffix}`)) suffix += 1;
	return `${base}-${suffix}`;
}

/** Lightweight base-URL check for the custom-provider form: a parseable
 *  http(s) URL (e.g. `https://host/litellm/v1`). */
export function isLikelyHttpUrl(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed) return false;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

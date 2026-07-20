// Crowd telemetry — Phase 7 of `docs/design/36-analytics-and-crowd-telemetry.md`,
// "your model vs the crowd". OFF by default; the user must opt in. Mirrors the
// privacy posture of `perf/perf-telemetry.ts` (anonymous client id, localStorage
// config, no PII) but adds a stronger guarantee this analytics data needs:
//
// LOCAL DIFFERENTIAL PRIVACY, not secure multi-party aggregation. Each client
// adds calibrated Laplace noise to its OWN per-model averages *before* anything
// leaves the device — the server only ever sees already-noised numbers, never
// the true value. This is a real, load-bearing distinction from a DAP/Prio-style
// protocol (where a set of non-colluding servers jointly compute an aggregate
// without any single server seeing individual values): LDP is weaker (a single
// malicious server sees noised-but-real per-submission data, not zero
// information) but is honest about what's actually shipped here — no secure
// multi-party computation is implemented, and no design doc claiming so exists
// past this comment. LDP noise scales with the privacy budget epsilon: smaller
// epsilon → more noise → more privacy but a noisier signal; averaging across
// many contributors cancels the (zero-mean) noise back out, which is what makes
// the aggregate still useful.
//
// What's sent: `{modelId, ttftMs, tokensPerSecond, requests}` — a provider/model
// slug + two noised numbers + a local request count (itself not identifying).
// NEVER prompts, paths, session ids, or account identity. A model only
// contributes once it has enough local volume (`MIN_REQUESTS_TO_CONTRIBUTE`) —
// a one-request average is too easy to correlate back to a single visible event.

import type { AnalyticsModelStats } from "@fraym/driver";
import { modelSlug } from "./analytics-format";

export interface CrowdTelemetryConfig {
	readonly enabled: boolean;
	readonly endpoint: string;
	readonly epsilon: number;
}

export const DEFAULT_CROWD_TELEMETRY_CONFIG: CrowdTelemetryConfig = {
	enabled: false,
	endpoint: "",
	epsilon: 4,
};

export const MIN_REQUESTS_TO_CONTRIBUTE = 10;
// Calibration matters here — LDP noise scale is clip/epsilon. A generous "cover any
// real value" clip (e.g. 60s) makes the noise scale swamp the actual signal (verified
// live: naive 60s/tps-500 clipping at epsilon=1 produced noised values with no visible
// relationship to the true ~500ms/~60tok-s inputs). These bounds instead cover the
// realistic range (doc-36's "slow" band tops out well under 10s; sane tok/s tops out
// well under 150) so a single noised sample stays in a meaningful ballpark, and the
// median across many contributors converges the rest of the way.
const TTFT_CLIP_MS = 10_000;
const TOKENS_PER_SECOND_CLIP = 150;
const CONFIG_KEY = "fraym.analytics.crowd-telemetry";
const CLIENT_ID_KEY = "fraym.analytics.crowd-telemetry.id";
const SUBMIT_TIMEOUT_MS = 8_000;

/** Inverse-CDF sampling of the Laplace(0, scale) distribution — pure, seedable via `random` for tests. */
export function laplaceNoise(scale: number, random: () => number = Math.random): number {
	const u = random() - 0.5;
	return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export function clip(value: number, max: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(max, value));
}

export interface CrowdContribution {
	readonly modelId: string;
	readonly ttftMs: number;
	readonly tokensPerSecond: number;
	readonly requests: number;
}

/**
 * Builds this device's noised contributions from its OWN measured model
 * averages. Clips before noising (bounds sensitivity, and thus the noise
 * scale) and again after (a single Laplace draw can occasionally push a
 * clipped value past the bound) — the server never receives an unbounded
 * number even from a client that ignored the clip.
 */
export function buildCrowdContributions(
	models: readonly AnalyticsModelStats[],
	epsilon: number = DEFAULT_CROWD_TELEMETRY_CONFIG.epsilon,
	random: () => number = Math.random,
): readonly CrowdContribution[] {
	const ttftScale = TTFT_CLIP_MS / epsilon;
	const tpsScale = TOKENS_PER_SECOND_CLIP / epsilon;
	return models
		.filter(
			(model): model is AnalyticsModelStats & { averageTtftMs: number; averageTokensPerSecond: number } =>
				model.requests >= MIN_REQUESTS_TO_CONTRIBUTE &&
				typeof model.averageTtftMs === "number" &&
				typeof model.averageTokensPerSecond === "number",
		)
		.map(model => ({
			modelId: modelSlug(model),
			ttftMs: clip(clip(model.averageTtftMs, TTFT_CLIP_MS) + laplaceNoise(ttftScale, random), TTFT_CLIP_MS),
			tokensPerSecond: clip(
				clip(model.averageTokensPerSecond, TOKENS_PER_SECOND_CLIP) + laplaceNoise(tpsScale, random),
				TOKENS_PER_SECOND_CLIP,
			),
			requests: model.requests,
		}));
}

export interface CrowdLeaderboardEntry {
	readonly modelId: string;
	readonly medianTtftMs: number;
	readonly medianTokensPerSecond: number;
	readonly contributors: number;
}

function normalizeReceiverEndpoint(value: unknown): string {
	if (typeof value !== "string" || value.length === 0 || value.trim() !== value) return "";
	try {
		const url = new URL(value);
		return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? value : "";
	} catch {
		return "";
	}
}

function readConfig(): CrowdTelemetryConfig {
	if (typeof window === "undefined") return DEFAULT_CROWD_TELEMETRY_CONFIG;
	try {
		const raw = window.localStorage?.getItem(CONFIG_KEY);
		if (!raw) return DEFAULT_CROWD_TELEMETRY_CONFIG;
		const parsed = JSON.parse(raw) as Partial<CrowdTelemetryConfig>;
		return {
			enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : false,
			endpoint: normalizeReceiverEndpoint(parsed.endpoint),
			epsilon:
				typeof parsed.epsilon === "number" && parsed.epsilon > 0
					? parsed.epsilon
					: DEFAULT_CROWD_TELEMETRY_CONFIG.epsilon,
		};
	} catch {
		return DEFAULT_CROWD_TELEMETRY_CONFIG;
	}
}

function writeConfig(config: CrowdTelemetryConfig): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage?.setItem(CONFIG_KEY, JSON.stringify(config));
	} catch {
		/* localStorage unavailable (private mode, quota) — opt-in state just won't persist. */
	}
}

function loadClientId(): string {
	if (typeof window === "undefined") return "anon";
	try {
		const existing = window.localStorage?.getItem(CLIENT_ID_KEY);
		if (existing) return existing;
		const id = crypto.randomUUID();
		window.localStorage?.setItem(CLIENT_ID_KEY, id);
		return id;
	} catch {
		return crypto.randomUUID();
	}
}

async function postJson(endpoint: string, path: string, body: unknown): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
	try {
		return await fetch(`${endpoint}${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timer);
	}
}

/** Submits this device's noised contributions. Never throws into the caller — a failed upload is silent (best-effort, same posture as perf telemetry). */
export async function submitCrowdContributions(
	contributions: readonly CrowdContribution[],
	config: CrowdTelemetryConfig,
): Promise<boolean> {
	if (!config.enabled || contributions.length === 0) return false;
	const endpoint = normalizeReceiverEndpoint(config.endpoint);
	if (!endpoint) return false;
	try {
		const response = await postJson(endpoint, "/submit", {
			clientId: loadClientId(),
			contributions,
		});
		return response.ok;
	} catch {
		return false;
	}
}

/** Fetches the current crowd leaderboard — a public read, no auth, no client id sent. */
export async function fetchCrowdLeaderboard(config: CrowdTelemetryConfig): Promise<readonly CrowdLeaderboardEntry[]> {
	const endpoint = normalizeReceiverEndpoint(config.endpoint);
	if (!config.enabled || !endpoint) return [];
	try {
		const response = await fetch(`${endpoint}/leaderboard`, { method: "GET" });
		if (!response.ok) return [];
		const body = (await response.json()) as { entries?: CrowdLeaderboardEntry[] };
		return Array.isArray(body.entries) ? body.entries : [];
	} catch {
		return [];
	}
}

export function loadCrowdTelemetryConfig(): CrowdTelemetryConfig {
	return readConfig();
}

export function setCrowdTelemetryConfig(patch: Partial<CrowdTelemetryConfig>): CrowdTelemetryConfig {
	const current = readConfig();
	const next: CrowdTelemetryConfig = {
		enabled: patch.enabled === undefined ? current.enabled : patch.enabled === true,
		endpoint: patch.endpoint === undefined ? current.endpoint : normalizeReceiverEndpoint(patch.endpoint),
		epsilon: typeof patch.epsilon === "number" && patch.epsilon > 0 ? patch.epsilon : current.epsilon,
	};
	writeConfig(next);
	return next;
}

export function setCrowdTelemetryEnabled(enabled: boolean): CrowdTelemetryConfig {
	return setCrowdTelemetryConfig({ enabled });
}

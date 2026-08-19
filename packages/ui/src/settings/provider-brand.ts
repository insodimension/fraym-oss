import type { CustomProviderBrand } from "@fraym-ai/config";

export interface ProviderBrand {
	readonly tileBg: string;
	readonly tileFg: string;
	readonly logoUrl?: string;
	readonly logoFilter?: string;
	readonly fallback: string;
}

const logo = (name: string): string => new URL(`../assets/provider-logos/${name}.svg`, import.meta.url).href;
const monochromeLogoFilter = "var(--fr-provider-monochrome-logo-filter)";

const BRAND_LOGOS = {
	alibaba: logo("alibaba"),
	alibabacloud: logo("alibabacloud"),
	aws: logo("aws"),
	azure: logo("azure"),
	azureai: logo("azureai"),
	baiducloud: logo("baiducloud"),
	bedrock: logo("bedrock"),
	brave: logo("brave"),
	cerebras: logo("cerebras"),
	cloudflare: logo("cloudflare"),
	codex: logo("codex"),
	cohere: logo("cohere"),
	cursor: logo("cursor"),
	deepinfra: logo("deepinfra"),
	deepseek: logo("deepseek"),
	exa: logo("exa"),
	fireworks: logo("fireworks"),
	gemini: logo("gemini"),
	github: logo("github"),
	githubcopilot: logo("githubcopilot"),
	gitlab: logo("gitlab"),
	google: logo("google"),
	googlecloud: logo("googlecloud"),
	groq: logo("groq"),
	huggingface: logo("huggingface"),
	jina: logo("jina"),
	kagi: logo("kagi"),
	kimi: logo("kimi"),
	litellm: logo("litellm"),
	lmstudio: logo("lmstudio"),
	minimax: logo("minimax"),
	mistral: logo("mistral"),
	moonshot: logo("moonshot"),
	nanogpt: logo("nanogpt"),
	nvidia: logo("nvidia"),
	ollama: logo("ollama"),
	opencode: logo("opencode"),
	openai: logo("openai"),
	openrouter: logo("openrouter"),
	perplexity: logo("perplexity"),
	ppio: logo("ppio"),
	qwen: logo("qwen"),
	replicate: logo("replicate"),
	siliconcloud: logo("siliconcloud"),
	tavily: logo("tavily"),
	tencentcloud: logo("tencentcloud"),
	together: logo("together"),
	venice: logo("venice"),
	vercel: logo("vercel"),
	vertexai: logo("vertexai"),
	vllm: logo("vllm"),
	workersai: logo("workersai"),
	xai: logo("xai"),
	xiaomi: logo("xiaomi"),
	xinference: logo("xinference"),
	zai: logo("zai"),
} as const;

function fallbackMark(name: string): string {
	const cleaned = name.trim();
	if (!cleaned) return "?";
	const words = cleaned.split(/[\s\-_./]+/).filter(Boolean);
	const [first, second] = words;
	if (first && second) return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
	return cleaned.slice(0, 2).toUpperCase();
}

const PROVIDER_BRANDS: Readonly<Record<string, ProviderBrand>> = {
	"alibaba-coding-plan": { tileBg: "#ff6a00", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.alibaba, fallback: "AC" },
	"amazon-bedrock": { tileBg: "#6b46c1", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.bedrock, fallback: "AB" },
	azure: { tileBg: "#0078d4", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.azure, fallback: "AZ" },
	"azure-openai": { tileBg: "#0078d4", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.azureai, fallback: "AZ" },
	bedrock: { tileBg: "#6b46c1", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.bedrock, fallback: "BR" },
	brave: { tileBg: "#fb542b", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.brave, fallback: "BR" },
	cerebras: {
		tileBg: "#ff5a2a",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.cerebras,
		logoFilter: monochromeLogoFilter,
		fallback: "CE",
	},
	"cloudflare-ai-gateway": {
		tileBg: "#f38020",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.cloudflare,
		fallback: "CF",
	},
	"cloudflare-workers-ai": { tileBg: "#f38020", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.workersai, fallback: "CW" },
	cohere: { tileBg: "#39594d", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.cohere, fallback: "CO" },
	cursor: {
		tileBg: "#111113",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.cursor,
		logoFilter: monochromeLogoFilter,
		fallback: "CU",
	},
	deepinfra: { tileBg: "#4b6fff", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.deepinfra, fallback: "DI" },
	deepseek: { tileBg: "#4d6bfe", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.deepseek, fallback: "DS" },
	exa: { tileBg: "#111827", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.exa, fallback: "EX" },
	firepass: { tileBg: "#3a9d9d", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.fireworks, fallback: "FI" },
	fireworks: { tileBg: "#ff6a2a", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.fireworks, fallback: "FW" },
	gemini: { tileBg: "#5b7cfa", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.gemini, fallback: "GE" },
	"github-copilot": {
		tileBg: "#8a5cf6",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.githubcopilot,
		logoFilter: monochromeLogoFilter,
		fallback: "GH",
	},
	"gitlab-duo": { tileBg: "#fc6d26", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.gitlab, fallback: "GL" },
	google: { tileBg: "#4285f4", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.google, fallback: "GO" },
	"google-antigravity": { tileBg: "#4285f4", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.google, fallback: "GA" },
	"google-gemini-cli": { tileBg: "#5b7cfa", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.gemini, fallback: "GG" },
	"google-vertex": { tileBg: "#4285f4", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.vertexai, fallback: "GV" },
	groq: {
		tileBg: "#f55036",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.groq,
		logoFilter: monochromeLogoFilter,
		fallback: "GR",
	},
	huggingface: { tileBg: "#ffcc4d", tileFg: "#1c1200", logoUrl: BRAND_LOGOS.huggingface, fallback: "HF" },
	jina: {
		tileBg: "#2a4dd0",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.jina,
		logoFilter: monochromeLogoFilter,
		fallback: "JI",
	},
	kagi: { tileBg: "#ffb319", tileFg: "#221600", logoUrl: BRAND_LOGOS.kagi, fallback: "KA" },
	kimi: { tileBg: "#5b4ee6", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.kimi, fallback: "KI" },
	"kimi-code": { tileBg: "#5b4ee6", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.kimi, fallback: "KC" },
	litellm: { tileBg: "#6657ff", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.litellm, fallback: "LL" },
	"llama.cpp": {
		tileBg: "#202124",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.ollama,
		logoFilter: monochromeLogoFilter,
		fallback: "LC",
	},
	"lm-studio": {
		tileBg: "#111827",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.lmstudio,
		logoFilter: monochromeLogoFilter,
		fallback: "LM",
	},
	minimax: { tileBg: "#1d4ed8", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.minimax, fallback: "MM" },
	"minimax-code": { tileBg: "#1d4ed8", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.minimax, fallback: "MC" },
	"minimax-code-cn": { tileBg: "#1d4ed8", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.minimax, fallback: "MC" },
	mistral: { tileBg: "#fa520f", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.mistral, fallback: "MI" },
	moonshot: {
		tileBg: "#111827",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.moonshot,
		logoFilter: monochromeLogoFilter,
		fallback: "MO",
	},
	nanogpt: { tileBg: "#ffd74a", tileFg: "#211800", logoUrl: BRAND_LOGOS.nanogpt, fallback: "NG" },
	nvidia: { tileBg: "#76b900", tileFg: "#091300", logoUrl: BRAND_LOGOS.nvidia, fallback: "NV" },
	ollama: {
		tileBg: "#1f1f22",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.ollama,
		logoFilter: monochromeLogoFilter,
		fallback: "OL",
	},
	"ollama-cloud": {
		tileBg: "#1f1f22",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.ollama,
		logoFilter: monochromeLogoFilter,
		fallback: "OC",
	},
	opencode: {
		tileBg: "#1f2937",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.opencode,
		logoFilter: monochromeLogoFilter,
		fallback: "OC",
	},
	"opencode-go": {
		tileBg: "#1f2937",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.opencode,
		logoFilter: monochromeLogoFilter,
		fallback: "OG",
	},
	"opencode-zen": {
		tileBg: "#1f2937",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.opencode,
		logoFilter: monochromeLogoFilter,
		fallback: "OZ",
	},
	openai: {
		tileBg: "#10a37f",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.openai,
		logoFilter: monochromeLogoFilter,
		fallback: "OA",
	},
	"openai-codex": { tileBg: "#10a37f", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.codex, fallback: "CX" },
	openrouter: {
		tileBg: "#6566f1",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.openrouter,
		logoFilter: monochromeLogoFilter,
		fallback: "OR",
	},
	perplexity: { tileBg: "#1fb8cd", tileFg: "#031315", logoUrl: BRAND_LOGOS.perplexity, fallback: "PE" },
	ppio: { tileBg: "#2563eb", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.ppio, fallback: "PP" },
	qianfan: { tileBg: "#2563eb", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.baiducloud, fallback: "QF" },
	qwen: { tileBg: "#615ced", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.qwen, fallback: "QW" },
	"qwen-portal": { tileBg: "#615ced", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.qwen, fallback: "QP" },
	replicate: {
		tileBg: "#111113",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.replicate,
		logoFilter: monochromeLogoFilter,
		fallback: "RE",
	},
	siliconcloud: { tileBg: "#20b486", tileFg: "#031811", logoUrl: BRAND_LOGOS.siliconcloud, fallback: "SC" },
	tavily: { tileBg: "#ff7a45", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.tavily, fallback: "TA" },
	tencentcloud: { tileBg: "#0052d9", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.tencentcloud, fallback: "TC" },
	together: {
		tileBg: "#111827",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.together,
		logoFilter: monochromeLogoFilter,
		fallback: "TO",
	},
	"together-ai": {
		tileBg: "#111827",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.together,
		logoFilter: monochromeLogoFilter,
		fallback: "TA",
	},
	venice: { tileBg: "#fa5c4f", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.venice, fallback: "VE" },
	vercel: {
		tileBg: "#111113",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.vercel,
		logoFilter: monochromeLogoFilter,
		fallback: "VC",
	},
	"vercel-ai-gateway": {
		tileBg: "#111113",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.vercel,
		logoFilter: monochromeLogoFilter,
		fallback: "VA",
	},
	vllm: { tileBg: "#7c3aed", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.vllm, fallback: "VL" },
	xai: {
		tileBg: "#111113",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.xai,
		logoFilter: monochromeLogoFilter,
		fallback: "XA",
	},
	"xai-oauth": {
		tileBg: "#111113",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.xai,
		logoFilter: monochromeLogoFilter,
		fallback: "XO",
	},
	xiaomi: {
		tileBg: "#ff6900",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.xiaomi,
		logoFilter: monochromeLogoFilter,
		fallback: "XM",
	},
	xinference: { tileBg: "#3076ff", tileFg: "#ffffff", logoUrl: BRAND_LOGOS.xinference, fallback: "XI" },
	zai: {
		tileBg: "#111827",
		tileFg: "#ffffff",
		logoUrl: BRAND_LOGOS.zai,
		logoFilter: monochromeLogoFilter,
		fallback: "ZA",
	},
};

const PROVIDER_TILE_PALETTE: readonly Pick<ProviderBrand, "tileBg" | "tileFg">[] = [
	{ tileBg: "#d97757", tileFg: "#ffffff" },
	{ tileBg: "#5b8cff", tileFg: "#ffffff" },
	{ tileBg: "#5bb98c", tileFg: "#06140d" },
	{ tileBg: "#b78cff", tileFg: "#1a1023" },
	{ tileBg: "#e0b15b", tileFg: "#1f1707" },
	{ tileBg: "#3a9d9d", tileFg: "#ffffff" },
	{ tileBg: "#d96f9c", tileFg: "#ffffff" },
	{ tileBg: "#7a86d6", tileFg: "#ffffff" },
	{ tileBg: "#c7794a", tileFg: "#ffffff" },
	{ tileBg: "#6aa3e0", tileFg: "#06101f" },
];

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

function builtInBrand(id: string, name: string): ProviderBrand {
	const override = PROVIDER_BRANDS[id];
	if (override) return override;

	const normalized = id.replace(/[-_.]/g, "").toLowerCase();
	const logoUrl = BRAND_LOGOS[normalized as keyof typeof BRAND_LOGOS];
	const palette = PROVIDER_TILE_PALETTE[hashString(id) % PROVIDER_TILE_PALETTE.length] ?? {
		tileBg: "#5b8cff",
		tileFg: "#ffffff",
	};
	return {
		...palette,
		logoUrl,
		fallback: fallbackMark(name),
	};
}

/** Effective display label for a provider: a user-supplied custom brand name wins
 *  over the engine-provided provider name (falling back to it when blank). */
export function providerDisplayName(name: string, custom?: CustomProviderBrand): string {
	const trimmed = custom?.displayName?.trim();
	return trimmed ? trimmed : name;
}

/**
 * Resolve the tile/logo brand for a provider. `custom` is the optional
 * user-supplied branding (from `FraymUiConfig.customProviderBrands`) for a
 * runtime-configured custom provider: a non-empty `logoUrl` replaces the built-in
 * asset (and its monochrome filter), and `displayName` drives the monogram
 * fallback. `hostLogoUrl` is the host-supplied logo carried on the resource
 * snapshot (`EngineProviderRecord.logoUrl` / `EngineModelRecord.logoUrl`): it
 * outranks the built-in brand table and the monogram/hash-palette fallback, and
 * yields to an explicit user `custom.logoUrl`. Built-in providers (no `custom`,
 * no `hostLogoUrl`) are unchanged.
 */
export function providerBrand(
	id: string,
	name = id,
	custom?: CustomProviderBrand,
	hostLogoUrl?: string,
): ProviderBrand {
	const displayName = providerDisplayName(name, custom);
	const base = builtInBrand(id, displayName);
	const suppliedLogo = custom?.logoUrl?.trim() || hostLogoUrl?.trim();
	if (suppliedLogo) return { ...base, logoUrl: suppliedLogo, logoFilter: undefined };
	return base;
}

export function providerMonogram(name: string): string {
	return fallbackMark(name);
}

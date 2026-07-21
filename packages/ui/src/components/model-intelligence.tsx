"use client";
import type {
	EngineModelInsight,
	EngineModelInsightsResult,
	EngineModelRecord,
	EngineProviderRecord,
} from "@fraym-ai/driver";
import { type DragEvent, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../elements/button";
import { Input } from "../elements/input";
import { Icon } from "../icons/icon";
import type { IconName } from "../icons/paths";
import { cn } from "../lib/cn";
import { BrandTile } from "./brand-tile";
import { dossierFieldFromCatalog, ModelDossier } from "./model-dossier";
import {
	hasModelDragData,
	modelDragSeesImages,
	readModelDragData,
	setModelDragImage,
	writeModelDragData,
} from "./model-drag";

// ---------------------------------------------------------------------------
// ModelIntelligence — THE model surface (owner-approved composition,
// 2026-07-10). One popup: browse + judge + assemble.
//   LEFT  — the catalog: search, capability filters, sort; clicking a model
//           swaps the region to its DOSSIER (benchmarks, DeepSWE, sentiment) with
//           a back row that keeps the search.
//   RIGHT — the team panel: a dropdown that scales to MANY teams, and the
//           role spine. One role is ARMED — list rows grow a quick-add for
//           it — and every well takes a drag (shared model-drag payload,
//           branded chip, live vision gating via the type list).
// Team semantics match the retired ModelTeamBuilder exactly: the built-in
// Default team IS the global modelRoles.* map (single pattern per role,
// instant writes, `:thinking` suffix preserved on replace); named teams
// stack fallbacks behind an explicit Save.
// ---------------------------------------------------------------------------

/** A named team's role → model map; a role holds ONE pattern or an ordered
 *  fallback STACK (both accepted by the engine's resolveConfiguredModelPatterns). */
export type ProfileRoleMap = Record<string, string | readonly string[]>;
export type ModelProfiles = Record<string, ProfileRoleMap>;

/** Per-model enrichment from the engine's insight feed; keyed `provider/modelId`. */
export type ModelInsight = EngineModelInsight;

export interface ModelIntelligenceProps {
	readonly profiles: ModelProfiles;
	readonly models: readonly EngineModelRecord[];
	/** The engine's provider roster — chip ORDER mirrors the composer's model
	 *  menu (engine provider order), and chips list CONNECTED providers only. */
	readonly providers?: readonly EngineProviderRecord[];
	/** Built-in Default team: the current modelRoles.* values (single pattern per
	 *  role, may carry a `:thinking` suffix). Omit to hide the built-in team. */
	readonly defaultRoles?: Readonly<Record<string, string | undefined>>;
	/** Write one modelRoles.<role> value; `undefined` resets it to the engine default. */
	readonly onDefaultRoleChange?: (role: string, pattern: string | undefined) => void;
	/** Persist a named team (role → ordered model stack) to global config. */
	readonly onSave: (name: string, roles: Record<string, readonly string[]>) => void;
	readonly onDelete?: (name: string) => void;
	/** Which team to open on (e.g. the loop's current team). */
	readonly initialSelected?: string;
	readonly insights?: Readonly<Record<string, ModelInsight>>;
	/** Feed provenance (fetch time, sources, staleness) for the dossier footer. */
	readonly insightsMeta?: Pick<EngineModelInsightsResult, "fetchedAt" | "sources" | "stale">;
	/** The engine's configured default model — the EFFECTIVE model shown in the
	 *  Default team's `default` well when `modelRoles.default` is unset. */
	readonly engineDefault?: { readonly provider: string; readonly modelId: string };
	readonly className?: string;
}

interface RoleMeta {
	readonly id: string;
	readonly label: string;
	readonly hint: string;
	readonly icon: IconName;
	/** Hard gate: this role only works with image-capable models. */
	readonly needsVision?: boolean;
}

/** Built-in OMP roles (model-roles.ts). Agents auto-pick these via `pi/<role>`
 *  aliases; a team remaps which model(s) each role resolves to. */
const BUILTIN_ROLES: readonly RoleMeta[] = [
	{ id: "default", label: "Default", hint: "drives the main turn", icon: "bolt" },
	{ id: "smol", label: "Fast", hint: "fan-out, titles, summaries", icon: "spark" },
	{ id: "slow", label: "Thinking", hint: "hard problems, no hurry", icon: "clock" },
	{ id: "vision", label: "Vision", hint: "screenshots & images", icon: "eye", needsVision: true },
	{ id: "plan", label: "Architect", hint: "system design & plans", icon: "workflow" },
	{ id: "designer", label: "Designer", hint: "UI taste + vision", icon: "aether", needsVision: true },
	{ id: "commit", label: "Commit", hint: "commit messages", icon: "git-branch" },
	{ id: "tiny", label: "Tiny", hint: "micro-calls & routing", icon: "dots" },
	{ id: "task", label: "Subtask", hint: "parallel subagents", icon: "bot" },
	{ id: "advisor", label: "Advisor", hint: "second opinions", icon: "shield" },
];

const ROLE_META: Record<string, RoleMeta> = Object.fromEntries(BUILTIN_ROLES.map(role => [role.id, role]));

function roleMeta(id: string): RoleMeta {
	return ROLE_META[id] ?? { id, label: id, hint: "custom role", icon: "gear" };
}

const THINKING_SUFFIX_RE = /:(off|minimal|low|medium|high|xhigh)$/;

/** Per-slot thinking levels (engine ThinkingLevel; null = inherit the session's). */
const THINK_LEVELS: readonly { readonly id: string | null; readonly label: string }[] = [
	{ id: null, label: "inherit" },
	{ id: "off", label: "off" },
	{ id: "minimal", label: "minimal" },
	{ id: "low", label: "low" },
	{ id: "medium", label: "medium" },
	{ id: "high", label: "high" },
	{ id: "xhigh", label: "xhigh" },
];

/** `provider/modelId` (suffix stripped) → parts. */
function splitPattern(pattern: string): { provider: string; modelId: string; suffix: string } {
	const suffixMatch = pattern.match(THINKING_SUFFIX_RE);
	const suffix = suffixMatch?.[0] ?? "";
	const bare = suffix ? pattern.slice(0, -suffix.length) : pattern;
	const slash = bare.indexOf("/");
	return slash > 0
		? { provider: bare.slice(0, slash), modelId: bare.slice(slash + 1), suffix }
		: { provider: "", modelId: bare, suffix };
}

function blended(record: EngineModelRecord): number | null {
	if (!record.cost) return null;
	return (record.cost.input * 3 + record.cost.output) / 4;
}

function fmtPerM(value: number): string {
	return value < 1 ? `$${value.toFixed(2)}` : `$${Number(value.toFixed(value < 10 ? 1 : 0))}`;
}

function ctxLabel(record: EngineModelRecord): string | null {
	const ctx = record.contextWindow;
	if (!ctx) return null;
	return ctx >= 1_000_000 ? `${Math.round(ctx / 100_000) / 10}M` : `${Math.round(ctx / 1000)}K`;
}

/** One underlying model across gateway aliases AND dated snapshots: label,
 *  lowercased, date stamps stripped (`gpt-5.5-2026-04-23` groups with
 *  `GPT-5.5`), non-alphanumerics dropped. */
export function modelIdentityKey(record: Pick<EngineModelRecord, "label">): string {
	return record.label
		.toLowerCase()
		.replace(/\b20\d{2}[-.]?\d{2}[-.]?\d{2}\b/g, "")
		.replace(/[^a-z0-9]/g, "");
}

/** Ghost listing: pricing is MISSING (unpriced alias/dated snapshot), not a
 *  genuine free tier (`:free` slugs keep their honest $0). */
function isGhost(record: EngineModelRecord): boolean {
	if (!record.cost) return true;
	if (record.cost.input === 0 && record.cost.output === 0) return !record.modelId.includes(":free");
	return false;
}

/** The row that stands for an identity group: available beats not, priced
 *  beats ghost, then cheapest. */
function pickRepresentative(group: readonly EngineModelRecord[]): EngineModelRecord {
	return [...group].sort(
		(a, b) =>
			Number(b.available) - Number(a.available) ||
			Number(isGhost(a)) - Number(isGhost(b)) ||
			(blended(a) ?? Number.POSITIVE_INFINITY) - (blended(b) ?? Number.POSITIVE_INFINITY),
	)[0] as EngineModelRecord;
}

// ═══ role-decision heuristics (deterministic, insight-fed; exported as the
// test seam) ═══════════════════════════════════════════════════════════════

/** How a role judges candidates — the criterion behind its shortlist. */
type RoleCriterion = "value" | "cheap" | "reasoning" | "vision-first";

const ROLE_CRITERIA: Record<string, RoleCriterion> = {
	default: "value",
	smol: "cheap",
	tiny: "cheap",
	commit: "cheap",
	task: "cheap",
	slow: "reasoning",
	plan: "reasoning",
	advisor: "reasoning",
	vision: "vision-first",
	designer: "vision-first",
};

const CRITERION_LABEL: Record<RoleCriterion, string> = {
	value: "quality per dollar",
	cheap: "cheapest competent",
	reasoning: "strongest reasoning",
	"vision-first": "best with images",
};

export type AutoDraftTheme = "cheap" | "balanced" | "frontier";

export interface RoleCandidate {
	readonly record: EngineModelRecord;
	readonly pattern: string;
	/** The role-criterion headline stat (e.g. "74.9 coding idx · $6.9/M"). */
	readonly stat: string;
	/** Deltas vs the role's CURRENT occupant (empty when the role is empty). */
	readonly deltas: readonly { readonly text: string; readonly good?: boolean }[];
}

function candidateDeltas(
	candidate: EngineModelRecord,
	candidateInsight: EngineModelInsight | undefined,
	current: EngineModelRecord | undefined,
	currentInsight: EngineModelInsight | undefined,
): readonly { readonly text: string; readonly good?: boolean }[] {
	if (!current) return [{ text: "fills empty role", good: true }];
	const out: { text: string; good?: boolean }[] = [];
	const codingA = candidateInsight?.indices?.coding;
	const codingB = currentInsight?.indices?.coding;
	if (codingA !== undefined && codingB !== undefined && Math.abs(codingA - codingB) >= 0.5) {
		const diff = codingA - codingB;
		out.push({ text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} coding idx`, good: diff > 0 });
	}
	const priceA = blended(candidate);
	const priceB = blended(current);
	if (priceA !== null && priceB !== null && priceA > 0 && priceB > 0) {
		const ratio = priceA / priceB;
		if (ratio <= 0.67) out.push({ text: `${(1 / ratio).toFixed(ratio < 0.1 ? 0 : 1)}× cheaper`, good: true });
		else if (ratio >= 1.5) out.push({ text: `${ratio.toFixed(ratio > 10 ? 0 : 1)}× pricier` });
	}
	const sweA = candidateInsight?.deepSwe?.passAt1;
	const sweB = currentInsight?.deepSwe?.passAt1;
	if (sweA !== undefined && sweB !== undefined && Math.abs(sweA - sweB) >= 1) {
		const diff = sweA - sweB;
		out.push({ text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} DeepSWE`, good: diff > 0 });
	}
	if (candidate.supportsImages && !current.supportsImages) out.push({ text: "gains vision", good: true });
	if (!candidate.supportsImages && current.supportsImages) out.push({ text: "loses vision" });
	return out.slice(0, 3);
}

/** Score a model for a criterion; null = ineligible. Higher wins. */
function criterionScore(
	criterion: RoleCriterion,
	record: EngineModelRecord,
	insight: EngineModelInsight | undefined,
): number | null {
	if (!record.available || record.supportsTools === false) return null;
	const coding = insight?.indices?.coding;
	const price = blended(record);
	switch (criterion) {
		case "value": {
			// quality per dollar: coding index discounted by log-price.
			if (coding === undefined) return null;
			return coding - 6 * Math.log10(1 + (price ?? 8));
		}
		case "cheap": {
			// cheapest competent: must clear a competence floor, then price rules.
			if (price === null) return null;
			if (coding !== undefined && coding < 35) return null;
			return -price;
		}
		case "reasoning": {
			if (!record.reasoning) return null;
			const intelligence = insight?.indices?.intelligence;
			if (intelligence === undefined) return null;
			return intelligence;
		}
		case "vision-first": {
			if (!record.supportsImages) return null;
			return coding ?? 0;
		}
	}
}

/** The role's shortlist: top candidates by ITS criterion, deltas vs current. */
export function roleCandidates(options: {
	readonly roleId: string;
	readonly models: readonly EngineModelRecord[];
	readonly insights: Readonly<Record<string, EngineModelInsight>>;
	readonly currentPattern?: string;
	readonly exclude?: readonly string[];
	/** Keep the current occupant IN the ranking (auto-draft: lets "best pick ==
	 *  current" read as a no-op instead of surfacing the second best). */
	readonly keepCurrent?: boolean;
	readonly limit?: number;
}): { readonly criterion: string; readonly candidates: readonly RoleCandidate[] } {
	const criterion = ROLE_CRITERIA[options.roleId] ?? "value";
	const excluded = new Set(options.exclude ?? []);
	const currentBare = options.currentPattern ? options.currentPattern.replace(THINKING_SUFFIX_RE, "") : undefined;
	const current = currentBare
		? options.models.find(record => `${record.providerId}/${record.modelId}` === currentBare)
		: undefined;
	const currentInsight = currentBare ? options.insights[currentBare] : undefined;
	const seen = new Set<string>();
	const scored: { record: EngineModelRecord; score: number }[] = [];
	for (const record of options.models) {
		const pattern = `${record.providerId}/${record.modelId}`;
		if (excluded.has(pattern) || (!options.keepCurrent && pattern === currentBare)) continue;
		// ghosts (unpriced aliases/dated snapshots) never rank; one candidate per
		// underlying model (aliases and dated variants share an identity)
		if (isGhost(record)) continue;
		const labelKey = modelIdentityKey(record);
		if (seen.has(labelKey)) continue;
		const score = criterionScore(criterion, record, options.insights[pattern]);
		if (score === null) continue;
		seen.add(labelKey);
		scored.push({ record, score });
	}
	scored.sort((a, b) => b.score - a.score);
	const candidates = scored.slice(0, options.limit ?? 3).map(({ record }) => {
		const pattern = `${record.providerId}/${record.modelId}`;
		const insight = options.insights[pattern];
		const price = blended(record);
		const statBits = [
			insight?.indices?.coding !== undefined ? `${insight.indices.coding.toFixed(1)} coding idx` : undefined,
			price !== null ? `${fmtPerM(price)}/M` : undefined,
			insight?.deepSwe ? `SWE ${insight.deepSwe.passAt1}%` : undefined,
		].filter(Boolean);
		return {
			record,
			pattern,
			stat: statBits.join(" · "),
			deltas: candidateDeltas(record, insight, current, currentInsight),
		};
	});
	return { criterion: CRITERION_LABEL[criterion], candidates };
}

/** One auto-draft suggestion. */
export interface AutoDraftPick {
	readonly roleId: string;
	readonly pattern: string;
	readonly label: string;
	readonly why: string;
}

/** Draft a whole team from the benchmarks for a theme. Deterministic: per role,
 *  take the criterion pool, then let the theme arbitrate quality vs price.
 *  Roles whose best pick equals the current occupant are omitted (no-op). */
export function autoDraftTeam(options: {
	readonly theme: AutoDraftTheme;
	readonly roleIds: readonly string[];
	readonly models: readonly EngineModelRecord[];
	readonly insights: Readonly<Record<string, EngineModelInsight>>;
	readonly currentByRole: Readonly<Record<string, string | undefined>>;
}): readonly AutoDraftPick[] {
	const picks: AutoDraftPick[] = [];
	for (const roleId of options.roleIds) {
		const currentPattern = options.currentByRole[roleId];
		const { candidates } = roleCandidates({
			roleId,
			models: options.models,
			insights: options.insights,
			currentPattern,
			keepCurrent: true,
			limit: 8,
		});
		if (!candidates.length) continue;
		let choice = candidates[0];
		if (options.theme === "cheap") {
			choice = [...candidates].sort(
				(a, b) => (blended(a.record) ?? Number.POSITIVE_INFINITY) - (blended(b.record) ?? Number.POSITIVE_INFINITY),
			)[0];
		} else if (options.theme === "balanced") {
			const prices = candidates.map(candidate => blended(candidate.record)).filter((p): p is number => p !== null);
			const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)] ?? Number.POSITIVE_INFINITY;
			choice =
				candidates.find(candidate => {
					const price = blended(candidate.record);
					return price !== null && price <= median * 2;
				}) ?? candidates[0];
		}
		if (!choice) continue;
		const currentBare = currentPattern?.replace(THINKING_SUFFIX_RE, "");
		if (choice.pattern === currentBare) continue;
		picks.push({
			roleId,
			pattern: choice.pattern,
			label: choice.record.label,
			why: choice.deltas.map(delta => delta.text).join(" · ") || choice.stat,
		});
	}
	return picks;
}

interface FilterDef {
	readonly id: string;
	readonly label: string;
	readonly test: (record: EngineModelRecord) => boolean;
	/** Hide the chip when no model in the catalog can ever satisfy it. */
	readonly applicable?: (models: readonly EngineModelRecord[]) => boolean;
}

const CATALOG_FILTERS: readonly FilterDef[] = [
	{ id: "tools", label: "tool calling", test: record => record.supportsTools !== false },
	{ id: "vision", label: "sees images", test: record => record.supportsImages },
	{ id: "reasoning", label: "reasoning", test: record => record.reasoning },
	{
		id: "cheap",
		label: "under $1/M",
		test: record => {
			const price = blended(record);
			return price !== null && price < 1;
		},
		applicable: models => models.some(record => record.cost),
	},
	{
		id: "ctx",
		label: "1M context",
		test: record => (record.contextWindow ?? 0) >= 1_000_000,
		applicable: models => models.some(record => (record.contextWindow ?? 0) >= 1_000_000),
	},
	{
		id: "unavailable",
		label: "include unavailable",
		test: () => true,
		applicable: models => models.some(record => !record.available),
	},
];

type SortId = "rank" | "price" | "context" | "name";
const LIST_PAGE = 80;

function patternOf(record: EngineModelRecord): string {
	return `${record.providerId}/${record.modelId}`;
}

// ═══ the component ════════════════════════════════════════════════════════════

export function ModelIntelligence({ className, initialSelected, ...props }: ModelIntelligenceProps) {
	// "" selects the built-in Default team (when defaultRoles is provided).
	const [selected, setSelected] = useState<string>(() => {
		if (initialSelected && initialSelected in props.profiles) return initialSelected;
		if (props.defaultRoles !== undefined) return "";
		return Object.keys(props.profiles).sort()[0] ?? "";
	});
	// Container-width responsive (the loops-page pattern): with the right dock open
	// the CONTAINER narrows while the viewport doesn't, so media queries can't help.
	// Below 880px the team panel stacks under the catalog instead of crushing it.
	const rootRef = useRef<HTMLDivElement | null>(null);
	const [narrow, setNarrow] = useState(false);
	useEffect(() => {
		const el = rootRef.current;
		if (!el || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(entries => setNarrow((entries[0]?.contentRect.width ?? el.clientWidth) < 880));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<div
			ref={rootRef}
			data-slot="model-intelligence"
			className={cn("flex min-h-0 flex-1 overflow-hidden", narrow && "flex-col", className)}
		>
			{/* key= resets team draft state when switching teams */}
			<ModelIntelligenceInner key={selected} {...props} selected={selected} onSelect={setSelected} narrow={narrow} />
		</div>
	);
}

/** Full-width catalog plus role wells for one selected team. The page owns
 * routing; this compatibility composition retains the established drag, slot,
 * thinking-suffix, draft, and persistence behavior. */
export interface ModelTeamWorkbenchProps extends Omit<ModelIntelligenceProps, "initialSelected" | "className"> {
	readonly team?: string;
	readonly className?: string;
}

export function ModelTeamWorkbench({ team = "", className, ...props }: ModelTeamWorkbenchProps) {
	return (
		<ModelIntelligence
			{...props}
			initialSelected={team}
			className={cn("min-h-[620px] rounded-xl border border-fr-border-soft bg-fr-surface", className)}
		/>
	);
}

function ModelIntelligenceInner({
	profiles,
	models,
	providers: engineProviders,
	defaultRoles,
	onDefaultRoleChange,
	onSave,
	onDelete,
	selected,
	onSelect,
	insights,
	insightsMeta,
	engineDefault,
	narrow = false,
}: Omit<ModelIntelligenceProps, "className" | "initialSelected"> & {
	readonly selected: string;
	readonly onSelect: (name: string) => void;
	readonly narrow?: boolean;
}) {
	const isDefault = selected === "" && defaultRoles !== undefined;
	const hasInsights = insights !== undefined && Object.keys(insights).length > 0;

	// --- catalog state ----------------------------------------------------------
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState<readonly string[]>([]);
	/** Provider chips (multi-select; empty = all). */
	const [providerFilter, setProviderFilter] = useState<ReadonlySet<string>>(new Set());
	const [sort, setSort] = useState<SortId>(hasInsights ? "rank" : "price");
	const [visibleCount, setVisibleCount] = useState(LIST_PAGE);
	const [inspecting, setInspecting] = useState<string | null>(null);

	// --- team state -------------------------------------------------------------
	const stored = profiles[selected];
	const [draftRoles, setDraftRoles] = useState<Record<string, readonly string[]>>(() => {
		const out: Record<string, readonly string[]> = {};
		for (const [role, value] of Object.entries(stored ?? {})) {
			out[role] = Array.isArray(value) ? [...value] : typeof value === "string" && value ? [value] : [];
		}
		if (Object.keys(out).length === 0) out.default = [];
		return out;
	});
	const [dirty, setDirty] = useState(false);
	const [armedRole, setArmedRole] = useState("default");
	const [dragging, setDragging] = useState<{
		readonly vision: boolean;
		readonly label: string;
		readonly providerId: string;
		readonly providerName: string;
		/** Set when the drag lifted an existing STACK ROW (kanban move), not a catalog copy. */
		readonly from?: { readonly roleId: string; readonly index: number };
	} | null>(null);
	/** Where the in-flight model will land: the card it drops BEFORE (null =
	 *  tail). Identity-keyed like the task board — stable under reflow, so the
	 *  ghost never fights the geometry it just changed. */
	const [dropHint, setDropHint] = useState<{ readonly roleId: string; readonly before: string | null } | null>(null);
	const [sentimentRole, setSentimentRole] = useState<string | null>(null);
	/** Which slot's thinking-level menu is open. */
	const [thinkMenu, setThinkMenu] = useState<{ readonly roleId: string; readonly index: number } | null>(null);
	// ✦ Auto-draft review (the Ledger): theme picks awaiting per-role acceptance.
	const [draft, setDraft] = useState<{
		readonly theme: AutoDraftTheme;
		readonly picks: readonly AutoDraftPick[];
		readonly accepted: ReadonlySet<string>;
	} | null>(null);
	const [draftMenuOpen, setDraftMenuOpen] = useState(false);

	const byPattern = useMemo(() => {
		const map = new Map<string, EngineModelRecord>();
		for (const record of models) map.set(patternOf(record), map.get(patternOf(record)) ?? record);
		return map;
	}, [models]);
	const recordFor = (pattern: string): EngineModelRecord | undefined => {
		const { provider, modelId } = splitPattern(pattern);
		return byPattern.get(`${provider}/${modelId}`);
	};

	const activeFilters = useMemo(() => CATALOG_FILTERS.filter(filter => filter.applicable?.(models) ?? true), [models]);
	/** Provider chips: OUR providers — connected ones only (models with
	 *  `available`), ordered like the composer's model menu (engine provider
	 *  order, then name). Gateways you haven't connected never crowd the bar. */
	const providers = useMemo(() => {
		const orderIndex = new Map((engineProviders ?? []).map((provider, index) => [provider.id, index]));
		const byId = new Map<string, { readonly id: string; readonly name: string; count: number }>();
		for (const record of models) {
			if (!record.available) continue;
			const entry = byId.get(record.providerId) ?? { id: record.providerId, name: record.providerName, count: 0 };
			entry.count += 1;
			byId.set(record.providerId, entry);
		}
		return [...byId.values()].sort(
			(a, b) =>
				(orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
				a.name.localeCompare(b.name),
		);
	}, [models, engineProviders]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally resets the page cap on any list-shaping input
	useEffect(() => setVisibleCount(LIST_PAGE), [filters, query, sort, providerFilter]);
	/** The catalog, grouped: one CARD per underlying model (gateway aliases and
	 *  dated snapshots collapse; the group's representative is available >
	 *  priced > cheapest). */
	const listed = useMemo(() => {
		const active = activeFilters.filter(filter => filters.includes(filter.id));
		const needle = query.trim().toLowerCase();
		const rankOf = (record: EngineModelRecord) => insights?.[patternOf(record)]?.rank ?? Number.POSITIVE_INFINITY;
		const compare: Record<SortId, (a: EngineModelRecord, b: EngineModelRecord) => number> = {
			price: (a, b) => (blended(a) ?? Number.POSITIVE_INFINITY) - (blended(b) ?? Number.POSITIVE_INFINITY),
			context: (a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0),
			name: (a, b) => a.label.localeCompare(b.label),
			rank: (a, b) => rankOf(a) - rankOf(b),
		};
		const matched = models
			.filter(record => record.available || filters.includes("unavailable"))
			.filter(record => providerFilter.size === 0 || providerFilter.has(record.providerId))
			.filter(record => active.every(filter => filter.test(record)))
			.filter(
				record =>
					!needle || `${record.label} ${record.providerName} ${record.modelId}`.toLowerCase().includes(needle),
			);
		const groups = new Map<string, EngineModelRecord[]>();
		for (const record of matched) {
			const key = modelIdentityKey(record);
			const group = groups.get(key);
			if (group) group.push(record);
			else groups.set(key, [record]);
		}
		return [...groups.values()]
			.map(group => {
				const record = pickRepresentative(group);
				return { record, aliases: group.filter(entry => entry !== record) };
			})
			.sort((a, b) => Number(b.record.available) - Number(a.record.available) || compare[sort](a.record, b.record));
	}, [models, activeFilters, filters, query, sort, insights, providerFilter]);
	const dossierField = useMemo(() => (insights ? dossierFieldFromCatalog(models, insights) : []), [models, insights]);

	// --- team mutations ------------------------------------------------------------
	// The Default team is a comma-joined pattern LIST per role — the engine's
	// resolveConfiguredModelPatterns splits `modelRoles.<role>` into a fallback
	// stack, so Default supports kanban stacks exactly like named teams.
	// Optimistic overlay: Default-team writes round-trip through the engine
	// config; until the snapshot echoes back, the pending value renders — drags
	// land instantly instead of appearing dead for a beat.
	const [pendingDefaultRoles, setPendingDefaultRoles] = useState<Record<string, string | undefined>>({});
	useEffect(() => {
		setPendingDefaultRoles(prev => {
			let changed = false;
			const next = { ...prev };
			for (const [role, value] of Object.entries(prev)) {
				if ((defaultRoles?.[role] ?? undefined) === value) {
					delete next[role];
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [defaultRoles]);
	const effectiveDefaultRoles = useMemo(
		() => ({ ...(defaultRoles ?? {}), ...pendingDefaultRoles }),
		[defaultRoles, pendingDefaultRoles],
	);

	const roles: Record<string, readonly string[]> = useMemo(
		() =>
			isDefault
				? Object.fromEntries(
						Object.entries(effectiveDefaultRoles).map(([role, value]) => [
							role,
							value
								? value
										.split(",")
										.map(entry => entry.trim())
										.filter(Boolean)
								: [],
						]),
					)
				: draftRoles,
		[isDefault, effectiveDefaultRoles, draftRoles],
	);

	/** ONE write path for both team kinds: Default joins the stack back into
	 *  `modelRoles.<role>` (empty → reset to engine default); named teams edit
	 *  the draft and arm Save. */
	const setStack = (roleId: string, stack: readonly string[]) => {
		if (isDefault) {
			const joined = stack.length ? stack.join(",") : undefined;
			setPendingDefaultRoles(prev => ({ ...prev, [roleId]: joined }));
			onDefaultRoleChange?.(roleId, joined);
			return;
		}
		setDraftRoles(prev => ({ ...prev, [roleId]: stack }));
		setDirty(true);
	};
	const fireSentiment = (roleId: string) => {
		setSentimentRole(roleId);
		setTimeout(() => setSentimentRole(current => (current === roleId ? null : current)), 450);
	};
	/** Quick-add / swap-in: the model becomes the PRIMARY (old primary demotes
	 *  to fb1, its thinking suffix carried onto the newcomer, bare dedupe). */
	const place = (roleId: string, pattern: string) => {
		const meta = roleMeta(roleId);
		const record = recordFor(pattern);
		if (!record || (meta.needsVision && !record.supportsImages)) return;
		const stack = roles[roleId] ?? [];
		const bare = pattern.replace(THINKING_SUFFIX_RE, "");
		const previous = stack[0];
		const suffix = previous ? splitPattern(previous).suffix : "";
		const rest = stack.filter(entry => entry.replace(THINKING_SUFFIX_RE, "") !== bare);
		setStack(roleId, [`${bare}${suffix}`, ...rest]);
		fireSentiment(roleId);
	};
	/** Drop handler: insert at a SPECIFIC slot, honoring kanban moves (source
	 *  row removed — cross-well too) and bare-pattern dedupe. */
	const placeAt = (
		roleId: string,
		pattern: string,
		index: number,
		from?: { readonly roleId: string; readonly index: number },
	) => {
		const meta = roleMeta(roleId);
		const bare = pattern.replace(THINKING_SUFFIX_RE, "");
		const record = recordFor(bare);
		if (!record || (meta.needsVision && !record.supportsImages)) return;
		let slot = index;
		if (from && from.roleId !== roleId) {
			// cross-well move: lift the row out of its source stack
			setStack(
				from.roleId,
				(roles[from.roleId] ?? []).filter((_, i) => i !== from.index),
			);
		}
		const stack = [...(roles[roleId] ?? [])];
		const sameRoleFrom =
			from && from.roleId === roleId
				? from.index
				: stack.findIndex(entry => entry.replace(THINKING_SUFFIX_RE, "") === bare);
		if (sameRoleFrom >= 0) {
			stack.splice(sameRoleFrom, 1);
			if (sameRoleFrom < slot) slot -= 1;
		}
		stack.splice(Math.max(0, Math.min(slot, stack.length)), 0, pattern);
		setStack(roleId, stack);
		fireSentiment(roleId);
	};
	const removeAt = (roleId: string, index: number) => {
		setStack(
			roleId,
			(roles[roleId] ?? []).filter((_, i) => i !== index),
		);
	};
	/** Set one slot's thinking suffix (null = inherit → bare pattern). */
	const setSuffix = (roleId: string, index: number, level: string | null) => {
		const stack = [...(roles[roleId] ?? [])];
		const entry = stack[index];
		if (entry === undefined) return;
		const bare = entry.replace(THINKING_SUFFIX_RE, "");
		stack[index] = level ? `${bare}:${level}` : bare;
		setStack(roleId, stack);
	};
	const move = (roleId: string, index: number, direction: -1 | 1) => {
		const stack = [...(roles[roleId] ?? [])];
		const target = index + direction;
		const a = stack[index];
		const b = stack[target];
		if (a === undefined || b === undefined) return;
		stack[index] = b;
		stack[target] = a;
		setStack(roleId, stack);
	};
	const addRole = (roleId: string) => {
		if (!isDefault && !(roleId in draftRoles)) setStack(roleId, []);
	};
	const removeRole = (roleId: string) => {
		if (isDefault) return;
		setDraftRoles(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== roleId)));
		setDirty(true);
	};
	const save = () => {
		const clean: Record<string, readonly string[]> = {};
		for (const [roleId, stack] of Object.entries(draftRoles)) {
			const filtered = stack.filter(Boolean);
			if (filtered.length > 0) clean[roleId] = filtered;
		}
		onSave(selected, clean);
		setDirty(false);
	};

	const activeRoleIds = isDefault
		? [...new Set([...BUILTIN_ROLES.map(role => role.id), ...Object.keys(defaultRoles ?? {})])]
		: Object.keys(draftRoles);
	const unusedRoles = isDefault ? [] : BUILTIN_ROLES.filter(role => !(role.id in draftRoles));
	const armedMeta = roleMeta(armedRole in roles || isDefault ? armedRole : (activeRoleIds[0] ?? "default"));
	const inspectingRecord = inspecting ? recordFor(inspecting) : undefined;

	const currentByRole = useMemo(() => {
		const out: Record<string, string | undefined> = {};
		for (const roleId of activeRoleIds) out[roleId] = (roles[roleId] ?? [])[0];
		if (isDefault && engineDefault && !out.default)
			out.default = `${engineDefault.provider}/${engineDefault.modelId}`;
		return out;
	}, [activeRoleIds, roles, isDefault, engineDefault]);

	const startDraft = (theme: AutoDraftTheme) => {
		if (!insights) return;
		const picks = autoDraftTeam({ theme, roleIds: activeRoleIds, models, insights, currentByRole });
		setDraft({ theme, picks, accepted: new Set(picks.map(pick => pick.roleId)) });
		setDraftMenuOpen(false);
	};
	const applyDraft = () => {
		if (!draft) return;
		for (const pick of draft.picks) {
			if (!draft.accepted.has(pick.roleId)) continue;
			if (isDefault) {
				place(pick.roleId, pick.pattern);
			} else {
				// the draft's pick becomes the PRIMARY; the old primary stays as fallback
				const stack = draftRoles[pick.roleId] ?? [];
				setStack(pick.roleId, [
					pick.pattern,
					...stack.filter(pattern => pattern.replace(THINKING_SUFFIX_RE, "") !== pick.pattern),
				]);
				fireSentiment(pick.roleId);
			}
		}
		setDraft(null);
	};

	const startModelDrag = (record: EngineModelRecord) => (event: DragEvent<HTMLElement>) => {
		const data = {
			pattern: patternOf(record),
			label: record.label,
			providerId: record.providerId,
			providerName: record.providerName,
			vision: record.supportsImages,
		};
		writeModelDragData(event.dataTransfer, data);
		setModelDragImage(event.dataTransfer, data);
		event.dataTransfer.effectAllowed = "copy";
		setDragging({
			vision: record.supportsImages,
			label: record.label,
			providerId: record.providerId,
			providerName: record.providerName,
		});
	};
	const endModelDrag = () => {
		setDragging(null);
		setDropHint(null);
	};

	return (
		<>
			{/* ═══ LEFT — the catalog: listing ⇄ dossier ═══ */}
			<div className="flex min-w-0 flex-1 flex-col">
				{inspectingRecord ? (
					<>
						<div className="flex items-center gap-2 border-b border-fr-border-soft px-4 py-2.5">
							<button
								type="button"
								onClick={() => setInspecting(null)}
								className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
							>
								← all models
							</button>
							<span className="text-fr-2xs text-fr-text-3">
								{listed.length} listed{query && " · search kept"}
							</span>
							<Button
								size="sm"
								className="ml-auto"
								onClick={() => place(armedMeta.id, patternOf(inspectingRecord))}
								disabled={armedMeta.needsVision === true && !inspectingRecord.supportsImages}
							>
								+ add to {armedMeta.label}
							</Button>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
							<ModelDossier
								record={inspectingRecord}
								insight={insights?.[patternOf(inspectingRecord)]}
								field={dossierField}
								meta={insightsMeta}
							/>
						</div>
					</>
				) : (
					<>
						<div className="flex flex-col gap-1.5 border-b border-fr-border-soft px-4 py-2.5">
							{/* providers first — the primary slice of the catalog */}
							<div className="flex flex-wrap items-center gap-1.5">
								<span className="relative">
									<Icon
										name="search"
										size={12}
										className="absolute left-2 top-1/2 -translate-y-1/2 text-fr-text-3"
									/>
									<Input
										value={query}
										placeholder={`search ${models.length} models`}
										aria-label="search models"
										onChange={event => setQuery(event.target.value)}
										className="h-7 w-[190px] pl-6 text-fr-xs"
									/>
								</span>
								{providers.slice(0, 12).map(provider => {
									const on = providerFilter.has(provider.id);
									return (
										<button
											type="button"
											key={provider.id}
											onClick={() =>
												setProviderFilter(prev => {
													const next = new Set(prev);
													if (on) next.delete(provider.id);
													else next.add(provider.id);
													return next;
												})
											}
											aria-pressed={on}
											className={cn(
												"flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-fr-xs transition-all duration-150",
												on
													? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
													: "border-fr-border-soft text-fr-text-3 hover:border-fr-border hover:text-fr-text-1",
											)}
										>
											<BrandTile providerId={provider.id} providerName={provider.name} size={16} />
											{provider.name}
											<span className="font-secondary text-fr-2xs tabular-nums opacity-60">
												{provider.count}
											</span>
										</button>
									);
								})}
							</div>
							<div className="flex flex-wrap items-center gap-1.5">
								{activeFilters.map(filter => {
									const on = filters.includes(filter.id);
									return (
										<button
											type="button"
											key={filter.id}
											onClick={() =>
												setFilters(prev =>
													on ? prev.filter(id => id !== filter.id) : [...prev, filter.id],
												)
											}
											aria-pressed={on}
											className={cn(
												"rounded-full border px-2 py-1 text-fr-xs transition-all duration-150",
												on
													? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
													: "border-fr-border-soft text-fr-text-3 hover:border-fr-border hover:text-fr-text-1",
											)}
										>
											{filter.label}
										</button>
									);
								})}
								<span className="ml-auto flex items-center gap-0.5 rounded-[9px] border border-fr-border-soft bg-fr-bg p-0.5">
									{(
										[
											...(hasInsights ? [{ id: "rank" as const, label: "best coder" }] : []),
											{ id: "price" as const, label: "cheapest" },
											{ id: "context" as const, label: "context" },
											{ id: "name" as const, label: "a-z" },
										] satisfies readonly { id: SortId; label: string }[]
									).map(entry => (
										<button
											type="button"
											key={entry.id}
											onClick={() => setSort(entry.id)}
											aria-pressed={sort === entry.id}
											className={cn(
												"rounded-[7px] px-2 py-1 text-fr-xs transition-colors",
												sort === entry.id
													? "bg-fr-surface-2 font-semibold text-fr-text-1"
													: "text-fr-text-3 hover:text-fr-text-2",
											)}
										>
											{entry.label}
										</button>
									))}
								</span>
							</div>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto p-3">
							<div className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] gap-2">
								{listed.slice(0, visibleCount).map(({ record, aliases }) => (
									<ModelCard
										key={patternOf(record)}
										record={record}
										aliases={aliases}
										insight={insights?.[patternOf(record)]}
										armedLabel={armedMeta.label}
										blockedForArmed={armedMeta.needsVision === true && !record.supportsImages}
										onOpen={() => setInspecting(patternOf(record))}
										onQuickAdd={() => place(armedMeta.id, patternOf(record))}
										onDragStart={startModelDrag(record)}
										onDragEnd={endModelDrag}
									/>
								))}
							</div>
							{listed.length > visibleCount && (
								<button
									type="button"
									onClick={() => setVisibleCount(count => count + LIST_PAGE)}
									className="w-full px-4 py-2.5 text-center text-fr-xs text-fr-text-2 transition-colors hover:text-fr-text"
								>
									show {Math.min(LIST_PAGE, listed.length - visibleCount)} more ·{" "}
									{listed.length - visibleCount} hidden
								</button>
							)}
							{listed.length === 0 && (
								<span className="block px-4 py-8 text-center text-fr-xs text-fr-text-3">
									no models match these filters
								</span>
							)}
						</div>
					</>
				)}
			</div>

			{/* ═══ RIGHT — the team panel ═══ */}
			<div
				className={cn(
					"relative flex shrink-0 flex-col bg-fr-rail",
					narrow
						? "min-h-0 max-h-[46%] w-full border-t border-fr-border-soft"
						: "w-[340px] border-l border-fr-border-soft",
				)}
			>
				<TeamSwitcher
					profiles={profiles}
					hasDefault={defaultRoles !== undefined}
					selected={selected}
					onSelect={onSelect}
					onCreate={name => {
						onSave(name, {});
						onSelect(name);
					}}
				/>
				<div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
					{draft && (
						<div data-slot="intel-draft-review" className="flex flex-col gap-1.5">
							<span className="px-1 text-fr-2xs text-fr-text-3">
								✦ {draft.theme} draft · review the diff, then apply
							</span>
							{draft.picks.length === 0 && (
								<span className="rounded-[10px] border border-dashed border-fr-border-soft px-3 py-4 text-center text-fr-2xs text-fr-text-3">
									nothing to change — the current picks already win this theme
								</span>
							)}
							{draft.picks.map(pick => {
								const accepted = draft.accepted.has(pick.roleId);
								const currentPattern = currentByRole[pick.roleId];
								const currentRecord = currentPattern ? recordFor(currentPattern) : undefined;
								const pickRecord = recordFor(pick.pattern);
								return (
									<button
										type="button"
										key={pick.roleId}
										onClick={() =>
											setDraft(current => {
												if (!current) return current;
												const next = new Set(current.accepted);
												if (next.has(pick.roleId)) next.delete(pick.roleId);
												else next.add(pick.roleId);
												return { ...current, accepted: next };
											})
										}
										className={cn(
											"flex flex-col gap-1 rounded-[10px] border p-2 text-left transition-colors",
											accepted ? "border-fr-accent-line bg-fr-accent-dim/40" : "border-fr-border-soft",
										)}
									>
										<span className="flex items-center gap-1.5">
											<span className="w-16 shrink-0 text-fr-xs font-semibold text-fr-text">
												{roleMeta(pick.roleId).label}
											</span>
											{currentRecord ? (
												<span
													className={cn(
														"flex items-center gap-1 text-fr-xs text-fr-text-2",
														accepted && "line-through opacity-50",
													)}
												>
													<BrandTile
														providerId={currentRecord.providerId}
														providerName={currentRecord.providerName}
														size={14}
													/>
													{currentRecord.label}
												</span>
											) : (
												<span className="rounded-full bg-fr-warn/10 px-1.5 py-px text-fr-2xs text-fr-warn">
													empty
												</span>
											)}
											<span className="text-fr-text-3">→</span>
											{pickRecord && (
												<span className="flex items-center gap-1 text-fr-xs font-medium text-fr-text-1">
													<BrandTile
														providerId={pickRecord.providerId}
														providerName={pickRecord.providerName}
														size={14}
													/>
													{pick.label}
												</span>
											)}
											<span
												className={cn(
													"ml-auto inline-block size-[16px] shrink-0 rounded-[5px] border text-center text-[10px] leading-[14px]",
													accepted
														? "border-fr-accent bg-fr-accent text-white"
														: "border-fr-border text-transparent",
												)}
											>
												✓
											</span>
										</span>
										<span className="pl-16 text-fr-2xs text-fr-text-3">{pick.why}</span>
									</button>
								);
							})}
						</div>
					)}
					{!draft &&
						activeRoleIds.map(roleId => {
							const meta = roleMeta(roleId);
							const stack = roles[roleId] ?? [];
							const armed = roleId === armedMeta.id;
							const over = dropHint?.roleId === roleId;
							const blockedForDrag = dragging !== null && meta.needsVision === true && !dragging.vision;
							const fallback =
								isDefault && roleId === "default" && engineDefault && stack.length === 0
									? {
											record: byPattern.get(`${engineDefault.provider}/${engineDefault.modelId}`),
											pattern: `${engineDefault.provider}/${engineDefault.modelId}`,
										}
									: undefined;
							/** Commit a drop at the current hint (before-card identity → index). */
							const commitDrop = (event: DragEvent<HTMLElement>, before: string | null) => {
								event.preventDefault();
								const at = before === null ? stack.length : stack.indexOf(before);
								const slot = at < 0 ? stack.length : at;
								const from = dragging?.from;
								setDropHint(null);
								setDragging(null);
								const data = readModelDragData(event.dataTransfer);
								if (data) placeAt(roleId, data.pattern, slot, from);
							};
							const ghost = (badge: string) =>
								dragging && (
									<SlotGhost
										label={dragging.label}
										providerId={dragging.providerId}
										providerName={dragging.providerName}
										badge={badge}
									/>
								);
							return (
								<Fragment key={roleId}>
									{/* biome-ignore lint/a11y/useKeyWithClickEvents: arming is a pointer convenience; wells stay reachable through the row buttons */}
									<section
										data-slot="intel-role-well"
										data-role-id={roleId}
										onClick={() => setArmedRole(roleId)}
										onDragOver={event => {
											if (!hasModelDragData(event.dataTransfer)) return;
											if (meta.needsVision && !modelDragSeesImages(event.dataTransfer)) return; // refuse: no preventDefault → no-drop cursor
											event.preventDefault();
											event.dataTransfer.dropEffect = dragging?.from ? "move" : "copy";
											// the WELL only claims the hint when no card has (padding/gaps/
											// empty) — cards own their own before/after decision, so the
											// ghost never fights the geometry it just changed.
											setDropHint(current =>
												current?.roleId === roleId ? current : { roleId, before: null },
											);
										}}
										onDragLeave={event => {
											// only when truly leaving the well — dragleave also fires when
											// entering a CHILD, which used to strobe the hint
											if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
											setDropHint(current => (current?.roleId === roleId ? null : current));
										}}
										onDrop={event => commitDrop(event, dropHint?.roleId === roleId ? dropHint.before : null)}
										className={cn(
											"cursor-pointer rounded-[10px] p-1 transition-colors duration-150",
											over && "bg-fr-accent-dim/40",
											sentimentRole === roleId && "ring-1 ring-fr-accent",
											blockedForDrag && "opacity-40",
										)}
									>
										<div className="flex shrink-0 items-center gap-1.5 px-1.5 py-1.5">
											<Icon
												name={meta.icon}
												size={11}
												className={armed ? "text-fr-accent" : "text-fr-text-3"}
											/>
											<span className="text-fr-xs font-medium text-fr-text-2">{meta.label}</span>
											<span className="fr-overflow text-fr-2xs text-fr-text-3">{meta.hint}</span>
											<span className="ml-auto flex items-center gap-1.5">
												{armed && (
													<span className="rounded-full bg-fr-accent-dim px-1.5 py-px text-fr-2xs font-semibold text-fr-accent">
														armed
													</span>
												)}
												{stack.length > 1 && (
													<span className="font-secondary text-fr-2xs text-fr-text-3 tabular-nums">
														{stack.length}
													</span>
												)}
												{!isDefault && roleId !== "default" && (
													<button
														type="button"
														onClick={event => {
															event.stopPropagation();
															removeRole(roleId);
														}}
														aria-label={`remove ${meta.label} role`}
														className="hidden size-4 items-center justify-center rounded text-fr-text-3 hover:text-fr-del group-hover:flex"
													>
														<Icon name="trash" size={10} />
													</button>
												)}
											</span>
										</div>
										<div className="flex flex-col gap-1.5">
											{fallback && (
												<span className="flex h-[40px] items-center gap-2 rounded-[10px] border border-dashed border-fr-border-soft px-2.5">
													{fallback.record && (
														<span className="opacity-70">
															<BrandTile
																providerId={fallback.record.providerId}
																providerName={fallback.record.providerName}
																size={20}
															/>
														</span>
													)}
													<span className="flex min-w-0 flex-col">
														<span className="fr-overflow text-fr-xs font-medium text-fr-text-2">
															{fallback.record?.label ?? fallback.pattern}
														</span>
														<span className="fr-overflow text-fr-2xs text-fr-text-3">
															engine default · drop to override
														</span>
													</span>
												</span>
											)}
											{stack.map((pattern, index) => {
												const record = recordFor(pattern);
												const { suffix } = splitPattern(pattern);
												return (
													<Fragment key={pattern}>
														{over &&
															dropHint?.before === pattern &&
															ghost(index === 0 ? "active" : `fb${index}`)}
														<div
															data-slot="intel-stack-row"
															draggable
															onDragStart={event => {
																event.stopPropagation();
																const data = {
																	pattern,
																	label: record?.label ?? pattern,
																	providerId: record?.providerId ?? "",
																	providerName: record?.providerName ?? "",
																	vision: record?.supportsImages ?? false,
																};
																writeModelDragData(event.dataTransfer, data);
																setModelDragImage(event.dataTransfer, data);
																event.dataTransfer.effectAllowed = "move";
																setDragging({ ...data, vision: data.vision, from: { roleId, index } });
															}}
															onDragEnd={endModelDrag}
															onDragOver={event => {
																if (!hasModelDragData(event.dataTransfer)) return;
																if (meta.needsVision && !modelDragSeesImages(event.dataTransfer))
																	return;
																event.preventDefault();
																event.stopPropagation();
																event.dataTransfer.dropEffect = dragging?.from ? "move" : "copy";
																// the board's rule: THIS card's midpoint decides
																// before-me vs after-me — stable under any reflow
																const rect = event.currentTarget.getBoundingClientRect();
																const before =
																	event.clientY < rect.top + rect.height / 2
																		? pattern
																		: (stack[index + 1] ?? null);
																setDropHint(current =>
																	current?.roleId === roleId && current.before === before
																		? current
																		: { roleId, before },
																);
															}}
															onDrop={event => {
																event.stopPropagation();
																const rect = event.currentTarget.getBoundingClientRect();
																commitDrop(
																	event,
																	event.clientY < rect.top + rect.height / 2
																		? pattern
																		: (stack[index + 1] ?? null),
																);
															}}
															className={cn(
																"group/row flex animate-[fr-pop-in_160ms_ease-out] cursor-grab items-center gap-2 rounded-[10px] border border-fr-border-soft bg-fr-surface px-2.5 py-2 transition-colors duration-150 hover:border-fr-border hover:bg-fr-surface-2 active:cursor-grabbing",
																index === 0 && "border-l-2 border-l-fr-accent",
																dragging?.from?.roleId === roleId &&
																	dragging.from.index === index &&
																	"opacity-40",
															)}
														>
															{record ? (
																<BrandTile
																	providerId={record.providerId}
																	providerName={record.providerName}
																	size={20}
																/>
															) : (
																<span className="flex size-5 items-center justify-center rounded-[5px] bg-fr-surface-3 text-fr-2xs text-fr-text-3">
																	?
																</span>
															)}
															<span className="min-w-0 fr-overflow text-fr-sm font-medium text-fr-text">
																{record?.label ?? pattern}
															</span>
															{record?.reasoning && (
																<span className="relative shrink-0">
																	<button
																		type="button"
																		data-slot="intel-think-chip"
																		onClick={event => {
																			event.stopPropagation();
																			setThinkMenu(current =>
																				current?.roleId === roleId && current.index === index
																					? null
																					: { roleId, index },
																			);
																		}}
																		title="thinking level for this slot"
																		aria-expanded={
																			thinkMenu?.roleId === roleId && thinkMenu.index === index
																		}
																		className={cn(
																			"rounded-full px-1.5 py-px font-secondary text-fr-2xs transition-colors",
																			suffix
																				? "bg-fr-accent-dim text-fr-accent"
																				: "bg-fr-surface-3 text-fr-text-3 opacity-0 hover:text-fr-text-2 group-hover/row:opacity-100",
																		)}
																	>
																		{suffix ? suffix.slice(1) : "think ▾"}
																	</button>
																	{thinkMenu?.roleId === roleId && thinkMenu.index === index && (
																		<span className="absolute right-0 top-6 z-10 flex w-28 flex-col overflow-hidden rounded-[10px] border border-fr-border bg-fr-surface-2 py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.9)]">
																			{THINK_LEVELS.map(level => (
																				<button
																					type="button"
																					key={level.id ?? "inherit"}
																					onClick={event => {
																						event.stopPropagation();
																						setSuffix(roleId, index, level.id);
																						setThinkMenu(null);
																					}}
																					className={cn(
																						"px-2.5 py-1 text-left font-secondary text-fr-2xs transition-colors hover:bg-fr-surface-3",
																						(
																							level.id === null
																								? suffix === ""
																								: suffix === `:${level.id}`
																						)
																							? "font-semibold text-fr-accent"
																							: "text-fr-text-2",
																					)}
																				>
																					{level.label}
																				</button>
																			))}
																		</span>
																	)}
																</span>
															)}
															<span className="ml-auto flex shrink-0 items-center gap-0.5">
																<span
																	className={cn(
																		"font-secondary text-fr-2xs",
																		index === 0 ? "font-semibold text-fr-accent" : "text-fr-text-3",
																	)}
																>
																	{index === 0 ? "active" : `fb${index}`}
																</span>
																{stack.length > 1 && (
																	<>
																		<StackButton
																			label="move up"
																			icon="caretD"
																			flip
																			disabled={index === 0}
																			onAct={() => move(roleId, index, -1)}
																		/>
																		<StackButton
																			label="move down"
																			icon="caretD"
																			disabled={index === stack.length - 1}
																			onAct={() => move(roleId, index, 1)}
																		/>
																	</>
																)}
																<StackButton
																	label="remove"
																	icon="x"
																	danger
																	onAct={() => removeAt(roleId, index)}
																/>
															</span>
														</div>
													</Fragment>
												);
											})}
											{over &&
												dropHint?.before === null &&
												ghost(stack.length === 0 ? "active" : `fb${stack.length}`)}
											{/* blank slots: 3 by default, auto-grows past 3 with the stack */}
											{Array.from(
												{
													length: Math.max(
														0,
														3 - stack.length - (fallback ? 1 : 0) - (over && dragging ? 1 : 0),
													),
												},
												(_, blank) => {
													const slot = stack.length + (fallback ? 1 : 0) + blank;
													return (
														<span
															key={`blank-${slot}`}
															data-slot="intel-blank-slot"
															className="flex h-[40px] items-center rounded-[10px] border border-dashed border-fr-border-soft px-2.5 text-fr-2xs text-fr-text-3"
														>
															{slot === 0
																? blockedForDrag
																	? "needs image input"
																	: armed
																		? "click + on a model, or drag here"
																		: isDefault
																			? "engine default"
																			: "empty — falls back to Default"
																: "empty"}
															<span className="ml-auto font-secondary">
																{slot === 0 ? "active" : `fb${slot}`}
															</span>
														</span>
													);
												},
											)}
										</div>
									</section>
								</Fragment>
							);
						})}
					{!draft && unusedRoles.length > 0 && (
						<div className="flex flex-wrap gap-1 pt-0.5">
							{unusedRoles.map(role => (
								<button
									type="button"
									key={role.id}
									onClick={() => addRole(role.id)}
									className="flex items-center gap-1 rounded-[7px] border border-dashed border-fr-border-soft px-1.5 py-1 text-fr-2xs text-fr-text-3 transition-colors hover:border-fr-border hover:text-fr-text-1"
								>
									<Icon name="plus" size={9} />
									{role.label}
								</button>
							))}
						</div>
					)}
				</div>
				<div className="relative flex items-center gap-2 border-t border-fr-border-soft px-3.5 py-2.5">
					{draft ? (
						<>
							<span className="text-fr-2xs text-fr-text-3">
								{draft.accepted.size} of {draft.picks.length} accepted
							</span>
							<button
								type="button"
								onClick={() => setDraft(null)}
								className="ml-auto rounded-[8px] border border-fr-border px-2.5 py-1.5 text-fr-xs text-fr-text-2 hover:text-fr-text"
							>
								Cancel
							</button>
							<Button size="sm" disabled={draft.accepted.size === 0} onClick={applyDraft}>
								Apply {draft.accepted.size || ""}
							</Button>
						</>
					) : (
						<>
							{insights && (
								<span className="relative">
									<button
										type="button"
										data-slot="intel-autodraft"
										onClick={() => setDraftMenuOpen(current => !current)}
										aria-expanded={draftMenuOpen}
										className="rounded-[8px] border border-fr-accent-line bg-fr-accent-dim px-2.5 py-1.5 text-fr-xs font-semibold text-fr-accent transition-colors hover:bg-fr-accent-dim/70"
									>
										✦ Auto-draft ▾
									</button>
									{draftMenuOpen && (
										<span className="absolute bottom-9 left-0 z-10 flex w-44 flex-col overflow-hidden rounded-[10px] border border-fr-border bg-fr-surface-2 py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.9)]">
											{(
												[
													{ id: "cheap", hint: "lowest price per role" },
													{ id: "balanced", hint: "quality within reason" },
													{ id: "frontier", hint: "best, price be damned" },
												] as const
											).map(theme => (
												<button
													type="button"
													key={theme.id}
													onClick={() => startDraft(theme.id)}
													className="flex flex-col px-3 py-1.5 text-left transition-colors hover:bg-fr-surface-3"
												>
													<span className="text-fr-xs font-semibold text-fr-text-1">✦ {theme.id}</span>
													<span className="text-fr-2xs text-fr-text-3">{theme.hint}</span>
												</button>
											))}
										</span>
									)}
								</span>
							)}
							{isDefault ? (
								<span className="ml-auto text-fr-2xs text-fr-text-3">
									edits save instantly to <span className="font-secondary">modelRoles.*</span>
								</span>
							) : (
								<>
									<span className="ml-1 text-fr-2xs text-fr-text-3">
										{dirty ? "unsaved changes" : "saved"}
									</span>
									{onDelete && selected in profiles && (
										<button
											type="button"
											onClick={() => onDelete(selected)}
											className="ml-1 text-fr-2xs text-fr-text-3 hover:text-fr-del"
										>
											delete team
										</button>
									)}
									<Button size="sm" className="ml-auto" disabled={!dirty} onClick={save}>
										Save team
									</Button>
								</>
							)}
						</>
					)}
				</div>
			</div>
		</>
	);
}

/** Standalone catalog for the Models page. Keeps the popup's identity collapse,
 * provider ordering, capability filters, and sort semantics without importing a
 * team well or a modal host. */
export interface ModelCatalogProps {
	readonly models: readonly EngineModelRecord[];
	readonly providers?: readonly EngineProviderRecord[];
	readonly insights?: Readonly<Record<string, EngineModelInsight>>;
	readonly onOpen: (record: EngineModelRecord) => void;
	readonly className?: string;
}

export function ModelCatalog({ models, providers: engineProviders, insights, onOpen, className }: ModelCatalogProps) {
	const hasInsights = insights !== undefined && Object.keys(insights).length > 0;
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState<readonly string[]>([]);
	const [providerFilter, setProviderFilter] = useState<ReadonlySet<string>>(new Set());
	const [sort, setSort] = useState<SortId>(hasInsights ? "rank" : "price");
	const activeFilters = useMemo(() => CATALOG_FILTERS.filter(filter => filter.applicable?.(models) ?? true), [models]);
	const selectedFilters = useMemo(() => new Set(filters), [filters]);
	const providers = useMemo(() => {
		const order = new Map((engineProviders ?? []).map((provider, index) => [provider.id, index]));
		const grouped = new Map<string, { readonly id: string; readonly name: string; count: number }>();
		for (const record of models) {
			if (!record.available) continue;
			const provider = grouped.get(record.providerId) ?? {
				id: record.providerId,
				name: record.providerName,
				count: 0,
			};
			provider.count += 1;
			grouped.set(record.providerId, provider);
		}
		return [...grouped.values()].sort(
			(a, b) =>
				(order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
				a.name.localeCompare(b.name),
		);
	}, [models, engineProviders]);
	const listed = useMemo(() => {
		const active = activeFilters.filter(filter => selectedFilters.has(filter.id));
		const needle = query.trim().toLowerCase();
		const rankOf = (record: EngineModelRecord) => insights?.[patternOf(record)]?.rank ?? Number.POSITIVE_INFINITY;
		const compare: Record<SortId, (a: EngineModelRecord, b: EngineModelRecord) => number> = {
			price: (a, b) => (blended(a) ?? Number.POSITIVE_INFINITY) - (blended(b) ?? Number.POSITIVE_INFINITY),
			context: (a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0),
			name: (a, b) => a.label.localeCompare(b.label),
			rank: (a, b) => rankOf(a) - rankOf(b),
		};
		const groups = new Map<string, EngineModelRecord[]>();
		for (const record of models) {
			if (
				(!record.available && !selectedFilters.has("unavailable")) ||
				(providerFilter.size > 0 && !providerFilter.has(record.providerId))
			)
				continue;
			if (!active.every(filter => filter.test(record))) continue;
			if (needle && !`${record.label} ${record.providerName} ${record.modelId}`.toLowerCase().includes(needle))
				continue;
			const group = groups.get(modelIdentityKey(record));
			if (group) group.push(record);
			else groups.set(modelIdentityKey(record), [record]);
		}
		return [...groups.values()]
			.map(group => {
				const record = pickRepresentative(group);
				return { record, aliases: group.filter(entry => entry !== record) };
			})
			.sort((a, b) => Number(b.record.available) - Number(a.record.available) || compare[sort](a.record, b.record));
	}, [models, activeFilters, selectedFilters, providerFilter, query, sort, insights]);
	return (
		<section data-slot="models-catalog" className={cn("flex flex-col gap-3", className)}>
			<div className="flex flex-col gap-2 rounded-xl border border-fr-border-soft bg-fr-surface p-3">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="relative">
						<Icon name="search" size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fr-text-3" />
						<Input
							value={query}
							placeholder={`Search ${models.length} models`}
							aria-label="search models"
							onChange={event => setQuery(event.target.value)}
							className="h-8 w-[220px] pl-6 text-fr-xs"
						/>
					</span>
					{providers.slice(0, 12).map(provider => {
						const selected = providerFilter.has(provider.id);
						return (
							<button
								type="button"
								key={provider.id}
								onClick={() =>
									setProviderFilter(current => {
										const next = new Set(current);
										if (selected) next.delete(provider.id);
										else next.add(provider.id);
										return next;
									})
								}
								aria-pressed={selected}
								className={cn(
									"flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-fr-xs transition-colors",
									selected
										? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
										: "border-fr-border-soft text-fr-text-3 hover:text-fr-text-1",
								)}
							>
								<BrandTile providerId={provider.id} providerName={provider.name} size={16} />
								{provider.name}
								<span className="font-secondary text-fr-2xs tabular-nums opacity-70">{provider.count}</span>
							</button>
						);
					})}
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					{activeFilters.map(filter => {
						const selected = filters.includes(filter.id);
						return (
							<button
								type="button"
								key={filter.id}
								onClick={() =>
									setFilters(current =>
										selected ? current.filter(id => id !== filter.id) : [...current, filter.id],
									)
								}
								aria-pressed={selected}
								className={cn(
									"rounded-full border px-2 py-1 text-fr-xs transition-colors",
									selected
										? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
										: "border-fr-border-soft text-fr-text-3 hover:text-fr-text-1",
								)}
							>
								{filter.label}
							</button>
						);
					})}
					<span className="ml-auto flex items-center gap-0.5 rounded-[9px] border border-fr-border-soft bg-fr-bg p-0.5">
						{(
							[
								...(hasInsights ? [{ id: "rank" as const, label: "best coder" }] : []),
								{ id: "price" as const, label: "cheapest" },
								{ id: "context" as const, label: "context" },
								{ id: "name" as const, label: "a-z" },
							] satisfies readonly { readonly id: SortId; readonly label: string }[]
						).map(option => (
							<button
								type="button"
								key={option.id}
								onClick={() => setSort(option.id)}
								aria-pressed={sort === option.id}
								className={cn(
									"rounded-[7px] px-2 py-1 text-fr-xs transition-colors",
									sort === option.id
										? "bg-fr-surface-2 font-semibold text-fr-text-1"
										: "text-fr-text-3 hover:text-fr-text-2",
								)}
							>
								{option.label}
							</button>
						))}
					</span>
				</div>
			</div>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(244px,1fr))] gap-2">
				{listed.map(({ record, aliases }) => (
					<ModelCard
						key={patternOf(record)}
						record={record}
						aliases={aliases}
						insight={insights?.[patternOf(record)]}
						onOpen={() => onOpen(record)}
					/>
				))}
			</div>
			{listed.length === 0 && (
				<div className="rounded-xl border border-dashed border-fr-border px-4 py-8 text-center font-secondary text-fr-xs text-fr-text-3">
					No models match these filters.
				</div>
			)}
		</section>
	);
}

/** Compact catalog card — identity up top, a small data grid (SWE · coding idx
 *  · price · ctx), gateway-alias count. The whole card drags; click opens the
 *  dossier; quick-add reveals on hover without shifting layout. */
export function ModelCard({
	record,
	aliases,
	insight,
	armedLabel,
	blockedForArmed = false,
	onOpen,
	onQuickAdd,
	onDragStart,
	onDragEnd,
}: {
	readonly record: EngineModelRecord;
	readonly aliases: readonly EngineModelRecord[];
	readonly insight?: EngineModelInsight;
	/** When supplied with `onQuickAdd`, the card exposes the armed-role action. */
	readonly armedLabel?: string;
	readonly blockedForArmed?: boolean;
	readonly onOpen: () => void;
	readonly onQuickAdd?: () => void;
	readonly onDragStart?: (event: DragEvent<HTMLElement>) => void;
	readonly onDragEnd?: () => void;
}) {
	const stats = [
		{ label: "SWE", value: insight?.deepSwe ? `${insight.deepSwe.passAt1}%` : "—" },
		{
			label: "coding",
			value: insight?.indices?.coding !== undefined ? insight.indices.coding.toFixed(1) : "—",
		},
		{
			label: "$/M",
			value: (() => {
				const price = blended(record);
				return price === null ? "—" : fmtPerM(price);
			})(),
			title: record.cost
				? `${fmtPerM(record.cost.input)} in · ${fmtPerM(record.cost.output)} out per 1M tokens`
				: undefined,
		},
		{ label: "ctx", value: ctxLabel(record) ?? "—" },
	];
	return (
		// The card is keyboard-operable as well as draggable; the nested quick-add
		// button stops propagation so it remains a distinct action.
		<div
			role="button"
			tabIndex={0}
			data-slot="intel-model-card"
			data-model-id={patternOf(record)}
			draggable={onDragStart !== undefined}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onClick={onOpen}
			onKeyDown={event => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onOpen();
				}
			}}
			className={cn(
				"group relative flex animate-[fr-pop-in_180ms_ease-out] cursor-pointer flex-col gap-2 rounded-[10px] border border-fr-border-soft bg-fr-rail p-2.5 transition-colors duration-150 hover:border-fr-border hover:bg-fr-surface",
				onDragStart && "cursor-grab active:cursor-grabbing",
				!record.available && "opacity-60",
			)}
		>
			<div className="flex items-center gap-2">
				<BrandTile providerId={record.providerId} providerName={record.providerName} size={22} />
				<span className="min-w-0 flex-1 fr-overflow text-fr-sm font-medium text-fr-text">{record.label}</span>
				{insight?.rank !== undefined && (
					<span
						title="OpenRouter's coding ranking — Artificial Analysis coding index"
						className="shrink-0 rounded-[7px] bg-fr-surface-2 px-1.5 py-0.5 font-secondary text-fr-2xs font-bold tabular-nums text-fr-text-1 transition-opacity group-hover:opacity-0"
					>
						#{insight.rank}
					</span>
				)}
				{onQuickAdd && armedLabel && (
					<button
						type="button"
						onClick={event => {
							event.stopPropagation();
							onQuickAdd();
						}}
						disabled={blockedForArmed}
						title={blockedForArmed ? `${armedLabel} needs image input` : `add to ${armedLabel}`}
						className="absolute right-2 top-2 rounded-[7px] border border-fr-accent-line bg-fr-accent-dim px-1.5 py-0.5 text-fr-2xs font-semibold text-fr-accent opacity-0 transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-0 group-hover:opacity-100"
					>
						+ {armedLabel}
					</button>
				)}
			</div>
			<div className="grid grid-cols-[repeat(4,minmax(3.5rem,1fr))] gap-1">
				{stats.map((stat, index) => (
					<span
						key={stat.label}
						title={"title" in stat ? stat.title : undefined}
						className={cn(
							"flex min-w-0 flex-col gap-0.5 rounded-[8px] px-1.5 py-1",
							index === 0 ? "bg-fr-surface-2" : "bg-fr-surface",
						)}
					>
						<span className="text-fr-2xs text-fr-text-3">{stat.label}</span>
						<span className="whitespace-nowrap font-secondary text-fr-xs font-medium tabular-nums text-fr-text-1">
							{stat.value}
						</span>
					</span>
				))}
			</div>
			<div className="flex items-center gap-1.5 text-fr-2xs text-fr-text-3">
				<span className="fr-overflow">{record.providerName}</span>
				{aliases.length > 0 && (
					<span
						className="shrink-0 rounded-full bg-fr-surface-3 px-1.5 py-px font-secondary tabular-nums"
						title={`also via ${aliases.map(alias => alias.providerName).join(", ")}`}
					>
						+{aliases.length}
					</span>
				)}
				{!record.available && <span className="shrink-0">not connected</span>}
				<Icon
					name="eye"
					size={10}
					className={cn("ml-auto shrink-0", record.supportsImages ? "text-fr-text-3" : "opacity-15")}
					aria-label={record.supportsImages ? "sees images" : "text-only"}
				/>
			</div>
		</div>
	);
}

/** The landing preview: a full slot GAP opens where the drop will land,
 *  displacing the cards below — the in-flight model ghosted inside with the
 *  slot it will take (primary / fbN). */
function SlotGhost({
	label,
	providerId,
	providerName,
	badge,
}: {
	readonly label: string;
	readonly providerId: string;
	readonly providerName: string;
	readonly badge: string;
}) {
	return (
		<div
			aria-hidden
			data-slot="intel-slot-ghost"
			className="pointer-events-none flex h-[40px] animate-[fr-slot-open_160ms_ease-out] items-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-fr-accent-line bg-fr-accent-dim/25 px-2.5"
		>
			{providerId && (
				<span className="opacity-70">
					<BrandTile providerId={providerId} providerName={providerName} size={18} />
				</span>
			)}
			<span className="fr-overflow text-fr-xs font-medium text-fr-accent">{label}</span>
			<span className="ml-auto shrink-0 rounded-full bg-fr-accent-dim px-1.5 py-px font-secondary text-fr-2xs font-semibold text-fr-accent">
				{badge}
			</span>
		</div>
	);
}

function StackButton({
	label,
	onAct,
	icon,
	disabled,
	flip,
	danger,
}: {
	readonly label: string;
	readonly onAct: () => void;
	readonly icon: "caretD" | "x";
	readonly disabled?: boolean;
	readonly flip?: boolean;
	readonly danger?: boolean;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={event => {
				event.stopPropagation();
				onAct();
			}}
			aria-label={label}
			className={cn(
				"flex size-4 items-center justify-center rounded text-fr-text-3 disabled:opacity-25",
				danger ? "hover:text-fr-del" : "hover:text-fr-text",
			)}
		>
			<Icon name={icon} size={icon === "x" ? 9 : 10} className={flip ? "rotate-180" : undefined} />
		</button>
	);
}

// ═══ team switcher — built for MANY teams ═════════════════════════════════════

function TeamSwitcher({
	profiles,
	hasDefault,
	selected,
	onSelect,
	onCreate,
}: {
	readonly profiles: ModelProfiles;
	readonly hasDefault: boolean;
	readonly selected: string;
	readonly onSelect: (name: string) => void;
	readonly onCreate: (name: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState("");
	const [draftName, setDraftName] = useState("");
	const names = Object.keys(profiles).sort();
	const needle = filter.trim().toLowerCase();
	const filtered = needle ? names.filter(name => name.toLowerCase().includes(needle)) : names;
	const currentLabel = selected === "" ? "Default" : selected;
	const create = () => {
		const name = draftName.trim();
		if (!name || name in profiles) return;
		onCreate(name);
		setDraftName("");
		setOpen(false);
	};
	return (
		<div className="border-b border-fr-border-soft px-3 py-2.5">
			<button
				type="button"
				data-slot="intel-team-switcher"
				onClick={() => setOpen(current => !current)}
				aria-expanded={open}
				className="flex w-full items-center gap-2 rounded-[10px] border border-fr-border-soft bg-fr-surface px-3 py-2 text-left transition-colors hover:border-fr-border"
			>
				<span className="flex min-w-0 flex-col">
					<span className="fr-overflow text-fr-sm font-semibold text-fr-text">{currentLabel}</span>
					<span className="fr-overflow text-fr-2xs text-fr-text-3">
						{selected === "" ? "built-in · the global role map" : "named team · saved to modelProfiles"}
					</span>
				</span>
				<span className="ml-auto shrink-0 text-fr-2xs text-fr-text-3">
					{names.length + (hasDefault ? 1 : 0)} team{names.length + (hasDefault ? 1 : 0) === 1 ? "" : "s"} ▾
				</span>
			</button>
			{open && (
				<div className="absolute left-3 right-3 z-10 mt-1 flex flex-col overflow-hidden rounded-[10px] border border-fr-border bg-fr-surface-2 py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.9)]">
					{names.length > 6 && (
						<Input
							value={filter}
							onChange={event => setFilter(event.target.value)}
							placeholder="filter teams…"
							aria-label="filter teams"
							className="mx-2 my-1 h-6 text-fr-2xs"
						/>
					)}
					<div className="max-h-56 overflow-y-auto">
						{hasDefault && (!needle || "default".includes(needle)) && (
							<TeamRow
								label="Default"
								note="built-in"
								active={selected === ""}
								onPick={() => {
									onSelect("");
									setOpen(false);
								}}
							/>
						)}
						{filtered.map(name => (
							<TeamRow
								key={name}
								label={name}
								active={selected === name}
								onPick={() => {
									onSelect(name);
									setOpen(false);
								}}
							/>
						))}
						{filtered.length === 0 && !hasDefault && (
							<span className="block px-3 py-2 text-center text-fr-2xs text-fr-text-3">no teams match</span>
						)}
					</div>
					<div className="mx-2 mt-1 flex items-center gap-1 border-t border-fr-border-soft pt-1.5">
						<Input
							value={draftName}
							onChange={event => setDraftName(event.target.value)}
							onKeyDown={event => {
								if (event.key === "Enter") create();
							}}
							placeholder="new team name"
							aria-label="new team name"
							className="h-6 flex-1 text-fr-2xs"
						/>
						<Button
							size="sm"
							variant="outline"
							disabled={!draftName.trim() || draftName.trim() in profiles}
							onClick={create}
						>
							Create
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function TeamRow({
	label,
	note,
	active,
	onPick,
}: {
	readonly label: string;
	readonly note?: string;
	readonly active: boolean;
	readonly onPick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onPick}
			className={cn(
				"flex w-full items-center gap-2 px-3 py-1.5 text-left text-fr-xs transition-colors hover:bg-fr-surface-3",
				active ? "font-semibold text-fr-accent" : "text-fr-text-1",
			)}
		>
			<span className="fr-overflow">{label}</span>
			{note && <span className="text-fr-2xs text-fr-text-3">· {note}</span>}
			{active && <span className="ml-auto text-fr-2xs text-fr-text-3">active</span>}
		</button>
	);
}

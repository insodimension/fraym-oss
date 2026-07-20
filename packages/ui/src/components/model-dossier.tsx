"use client";
import type {
	EngineModelDeepSwe,
	EngineModelInsight,
	EngineModelInsightsResult,
	EngineModelRecord,
} from "@fraym/driver";
import { type ReactNode, useMemo, useState } from "react";
import { Modal } from "../elements/popover";
import { Icon } from "../icons/icon";
import { cn } from "../lib/cn";
import { BrandTile } from "./brand-tile";

// ---------------------------------------------------------------------------
// ModelDossier — the modular model-details page (journey round, 2026-07-10).
// ONE model's complete file, host-agnostic: mount it in a popup, a drawer, or
// a role-decision view. Chart grammars verified against the LIVE producers
// (2026-07-10 screenshots):
//   · Design Arena  — vertical ELO bars, value INSIDE the bar top, provider
//     tile at the bar foot, model name below, a category switcher, and an
//     ELO ↔ win-rate toggle.
//   · Artificial Analysis — the same vertical-bar grammar with index TABS
//     (coding / agentic / intelligence) and a composition subtitle.
//   · Preference vs price — the scatter both producers ship: quality (ELO)
//     over log-price, "most attractive quadrant" shaded, dots labelled.
// Sections: identity → insights dashboard → Design Arena → Artificial
// Analysis → preference vs price → market sentiment (future crowd feed slot) →
// data provenance.
// ---------------------------------------------------------------------------

/** Community-sentiment feed for one model (the future last30days crowd loop).
 *  Typed now so the section renders real data the day the feed exists. */
export interface ModelSentimentQuote {
	readonly source: string;
	readonly text: string;
	readonly sentiment: "up" | "down" | "mixed";
	readonly url?: string;
}

export interface ModelSentiment {
	readonly updatedAt: string;
	/** Net sentiment -1..1 across the sampled window. */
	readonly score: number;
	/** Posts/comments sampled. */
	readonly volume: number;
	readonly themes?: readonly string[];
	readonly quotes?: readonly ModelSentimentQuote[];
}

/** One benchmarked rival: the charts place the dossier's model IN the field —
 *  a lone model's bars mean nothing. Hosts build these from the catalog +
 *  insight feed (label = the model's display name). */
export interface DossierFieldEntry {
	readonly label: string;
	readonly insight: EngineModelInsight;
	/** Provider identity → brand-colored bars/dots + the logo at the bar foot. */
	readonly providerId?: string;
	readonly providerName?: string;
	/** Blended $/M for the preference-vs-price scatter; omit to leave the dot out. */
	readonly blendedPricePerM?: number;
}

export interface ModelDossierProps {
	readonly record: EngineModelRecord;
	readonly insight?: EngineModelInsight;
	/** The benchmarked field this model is charted against (top rivals included).
	 *  Omit → charts degrade to solo bars with no field context. */
	readonly field?: readonly DossierFieldEntry[];
	/** Feed provenance for the data section. */
	readonly meta?: Pick<EngineModelInsightsResult, "fetchedAt" | "sources" | "stale">;
	/** Community sentiment (future weekly crowd feed). Absent → designed slot. */
	readonly sentiment?: ModelSentiment;
	/** Host-injected actions (e.g. "Use as Default ▾") — the dossier itself is
	 *  journey-agnostic and ships no mutations. */
	readonly actions?: ReactNode;
	readonly className?: string;
}

const mono = "font-secondary";

/** Engine enrichment rolls these LMArena fields out independently of the
 * dossier package. Keeping the optional shape local lets older drivers render
 * every other signal unchanged while a newer driver contributes crowd standing. */
type LMArenaInsight = EngineModelInsight & {
	readonly arenaTextElo?: number;
	readonly arenaTextRank?: number;
	readonly arenaTextVotes?: number;
	readonly arenaCodeElo?: number;
	readonly arenaCodeRank?: number;
	readonly arenaCodeVotes?: number;
};

function ArenaCrowdStanding({ insight }: { readonly insight: EngineModelInsight }) {
	const arena = insight as LMArenaInsight;
	const standings = [
		{ label: "Text", rank: arena.arenaTextRank, elo: arena.arenaTextElo, votes: arena.arenaTextVotes },
		{ label: "Code", rank: arena.arenaCodeRank, elo: arena.arenaCodeElo, votes: arena.arenaCodeVotes },
	].filter(standing => standing.rank !== undefined || standing.elo !== undefined);
	if (standings.length === 0) return null;
	return (
		<section
			data-slot="dossier-lmarena"
			className="flex flex-col gap-2.5 rounded-[14px] border border-fr-border-soft bg-fr-surface-2 p-4"
		>
			<SectionHead title="LMArena crowd standing" hint="human pairwise preference · arena.ai" />
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{standings.map(standing => (
					<div
						key={standing.label}
						className="flex min-w-0 items-baseline gap-2 rounded-[10px] bg-fr-surface px-3 py-2"
					>
						<span className="text-fr-sm font-semibold text-fr-text">{standing.label}</span>
						<span className={cn("whitespace-nowrap text-fr-xs font-semibold tabular-nums text-fr-text-1", mono)}>
							{standing.rank === undefined ? "unranked" : `#${standing.rank}`}
						</span>
						<span className={cn("ml-auto whitespace-nowrap text-fr-2xs tabular-nums text-fr-text-3", mono)}>
							{standing.elo !== undefined && `${standing.elo} Elo`}
							{standing.elo !== undefined && standing.votes !== undefined && " · "}
							{standing.votes !== undefined && `${standing.votes.toLocaleString()} votes`}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}

function fmtPerM(value: number): string {
	return value < 1 ? `$${value.toFixed(2)}` : `$${Number(value.toFixed(value < 10 ? 1 : 0))}`;
}

function ctxLabel(record: EngineModelRecord): string | null {
	const ctx = record.contextWindow;
	if (!ctx) return null;
	return ctx >= 1_000_000 ? `${Math.round(ctx / 100_000) / 10}M` : `${Math.round(ctx / 1000)}K`;
}

function relativeDay(iso: string): string {
	const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
	if (Number.isNaN(days)) return "";
	if (days <= 0) return "today";
	if (days === 1) return "yesterday";
	return `${days} days ago`;
}

// ═══ 1. identity ══════════════════════════════════════════════════════════════

function IdentityHeader({
	record,
	insight,
	actions,
}: {
	readonly record: EngineModelRecord;
	readonly insight?: EngineModelInsight;
	readonly actions?: ReactNode;
}) {
	const ctx = ctxLabel(record);
	const facts: readonly { readonly label: string; readonly value: string; readonly muted?: boolean }[] = [
		{
			label: "price / M",
			value: record.cost ? `${fmtPerM(record.cost.input)} in · ${fmtPerM(record.cost.output)} out` : "unpriced",
			muted: !record.cost,
		},
		{ label: "context", value: ctx ? `${ctx} tokens` : "unknown", muted: !ctx },
		{
			label: "max output",
			value: record.maxOutputTokens ? `${Math.round(record.maxOutputTokens / 1000)}K` : "unknown",
			muted: !record.maxOutputTokens,
		},
		{ label: "vision", value: record.supportsImages ? "sees images" : "text-only", muted: !record.supportsImages },
		{ label: "reasoning", value: record.reasoning ? "yes" : "no", muted: !record.reasoning },
		{
			label: "tool calling",
			value: record.supportsTools === false ? "no" : "native",
			muted: record.supportsTools === false,
		},
	];
	return (
		<header className="flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<BrandTile providerId={record.providerId} providerName={record.providerName} size={44} />
				<div className="flex min-w-0 flex-col">
					<h2 className="fr-overflow text-fr-xl font-semibold leading-tight tracking-[-0.01em] text-fr-text">
						{record.label}
					</h2>
					<span className={cn("fr-overflow text-fr-xs text-fr-text-3", mono)}>
						{record.providerName} · {record.modelId}
						{!record.available && " · not connected"}
					</span>
				</div>
				<div className="ml-auto flex shrink-0 items-center gap-2">
					{insight?.usageRank !== undefined && (
						<span
							title="real weekly usage rank across the whole catalog"
							className={cn(
								"rounded-full border border-fr-border-soft px-2.5 py-1 text-fr-2xs tabular-nums text-fr-text-2",
								mono,
							)}
						>
							#{insight.usageRank} used this week
						</span>
					)}
					{actions}
				</div>
			</div>
			<dl className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
				{facts.map(fact => (
					<div key={fact.label} className="rounded-[9px] bg-fr-surface-2 px-2.5 py-2">
						<dt className={cn("text-fr-2xs text-fr-text-3", mono)}>{fact.label}</dt>
						<dd
							className={cn(
								"mt-0.5 fr-overflow text-fr-xs",
								fact.muted ? "text-fr-text-3" : "font-medium text-fr-text-1",
							)}
						>
							{fact.value}
						</dd>
					</div>
				))}
			</dl>
		</header>
	);
}

// ═══ 2. the dashboard — insights up front ═════════════════════════════════════

function InsightDashboard({
	insight,
	field,
}: {
	readonly insight: EngineModelInsight;
	readonly field: readonly DossierFieldEntry[];
}) {
	const coding = insight.categories?.find(category => category.id === "codecategories");
	const averages = useMemo(() => {
		const sums = { intelligence: 0, coding: 0, agentic: 0 };
		const counts = { intelligence: 0, coding: 0, agentic: 0 };
		for (const entry of field) {
			for (const key of ["intelligence", "coding", "agentic"] as const) {
				const value = entry.insight.indices?.[key];
				if (value !== undefined) {
					sums[key] += value;
					counts[key] += 1;
				}
			}
		}
		return {
			intelligence: counts.intelligence ? sums.intelligence / counts.intelligence : undefined,
			coding: counts.coding ? sums.coding / counts.coding : undefined,
			agentic: counts.agentic ? sums.agentic / counts.agentic : undefined,
		};
	}, [field]);
	return (
		<section data-slot="dossier-dashboard" className="grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
			<div className="flex flex-col justify-between rounded-[14px] border border-fr-border-soft bg-fr-surface-2 p-4">
				<span className="fr-eyebrow text-fr-text-3">Arena standing</span>
				{insight.rank !== undefined ? (
					<>
						<div className="flex items-baseline gap-1.5 pt-2">
							<span className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-fr-text">
								#{insight.rank}
							</span>
							<span className={cn("text-fr-xs text-fr-text-3", mono)}>coding</span>
						</div>
						<div className={cn("flex items-center gap-3 pt-2 text-fr-2xs tabular-nums text-fr-text-2", mono)}>
							{insight.elo !== undefined && <span>{insight.elo} ELO</span>}
							{(insight.winRate ?? coding?.winRate) !== undefined && (
								<span>{Math.round(insight.winRate ?? coding?.winRate ?? 0)}% win rate</span>
							)}
						</div>
					</>
				) : (
					<span className="pt-2 text-fr-xs text-fr-text-3">not yet benchmarked by the arena</span>
				)}
			</div>
			<div className="flex flex-col gap-2.5 rounded-[14px] border border-fr-border-soft bg-fr-surface-2 p-4">
				<span className="fr-eyebrow text-fr-text-3">
					Signal indices{" "}
					<span className="normal-case tracking-normal">· Artificial Analysis, 0-100 · │ field average</span>
				</span>
				{(["coding", "agentic", "intelligence"] as const).map(key => {
					const value = insight.indices?.[key];
					const average = averages[key];
					if (value === undefined) return null;
					return (
						<div key={key} className="flex items-center gap-2.5">
							<span className="w-[86px] text-fr-xs text-fr-text-3">{key}</span>
							<div className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-fr-surface-3">
								<div
									className="h-full rounded-full"
									style={{
										width: `${value}%`,
										background: "linear-gradient(90deg, var(--fr-accent-2), var(--fr-accent))",
									}}
								/>
								{average !== undefined && (
									<div
										className="absolute top-0 h-full w-px bg-fr-text-2"
										style={{ left: `${average}%` }}
										title={`field average ${average.toFixed(1)}`}
									/>
								)}
							</div>
							<span className={cn("w-10 text-right text-fr-xs font-semibold tabular-nums text-fr-text-1", mono)}>
								{value.toFixed(1)}
							</span>
						</div>
					);
				})}
				{insight.strengths && insight.strengths.length > 0 && (
					<div className="flex flex-wrap gap-1 pt-0.5">
						{insight.strengths.map(strength => (
							<span
								key={strength}
								className={cn("rounded-full bg-fr-accent-dim px-2 py-0.5 text-fr-2xs text-fr-accent", mono)}
							>
								{strength}
							</span>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

// ═══ the producers' shared chart: vertical bars, value INSIDE the bar top ════

interface FieldBar {
	readonly label: string;
	readonly value: number;
	readonly hot: boolean;
	/** Provider identity → brand color for the bar + logo at the bar foot
	 *  (both producers color bars per model and mark the provider). */
	readonly providerId?: string;
	readonly providerName?: string;
}

/** The vertical bar grammar BOTH producers use (verified live 2026-07-10):
 *  value label inside the bar top, provider logo at the bar foot, name below,
 *  bars in the provider's brand color, the dossier's model ringed + lit. */
function FieldBars({
	bars,
	min,
	unit,
	height = 200,
}: {
	readonly bars: readonly FieldBar[];
	readonly min: number;
	readonly unit?: string;
	readonly height?: number;
}) {
	const max = Math.max(...bars.map(bar => bar.value)) * 1.02;
	return (
		<div className="flex items-end gap-[7px]" style={{ height: height + 62 }}>
			{bars.map(bar => {
				const h = Math.max(40, ((bar.value - min) / (max - min)) * height);
				return (
					<div
						key={bar.label}
						title={`${bar.label} — ${bar.value}${unit ?? ""}${bar.providerName ? ` · ${bar.providerName}` : ""}`}
						className="flex min-w-0 flex-1 cursor-default flex-col items-center gap-1.5"
					>
						<div
							className={cn(
								"flex w-full max-w-[64px] flex-col items-center justify-between rounded-t-[6px] pb-1.5 pt-1.5 transition-all duration-150",
								bar.hot
									? "bg-fr-accent shadow-[0_0_22px_-6px_var(--fr-accent)]"
									: "border border-b-0 border-fr-border-soft bg-fr-surface-3 hover:border-fr-border",
							)}
							style={{ height: h }}
						>
							<span
								className={cn(
									"text-fr-2xs font-semibold tabular-nums",
									mono,
									bar.hot ? "text-[var(--fr-accent-ink)]" : "text-fr-text-1",
								)}
							>
								{bar.value}
								{unit}
							</span>
							{bar.providerId && h > 64 && (
								<BrandTile
									providerId={bar.providerId}
									providerName={bar.providerName ?? bar.providerId}
									size={18}
								/>
							)}
						</div>
						<span
							className={cn(
								"max-w-full fr-overflow text-fr-2xs",
								bar.hot ? "font-semibold text-fr-text" : "text-fr-text-3",
							)}
							title={bar.label}
						>
							{bar.label}
						</span>
					</div>
				);
			})}
		</div>
	);
}

/** Segmented control shared by the producer sections (their tab/toggle chrome). */
function Segmented<T extends string>({
	options,
	value,
	onChange,
}: {
	readonly options: readonly { readonly id: T; readonly label: string }[];
	readonly value: T;
	readonly onChange: (next: T) => void;
}) {
	return (
		<span className="flex items-center gap-0.5 rounded-[9px] border border-fr-border-soft bg-fr-surface p-0.5">
			{options.map(option => (
				<button
					type="button"
					key={option.id}
					onClick={() => onChange(option.id)}
					aria-pressed={value === option.id}
					className={cn(
						"rounded-[7px] px-2 py-1 text-fr-2xs transition-colors",
						mono,
						value === option.id
							? "bg-fr-surface-3 font-semibold text-fr-text-1"
							: "text-fr-text-3 hover:text-fr-text-2",
					)}
				>
					{option.label}
				</button>
			))}
		</span>
	);
}

// ═══ 3. Design Arena — category switcher + ELO/win-rate bars ═════════════════

function ArenaSection({
	model,
	insight,
	field,
}: {
	readonly model: EngineModelRecord;
	readonly insight: EngineModelInsight;
	readonly field: readonly DossierFieldEntry[];
}) {
	const modelLabel = model.label;
	const categories = useMemo(
		() => [...(insight.categories ?? [])].sort((a, b) => a.rank - b.rank),
		[insight.categories],
	);
	const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
	const [metric, setMetric] = useState<"elo" | "win">("elo");
	const active = categories.find(category => category.id === categoryId) ?? categories[0];
	const bars = useMemo(() => {
		if (!active) return [];
		const rivals = field
			.flatMap(entry => {
				const category = entry.insight.categories?.find(candidate => candidate.id === active.id);
				return category
					? [
							{
								label: entry.label,
								elo: category.elo,
								win: category.winRate,
								providerId: entry.providerId,
								providerName: entry.providerName,
							},
						]
					: [];
			})
			.filter(entry => entry.label !== modelLabel);
		const own = {
			label: modelLabel,
			elo: active.elo,
			win: active.winRate,
			providerId: model.providerId,
			providerName: model.providerName,
		};
		const all = [own, ...rivals].sort((a, b) => b.elo - a.elo).slice(0, 11);
		if (!all.some(bar => bar.label === modelLabel)) {
			all.pop();
			all.push(own);
		}
		return all.map(bar => ({
			label: bar.label,
			value: metric === "elo" ? bar.elo : Math.round(bar.win),
			hot: bar.label === modelLabel,
			providerId: bar.providerId,
			providerName: bar.providerName,
		}));
	}, [active, field, metric, modelLabel, model.providerId, model.providerName]);
	if (!active) return null;
	const eloFloor = Math.min(...bars.map(bar => bar.value)) - (metric === "elo" ? 60 : 8);
	return (
		<section data-slot="dossier-arena" className="flex flex-col gap-2.5">
			<SectionHead title="Design Arena" hint="community pairwise votes · crowd-ranked per category">
				<Segmented
					options={[
						{ id: "elo", label: "Elo rating" },
						{ id: "win", label: "Win rate" },
					]}
					value={metric}
					onChange={setMetric}
				/>
			</SectionHead>
			<div className="flex flex-wrap gap-1">
				{categories.map(category => (
					<button
						type="button"
						key={category.id}
						onClick={() => setCategoryId(category.id)}
						aria-pressed={category.id === active.id}
						className={cn(
							"rounded-full border px-2.5 py-1 text-fr-2xs transition-colors",
							mono,
							category.id === active.id
								? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
								: "border-fr-border-soft text-fr-text-3 hover:text-fr-text-1",
						)}
					>
						{category.label} <span className="opacity-70">#{category.rank}</span>
					</button>
				))}
			</div>
			<div className="rounded-[14px] border border-fr-border-soft bg-fr-surface-2 px-5 pb-3 pt-5">
				<FieldBars bars={bars} min={eloFloor} unit={metric === "win" ? "%" : undefined} />
				<div className="mt-1 border-t border-fr-border-soft pt-2 text-fr-xs text-fr-text-3">
					{active.label}: #{active.rank} of the benchmarked field · {active.elo} ELO · {active.winRate.toFixed(1)}%
					win rate — top {bars.length} shown
				</div>
			</div>
		</section>
	);
}

// ═══ DeepSWE — long-horizon agentic tasks (first-party feed) ═════════════════

function DeepSweSection({
	model,
	insight,
	field,
}: {
	readonly model: EngineModelRecord;
	readonly insight: EngineModelInsight;
	readonly field: readonly DossierFieldEntry[];
}) {
	const own = insight.deepSwe;
	const [metric, setMetric] = useState<"pass1" | "pass4">("pass1");
	if (!own) return null;
	const pick = (entry: EngineModelDeepSwe) => (metric === "pass1" ? entry.passAt1 : (entry.passAt4 ?? entry.passAt1));
	const rivals = field.flatMap(entry =>
		entry.insight.deepSwe && entry.label !== model.label
			? [
					{
						label: entry.label,
						value: pick(entry.insight.deepSwe),
						hot: false,
						providerId: entry.providerId,
						providerName: entry.providerName,
					},
				]
			: [],
	);
	const bars = [
		{
			label: model.label,
			value: pick(own),
			hot: true,
			providerId: model.providerId,
			providerName: model.providerName,
		},
		...rivals,
	].sort((a, b) => b.value - a.value);
	const telemetry = [
		own.effort && `best config: ${own.effort} effort`,
		own.passAt4 !== undefined && `pass@4 ${own.passAt4}%`,
		own.medianCostPerTaskUsd !== undefined && `median $${own.medianCostPerTaskUsd}/task`,
		own.medianAgentSteps !== undefined && `${own.medianAgentSteps} agent steps`,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<section data-slot="dossier-deepswe" className="flex flex-col gap-2.5">
			<SectionHead
				title="DeepSWE"
				hint="Datacurve · 113 long-horizon tasks on live repos · fixed mini-swe-agent harness"
			>
				<Segmented
					options={[
						{ id: "pass1", label: "pass@1" },
						{ id: "pass4", label: "pass@4" },
					]}
					value={metric}
					onChange={setMetric}
				/>
			</SectionHead>
			<div className="rounded-[14px] border border-fr-border-soft bg-fr-surface-2 px-5 pb-3 pt-5">
				<FieldBars bars={bars} min={0} unit="%" height={180} />
				<div className="mt-1 border-t border-fr-border-soft pt-2 text-fr-xs text-fr-text-3">{telemetry}</div>
			</div>
		</section>
	);
}

// ═══ 4. Artificial Analysis — index tabs + field bars ════════════════════════

const INDEX_TABS = [
	{ id: "coding", label: "Coding index" },
	{ id: "agentic", label: "Agentic index" },
	{ id: "intelligence", label: "Intelligence index" },
] as const;

function IndicesSection({
	model,
	insight,
	field,
}: {
	readonly model: EngineModelRecord;
	readonly insight: EngineModelInsight;
	readonly field: readonly DossierFieldEntry[];
}) {
	const modelLabel = model.label;
	const available = INDEX_TABS.filter(tab => insight.indices?.[tab.id] !== undefined);
	const [tabId, setTabId] = useState<(typeof INDEX_TABS)[number]["id"]>(available[0]?.id ?? "coding");
	if (!available.length) return null;
	const activeTab = available.find(tab => tab.id === tabId) ?? available[0];
	if (!activeTab) return null;
	const own = insight.indices?.[activeTab.id];
	const rivals = field
		.flatMap(entry => {
			const value = entry.insight.indices?.[activeTab.id];
			return value !== undefined && entry.label !== modelLabel
				? [{ label: entry.label, value, providerId: entry.providerId, providerName: entry.providerName }]
				: [];
		})
		.sort((a, b) => b.value - a.value);
	const ownBar = {
		label: modelLabel,
		value: own ?? 0,
		hot: true,
		providerId: model.providerId,
		providerName: model.providerName,
	};
	const bars = [ownBar, ...rivals.map(rival => ({ ...rival, hot: false }))]
		.sort((a, b) => b.value - a.value)
		.slice(0, 11)
		.map(bar => ({ ...bar, value: Math.round(bar.value * 10) / 10 }));
	if (!bars.some(bar => bar.hot) && own !== undefined) {
		bars.pop();
		bars.push({ ...ownBar, value: Math.round((own ?? 0) * 10) / 10 });
	}
	return (
		<section data-slot="dossier-indices" className="flex flex-col gap-2.5">
			<SectionHead title="Artificial Analysis" hint="standardized eval indices, 0-100 · higher is better">
				<Segmented options={available} value={activeTab.id} onChange={setTabId} />
			</SectionHead>
			<div className="rounded-[14px] border border-fr-border-soft bg-fr-surface-2 px-5 pb-3 pt-5">
				<FieldBars bars={bars} min={0} height={170} />
				<div className="mt-1 border-t border-fr-border-soft pt-2 text-fr-xs text-fr-text-3">
					index composition per Artificial Analysis methodology · top {bars.length} of the benchmarked field
				</div>
			</div>
		</section>
	);
}

// ═══ 5. preference vs price — the producers' scatter ═════════════════════════

function FrontierSection({
	model,
	insight,
	field,
	blendedPricePerM,
}: {
	readonly model: EngineModelRecord;
	readonly insight: EngineModelInsight;
	readonly field: readonly DossierFieldEntry[];
	readonly blendedPricePerM?: number;
}) {
	const modelLabel = model.label;
	/** Readable on a LIVE field: cap to the top of the pack (plus the best-value
	 *  corner), label only the leaders — everything else is a quiet, hoverable dot. */
	const MAX_RIVALS = 36;
	const { dots, labelled } = useMemo(() => {
		const rivals = field.flatMap(entry =>
			entry.insight.elo !== undefined && entry.blendedPricePerM !== undefined && entry.label !== modelLabel
				? [
						{
							label: entry.label,
							elo: entry.insight.elo,
							price: entry.blendedPricePerM,
							hot: false,
							providerId: entry.providerId,
							providerName: entry.providerName,
						},
					]
				: [],
		);
		rivals.sort((a, b) => b.elo - a.elo);
		const top = rivals.slice(0, MAX_RIVALS - 6);
		// keep the value corner visible: cheapest above-median performers beyond the cap
		const medianElo = rivals[Math.floor(rivals.length / 2)]?.elo ?? 0;
		const value = rivals
			.slice(MAX_RIVALS - 6)
			.filter(rival => rival.elo >= medianElo)
			.sort((a, b) => a.price - b.price)
			.slice(0, 6);
		const shown: typeof rivals = [...top, ...value];
		const names = new Set<string>([
			...shown.slice(0, 8).map(dot => dot.label),
			...[...shown]
				.sort((a, b) => a.price - b.price)
				.slice(0, 2)
				.map(dot => dot.label),
			modelLabel,
		]);
		if (insight.elo !== undefined && blendedPricePerM !== undefined) {
			shown.push({
				label: modelLabel,
				elo: insight.elo,
				price: blendedPricePerM,
				hot: true,
				providerId: model.providerId,
				providerName: model.providerName,
			});
		}
		return { dots: shown, labelled: names };
	}, [field, insight, modelLabel, blendedPricePerM, model.providerId, model.providerName]);
	if (dots.length < 3) return null;
	const width = 640;
	const height = 260;
	const pad = { left: 42, bottom: 26, top: 14, right: 84 };
	const eloMin = Math.min(...dots.map(dot => dot.elo)) - 20;
	const eloMax = Math.max(...dots.map(dot => dot.elo)) + 12;
	const priceMax = Math.max(...dots.map(dot => dot.price));
	const x = (price: number) =>
		pad.left + (Math.log10(1 + price) / Math.log10(1 + priceMax)) * (width - pad.left - pad.right);
	const y = (elo: number) => pad.top + (1 - (elo - eloMin) / (eloMax - eloMin)) * (height - pad.top - pad.bottom);
	const median = [...dots].sort((a, b) => a.price - b.price)[Math.floor(dots.length / 2)];
	return (
		<section data-slot="dossier-frontier" className="flex flex-col gap-2.5">
			<SectionHead
				title="Preference vs price"
				hint="arena ELO over blended $/M (log scale) · ◤ most attractive quadrant"
			/>
			<div className="overflow-x-auto rounded-[14px] border border-fr-border-soft bg-fr-surface-2 p-4">
				<svg width={width} height={height} className="max-w-full">
					{/* most attractive quadrant: better than median ELO, cheaper than median price */}
					{median && (
						<rect
							x={pad.left}
							y={pad.top}
							width={Math.max(0, x(median.price) - pad.left)}
							height={Math.max(0, y(median.elo) - pad.top)}
							fill="var(--fr-add)"
							opacity={0.07}
						/>
					)}
					{[0.25, 0.5, 0.75].map(fraction => (
						<line
							key={fraction}
							x1={pad.left}
							y1={pad.top + (height - pad.top - pad.bottom) * fraction}
							x2={width - pad.right}
							y2={pad.top + (height - pad.top - pad.bottom) * fraction}
							stroke="var(--fr-border-soft)"
							strokeDasharray="2 5"
						/>
					))}
					<line
						x1={pad.left}
						y1={height - pad.bottom}
						x2={width - pad.right}
						y2={height - pad.bottom}
						stroke="var(--fr-border)"
					/>
					<line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="var(--fr-border)" />
					{dots.map(dot => (
						<g key={dot.label} className="group/dot cursor-default">
							<title>
								{`${dot.label} — ELO ${dot.elo} · $${dot.price < 1 ? dot.price.toFixed(2) : dot.price.toFixed(1)}/M blended${dot.providerName ? ` · ${dot.providerName}` : ""}`}
							</title>
							{dot.hot && <circle cx={x(dot.price)} cy={y(dot.elo)} r={12} fill="var(--fr-accent-dim)" />}
							{/* generous invisible hit area so the tooltip is easy to reach */}
							<circle cx={x(dot.price)} cy={y(dot.elo)} r={11} fill="transparent" />
							<circle
								cx={x(dot.price)}
								cy={y(dot.elo)}
								r={dot.hot ? 5.5 : 4}
								fill={dot.hot ? "var(--fr-accent)" : "var(--fr-text-3)"}
								opacity={dot.hot ? 1 : 0.45}
								className={cn(!dot.hot && "transition-opacity duration-150 group-hover/dot:opacity-90")}
							/>
							{(labelled.has(dot.label) || undefined) && (
								<text
									x={x(dot.price) > width - pad.right - 30 ? x(dot.price) - 8 : x(dot.price) + 8}
									y={y(dot.elo) + 3}
									textAnchor={x(dot.price) > width - pad.right - 30 ? "end" : "start"}
									className={mono}
									fill={dot.hot ? "var(--fr-text)" : "var(--fr-text-3)"}
									style={{ fontSize: 9.5, fontWeight: dot.hot ? 700 : 400 }}
								>
									{dot.label}
								</text>
							)}
						</g>
					))}
					<text
						x={width - pad.right}
						y={height - 6}
						textAnchor="end"
						fill="var(--fr-text-3)"
						className={mono}
						style={{ fontSize: 9 }}
					>
						blended $/M (log) →
					</text>
					<text x={pad.left} y={pad.top - 2} fill="var(--fr-text-3)" className={mono} style={{ fontSize: 9.5 }}>
						coding ELO ↑
					</text>
				</svg>
			</div>
		</section>
	);
}

// ═══ 6. market sentiment — the future crowd feed's designed slot ═════════════

function SentimentSection({ sentiment }: { readonly sentiment?: ModelSentiment }) {
	return (
		<section data-slot="dossier-sentiment" className="flex flex-col gap-2.5">
			<SectionHead
				title="Market sentiment"
				hint={
					sentiment
						? `community sentiment · last 30 days · ${sentiment.volume} posts sampled · updated ${relativeDay(sentiment.updatedAt)}`
						: "community sentiment · coming"
				}
			/>
			{sentiment ? (
				<div className="flex flex-col gap-3 rounded-[14px] border border-fr-border-soft bg-fr-surface-2 p-4">
					<div className="flex items-center gap-3">
						<div className="relative h-[8px] flex-1 overflow-hidden rounded-full bg-fr-surface-3">
							<div className="absolute inset-y-0 left-1/2 w-px bg-fr-border" />
							<div
								className={cn("absolute inset-y-0 rounded-full", sentiment.score >= 0 ? "bg-fr-add" : "bg-fr-del")}
								style={{
									left: sentiment.score >= 0 ? "50%" : `${50 + sentiment.score * 50}%`,
									width: `${Math.abs(sentiment.score) * 50}%`,
								}}
							/>
						</div>
						<span
							className={cn(
								"text-fr-xs font-semibold tabular-nums",
								sentiment.score >= 0 ? "text-fr-add" : "text-fr-del",
								mono,
							)}
						>
							{sentiment.score >= 0 ? "+" : ""}
							{Math.round(sentiment.score * 100)} sentiment
						</span>
					</div>
					{sentiment.themes && sentiment.themes.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{sentiment.themes.map(theme => (
								<span
									key={theme}
									className={cn("rounded-full bg-fr-surface-3 px-2 py-0.5 text-fr-2xs text-fr-text-2", mono)}
								>
									{theme}
								</span>
							))}
						</div>
					)}
					{sentiment.quotes && sentiment.quotes.length > 0 && (
						<div className="grid gap-2 sm:grid-cols-2">
							{sentiment.quotes.slice(0, 4).map(quote => (
								<figure key={quote.text} className="rounded-[10px] bg-fr-surface-3/70 p-2.5">
									<blockquote className="text-fr-2xs leading-relaxed text-fr-text-2">
										“{quote.text}”
									</blockquote>
									<figcaption className="mt-1.5 flex items-center gap-1.5 text-fr-2xs text-fr-text-3">
										<Icon
											name={
												quote.sentiment === "up" ? "plus" : quote.sentiment === "down" ? "minus" : "dots"
											}
											size={9}
											className={
												quote.sentiment === "up"
													? "text-fr-add"
													: quote.sentiment === "down"
														? "text-fr-del"
														: undefined
											}
										/>
										{quote.source}
									</figcaption>
								</figure>
							))}
						</div>
					)}
				</div>
			) : (
				<div className="flex items-center gap-3 rounded-[14px] border border-dashed border-fr-border-soft px-4 py-4">
					<Icon name="globe" size={16} className="shrink-0 text-fr-text-3" />
					<span className="text-fr-xs leading-relaxed text-fr-text-3">
						What people actually say about this model — net sentiment, themes, and standout takes from the last 30
						days across Reddit, X, and Hacker News. Lands when the weekly crowd feed ships; this dossier renders
						it automatically.
					</span>
				</div>
			)}
		</section>
	);
}

// ═══ 7. provenance ════════════════════════════════════════════════════════════

function ProvenanceSection({
	meta,
	insight,
}: {
	readonly meta?: Pick<EngineModelInsightsResult, "fetchedAt" | "sources" | "stale">;
	readonly insight?: EngineModelInsight;
}) {
	const rows: readonly { readonly label: string; readonly value: string; readonly warn?: boolean }[] = [
		{
			label: "sources",
			value: `${(meta?.sources ?? ["openrouter"]).join(" · ")} — Design Arena votes + Artificial Analysis indices + DeepSWE (Datacurve) long-horizon runs`,
		},
		{
			label: "updated",
			value: meta?.fetchedAt
				? `${new Date(meta.fetchedAt).toLocaleDateString()} (${relativeDay(meta.fetchedAt)}) · refreshes daily`
				: "unknown",
			warn: meta?.stale,
		},
		{
			label: "coverage",
			value:
				insight?.categories?.length !== undefined
					? `${insight.categories.length} arena categories · ranks are relative to feed-listed models, not the whole world`
					: "ranks are relative to feed-listed models, not the whole world",
		},
	];
	return (
		<section data-slot="dossier-provenance" className="flex flex-col gap-1.5">
			<SectionHead title="Data" hint="where these numbers come from" />
			{rows.map(row => (
				<div key={row.label} className="flex items-baseline gap-3">
					<span className="w-24 shrink-0 text-fr-xs text-fr-text-3">{row.label}</span>
					<span className="text-fr-xs leading-relaxed text-fr-text-2">
						{row.value}
						{row.warn && (
							<span
								className="ml-2 rounded-full bg-fr-surface-3 px-2 py-px text-fr-warn"
								title="the last refresh failed; showing the previous snapshot"
							>
								stale
							</span>
						)}
					</span>
				</div>
			))}
		</section>
	);
}

// ═══ shared bits ══════════════════════════════════════════════════════════════

function SectionHead({
	title,
	hint,
	children,
}: {
	readonly title: string;
	readonly hint?: string;
	readonly children?: ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 border-b border-fr-border-soft pb-1.5">
			<h3 className="text-fr-sm font-semibold text-fr-text">{title}</h3>
			{hint && <span className="text-fr-xs text-fr-text-3">{hint}</span>}
			{children && <span className="ml-auto">{children}</span>}
		</div>
	);
}

// ═══ the dossier ══════════════════════════════════════════════════════════════

export function ModelDossier({ record, insight, field = [], meta, sentiment, actions, className }: ModelDossierProps) {
	const blended = record.cost ? (record.cost.input * 3 + record.cost.output) / 4 : undefined;
	return (
		<article data-slot="model-dossier" className={cn("flex flex-col gap-6", className)}>
			<IdentityHeader record={record} insight={insight} actions={actions} />
			{insight ? (
				<>
					<InsightDashboard insight={insight} field={field} />
					<ArenaCrowdStanding insight={insight} />
					<ArenaSection model={record} insight={insight} field={field} />
					<DeepSweSection model={record} insight={insight} field={field} />
					<IndicesSection model={record} insight={insight} field={field} />
					<FrontierSection model={record} insight={insight} field={field} blendedPricePerM={blended} />
				</>
			) : (
				<p className="rounded-[14px] border border-dashed border-fr-border-soft px-4 py-8 text-center font-secondary text-fr-xs text-fr-text-3">
					no benchmark data for this model yet — the feed covers models with Design Arena or Artificial Analysis
					results
				</p>
			)}
			<SentimentSection sentiment={sentiment} />
			<ProvenanceSection meta={meta} insight={insight} />
		</article>
	);
}

// ═══ hosts ════════════════════════════════════════════════════════════════════

/** Build the dossier's field from the live catalog + insight feed: one entry
 *  per benchmarked model, deduped by label (a model served by several
 *  providers appears once — first, i.e. most-available, record wins). */
export function dossierFieldFromCatalog(
	models: readonly EngineModelRecord[],
	insights: Readonly<Record<string, EngineModelInsight>>,
): readonly DossierFieldEntry[] {
	const seen = new Set<string>();
	const entries: DossierFieldEntry[] = [];
	for (const record of models) {
		const insight = insights[`${record.providerId}/${record.modelId}`];
		if (!insight) continue;
		// Dedupe twice: on the NORMALIZED label ("GPT-5.6 Sol" / "GPT-5.6-Sol"),
		// and on the insight FINGERPRINT — custom gateway providers list the same
		// model under unrelated labels ("TEE/glm-5.2", "zai-org/glm-5.2") yet
		// carry the identical benchmark row; one bar per underlying model.
		const labelKey = record.label.toLowerCase().replace(/[^a-z0-9]/g, "");
		const fingerprint = `${insight.rank ?? ""}|${insight.elo ?? ""}|${insight.usageRank ?? ""}|${insight.deepSwe?.passAt1 ?? ""}`;
		if (seen.has(labelKey) || (fingerprint !== "|||" && seen.has(fingerprint))) continue;
		seen.add(labelKey);
		seen.add(fingerprint);
		entries.push({
			label: record.label,
			providerId: record.providerId,
			providerName: record.providerName,
			insight,
			blendedPricePerM: record.cost ? (record.cost.input * 3 + record.cost.output) / 4 : undefined,
		});
	}
	return entries;
}

export interface ModelDossierModalProps {
	readonly record: EngineModelRecord;
	/** Full catalog — the field is derived from every benchmarked model in it. */
	readonly models: readonly EngineModelRecord[];
	readonly insights: Readonly<Record<string, EngineModelInsight>>;
	readonly meta?: Pick<EngineModelInsightsResult, "fetchedAt" | "sources" | "stale">;
	readonly sentiment?: ModelSentiment;
	readonly actions?: ReactNode;
	readonly onClose: () => void;
}

/** The dossier in its popup shell — the app's model-details surface. */
export function ModelDossierModal({ record, models, insights, meta, sentiment, actions, onClose }: ModelDossierModalProps) {
	const field = useMemo(() => dossierFieldFromCatalog(models, insights), [models, insights]);
	return (
		<Modal
			onClose={onClose}
			data-slot="model-dossier-modal"
			className="flex max-h-[min(90vh,860px)] w-[min(920px,calc(100vw-24px))] flex-col overflow-hidden rounded-[16px] border border-fr-border-soft bg-fr-surface"
		>
			<div className="flex items-center justify-end px-3 pt-2.5">
				<button
					type="button"
					onClick={onClose}
					aria-label="close"
					className="flex size-7 items-center justify-center rounded-[8px] text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
				>
					<Icon name="x" size={12} />
				</button>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
				<ModelDossier
					record={record}
					insight={insights[`${record.providerId}/${record.modelId}`]}
					field={field}
					meta={meta}
					sentiment={sentiment}
					actions={actions}
				/>
			</div>
		</Modal>
	);
}

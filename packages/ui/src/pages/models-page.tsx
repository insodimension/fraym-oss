"use client";

import type { EngineModelInsight, EngineModelRecord, EngineProviderRecord } from "@fraym/driver";
import { useContext, useEffect, useMemo, useState } from "react";
import { BrandTile } from "../components/brand-tile";
import { dossierFieldFromCatalog, ModelDossier } from "../components/model-dossier";
import { ModelCatalog, type ModelProfiles, ModelTeamWorkbench, roleCandidates } from "../components/model-intelligence";
import { Button, Input } from "../elements";
import { Icon } from "../icons/icon";
import { cn } from "../lib/cn";
import { PageDockContext } from "./page-dock-context";

export interface ModelsHomeProps {
	readonly models: readonly EngineModelRecord[];
	readonly providers?: readonly EngineProviderRecord[];
	readonly profiles: ModelProfiles;
	readonly defaultRoles?: Readonly<Record<string, string>>;
	readonly engineDefault?: { readonly provider: string; readonly modelId: string };
	readonly insights?: Readonly<Record<string, EngineModelInsight>>;
	readonly insightsMeta?: {
		readonly fetchedAt?: number;
		readonly sources?: readonly string[];
		readonly stale?: boolean;
	};
	readonly onDefaultRoleChange: (role: string, pattern: string | undefined) => void;
	readonly onSave: (name: string, roles: Record<string, readonly string[]>) => void;
	readonly onDelete?: (name: string) => void;
	readonly onModelAgent?: (seed: string) => void;
	readonly className?: string;
}

type ModelsView =
	| { readonly kind: "home" }
	| { readonly kind: "team"; readonly name: string }
	| { readonly kind: "model"; readonly key: string };

const THINKING_SUFFIX_RE = /:(off|minimal|low|medium|high|xhigh)$/;
/** Dock-agent seeds lead with the `/skill:model-intel` command token — the composer
 *  commits it as an atomic command pill (the badge attachment), so the draft reads as
 *  a chip + one short fill-in sentence instead of a wall of instructions. */
const CREATE_SEED =
	"/skill:model-intel assemble a new model team for <goal — e.g. cheapest competent coding, frontier quality, vision-heavy>";

function patternOf(record: EngineModelRecord): string {
	return `${record.providerId}/${record.modelId}`;
}

function ModelsDockRegistrar({ onOpen }: { readonly onOpen?: () => void }) {
	const { registerDock } = useContext(PageDockContext);
	useEffect(() => {
		if (!onOpen) return;
		registerDock({ button: { label: "Team agent", icon: "bot" }, onOpen });
		return () => registerDock(null);
	}, [onOpen, registerDock]);
	return null;
}

function FreshnessChip({ meta }: { readonly meta?: ModelsHomeProps["insightsMeta"] }) {
	if (!meta) {
		return (
			<span className="rounded-full border border-fr-border-soft px-2 py-1 font-secondary text-fr-2xs text-fr-text-3">
				enrichment unavailable
			</span>
		);
	}
	const source = meta.sources?.join(" · ") || "benchmark feed";
	const age = meta.fetchedAt ? new Date(meta.fetchedAt).toLocaleDateString() : "freshness unknown";
	return (
		<span
			title={`${source} · ${age}${meta.stale ? " · stale cache" : ""}`}
			className={cn(
				"rounded-full border px-2 py-1 font-secondary text-fr-2xs",
				meta.stale ? "border-fr-warn/40 bg-fr-warn/10 text-fr-warn" : "border-fr-border-soft text-fr-text-3",
			)}
		>
			{meta.stale ? "stale" : "live"} · {source}
		</span>
	);
}

function TeamCard({
	name,
	roles,
	builtIn,
	modelsByPattern,
	onOpen,
}: {
	readonly name: string;
	readonly roles: Readonly<Record<string, string | readonly string[]>>;
	readonly builtIn?: boolean;
	readonly modelsByPattern: ReadonlyMap<string, EngineModelRecord>;
	readonly onOpen: () => void;
}) {
	const roleStacks = Object.entries(roles).map(
		([role, value]) => [role, Array.isArray(value) ? value : value ? [value] : []] as const,
	);
	const fallbackDepth = roleStacks.reduce((count, [, stack]) => count + Math.max(0, stack.length - 1), 0);
	const primaryModels = roleStacks
		.map(([, stack]) => stack[0]?.replace(THINKING_SUFFIX_RE, ""))
		.filter((pattern): pattern is string => Boolean(pattern))
		.map(pattern => modelsByPattern.get(pattern))
		.filter((record): record is EngineModelRecord => record !== undefined);
	// Only honestly-priced primaries count: registry rows can carry negative sentinel
	// costs (e.g. dynamic-priced routers), which must read as unknown, never as $-1M/M.
	const pricedPrimaries = primaryModels.filter(
		record => record.cost && record.cost.input >= 0 && record.cost.output >= 0,
	);
	const blended = pricedPrimaries.length
		? pricedPrimaries.reduce(
				(sum, record) => sum + ((record.cost?.input ?? 0) * 3 + (record.cost?.output ?? 0)) / 4,
				0,
			) / pricedPrimaries.length
		: undefined;
	return (
		<button
			type="button"
			data-slot="models-team-card"
			data-team-name={builtIn ? "default" : name}
			onClick={onOpen}
			className="group flex min-h-[172px] flex-col gap-3 rounded-xl border border-fr-border-soft bg-fr-surface p-4 text-left transition-colors hover:border-fr-border hover:bg-fr-surface-2"
		>
			<div className="flex items-center gap-2">
				<span className="text-fr-md font-semibold text-fr-text">{name}</span>
				<span
					className={cn(
						"rounded-full px-1.5 py-0.5 font-secondary text-fr-2xs",
						builtIn ? "bg-fr-accent-dim text-fr-accent" : "bg-fr-surface-3 text-fr-text-3",
					)}
				>
					{builtIn ? "built-in" : "team"}
				</span>
				<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">
					{roleStacks.length === 1 ? "1 role" : `${roleStacks.length} roles`}
				</span>
			</div>
			<div className="flex min-h-[42px] flex-wrap content-start gap-1.5">
				{roleStacks.slice(0, 6).map(([role, stack]) => {
					const record = stack[0] ? modelsByPattern.get(stack[0].replace(THINKING_SUFFIX_RE, "")) : undefined;
					return (
						<span
							key={role}
							className="flex max-w-full items-center gap-1 rounded-[7px] bg-fr-surface-3 py-1 pl-1 pr-1.5 text-fr-2xs text-fr-text-2"
						>
							{record && (
								<BrandTile providerId={record.providerId} providerName={record.providerName} size={14} />
							)}
							<span className="font-secondary text-fr-text-3">{role}</span>
							<span className="fr-overflow">
								{record?.label ?? (stack[0] ? "configured" : "engine default")}
							</span>
						</span>
					);
				})}
				{roleStacks.length === 0 && <span className="text-fr-xs text-fr-text-3">No explicit roles yet.</span>}
			</div>
			<div className="mt-auto grid grid-cols-2 gap-2 border-t border-fr-border-soft pt-3">
				<span className="flex flex-col gap-0.5">
					<span className="text-fr-2xs text-fr-text-3">fallback depth</span>
					<span className="font-secondary text-fr-sm tabular-nums text-fr-text-1">{fallbackDepth}</span>
				</span>
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="text-fr-2xs text-fr-text-3">est. blended</span>
					<span className="whitespace-nowrap font-secondary text-fr-sm tabular-nums text-fr-text-1">
						{blended === undefined ? "—" : `$${blended < 1 ? blended.toFixed(2) : blended.toFixed(1)}`}/M
					</span>
				</span>
			</div>
		</button>
	);
}

function TeamCreateCard({ onCreate }: { readonly onCreate: (name: string) => void }) {
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState("");
	const submit = () => {
		const next = name.trim();
		if (!next) return;
		onCreate(next);
		setName("");
		setCreating(false);
	};
	if (creating) {
		return (
			<div
				data-slot="models-new-team"
				className="flex min-h-[172px] flex-col justify-center gap-2 rounded-xl border border-dashed border-fr-border bg-fr-surface/50 p-4"
			>
				<label className="text-fr-xs font-medium text-fr-text-2" htmlFor="models-new-team-name">
					Team name
				</label>
				<Input
					id="models-new-team-name"
					value={name}
					onChange={event => setName(event.target.value)}
					onKeyDown={event => event.key === "Enter" && submit()}
					placeholder="e.g. Budget coding"
					className="h-8 text-fr-xs"
				/>
				<div className="flex justify-end gap-2">
					<Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
						Cancel
					</Button>
					<Button size="sm" disabled={!name.trim()} onClick={submit}>
						Create team
					</Button>
				</div>
			</div>
		);
	}
	return (
		<button
			type="button"
			data-slot="models-new-team"
			onClick={() => setCreating(true)}
			className="flex min-h-[172px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-fr-border bg-fr-surface/40 px-5 py-4 text-fr-text-3 transition-colors hover:border-fr-accent-line hover:text-fr-text-2"
		>
			<Icon name="plus" size={16} />
			<span className="text-fr-sm font-medium">New team</span>
			<span className="font-secondary text-fr-2xs">compose a role-specific stack</span>
		</button>
	);
}

function BackButton({ onBack, label = "All models" }: { readonly onBack: () => void; readonly label?: string }) {
	return (
		<Button data-slot="models-back" size="sm" variant="ghost" onClick={onBack}>
			<Icon name="back" size={13} />
			{label}
		</Button>
	);
}

export function ModelsHome({
	models,
	providers,
	profiles,
	defaultRoles,
	engineDefault,
	insights,
	insightsMeta,
	onDefaultRoleChange,
	onSave,
	onDelete,
	onModelAgent,
	className,
}: ModelsHomeProps) {
	const [view, setView] = useState<ModelsView>({ kind: "home" });
	const modelsByPattern = useMemo(() => new Map(models.map(record => [patternOf(record), record])), [models]);
	const selectedRecord = view.kind === "model" ? modelsByPattern.get(view.key) : undefined;
	const dockSeed =
		view.kind === "home"
			? CREATE_SEED
			: view.kind === "team"
				? `/skill:model-intel review and improve the "${view.name || "Default"}" team — propose swaps with evidence, apply what I approve`
				: `/skill:model-intel deep dossier on ${selectedRecord?.label ?? view.key} — benchmarks, last-30-days sentiment, price/endpoints, and team fit`;
	// Stable identity matters: ModelsDockRegistrar re-registers on opener change, and
	// registration is a workspace-level setState — an inline lambda here loops the render.
	const onAskAgent = useMemo(
		() => (onModelAgent ? () => onModelAgent(dockSeed) : undefined),
		[onModelAgent, dockSeed],
	);
	const dossierMeta = insightsMeta?.fetchedAt
		? {
				fetchedAt: new Date(insightsMeta.fetchedAt).toISOString(),
				sources: insightsMeta.sources ?? [],
				stale: insightsMeta.stale,
			}
		: undefined;
	const defaultProfile: Record<string, string | readonly string[]> = Object.fromEntries(
		Object.entries(defaultRoles ?? {}).map(([role, pattern]) => [
			role,
			pattern
				.split(",")
				.map(entry => entry.trim())
				.filter(Boolean),
		]),
	);
	const insightCount = insights ? Object.keys(insights).length : 0;
	return (
		<div
			data-slot="models-home"
			className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden bg-fr-bg", className)}
		>
			<ModelsDockRegistrar onOpen={onAskAgent} />
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-8 py-8 max-[760px]:px-4">
					{view.kind === "home" && (
						<>
							<header
								data-slot="models-header"
								className="flex flex-wrap items-end justify-between gap-4 border-b border-fr-border-soft pb-5"
							>
								<div className="flex flex-col gap-1">
									<h1 className="text-fr-2xl font-semibold tracking-[-0.02em] text-fr-text">Models</h1>
									<p className="text-fr-sm text-fr-text-2">
										Build dependable role stacks from the catalog you can actually run.
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<FreshnessChip meta={insightsMeta} />
									<span className="rounded-full border border-fr-border-soft px-2 py-1 font-secondary text-fr-2xs text-fr-text-3">
										{models.length} models
									</span>
									<span className="rounded-full border border-fr-border-soft px-2 py-1 font-secondary text-fr-2xs text-fr-text-3">
										{Object.keys(profiles).length + Number(defaultRoles !== undefined)} teams
									</span>
								</div>
							</header>
							{models.length === 0 ? (
								<div
									data-slot="models-offline"
									className="rounded-xl border border-dashed border-fr-border px-5 py-12 text-center"
								>
									<Icon name="chart" size={22} className="mx-auto mb-3 text-fr-text-3" />
									<h2 className="text-fr-md font-semibold text-fr-text">Model catalog is offline</h2>
									<p className="mx-auto mt-1 max-w-[48ch] text-fr-xs text-fr-text-3">
										Reconnect a provider or wait for the engine resource sweep. Existing team configuration
										remains available when the catalog returns.
									</p>
								</div>
							) : (
								<>
									<section data-slot="models-teams" className="flex flex-col gap-3">
										<div className="flex items-baseline justify-between gap-3">
											<h2 className="text-fr-lg font-semibold text-fr-text">Teams</h2>
											<span className="font-secondary text-fr-2xs text-fr-text-3">
												role routing · ordered fallbacks
											</span>
										</div>
										<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
											{defaultRoles !== undefined && (
												<TeamCard
													name="Default"
													roles={defaultProfile}
													builtIn
													modelsByPattern={modelsByPattern}
													onOpen={() => setView({ kind: "team", name: "" })}
												/>
											)}
											{Object.entries(profiles)
												.sort(([a], [b]) => a.localeCompare(b))
												.map(([name, roles]) => (
													<TeamCard
														key={name}
														name={name}
														roles={roles}
														modelsByPattern={modelsByPattern}
														onOpen={() => setView({ kind: "team", name })}
													/>
												))}
											<TeamCreateCard
												onCreate={name => {
													onSave(name, {});
													setView({ kind: "team", name });
												}}
											/>
										</div>
									</section>
									<section className="flex flex-col gap-3 border-t border-fr-border-soft pt-6">
										<div className="flex items-baseline justify-between gap-3">
											<h2 className="text-fr-lg font-semibold text-fr-text">Catalog</h2>
											<span className="font-secondary text-fr-2xs text-fr-text-3">
												one card per model identity
											</span>
										</div>
										{insightCount === 0 && (
											<div
												data-slot="models-no-insights"
												className="rounded-xl border border-dashed border-fr-border px-4 py-3 text-fr-xs text-fr-text-3"
											>
												Benchmark enrichment is absent. You can still browse capability, price, and context
												data; rankings appear after the next insight sweep.
											</div>
										)}
										<ModelCatalog
											models={models}
											providers={providers}
											insights={insights}
											onOpen={record => setView({ kind: "model", key: patternOf(record) })}
										/>
									</section>
								</>
							)}
						</>
					)}
					{view.kind === "team" && (
						<section data-slot="models-team-workbench" className="flex flex-col gap-5">
							<header className="flex flex-wrap items-center gap-3 border-b border-fr-border-soft pb-4">
								<BackButton onBack={() => setView({ kind: "home" })} label="All teams" />
								<div className="min-w-0">
									<h1 className="fr-overflow text-fr-xl font-semibold text-fr-text">
										{view.name || "Default"}
									</h1>
									<p className="text-fr-xs text-fr-text-3">
										{view.name
											? "Named teams save on confirmation."
											: "Default changes write straight to modelRoles.*."}
									</p>
								</div>
								{onAskAgent && (
									<Button
										data-slot="models-ask-agent"
										size="sm"
										variant="outline"
										className="ml-auto"
										onClick={onAskAgent}
									>
										<Icon name="bot" size={13} />
										Ask the agent
									</Button>
								)}
							</header>
							<ModelTeamWorkbench
								profiles={profiles}
								models={models}
								providers={providers}
								defaultRoles={defaultRoles}
								engineDefault={engineDefault}
								insights={insights}
								insightsMeta={dossierMeta}
								onDefaultRoleChange={onDefaultRoleChange}
								onSave={onSave}
								onDelete={onDelete}
								team={view.name}
							/>
						</section>
					)}
					{view.kind === "model" && selectedRecord && (
						<section data-slot="models-detail" className="flex flex-col gap-5">
							<header className="flex flex-wrap items-center gap-3 border-b border-fr-border-soft pb-4">
								<BackButton onBack={() => setView({ kind: "home" })} />
								{onAskAgent && (
									<Button
										data-slot="models-ask-agent"
										size="sm"
										variant="outline"
										className="ml-auto"
										onClick={onAskAgent}
									>
										<Icon name="bot" size={13} />
										Ask the agent
									</Button>
								)}
							</header>
							<div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
								<ModelDossier
									record={selectedRecord}
									insight={insights?.[view.key]}
									field={insights ? dossierFieldFromCatalog(models, insights) : []}
									meta={dossierMeta}
								/>
								<aside className="flex h-fit flex-col gap-4 rounded-xl border border-fr-border-soft bg-fr-surface p-4">
									<div>
										<h2 className="text-fr-md font-semibold text-fr-text">In your teams</h2>
										<p className="mt-1 text-fr-xs text-fr-text-3">Reference map and decision deltas.</p>
									</div>
									<div className="flex flex-col gap-2">
										{[
											...(defaultRoles ? [["Default", defaultProfile] as const] : []),
											...Object.entries(profiles),
										]
											.flatMap(([team, roles]) =>
												Object.entries(roles).flatMap(([role, value]) => {
													const stack = Array.isArray(value) ? value : value ? [value] : [];
													const index = stack.findIndex(
														pattern => pattern.replace(THINKING_SUFFIX_RE, "") === view.key,
													);
													return index >= 0 ? [{ team, role, index }] : [];
												}),
											)
											.map(reference => (
												<span
													key={`${reference.team}/${reference.role}`}
													className="flex items-center gap-2 rounded-lg bg-fr-surface-2 px-2.5 py-2 text-fr-xs"
												>
													<span className="font-medium text-fr-text">{reference.team}</span>
													<span className="font-secondary text-fr-text-3">{reference.role}</span>
													<span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">
														{reference.index === 0 ? "active" : `fb${reference.index}`}
													</span>
												</span>
											))}
										{!Object.entries(profiles).some(([, roles]) =>
											Object.values(roles)
												.flat()
												.some(pattern => pattern.replace(THINKING_SUFFIX_RE, "") === view.key),
										) &&
											!(
												defaultRoles &&
												Object.values(defaultRoles).some(pattern =>
													pattern
														.split(",")
														.some(entry => entry.trim().replace(THINKING_SUFFIX_RE, "") === view.key),
												)
											) && (
												<span className="text-fr-xs text-fr-text-3">
													Not assigned to any configured role.
												</span>
											)}
									</div>
									{defaultRoles && (
										<div className="flex flex-col gap-2 border-t border-fr-border-soft pt-3">
											<span className="text-fr-xs font-medium text-fr-text-2">Quick-assign to Default</span>
											{Object.keys(defaultRoles)
												.slice(0, 5)
												.map(role => (
													<button
														type="button"
														key={role}
														onClick={() => {
															const current = (defaultRoles[role] ?? "")
																.split(",")
																.map(entry => entry.trim())
																.filter(Boolean);
															const suffix = current[0]?.match(THINKING_SUFFIX_RE)?.[0] ?? "";
															const next = [
																`${view.key}${suffix}`,
																...current.filter(
																	entry => entry.replace(THINKING_SUFFIX_RE, "") !== view.key,
																),
															];
															onDefaultRoleChange(role, next.join(","));
														}}
														className="flex items-center justify-between rounded-lg border border-fr-border-soft px-2.5 py-1.5 text-fr-xs text-fr-text-2 transition-colors hover:border-fr-accent-line hover:text-fr-text"
													>
														<span>{role}</span>
														<span className="font-secondary text-fr-2xs text-fr-text-3">assign</span>
													</button>
												))}
										</div>
									)}
									{insights && (
										<div className="flex flex-col gap-2 border-t border-fr-border-soft pt-3">
											<span className="text-fr-xs font-medium text-fr-text-2">Role shortlist deltas</span>
											{["default", "slow", "vision"].flatMap(role => {
												const candidate = roleCandidates({
													roleId: role,
													models,
													insights,
													currentPattern: defaultRoles?.[role],
													limit: 1,
												}).candidates[0];
												return candidate
													? [
															<span
																key={`${role}/${candidate.pattern}`}
																className="rounded-lg bg-fr-surface-2 px-2.5 py-2 text-fr-2xs text-fr-text-3"
															>
																<span className="font-medium text-fr-text-2">
																	{candidate.record.label}
																</span>
																<br />
																{candidate.deltas.map(delta => delta.text).join(" · ") ||
																	candidate.stat}
															</span>,
														]
													: [];
											})}
										</div>
									)}
								</aside>
							</div>
						</section>
					)}
				</div>
			</div>
		</div>
	);
}

import type { EngineSpacePluginState, EngineSpaceRecord } from "@fraym-ai/driver";

/** The verbose, HONEST install plan for a Space — the labor illusion done right:
 *  every step maps to a REAL operation (install/enable a required plugin, enable
 *  the space, wire it), and a dependency that is already installed + enabled is
 *  NOT shown (faking work the system isn't doing fails the ethics gate). The plan
 *  is the actual delta being applied, ending on a strong "ready" moment. */

export type SpaceInstallStepStatus = "pending" | "active" | "done" | "error";
export type SpaceInstallStepKind = "resolve" | "dependency" | "space" | "wire" | "ready";

export interface SpaceInstallStep {
	readonly id: string;
	readonly kind: SpaceInstallStepKind;
	/** The verbose action line, e.g. "Installing Web preview". */
	readonly label: string;
	/** The quiet secondary line — what the thing IS. */
	readonly detail?: string;
	/** The plugin this step installs/enables (dependency + space steps). */
	readonly pluginId?: string;
	readonly status: SpaceInstallStepStatus;
	/** Present only when status === "error". */
	readonly error?: string;
}

/** Specific, honest copy for the known first-party dependency plugins. Unknown
 *  ids fall back to a humanized label so third-party deps still read cleanly. */
const DEP_COPY: Record<string, { readonly label: string; readonly detail: string }> = {
	"artifactory-web": { label: "Web preview", detail: "HTML · landing pages · live apps" },
	"artifactory-doc": { label: "Documents", detail: "Markdown briefs, posts, notes" },
	"artifactory-image": { label: "Images", detail: "Art, key art, thumbnails" },
	"artifactory-deck": { label: "Slide decks", detail: "Filmstrip · per-slide stage" },
	"studio-design-systems": { label: "Design systems", detail: "Reusable brand kits" },
	"studio-pipelines": { label: "Pipeline examples", detail: "Starter prompts" },
};

/** "artifactory-web" -> "Artifactory web" — a readable fallback for ids with no
 *  curated copy (third-party dependency plugins). */
export function humanizePluginId(id: string): string {
	const spaced = id.replace(/[-_]+/g, " ").trim();
	return spaced.length === 0 ? id : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function dependencyCopy(pluginId: string): { readonly label: string; readonly detail: string } {
	return DEP_COPY[pluginId] ?? { label: humanizePluginId(pluginId), detail: pluginId };
}

export interface PluginReadiness {
	readonly installed: boolean;
	readonly enabled: boolean;
}

/** Resolves the install/enable state of any plugin id (a required dependency or
 *  the space's own owning plugin). `undefined` = unknown to the snapshot → treated
 *  as not-installed (a real install step). */
export type PluginStateLookup = (pluginId: string) => PluginReadiness | undefined;

export interface SpaceInstallPlanInput {
	readonly space: EngineSpaceRecord;
	/** The plugin that owns this space (must end enabled). */
	readonly ownerPluginId?: string;
	readonly ownerState?: EngineSpacePluginState;
	/** State of each required dependency plugin. */
	readonly stateOf: PluginStateLookup;
}

/** Derive the ordered, honest step plan. Steps appear ONLY for real work:
 *  a ready dependency is skipped, a disabled-but-installed one becomes "Enabling",
 *  a missing one becomes "Installing". The terminal "ready" step is always present
 *  (Peak-End: the journey finishes on the strongest moment). */
export function spaceInstallPlan(input: SpaceInstallPlanInput): SpaceInstallStep[] {
	const { space, stateOf, ownerPluginId, ownerState } = input;
	const deps = space.requires?.plugins ?? [];
	const steps: SpaceInstallStep[] = [];

	const depSteps: SpaceInstallStep[] = [];
	for (const dep of deps) {
		const state = stateOf(dep);
		if (state?.installed === true && state?.enabled === true) continue; // already present — never fake a step
		const copy = dependencyCopy(dep);
		const verb = state?.installed && !state.enabled ? "Enabling" : "Installing";
		depSteps.push({
			id: `dep:${dep}`,
			kind: "dependency",
			pluginId: dep,
			label: `${verb} ${copy.label}`,
			detail: copy.detail,
			status: "pending",
		});
	}

	// Resolve appears ONLY when dependencies actually need adding — a space whose
	// deps are all present shows no resolve/wire theatrics (isNoOpPlan → "ready").
	if (depSteps.length > 0) {
		steps.push({
			id: "resolve",
			kind: "resolve",
			label: `Resolving ${space.label}'s dependencies`,
			detail: `${depSteps.length} to add`,
			status: "pending",
		});
		steps.push(...depSteps);
	}

	if (ownerPluginId && !(ownerState?.installed === true && ownerState?.enabled === true)) {
		const verb = ownerState?.installed ? "Enabling" : "Installing";
		steps.push({
			id: "space",
			kind: "space",
			pluginId: ownerPluginId,
			label: `${verb} ${space.label}`,
			detail: "the space itself",
			status: "pending",
		});
	}

	if (steps.length > 0) {
		const surfaces = space.workspace.surfaces.length;
		steps.push({
			id: "wire",
			kind: "wire",
			label: "Wiring the workspace",
			detail: `${surfaces} surface${surfaces === 1 ? "" : "s"}`,
			status: "pending",
		});
	}

	steps.push({
		id: "ready",
		kind: "ready",
		label: `${space.label} is ready`,
		detail: "Open it from the rail",
		status: "pending",
	});

	return steps;
}

/** True when the plan has no real work — the space and every dependency are
 *  already installed + enabled (only the terminal "ready" step remains). A
 *  first-party bundled space hits this: install is instant + honest. */
export function isNoOpPlan(steps: readonly SpaceInstallStep[]): boolean {
	return steps.every(step => step.kind === "ready");
}

// ── Pure step transitions (the reducer the progress hook drives) ─────────────

export function withStepStatus(
	steps: readonly SpaceInstallStep[],
	id: string,
	status: SpaceInstallStepStatus,
	error?: string,
): SpaceInstallStep[] {
	return steps.map(step =>
		step.id === id ? { ...step, status, ...(status === "error" && error !== undefined ? { error } : {}) } : step,
	);
}

/** The first step not yet started — the next unit of real work, or undefined
 *  when the plan is drained. */
export function firstPending(steps: readonly SpaceInstallStep[]): SpaceInstallStep | undefined {
	return steps.find(step => step.status === "pending");
}

/** Complete the active step and promote the next pending one to active. When no
 *  pending step remains, the plan is done. Errors are terminal — an errored step
 *  is never auto-advanced past. */
export function advance(steps: readonly SpaceInstallStep[]): SpaceInstallStep[] {
	if (steps.some(step => step.status === "error")) return [...steps];
	const active = steps.find(step => step.status === "active");
	const afterDone = active ? withStepStatus(steps, active.id, "done") : [...steps];
	const next = firstPending(afterDone);
	return next ? withStepStatus(afterDone, next.id, "active") : afterDone;
}

/** Kick the plan off: the first pending step becomes active. */
export function begin(steps: readonly SpaceInstallStep[]): SpaceInstallStep[] {
	const next = firstPending(steps);
	return next ? withStepStatus(steps, next.id, "active") : [...steps];
}

export function isComplete(steps: readonly SpaceInstallStep[]): boolean {
	return steps.length > 0 && steps.every(step => step.status === "done");
}

export function hasError(steps: readonly SpaceInstallStep[]): boolean {
	return steps.some(step => step.status === "error");
}

/** Progress as a 0..1 fraction of steps completed — for the header meter. */
export function installProgress(steps: readonly SpaceInstallStep[]): number {
	if (steps.length === 0) return 0;
	const done = steps.filter(step => step.status === "done").length;
	return done / steps.length;
}

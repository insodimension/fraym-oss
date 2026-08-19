import { createContext, type ReactNode, use } from "react";

/**
 * How the model picker groups its models. `"all"` (default) keeps the aggregate
 * categories — a "Current" group for the active model and an "All available"
 * capability group — beside one group per provider. `"providers-only"` drops
 * both aggregates so the picker shows nothing but provider groups.
 *
 * A host that ships exactly ONE provider gets no information from the
 * aggregates: "Current" restates a row that is already visible (and already
 * checkmarked) inside its provider group, and "All available" restates that
 * provider's whole list. For such a deployment the two extra headings are pure
 * noise, so it opts into `"providers-only"`.
 */
export type ModelPickerGroups = "all" | "providers-only";

/**
 * Deployment-wide appearance gates: allowlists that narrow the in-app galleries
 * to a curated subset, so a white-label / embedded deployment can ship (say) a
 * single Vibr and a single wisp. `undefined` ⇒ no gate (the full gallery shows).
 *
 * Provided once at the Fraym root from the deployment profile and read by the
 * deep Appearance pickers via {@link useDeploymentGates}, so new gates cost one
 * field here + one read at the leaf instead of prop-drilling through the frame.
 *
 * Provider visibility is deliberately NOT here: it is filtered at the engine
 * resource snapshot (before the React tree mounts), see `fraym-root-core`.
 */
export interface DeploymentGates {
	/** Allowlisted Vibr (avatar) ids; `undefined`/empty ⇒ all. */
	readonly enabledAvatars?: readonly string[];
	/** Allowlisted stream-wisp preset ids (`"auto"` included if listed); `undefined`/empty ⇒ all. */
	readonly enabledWisps?: readonly string[];
	/** Provider ids whose OAuth login is hidden (API-key connection only); others unaffected. */
	readonly apiKeyOnlyProviderIds?: readonly string[];
	/** Show the "bring your own company gateway" setup card on the Connections page.
	 *  `undefined`/`true` ⇒ shown; `false` hides it for a curated/white-label deployment. */
	readonly enterpriseGatewaySetup?: boolean;
	/** How the model picker groups models; `undefined` ⇒ `"all"`. See {@link ModelPickerGroups}. */
	readonly modelPickerGroups?: ModelPickerGroups;
}

const EMPTY_GATES: DeploymentGates = {};
const DeploymentGatesContext = createContext<DeploymentGates>(EMPTY_GATES);

export function DeploymentGatesProvider({
	value,
	children,
}: {
	readonly value: DeploymentGates;
	readonly children: ReactNode;
}) {
	return <DeploymentGatesContext.Provider value={value}>{children}</DeploymentGatesContext.Provider>;
}

export function useDeploymentGates(): DeploymentGates {
	return use(DeploymentGatesContext);
}

/**
 * Filter id-keyed gallery options by an allowlist, preserving order. An absent or
 * empty allowlist (no gate) returns the input by reference. A non-empty allowlist
 * that matches nothing also falls back to the full list, so a mis-typed gate can
 * never strand a deployment with an empty picker.
 */
export function applyGate<T extends { readonly id: string }>(
	options: readonly T[],
	allow: readonly string[] | undefined,
): readonly T[] {
	if (!allow || allow.length === 0) return options;
	const set = new Set(allow);
	const filtered = options.filter(option => set.has(option.id));
	return filtered.length > 0 ? filtered : options;
}

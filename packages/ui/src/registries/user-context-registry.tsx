// UserContextRegistry — the pluggable contract for INSERTED user-message context:
// a machine- or plugin-composed user message (an autonomy loop tick, a skill/plugin
// wake-up, a scheduled prompt) renders as its DEFINED chip instead of a raw text
// wall. Mirrors the house registry idiom (ToolRendererRegistry /
// SurfaceRendererRegistry: provider + hook + resolver + built-in defaults), so
// realms / plugins / extensions register a context chip the same way they register
// a tool renderer.
//
// Contract: a RESOLVER claims a user message — it inspects the message (joined
// text, raw blocks, customType) and returns its chip node, or null to decline.
// First claim wins: provider-registered resolvers are consulted before the
// built-ins, in registration order. An unclaimed message falls through to the
// ordinary user bubble — this registry never swallows human text (resolvers must
// match exact machine-composed shapes, not vibes).

import { createContext, type ReactNode, use, useMemo } from "react";
import type { MessageBlock } from "../features/message/message";
import { LoopTickBadge, parseLoopTickMessage } from "../features/thread/loop-tick-badge";

/** What a resolver inspects to claim a user message. */
export interface UserContextInput {
	/** The message's text blocks joined — what text-shaped matchers parse. */
	readonly text: string;
	/** The raw blocks, for resolvers that need more than text (attachments, …). */
	readonly blocks: readonly MessageBlock[];
	/** The transcript entry's customType, when the engine stamped one. */
	readonly customType?: string;
}

/** Claim a user message: return the chip that REPLACES the plain bubble, or null
 *  to decline. Resolvers must match exact machine-composed shapes — a resolver
 *  that could claim ordinary human prose is a bug. */
export type UserContextResolver = (input: UserContextInput) => ReactNode | null;

/** Registrations keyed by a stable id (e.g. "loop-tick"). Re-using a built-in's
 *  id overrides that built-in; a resolver returning null for everything disables it. */
export type UserContextMap = Readonly<Record<string, UserContextResolver>>;

/** Built-in context chips. The autonomy loop tick is the first claimant: the
 *  scheduler's wake-up prompt renders as the orbit chip instead of raw text. */
export const DEFAULT_USER_CONTEXTS: UserContextMap = {
	"loop-tick": input => {
		const tick = parseLoopTickMessage(input.text);
		return tick ? <LoopTickBadge tick={tick} /> : null;
	},
};

const UserContextContext = createContext<UserContextMap | null>(null);
const EMPTY: UserContextMap = Object.freeze({});

export interface UserContextProviderProps {
	readonly contexts: UserContextMap;
	readonly replace?: boolean;
	readonly children: ReactNode;
}

/** Provide (or extend) the user-context map. Nested providers merge by default. */
export function UserContextProvider({ contexts, replace = false, children }: UserContextProviderProps) {
	const parent = use(UserContextContext);
	const value = useMemo<UserContextMap>(
		() => (replace || !parent ? contexts : { ...parent, ...contexts }),
		[parent, contexts, replace],
	);
	return <UserContextContext.Provider value={value}>{children}</UserContextContext.Provider>;
}

/** Read the active user-context overrides (empty when no provider is mounted). */
export function useUserContextMap(): UserContextMap {
	return use(UserContextContext) ?? EMPTY;
}

/**
 * Resolve a user message against the registry: provider-registered resolvers
 * first (registration order), then the built-ins a provider hasn't overridden.
 * Returns the claiming chip, or null — the caller renders the ordinary bubble.
 */
export function resolveUserContext(map: UserContextMap, input: UserContextInput): ReactNode | null {
	for (const resolver of Object.values(map)) {
		const node = resolver(input);
		if (node !== null && node !== undefined) return node;
	}
	for (const [id, resolver] of Object.entries(DEFAULT_USER_CONTEXTS)) {
		if (id in map) continue;
		const node = resolver(input);
		if (node !== null && node !== undefined) return node;
	}
	return null;
}

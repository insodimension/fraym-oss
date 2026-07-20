import type {
	EngineMarketplacePlugin,
	EnginePluginRecord,
	EngineSpacePluginState,
	EngineSpaceRecord,
} from "@fraym/driver";
import type { SpaceUiDef } from "./space-def";

/** A space the host compiled into its shell configuration. It has no plugin
 * owner, install action, or enable toggle. */
export interface CompiledSpaceStoreRecord {
	readonly source: "compiled";
	readonly space: SpaceUiDef;
}

/** A pure-data space contribution carried by the engine resource snapshot. */
export interface PluginSpaceStoreRecord {
	readonly source: "plugin";
	readonly space: EngineSpaceRecord;
	readonly pluginState: EngineSpacePluginState;
	/** The installed owner record when the snapshot contains this contribution's
	 * exact `pluginId`; no display-name matching is permitted. */
	readonly installedPlugin?: EnginePluginRecord;
	/** Every marketplace entry with an exact manifest name match. Multiple
	 * sources remain explicit so install routing never picks a registry by
	 * guesswork. */
	readonly marketplaceCandidates: readonly EngineMarketplacePlugin[];
}

/** Inputs to the pure Space Store projection. `spaces` and `installedPlugins`
 * come from the resource snapshot; `marketplacePlugins` comes from the
 * marketplace controller's catalog. */
export interface SpaceStoreSpacesInput {
	readonly compiledSpaces?: readonly SpaceUiDef[];
	readonly spaces?: readonly EngineSpaceRecord[];
	readonly installedPlugins?: readonly EnginePluginRecord[];
	/** Optional resource-derived state keyed by contribution space id. When
	 * supplied, this is the explicit store state; installed records remain
	 * available for owner identity and a safe fallback. */
	readonly spacePluginStateById?: Readonly<Record<string, EngineSpacePluginState>>;
	readonly marketplacePlugins?: readonly EngineMarketplacePlugin[];
}

const EMPTY_MARKETPLACE_CANDIDATES: readonly EngineMarketplacePlugin[] = [];
/** The explicit store provenance contract. Consumers must branch on `source`,
 * never infer built-in status from an id, label, or missing plugin metadata. */
export type SpaceStoreRecord = CompiledSpaceStoreRecord | PluginSpaceStoreRecord;

export function compiledSpaceStoreRecord(space: SpaceUiDef): CompiledSpaceStoreRecord {
	return { source: "compiled", space };
}

export function pluginSpaceStoreRecord(
	space: EngineSpaceRecord,
	pluginState: EngineSpacePluginState,
	options?: {
		readonly installedPlugin?: EnginePluginRecord;
		readonly marketplaceCandidates?: readonly EngineMarketplacePlugin[];
	},
): PluginSpaceStoreRecord {
	return {
		source: "plugin",
		space,
		pluginState,
		...(options?.installedPlugin ? { installedPlugin: options.installedPlugin } : {}),
		marketplaceCandidates: options?.marketplaceCandidates ?? EMPTY_MARKETPLACE_CANDIDATES,
	};
}

/** Projects every known space into an explicit store record. Compiled definitions
 * stay first and distinct; plugin records retain engine snapshot order. A
 * marketplace candidate is attached only for an exact `name === pluginId`
 * identity match, and every matching source is retained for the install UI. */
export function spaceStoreSpaces({
	compiledSpaces = [],
	spaces = [],
	installedPlugins = [],
	spacePluginStateById,
	marketplacePlugins = [],
}: SpaceStoreSpacesInput): readonly SpaceStoreRecord[] {
	const installedById = new Map(installedPlugins.map(plugin => [plugin.id, plugin]));
	const marketplaceByPluginId = new Map<string, EngineMarketplacePlugin[]>();
	for (const marketplacePlugin of marketplacePlugins) {
		const candidates = marketplaceByPluginId.get(marketplacePlugin.name);
		if (candidates) candidates.push(marketplacePlugin);
		else marketplaceByPluginId.set(marketplacePlugin.name, [marketplacePlugin]);
	}
	const records: SpaceStoreRecord[] = compiledSpaces.map(compiledSpaceStoreRecord);
	for (const space of spaces) {
		const installedPlugin = installedById.get(space.pluginId);
		const pluginState = spacePluginStateById?.[space.id] ?? {
			installed: installedPlugin !== undefined,
			enabled: installedPlugin?.enabled ?? false,
		};
		records.push(
			pluginSpaceStoreRecord(space, pluginState, {
				...(installedPlugin ? { installedPlugin } : {}),
				marketplaceCandidates: marketplaceByPluginId.get(space.pluginId) ?? EMPTY_MARKETPLACE_CANDIDATES,
			}),
		);
	}
	return records;
}

export function isCompiledSpaceStoreRecord(record: SpaceStoreRecord): record is CompiledSpaceStoreRecord {
	return record.source === "compiled";
}

export function isPluginSpaceStoreRecord(record: SpaceStoreRecord): record is PluginSpaceStoreRecord {
	return record.source === "plugin";
}

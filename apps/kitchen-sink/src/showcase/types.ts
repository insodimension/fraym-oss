import type {
	MessageBlockRendererMap,
	ToolDefaultOpen,
	ToolDisplaySettings,
	ToolRendererMap,
} from "@fraym-ai/ui";
import type { SessionDriver, SessionRef } from "@fraym-ai/driver";
import type { VerberProfileId } from "@fraym-ai/verber";
import type { ComponentType, ReactNode } from "react";
import type { ControlsSchema } from "./controls";
import type { EntryDocs } from "./docs";

export type Tier = "guide" | "tokens" | "elements" | "components" | "features" | "pages";

/**
 * Live-conversation demo for an entry, consumed by the shared Demo Dock.
 * Declaring this on an entry makes it verifiable in a real, interactive thread —
 * the conversation lives in the dock, NOT embedded in the entry body.
 */
export interface EntryDemo {
	/** Stable factory — re-minted on Replay / speed change / entry switch. `speed` is a delay multiplier (1 = authored, <1 faster, >1 slower). */
	readonly createDriver: (opts?: { speed?: number }) => SessionDriver;
	readonly sessionRef: SessionRef;
	/** Scope this entry's tool renderer(s) to the dock thread only. */
	readonly renderers?: ToolRendererMap;
	/** Override message-block renderers in the dock thread (e.g. render `read` as a full card via the `tool` block). */
	readonly messageBlocks?: MessageBlockRendererMap;
	/** Tool-card expansion policy for the dock thread (tool demos use "all"). */
	readonly toolDefaultOpen?: ToolDefaultOpen;
	/** Dock header label (defaults to the entry name). */
	readonly title?: string;
	/** Optional presence node pinned beside the dock's working-status shimmer. */
	readonly presence?: ReactNode;
	/** Optional Verber profile for resolving the dock's working-status language from shared entry config. */
	readonly verberProfile?: VerberProfileId | ((values: Record<string, unknown>) => VerberProfileId | undefined);
	/** Extra tool-display settings merged into the dock thread (e.g. `groupConsecutiveTools`). */
	readonly threadSettings?: Partial<ToolDisplaySettings>;
}

/** A single navigable subsection in the kitchen sink. */
export interface ShowcaseEntry {
	/** Stable id, used in the `#tier/id` hash route. */
	readonly id: string;
	/** Display name shown in the nav and as the page H1. */
	readonly name: string;
	/** Optional sub-group label; clustered under its tier in the nav. */
	readonly group?: string;
	/** The demo body — renders its own description, import path, controls, and preview. */
	readonly Component: ComponentType;
	/** Optional live-conversation demo surfaced in the shared Demo Dock. */
	readonly demo?: EntryDemo;
	/** Declarative config schema (axes + modes). When set, the shell renders the generic Configuration panel and shares values with the preview + Demo Dock. */
	readonly config?: ControlsSchema;
	/** Structured documentation (anatomy, examples, API reference). */
	readonly docs?: EntryDocs;
}

export interface TierDef {
	readonly id: Tier;
	readonly label: string;
	readonly intro: string;
	readonly entries: readonly ShowcaseEntry[];
}

/** Stamp a sub-group label onto a cluster of entries (consumed by the nav's grouped view). */
export function withGroup(group: string, entries: readonly ShowcaseEntry[]): ShowcaseEntry[] {
	return entries.map(entry => ({ ...entry, group }));
}

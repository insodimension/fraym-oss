import type { ToolIconPolicy } from "@fraym/config";
import { DEFAULT_TOOL_ICON_POLICY } from "../../registries/tool-icon-policy";
import type { FraymDensity } from "../surface-kit";

export type ToolDefaultOpen = "none" | "failed" | "running" | "all";

/**
 * How the thread condenses a long agent turn.
 * - `simple` — window the live streaming turn to the last N blocks behind a "N earlier blocks collapsed" notice.
 * - `worked` — Codex-style: fold the turn's work (reasoning + tool calls) into one openable "Worked for Xs" disclosure, keeping the answer visible.
 */
export type ThreadCollapseMode = "simple" | "worked";

export interface ToolDisplaySettings {
	readonly defaultOpen?: ToolDefaultOpen;
	/** Card density applied to tool cards under this provider (overridable per-card). */
	readonly density?: FraymDensity;
	/** How long agent turns condense in the thread (default `worked`). */
	readonly collapseMode?: ThreadCollapseMode;
	/** When `collapseMode: "simple"`, how many blocks to show before windowing (default 10). */
	readonly maxVisibleBlocks?: number;
	/** How many recent turns to keep before windowing the very early ones (default 12). */
	readonly maxVisibleTurns?: number;
	/** Per-tool icon policy (exact + ordered globs) resolved over each card's kind icon. */
	readonly iconPolicy?: ToolIconPolicy;
	/** Coalesce runs of consecutive tool calls into one nested group card (default `false`). */
	readonly groupConsecutiveTools?: boolean;
	/** Minimum consecutive-call run length before a group forms (default 2). */
	readonly groupThreshold?: number;
}

export const DEFAULT_TOOL_DISPLAY_SETTINGS: Required<ToolDisplaySettings> = Object.freeze({
	defaultOpen: "none",
	density: "comfortable",
	collapseMode: "worked",
	maxVisibleBlocks: 10,
	maxVisibleTurns: 12,
	iconPolicy: DEFAULT_TOOL_ICON_POLICY,
	groupConsecutiveTools: false,
	groupThreshold: 2,
});
const DEFAULT_OPEN_STATUSES: Partial<Record<ToolDefaultOpen, ReadonlySet<string>>> = Object.freeze({
	failed: new Set(["failed", "error"]),
	running: new Set(["running", "waiting"]),
});

const TOOL_DEFAULT_OPEN_VALUES = new Set<string>(["none", "failed", "running", "all"]);

const TOOL_DEFAULT_OPEN_RULES = Object.freeze({
	all: () => true,
	failed: (status: string | null | undefined) => DEFAULT_OPEN_STATUSES.failed?.has(status ?? "") ?? false,
	none: () => false,
	running: (status: string | null | undefined) => DEFAULT_OPEN_STATUSES.running?.has(status ?? "") ?? false,
}) satisfies Record<ToolDefaultOpen, (status: string | null | undefined) => boolean>;

export function isToolDefaultOpen(value: string | null | undefined): value is ToolDefaultOpen {
	return typeof value === "string" && TOOL_DEFAULT_OPEN_VALUES.has(value);
}

export function resolveToolDefaultOpen(
	status: string | null | undefined,
	settings?: ToolDisplaySettings,
	explicitDefaultOpen?: boolean,
): boolean {
	if (explicitDefaultOpen !== undefined) return explicitDefaultOpen;
	// A LIVE (still-executing) tool streams open regardless of the user's
	// disclosure policy — TUI parity: a running tool always shows its streaming
	// body ("Eval running… but nothing streams", 2026-07-16; previously patched
	// per-tool in bash only). Completion hands control back to the policy: the
	// ToolCard defaultOpen effect re-applies it unless the user toggled.
	if (DEFAULT_OPEN_STATUSES.running?.has(status ?? "")) return true;
	const mode = settings?.defaultOpen ?? DEFAULT_TOOL_DISPLAY_SETTINGS.defaultOpen;
	return TOOL_DEFAULT_OPEN_RULES[mode](status);
}

// surface-kit — shared foundation for the agent-surface features. Holds the
// cross-cutting surface config types, density/tone style helpers, and small
// view-model helpers used by multiple feature folders. Knows only tokens + icons.

import type { TaskPhase } from "@fraym-ai/driver";
import type { IconName } from "../icons";

export type FraymDensity = "compact" | "comfortable" | "spacious";
export type FraymMotion = "system" | "reduced" | "full";
export type FraymSurfacePlacement = "inline" | "dock" | "modal" | "bottom" | "hidden";

export interface FraymSurfaceConfig {
	readonly density?: FraymDensity;
	readonly motion?: FraymMotion;
	readonly placement?: FraymSurfacePlacement;
	readonly visible?: boolean;
}

export type ComposerControlTone = "default" | "accent" | "add" | "warn" | "del" | "blue";

export type ToolTimelineStatus = "queued" | "running" | "waiting" | "success" | "failed";

export interface ToolMetadataItem {
	readonly id: string;
	readonly label: string;
	readonly value: React.ReactNode;
	readonly tone?: ComposerControlTone | "mute";
	readonly hidden?: boolean;
}

export interface DisplaySurfaceAction {
	readonly id: string;
	readonly label: string;
	readonly icon?: IconName;
	readonly variant?: "default" | "outline" | "ghost";
}

// ── Density as information architecture, not whitespace ──────────────────────
// The three density modes are deliberately DIFFERENT layouts, not the same
// layout with different padding. Each component switches on `mode` (or the
// `isCompact`/`isSpacious` flags) to pick a structurally distinct treatment:
//
//   compact      → "console": one hairline-divided line per item, mono-leaning,
//                  status as a single dot/glyph, no card chrome. Maximal density.
//   comfortable  → "card":    bordered surface cards, icon tile + label + one
//                  metadata line + badge. The balanced product default.
//   spacious     → "dashboard": large tinted icon tiles, two-line content with
//                  descriptions, progress meters, generous grouping. Editorial.
//
// The class tokens below tune the *within-mode* rhythm; the real differentiation
// lives in each feature's render branch. `card` is intentionally empty in compact
// so list features render a flat, divided surface instead of nested cards.
export interface DensityKit {
	readonly mode: FraymDensity;
	readonly isCompact: boolean;
	readonly isSpacious: boolean;
	/** flex/grid gap between sibling blocks */
	readonly gap: string;
	/** padding for a card/section interior */
	readonly pad: string;
	/** padding for a single list row */
	readonly row: string;
	/** body text size */
	readonly text: string;
	/** heading / title size */
	readonly title: string;
	/** secondary label / caption size */
	readonly label: string;
	/** card surface chrome (border + bg + radius); empty in compact */
	readonly card: string;
	/** glyph pixel size for the mode */
	readonly icon: number;
	/** icon-tile box size class */
	readonly tile: string;
	/** icon-tile corner radius class */
	readonly tileRadius: string;
}

const densityKit = {
	compact: {
		mode: "compact",
		isCompact: true,
		isSpacious: false,
		gap: "gap-px",
		pad: "p-2",
		row: "px-2 py-1",
		text: "text-fr-xs",
		title: "text-fr-sm",
		label: "text-fr-2xs",
		card: "",
		icon: 12,
		tile: "size-4",
		tileRadius: "rounded-[4px]",
	},
	comfortable: {
		mode: "comfortable",
		isCompact: false,
		isSpacious: false,
		gap: "gap-2",
		pad: "p-3",
		row: "px-3 py-2",
		text: "text-fr-sm",
		title: "text-fr-base",
		label: "text-fr-xs",
		card: "rounded-[10px] border border-fr-border-soft bg-fr-surface",
		icon: 14,
		tile: "size-7",
		tileRadius: "rounded-[8px]",
	},
	spacious: {
		mode: "spacious",
		isCompact: false,
		isSpacious: true,
		gap: "gap-3",
		pad: "p-4",
		row: "px-4 py-3",
		text: "text-fr-base",
		title: "text-fr-md",
		label: "text-fr-xs",
		card: "rounded-[14px] border border-fr-border bg-fr-surface",
		icon: 18,
		tile: "size-10",
		tileRadius: "rounded-[11px]",
	},
} as const satisfies Record<FraymDensity, DensityKit>;

export function resolveDensity(density?: FraymDensity): DensityKit {
	return densityKit[density ?? "comfortable"];
}

/** Solid fill color for a status dot / meter fill, keyed to the tone palette. */
export function dotToneClass(tone?: ComposerControlTone | "mute"): string {
	if (tone === "accent") return "bg-fr-accent";
	if (tone === "add") return "bg-fr-add";
	if (tone === "warn") return "bg-fr-warn";
	if (tone === "del") return "bg-fr-del";
	if (tone === "blue") return "bg-fr-blue";
	return "bg-fr-text-3";
}

export function toneClass(tone: ComposerControlTone | undefined, active?: boolean) {
	if (tone === "accent") return active ? "bg-fr-accent-dim text-fr-accent" : "text-fr-accent";
	if (tone === "add") return active ? "bg-fr-add-bg text-fr-add" : "text-fr-add";
	if (tone === "warn") return active ? "bg-fr-accent-dim text-fr-warn" : "text-fr-warn";
	if (tone === "del") return active ? "bg-fr-del-bg text-fr-del" : "text-fr-del";
	if (tone === "blue") return active ? "bg-fr-accent-dim text-fr-blue" : "text-fr-blue";
	return active ? "bg-fr-surface-2 text-fr-text" : "text-fr-text-2";
}

export function taskStatusTone(status: string): ComposerControlTone {
	if (status === "completed") return "add";
	if (status === "in_progress") return "accent";
	if (status === "abandoned") return "del";
	return "default";
}

export function taskStatusIcon(status: string): IconName {
	if (status === "completed") return "check";
	if (status === "in_progress") return "spark";
	if (status === "abandoned") return "x";
	return "clock";
}

export function taskCounts(phases: readonly TaskPhase[]) {
	const tasks = phases.flatMap(phase => phase.tasks);
	const completed = tasks.filter(task => task.status === "completed").length;
	const active = tasks.filter(task => task.status === "in_progress").length;
	return { total: tasks.length, completed, active };
}

export function currentTask(phases: readonly TaskPhase[]) {
	return phases.flatMap(phase => phase.tasks).find(task => task.status === "in_progress");
}

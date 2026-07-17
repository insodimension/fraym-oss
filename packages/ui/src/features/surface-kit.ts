import type { ReactNode } from "react";
import type { TaskPhase } from "@fraym/driver";

export type FraymDensity = "compact" | "comfortable" | "spacious";
export type FraymMotion = "system" | "reduced" | "full";
export type FraymSurfacePlacement = "inline" | "dock" | "modal" | "bottom" | "hidden";
export type ComposerControlTone = "default" | "accent" | "add" | "warn" | "del" | "blue";
export type ToolTimelineStatus = "queued" | "running" | "waiting" | "success" | "failed";

export interface FraymSurfaceConfig {
  readonly density?: FraymDensity;
  readonly motion?: FraymMotion;
  readonly placement?: FraymSurfacePlacement;
  readonly visible?: boolean;
}

export interface ToolMetadataItem {
  readonly id: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly tone?: ComposerControlTone | "mute";
  readonly hidden?: boolean;
}

export interface DisplaySurfaceAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly variant?: "default" | "outline" | "ghost";
}

export interface DensityKit {
  readonly mode: FraymDensity;
  readonly isCompact: boolean;
  readonly isSpacious: boolean;
  readonly gap: string;
  readonly pad: string;
  readonly row: string;
  readonly text: string;
  readonly title: string;
  readonly label: string;
  readonly card: string;
  readonly icon: number;
  readonly tile: string;
  readonly tileRadius: string;
}

const kits: Record<FraymDensity, DensityKit> = {
  compact: { mode: "compact", isCompact: true, isSpacious: false, gap: "fraym-density--tight", pad: "fraym-pad--compact", row: "fraym-row--compact", text: "fraym-text--xs", title: "fraym-text--sm", label: "fraym-text--2xs", card: "fraym-surface--flat", icon: 12, tile: "fraym-tile--compact", tileRadius: "fraym-radius--sm" },
  comfortable: { mode: "comfortable", isCompact: false, isSpacious: false, gap: "fraym-density--normal", pad: "fraym-pad--comfortable", row: "fraym-row--comfortable", text: "fraym-text--sm", title: "fraym-text--base", label: "fraym-text--xs", card: "fraym-surface--card", icon: 14, tile: "fraym-tile--comfortable", tileRadius: "fraym-radius--md" },
  spacious: { mode: "spacious", isCompact: false, isSpacious: true, gap: "fraym-density--loose", pad: "fraym-pad--spacious", row: "fraym-row--spacious", text: "fraym-text--base", title: "fraym-text--md", label: "fraym-text--xs", card: "fraym-surface--dashboard", icon: 18, tile: "fraym-tile--spacious", tileRadius: "fraym-radius--lg" },
};

export function resolveDensity(density: FraymDensity = "comfortable"): DensityKit { return kits[density]; }
export function dotToneClass(tone: ComposerControlTone | "mute" = "mute"): string { return `fraym-tone-dot--${tone}`; }
export function toneClass(tone: ComposerControlTone = "default", active = false): string { return `fraym-tone--${tone}${active ? " is-active" : ""}`; }
export function taskStatusTone(status: string): ComposerControlTone { return status === "completed" ? "add" : status === "in_progress" ? "accent" : status === "abandoned" ? "del" : "default"; }
export function taskStatusIcon(status: string): string { return status === "completed" ? "✓" : status === "in_progress" ? "✦" : status === "abandoned" ? "×" : "◷"; }
export function taskCounts(phases: readonly TaskPhase[]) { const tasks = phases.flatMap((phase) => phase.tasks); return { total: tasks.length, completed: tasks.filter((task) => task.status === "completed").length, active: tasks.filter((task) => task.status === "in_progress").length }; }
export function currentTask(phases: readonly TaskPhase[]) { return phases.flatMap((phase) => phase.tasks).find((task) => task.status === "in_progress"); }

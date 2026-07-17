import type { Entry } from "./entry";
import { entries } from "./entries";

export const tierIds = [
  "guide",
  "tokens",
  "elements",
  "components",
  "features",
  "pages",
] as const;

export type TierId = (typeof tierIds)[number];

export interface TierDefinition {
  readonly id: TierId;
  readonly label: string;
  readonly description: string;
}

export const tiers: readonly TierDefinition[] = [
  { id: "guide", label: "Getting Started", description: "Install, configure, and ship Fraym." },
  { id: "tokens", label: "Tokens", description: "Theme foundations and visual decisions." },
  { id: "elements", label: "Elements", description: "Small, composable interface primitives." },
  { id: "components", label: "Components", description: "Structured interface building blocks." },
  { id: "features", label: "Features", description: "Complete agent interaction patterns." },
  { id: "pages", label: "Pages", description: "Full application surfaces." },
];

export const guides = [
  { id: "introduction", title: "Introduction" },
  { id: "installation", title: "Installation" },
  { id: "quick-start", title: "Quick start" },
  { id: "drivers", title: "Drivers" },
  { id: "theming", title: "Theming" },
  { id: "architecture", title: "Architecture" },
] as const;

const componentIds = new Set([
  "diff-block", "collapsible", "menu", "confirm-dialog", "page-header",
  "filter-pills", "input-group", "selector-menu", "bottom-sheet", "dock-split",
  "tool-renderer-registry", "message-block-registry", "surface-renderer-registry",
  "command-tag-registry", "agent-setup", "form-sheet", "install-progress",
  "waiting-for-app", "oauth-popup", "approval-card", "reasoning-row",
]);

const pageIds = new Set(["streaming-thread"]);

export function tierFor(entry: Entry): Exclude<TierId, "guide"> {
  if (entry.id === "theme-engine" || entry.group === "tokens") return "tokens";
  if (pageIds.has(entry.id)) return "pages";
  if (componentIds.has(entry.id)) return "components";
  if (entry.group === "elements") return "elements";
  return "features";
}

export function entriesForTier(tier: TierId): readonly Entry[] {
  return tier === "guide" ? [] : entries.filter((entry) => tierFor(entry) === tier);
}


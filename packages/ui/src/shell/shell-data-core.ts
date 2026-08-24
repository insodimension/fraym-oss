import { DEFAULT_SESSION_FILTERS, type SessionFilters } from "@fraym-ai/config";
import type { EngineModelRecord, SessionConfig } from "@fraym-ai/driver";
import type { AvatarId } from "@fraym-ai/vibr";
import type { ModelSelection, PaletteCategory } from "../components";
import type { DockTab } from "../features/right-dock";
import type { PermissionDef } from "../features/permission-menu/permission-menu";
import type { RepoGroup } from "../features/session-rail/session-rail";
import type { SettingsNavItem } from "../pages";

export const DEFAULT_FILTERS: SessionFilters = DEFAULT_SESSION_FILTERS;

export const SESSIONS: RepoGroup[] = [
	{
		repo: "fraym-api",
		dot: "var(--fr-accent)",
		branch: "feat/ratelimit",
		items: [
			{ id: "s1", title: "Rate-limit auth middleware", time: "now", status: "working", active: true },
			{ id: "s2", title: "Refactor token refresh flow", time: "2h", status: "idle" },
			{ id: "s3", title: "Migrate sessions to Redis", time: "1d", status: "idle" },
		],
	},
	{
		repo: "fraym-web",
		dot: "var(--fr-blue)",
		branch: "main",
		items: [
			{ id: "s4", title: "Dark-mode token audit", time: "4h", status: "failed" },
			{ id: "s5", title: "Composer slash-command UX", time: "1d", status: "idle" },
			{ id: "s6", title: "Onboarding empty states", time: "3d", status: "idle" },
		],
	},
	{
		repo: "infra",
		dot: "var(--fr-add)",
		branch: "main",
		items: [
			{ id: "s7", title: "Bump CI runner to Node 22", time: "2d", status: "idle" },
			{ id: "s8", title: "Terraform state lock fix", time: "5d", status: "idle" },
		],
	},
];

export const DOCK_TABS: DockTab[] = [
	{ id: "preview", label: "Preview", icon: "eye" },
	{ id: "ide", label: "Code", icon: "folder" },
	{ id: "terminal", label: "Terminal", icon: "terminal" },
	{ id: "tasks", label: "Tasks", icon: "list" },
	{ id: "board", label: "Board", icon: "grid" },
	{ id: "insights", label: "Insights", icon: "spark" },
];

/** Resolve the dock tab set for a deployment: with `ids` (a profile allowlist)
 *  return those tabs in that order; otherwise the full catalog. Config-driven —
 *  the dock components render the result, no per-tab conditions. */
export function resolveDockTabs(ids?: readonly string[]): readonly DockTab[] {
	if (!ids) return DOCK_TABS;
	const byId = new Map(DOCK_TABS.map(tab => [tab.id, tab]));
	return ids.flatMap(id => {
		const tab = byId.get(id);
		return tab ? [tab] : [];
	});
}

export const AVATAR_OPTIONS: { id: AvatarId; label: string }[] = [
	{ id: "nebula", label: "Nebula" },
	{ id: "smiley", label: "Smiley" },
];

export const PALETTE_CMDS: PaletteCategory[] = [
	{
		name: "Session",
		items: [
			{ cmd: "/compact", desc: "Summarize and trim context", icon: "history" },
			{ cmd: "/diff", desc: "Show working-tree diff", icon: "diff" },
			{ cmd: "/pr", desc: "Commit and open pull request", icon: "arrowR" },
		],
	},
	{
		name: "Context and tools",
		items: [
			{ cmd: "/add", desc: "Attach files to context", icon: "file" },
			{ cmd: "/skill", desc: "Invoke a skill", icon: "spark" },
			{ cmd: "/model", desc: "Switch model and effort", icon: "gear" },
		],
	},
];

export const PERMS: PermissionDef[] = [
	{ id: "yolo", label: "Full access", desc: "Reads, writes & runs commands — no prompts", icon: "bolt", tone: "del" },
	{
		id: "write",
		label: "Ask on commands",
		desc: "Auto-approves edits; asks before shell commands",
		icon: "eye",
		tone: "warn",
	},
	{
		id: "always-ask",
		label: "Ask on edits & commands",
		desc: "Asks before any write or command",
		icon: "hand",
		tone: "add",
	},
];

/**
 * The composer model chip's content. Pass `models` (the resource snapshot's model
 * records) to opt into host branding: when the record bound to this session
 * carries a `logoUrl`, the chip shows that mark plus the BARE model name (the
 * segment after the last `/`), keeping the reasoning-effort segment. Without a
 * `logoUrl` — every existing consumer — the chip is unchanged: the full
 * `provider/model` id and no logo.
 */
export function modelSelectionFromConfig(
	config?: SessionConfig,
	models?: readonly EngineModelRecord[],
): ModelSelection | null {
	if (!config?.modelId && !config?.thinkingLevel) return null;
	// `||`, matching the truthiness test above. With `??` an empty-string modelId
	// passed the guard (a set thinkingLevel kept it alive) and then survived the
	// fallback, so the composer chip rendered a nameless model.
	const name = config?.modelId || "engine model";
	const effort = config?.thinkingLevel || "default";
	const branded = config?.modelId
		? models?.find(
				model =>
					Boolean(model.logoUrl) &&
					(model.modelId === config.modelId || `${model.providerId}/${model.modelId}` === config.modelId) &&
					(!config.provider || model.providerId === config.provider),
			)
		: undefined;
	if (!branded?.logoUrl) return { name, effort };
	return {
		name: name.slice(name.lastIndexOf("/") + 1),
		effort,
		logoUrl: branded.logoUrl,
		providerId: branded.providerId,
		providerName: branded.providerName,
	};
}

export const SET_NAV: SettingsNavItem[] = [
	{ id: "general", label: "General", icon: "gear" },
	{ id: "profile", label: "Profile", icon: "user" },
	{ id: "appearance", label: "Appearance", icon: "sun" },
	{ id: "keyboard", label: "Keyboard shortcuts", icon: "keyboard" },
];

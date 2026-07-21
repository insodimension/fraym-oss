import { resolveSlashEntryLayered, type SlashEntryPolicy, type SlashEntrySpec, slashEntryKey } from "@fraym-ai/config";
import { createContext, useContext, useMemo } from "react";
import { Icon, type IconName, iconPaths } from "../../icons";
import { cn } from "../../lib/cn";
import { DEFAULT_SLASH_ENTRY_POLICY } from "../../registries/slash-entry-policy";

// Slash-entry presentation resolver — the composer's consumer of the
// `SlashEntryPolicy` standard. Resolves a menu option's icon/label/hidden across
// four override layers (later wins): bundled default ▸ engine wire (option.icon)
// ▸ plugin (the plugin manifest) ▸ user (Fraym config). Falls back to the kind
// glyph when no layer supplies an icon.

/** The plugin + user policy layers, threaded from the Fraym root. The bundled
 *  default is always applied lowest; the engine-wire icon rides each option. */
export interface SlashEntryLayers {
	readonly plugin?: SlashEntryPolicy;
	readonly user?: SlashEntryPolicy;
}

const EMPTY_LAYERS: SlashEntryLayers = {};
const SlashEntryLayersContext = createContext<SlashEntryLayers>(EMPTY_LAYERS);

/** Provide the plugin + user slash-entry policy layers. Mount once near the Fraym
 *  root (beside ToolDisplaySettingsProvider); absent → only the bundled default +
 *  engine-wire icons apply. */
export function SlashEntryPolicyProvider({
	layers,
	children,
}: {
	readonly layers: SlashEntryLayers;
	readonly children: React.ReactNode;
}) {
	return <SlashEntryLayersContext.Provider value={layers}>{children}</SlashEntryLayersContext.Provider>;
}

export function useSlashEntryLayers(): SlashEntryLayers {
	return useContext(SlashEntryLayersContext);
}

/** Minimal shape the resolver needs from a slash option (structurally satisfied by
 *  `SlashCommandOption`). `value`/`label` yield the policy key; `icon` is the
 *  engine-wire layer; `kind` drives the fallback glyph. */
export interface SlashEntryTarget {
	readonly kind?: string;
	readonly value?: string;
	readonly label?: string;
	/** Engine-advertised icon (skill frontmatter / command def) — the wire layer. */
	readonly icon?: string;
}

// Kind → fallback glyph, used when NO policy layer supplies an icon. Guarded with
// `in` so an unknown/new engine kind can never produce an invalid <Icon> name
// (which would throw and blank the menu).
const SLASH_KIND_ICON: Record<string, IconName> = {
	command: "terminal",
	prompt: "chat",
	extension: "bolt",
	skill: "spark",
	file: "file",
	mention: "user",
	"command-arg": "caretR",
};

/** The kind fallback glyph for an option whose key matched no policy layer. */
export function slashKindIcon(kind: string | undefined): IconName {
	const icon = kind ? SLASH_KIND_ICON[kind] : undefined;
	return icon ?? "terminal";
}

/** Resolve one option's presentation across all four layers (lowest→highest):
 *  bundled default ▸ engine wire (`target.icon`) ▸ plugin ▸ user. Returns the
 *  merged spec, or null when no layer matched (caller uses the kind fallback). */
export function resolveSlashEntrySpec(target: SlashEntryTarget, layers: SlashEntryLayers): SlashEntrySpec | null {
	const key = slashEntryKey(target.value ?? target.label ?? "");
	if (!key) return null;
	const wire: SlashEntryPolicy | undefined = target.icon
		? { version: 1, exact: { [key]: { icon: target.icon } } }
		: undefined;
	return resolveSlashEntryLayered([DEFAULT_SLASH_ENTRY_POLICY, wire, layers.plugin, layers.user], key);
}

/** Hook form of {@link resolveSlashEntrySpec} — layers from context, memoized per option. */
export function useSlashEntrySpec(target: SlashEntryTarget): SlashEntrySpec | null {
	const layers = useSlashEntryLayers();
	const { kind, value, label, icon } = target;
	return useMemo(
		() => resolveSlashEntrySpec({ kind, value, label, icon }, layers),
		[kind, value, label, icon, layers],
	);
}

// An asset-reference icon (data-URI / URL / path) renders as an <img>; a bare
// glyph name renders as an <Icon>. Glyph names never contain "/".
function isAssetIcon(icon: string): boolean {
	return icon.startsWith("data:") || icon.includes("/");
}

/** Render a resolved slash-entry glyph: a policy image asset, a mono glyph, or the
 *  kind fallback. Pure (no hook) so the menu row and the committed-command pill
 *  share it after resolving once. */
export function SlashEntryGlyph({
	spec,
	kind,
	size,
	className,
	fallbackColor = "text-fr-text-3",
}: {
	readonly spec: SlashEntrySpec | null;
	readonly kind?: string;
	readonly size: number;
	readonly className?: string;
	/** Icon tint when the policy sets none — the menu row's muted default, or an
	 *  empty string to inherit the parent color (the accent-tinted committed pill). */
	readonly fallbackColor?: string;
}) {
	const icon = spec?.icon;
	if (icon && isAssetIcon(icon)) {
		return (
			<img
				src={icon}
				alt=""
				width={size}
				height={size}
				className={cn("shrink-0 rounded-[3px] object-contain", className)}
			/>
		);
	}
	const name: IconName = icon && icon in iconPaths ? (icon as IconName) : slashKindIcon(kind);
	return (
		<Icon
			name={name}
			size={size}
			strokeWidth={1.8}
			className={cn("shrink-0", spec?.color ?? fallbackColor, className)}
		/>
	);
}

import type { LayoutConfig } from "./layout-config";
import type { SlashEntryPolicy } from "./slash-entries";

export type ThemeMode = "dark" | "light" | "system";
export type MotionPref = "system" | "full" | "reduced";
export type AccentPalette =
  "theme" | "violet" | "coral" | "blue" | "green" | "amber" | "mono";
export type AccentStyle = "solid" | "gradient";
export type Density = "compact" | "comfortable" | "spacious";
export type TextScale = "sm" | "md" | "lg";
export type ToolOutputDefault = "none" | "failed" | "running" | "all";
export type TranscriptVerbosity = "summary" | "normal" | "verbose";
export type CollapseMode = "simple" | "worked";
export type VerberProfileSetting = "tui" | "codex" | "expressive" | "quiet";
export type DiffMarkers = "color" | "symbols";
export type StartupView = "last" | "new" | "home";
export type ComposerSendMode = "steer" | "followUp";
export type MdBoldColor = "default" | "soft" | "accent";
export type StreamWispPreset =
  | "auto"
  | "liquid"
  | "koi"
  | "duel"
  | "blade"
  | "ronin"
  | "lantern-moth"
  | "smiley"
  | "pixel";
export type StreamCursorPreset = StreamWispPreset;

export const THEME_MODES = ["dark", "light", "system"] as const;
export const MOTION_PREFS = ["system", "full", "reduced"] as const;
export const ACCENT_PALETTES = [
  "theme",
  "violet",
  "coral",
  "blue",
  "green",
  "amber",
  "mono",
] as const;
export const ACCENT_STYLES = ["solid", "gradient"] as const;
export const DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const TEXT_SCALES = ["sm", "md", "lg"] as const;
export const TOOL_OUTPUT_DEFAULTS = [
  "none",
  "failed",
  "running",
  "all",
] as const;
export const TRANSCRIPT_VERBOSITIES = ["summary", "normal", "verbose"] as const;
export const COLLAPSE_MODES = ["simple", "worked"] as const;
export const VERBER_PROFILE_SETTINGS = [
  "tui",
  "codex",
  "expressive",
  "quiet",
] as const;
export const STARTUP_VIEWS = ["last", "new", "home"] as const;
export const COMPOSER_SEND_MODES = ["steer", "followUp"] as const;
export const MD_BOLD_COLORS = ["default", "soft", "accent"] as const;
export const STREAM_WISP_PRESETS = [
  "auto",
  "liquid",
  "koi",
  "duel",
  "blade",
  "ronin",
  "lantern-moth",
  "smiley",
  "pixel",
] as const;
export const STREAM_CURSOR_PRESETS = STREAM_WISP_PRESETS;

export interface CustomProviderBrand {
  readonly displayName?: string;
  readonly logoUrl?: string;
}
export type SessionStatusFilter = "Active" | "Done" | "Archived" | "All";
export type SessionActivityWindow =
  "1h" | "6h" | "12h" | "1d" | "3d" | "7d" | "30d" | "All";
export type SessionGroupMode = "Project" | "Flat";
export type SessionRailStyle = "classic" | "threaded";
export type TextOverflow = "ellipsis" | "fade";
export type SessionSortMode = "Activity" | "Updated" | "Created" | "Name";
export type SessionMetadataMode = "Hide" | "Show";
export const SESSION_STATUS_FILTERS = [
  "Active",
  "Done",
  "Archived",
  "All",
] as const;
export const SESSION_ACTIVITY_WINDOWS = [
  "1h",
  "6h",
  "12h",
  "1d",
  "3d",
  "7d",
  "30d",
  "All",
] as const;
export const SESSION_GROUP_MODES = ["Project", "Flat"] as const;
export const SESSION_RAIL_STYLES = ["classic", "threaded"] as const;
export const TEXT_OVERFLOWS = ["ellipsis", "fade"] as const;
export const SESSION_SORT_MODES = [
  "Activity",
  "Updated",
  "Created",
  "Name",
] as const;
export const SESSION_METADATA_MODES = ["Hide", "Show"] as const;
export const SESSION_COLLAPSE_ALL = 9999;
export const SESSION_COLLAPSE_LIMITS = [
  5,
  10,
  15,
  20,
  SESSION_COLLAPSE_ALL,
] as const;

export interface SessionFilters {
  readonly status: SessionStatusFilter;
  readonly project: string;
  readonly activity: SessionActivityWindow;
  readonly group: SessionGroupMode;
  readonly sort: SessionSortMode;
  readonly metadata: SessionMetadataMode;
  readonly collapseAfter: number;
}
export type ProjectFilterOverride = Partial<
  Pick<SessionFilters, "status" | "activity" | "sort" | "collapseAfter">
>;
export type ProjectFilters = Readonly<Record<string, ProjectFilterOverride>>;
export const DEFAULT_SESSION_FILTERS: SessionFilters = Object.freeze({
  status: "All",
  project: "All",
  activity: "3d",
  group: "Project",
  sort: "Activity",
  metadata: "Hide",
  collapseAfter: 5,
});

export interface FraymUiConfig {
  readonly themeMode: ThemeMode;
  readonly accent: AccentPalette;
  readonly accentStyle: AccentStyle;
  readonly themePreset: string;
  readonly motion: MotionPref;
  readonly uiFont: string;
  readonly codeFont: string;
  readonly fontPreset: string;
  readonly uiFontSize: number;
  readonly codeFontSize: number;
  readonly translucentSidebar: boolean;
  readonly contrast: number;
  readonly pointerCursors: boolean;
  readonly diffMarkers: DiffMarkers;
  readonly density: Density;
  readonly textScale: TextScale;
  readonly showAvatars: boolean;
  readonly avatar: string;
  readonly vibrEnabled: boolean;
  readonly railVibr: boolean;
  readonly railVibrAllSessions: boolean;
  readonly transcriptVerbosity: TranscriptVerbosity;
  readonly collapseMode: CollapseMode;
  readonly maxVisibleBlocks: number;
  readonly maxVisibleTurns: number;
  readonly verberProfile: VerberProfileSetting;
  readonly streamWisp: boolean;
  readonly streamWispPreset: StreamWispPreset;
  readonly mdBoldWeight: number;
  readonly mdBoldColor: MdBoldColor;
  readonly showTokenUsage: boolean;
  readonly toolOutputDefault: ToolOutputDefault;
  readonly showReasoning: boolean;
  readonly groupConsecutiveTools: boolean;
  readonly groupThreshold: number;
  readonly startup: StartupView;
  readonly confirmBeforeApply: boolean;
  readonly autoSaveTranscripts: boolean;
  readonly telemetry: boolean;
  readonly composerSendWhileRunning: ComposerSendMode;
  readonly keybindingOverrides: Readonly<Record<string, readonly string[]>>;
  readonly customProviderBrands: Readonly<Record<string, CustomProviderBrand>>;
  readonly sessionFilters: SessionFilters;
  readonly sessionRailStyle: SessionRailStyle;
  readonly textOverflow: TextOverflow;
  readonly projectSessionFilters: ProjectFilters;
  readonly usageWarnEnabled: boolean;
  readonly usageWarnThreshold: number;
  readonly usageWarnRedThreshold: number;
  readonly usageWarnDismissed: Readonly<
    Record<string, { readonly tier: number; readonly resetsAt: number }>
  >;
  readonly studioPersona: string;
  readonly layout?: LayoutConfig;
  readonly slashEntries?: SlashEntryPolicy;
}

export const DEFAULT_FRAYM_UI_CONFIG: FraymUiConfig = Object.freeze({
  themeMode: "dark",
  accent: "theme",
  accentStyle: "solid",
  themePreset: "",
  motion: "system",
  uiFont: "",
  codeFont: "",
  fontPreset: "",
  uiFontSize: 14,
  codeFontSize: 12,
  translucentSidebar: true,
  contrast: 50,
  pointerCursors: true,
  diffMarkers: "color",
  density: "comfortable",
  textScale: "md",
  showAvatars: false,
  avatar: "blob",
  vibrEnabled: true,
  railVibr: true,
  railVibrAllSessions: false,
  transcriptVerbosity: "normal",
  collapseMode: "worked",
  maxVisibleBlocks: 10,
  maxVisibleTurns: 12,
  verberProfile: "tui",
  streamWisp: false,
  streamWispPreset: "auto",
  mdBoldWeight: 600,
  mdBoldColor: "default",
  showTokenUsage: true,
  toolOutputDefault: "none",
  showReasoning: true,
  groupConsecutiveTools: true,
  groupThreshold: 2,
  startup: "last",
  confirmBeforeApply: true,
  autoSaveTranscripts: true,
  telemetry: false,
  composerSendWhileRunning: "steer",
  keybindingOverrides: {},
  customProviderBrands: {},
  sessionFilters: { ...DEFAULT_SESSION_FILTERS },
  sessionRailStyle: "classic",
  textOverflow: "fade",
  projectSessionFilters: {},
  usageWarnEnabled: true,
  usageWarnThreshold: 60,
  usageWarnRedThreshold: 90,
  usageWarnDismissed: {},
  studioPersona: "",
});

type Key = keyof FraymUiConfig;
const enumValues: Partial<Record<Key, readonly string[]>> = {
  themeMode: THEME_MODES,
  accent: ACCENT_PALETTES,
  accentStyle: ACCENT_STYLES,
  motion: MOTION_PREFS,
  diffMarkers: ["color", "symbols"],
  density: DENSITIES,
  textScale: TEXT_SCALES,
  transcriptVerbosity: TRANSCRIPT_VERBOSITIES,
  collapseMode: COLLAPSE_MODES,
  verberProfile: VERBER_PROFILE_SETTINGS,
  streamWispPreset: STREAM_WISP_PRESETS,
  mdBoldColor: MD_BOLD_COLORS,
  toolOutputDefault: TOOL_OUTPUT_DEFAULTS,
  startup: STARTUP_VIEWS,
  composerSendWhileRunning: COMPOSER_SEND_MODES,
  sessionRailStyle: SESSION_RAIL_STYLES,
  textOverflow: TEXT_OVERFLOWS,
};
const numberRanges: Partial<Record<Key, readonly [number, number]>> = {
  uiFontSize: [8, 32],
  codeFontSize: [8, 32],
  contrast: [0, 100],
  maxVisibleBlocks: [1, 500],
  maxVisibleTurns: [1, 500],
  mdBoldWeight: [400, 700],
  groupThreshold: [2, 20],
  usageWarnThreshold: [5, 95],
  usageWarnRedThreshold: [5, 100],
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clamped(
  value: unknown,
  range: readonly [number, number],
): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(range[1], Math.max(range[0], value))
    : undefined;
}
function cleanStringMap(
  value: unknown,
): Readonly<Record<string, readonly string[]>> {
  if (!record(value)) return {};
  const output: Record<string, readonly string[]> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      key &&
      Array.isArray(item) &&
      item.length &&
      item.every(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      )
    )
      output[key] = item;
  }
  return output;
}
function cleanBrands(
  value: unknown,
): Readonly<Record<string, CustomProviderBrand>> {
  if (!record(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (!record(item)) return [];
      const brand = {
        ...(typeof item.displayName === "string" && item.displayName
          ? { displayName: item.displayName }
          : {}),
        ...(typeof item.logoUrl === "string" && item.logoUrl
          ? { logoUrl: item.logoUrl }
          : {}),
      };
      return [[key, brand]];
    }),
  );
}
function cleanDismissals(value: unknown): FraymUiConfig["usageWarnDismissed"] {
  if (!record(value)) return {};
  const output: Record<
    string,
    { readonly tier: number; readonly resetsAt: number }
  > = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      record(item) &&
      typeof item.tier === "number" &&
      typeof item.resetsAt === "number"
    )
      output[key] = { tier: item.tier, resetsAt: item.resetsAt };
  }
  return output;
}
function cleanFilters(value: unknown): SessionFilters {
  if (!record(value)) return { ...DEFAULT_SESSION_FILTERS };
  const choose = <T extends string>(
    candidate: unknown,
    values: readonly T[],
    fallback: T,
  ): T =>
    typeof candidate === "string" && values.includes(candidate as T)
      ? (candidate as T)
      : fallback;
  return {
    status: choose(
      value.status,
      SESSION_STATUS_FILTERS,
      DEFAULT_SESSION_FILTERS.status,
    ),
    project: typeof value.project === "string" ? value.project : "All",
    activity: choose(
      value.activity,
      SESSION_ACTIVITY_WINDOWS,
      DEFAULT_SESSION_FILTERS.activity,
    ),
    group: choose(
      value.group,
      SESSION_GROUP_MODES,
      DEFAULT_SESSION_FILTERS.group,
    ),
    sort: choose(value.sort, SESSION_SORT_MODES, DEFAULT_SESSION_FILTERS.sort),
    metadata: choose(
      value.metadata,
      SESSION_METADATA_MODES,
      DEFAULT_SESSION_FILTERS.metadata,
    ),
    collapseAfter:
      typeof value.collapseAfter === "number"
        ? Math.min(SESSION_COLLAPSE_ALL, Math.max(1, value.collapseAfter))
        : DEFAULT_SESSION_FILTERS.collapseAfter,
  };
}
function cleanProjectFilters(value: unknown): ProjectFilters {
  if (!record(value)) return {};
  const output: Record<string, ProjectFilterOverride> = {};
  for (const [project, raw] of Object.entries(value)) {
    if (!project || !record(raw)) continue;
    const next: Record<string, unknown> = {};
    if (
      typeof raw.status === "string" &&
      SESSION_STATUS_FILTERS.includes(raw.status as SessionStatusFilter)
    )
      next.status = raw.status;
    if (
      typeof raw.activity === "string" &&
      SESSION_ACTIVITY_WINDOWS.includes(raw.activity as SessionActivityWindow)
    )
      next.activity = raw.activity;
    if (
      typeof raw.sort === "string" &&
      SESSION_SORT_MODES.includes(raw.sort as SessionSortMode)
    )
      next.sort = raw.sort;
    if (typeof raw.collapseAfter === "number")
      next.collapseAfter = Math.min(
        SESSION_COLLAPSE_ALL,
        Math.max(1, raw.collapseAfter),
      );
    if (Object.keys(next).length) output[project] = next;
  }
  return output;
}
function migrateLayout(value: unknown): LayoutConfig | undefined {
  if (!record(value)) return undefined;
  const rewrite = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(rewrite)
      : record(input)
        ? Object.fromEntries(
            Object.entries(input).map(([key, item]) => [
              key,
              key === "id" &&
              typeof item === "string" &&
              item.startsWith("design-")
                ? `studio-${item.slice(7)}`
                : rewrite(item),
            ]),
          )
        : input;
  return rewrite(value) as LayoutConfig;
}

export function resolveFraymUiConfig(
  partial?: Partial<FraymUiConfig>,
): FraymUiConfig {
  if (!partial) return { ...DEFAULT_FRAYM_UI_CONFIG };
  const source = partial as Record<string, unknown>;
  const output: Record<string, unknown> = { ...DEFAULT_FRAYM_UI_CONFIG };
  const merged: Record<string, unknown> = {
    streamWisp: source.streamWisp ?? source.streamCursor,
    streamWispPreset: source.streamWispPreset ?? source.streamCursorPreset,
    studioPersona: source.studioPersona ?? source.designPersona,
    ...source,
  };
  for (const key of Object.keys(DEFAULT_FRAYM_UI_CONFIG) as Key[]) {
    const value = merged[key];
    if (value === undefined) continue;
    const allowed = enumValues[key];
    if (allowed) {
      if (typeof value === "string" && allowed.includes(value))
        output[key] = value;
      continue;
    }
    const range = numberRanges[key];
    if (range) {
      const next = clamped(value, range);
      if (next !== undefined) output[key] = next;
      continue;
    }
    const fallback = DEFAULT_FRAYM_UI_CONFIG[key];
    if (typeof fallback === "boolean") {
      if (typeof value === "boolean") output[key] = value;
      continue;
    }
    if (typeof fallback === "string") {
      if (typeof value === "string") output[key] = value;
      continue;
    }
    if (key === "keybindingOverrides") output[key] = cleanStringMap(value);
    else if (key === "customProviderBrands") output[key] = cleanBrands(value);
    else if (key === "sessionFilters") output[key] = cleanFilters(value);
    else if (key === "projectSessionFilters")
      output[key] = cleanProjectFilters(value);
    else if (key === "usageWarnDismissed") output[key] = cleanDismissals(value);
  }
  const layout = migrateLayout(source.layout);
  if (layout) output.layout = layout;
  if (record(source.slashEntries) && source.slashEntries.version === 1)
    output.slashEntries = source.slashEntries;
  return output as unknown as FraymUiConfig;
}

export function resolveActionKeys(
  config: Pick<FraymUiConfig, "keybindingOverrides">,
  actionId: string,
  canonicalKeys: readonly string[],
): readonly string[] {
  return config.keybindingOverrides[actionId] ?? canonicalKeys;
}
export function isToolOutputDefault(
  value: string | null | undefined,
): value is ToolOutputDefault {
  return TOOL_OUTPUT_DEFAULTS.includes(value as ToolOutputDefault);
}

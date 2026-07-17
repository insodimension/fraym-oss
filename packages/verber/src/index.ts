export type VerberProfileId =
  "tui" | "codex" | "expressive" | "quiet" | "custom";
export type BuiltInVerberProfileId = Exclude<VerberProfileId, "custom">;
export type VerberPhase =
  | "idle"
  | "queued"
  | "working"
  | "reasoning"
  | "typing"
  | "tool"
  | "waiting"
  | "complete"
  | "error";
export type VerberSource =
  "driver" | "tool-intent" | "tool" | "phase" | "rotator" | "hidden";
export type VerberToolKind =
  "search" | "read" | "run" | "edit" | "write" | "skill" | "mcp" | "unknown";
export interface VerberWorkingStatus {
  readonly message: string | null;
  readonly visible: boolean;
}
export interface VerberProfile {
  readonly id: VerberProfileId;
  readonly label: string;
  readonly fallback: Partial<Record<VerberPhase, string | null>>;
  readonly genericPhrases?: readonly string[];
  readonly toolVerbs?: Partial<Record<VerberToolKind, string>>;
  readonly rotateGeneric?: boolean;
  readonly honorDriverStatus?: boolean;
  readonly honorToolIntent?: boolean;
  readonly showToolFallback?: boolean;
}
export interface VerberInput {
  readonly profile?: VerberProfileId | VerberProfile;
  readonly customProfile?: VerberProfile;
  readonly phase?: VerberPhase;
  readonly workingStatus?: VerberWorkingStatus | null;
  readonly toolIntent?: string | null;
  readonly toolName?: string | null;
  readonly toolKind?: VerberToolKind | null;
  readonly tick?: number;
}
export interface VerberState {
  readonly text: string;
  readonly visible: boolean;
  readonly profile: VerberProfileId;
  readonly phase: VerberPhase;
  readonly source: VerberSource;
}

const TOOL_VERBS: Record<VerberToolKind, string> = {
  search: "Searching",
  read: "Reading",
  run: "Running",
  edit: "Editing",
  write: "Writing",
  skill: "Loading skill",
  mcp: "Calling MCP",
  unknown: "Working",
};
const expressive = [
  "Thinking",
  "Analyzing",
  "Processing",
  "Evaluating",
  "Researching",
  "Synthesizing",
  "Reviewing",
  "Working",
] as const;
const working = {
  queued: "Working",
  working: "Working",
  reasoning: "Working",
  typing: "Working",
  tool: "Working",
  waiting: "Waiting",
} as const;
const thinking = {
  queued: "Thinking",
  working: "Thinking",
  reasoning: "Thinking",
  typing: "Thinking",
  tool: "Thinking",
  waiting: "Waiting",
} as const;

export const VERBER_PROFILES: Record<BuiltInVerberProfileId, VerberProfile> =
  Object.freeze({
    tui: {
      id: "tui",
      label: "TUI",
      fallback: working,
      toolVerbs: TOOL_VERBS,
      showToolFallback: true,
    },
    codex: {
      id: "codex",
      label: "Codex",
      fallback: thinking,
      honorDriverStatus: false,
      honorToolIntent: false,
      showToolFallback: false,
    },
    expressive: {
      id: "expressive",
      label: "Expressive",
      fallback: { ...thinking, typing: "Composing", tool: "Working" },
      genericPhrases: expressive,
      rotateGeneric: true,
      showToolFallback: true,
      toolVerbs: {
        ...TOOL_VERBS,
        search: "Researching",
        read: "Reading context",
        run: "Running checks",
        edit: "Shaping edits",
        write: "Drafting",
        skill: "Loading expertise",
      },
    },
    quiet: {
      id: "quiet",
      label: "Quiet",
      fallback: { waiting: "Waiting", error: "Error" },
      toolVerbs: TOOL_VERBS,
      showToolFallback: false,
    },
  });
export const DEFAULT_VERBER_PROFILE_ID: BuiltInVerberProfileId = "tui";

const patterns: readonly [RegExp, VerberToolKind][] = [
  [/search|grep|find/, "search"],
  [/read|list|inspect/, "read"],
  [/edit|patch|update/, "edit"],
  [/write|create|draft/, "write"],
  [/skill/, "skill"],
  [/mcp/, "mcp"],
];
export function inferToolKind(toolName?: string | null): VerberToolKind {
  const name = toolName?.toLowerCase() ?? "";
  return name
    ? (patterns.find(([pattern]) => pattern.test(name))?.[1] ?? "run")
    : "unknown";
}
export function describeTool(
  toolName?: string | null,
  toolKind?: VerberToolKind | null,
  profile: VerberProfile = VERBER_PROFILES.tui,
): string {
  const kind = toolKind ?? inferToolKind(toolName);
  return (
    profile.toolVerbs?.[kind] ?? profile.toolVerbs?.unknown ?? TOOL_VERBS[kind]
  );
}
function clean(value: string | null | undefined): string {
  return value?.trim().replace(/\.+$/, "") ?? "";
}
function selectedProfile(
  value: VerberInput["profile"],
  custom: VerberProfile | undefined,
): VerberProfile {
  return typeof value === "object"
    ? value
    : value === "custom" && custom
      ? custom
      : value && value !== "custom"
        ? VERBER_PROFILES[value]
        : VERBER_PROFILES.tui;
}
function result(
  text: string,
  profile: VerberProfile,
  phase: VerberPhase,
  source: VerberSource,
): VerberState {
  return { text, visible: Boolean(text), profile: profile.id, phase, source };
}
export function resolveVerber(input: VerberInput = {}): VerberState {
  const phase = input.phase ?? "working";
  const profile = selectedProfile(input.profile, input.customProfile);
  const driver = clean(
    profile.honorDriverStatus !== false && input.workingStatus?.visible
      ? input.workingStatus.message
      : null,
  );
  if (driver) return result(driver, profile, phase, "driver");
  const intent = clean(
    profile.honorToolIntent !== false ? input.toolIntent : null,
  );
  if (intent) return result(intent, profile, phase, "tool-intent");
  if (
    profile.showToolFallback !== false &&
    (phase === "tool" || input.toolName || input.toolKind)
  )
    return result(
      describeTool(input.toolName, input.toolKind, profile),
      profile,
      phase,
      "tool",
    );
  if (
    profile.rotateGeneric &&
    ["working", "reasoning", "typing"].includes(phase) &&
    profile.genericPhrases?.length
  )
    return result(
      profile.genericPhrases[
        Math.abs(Math.floor(input.tick ?? 0)) % profile.genericPhrases.length
      ] ?? "",
      profile,
      phase,
      "rotator",
    );
  const fallback = clean(profile.fallback[phase]);
  return result(fallback, profile, phase, fallback ? "phase" : "hidden");
}
export function verberProfileIds(): readonly VerberProfileId[] {
  return ["tui", "codex", "expressive", "quiet"];
}

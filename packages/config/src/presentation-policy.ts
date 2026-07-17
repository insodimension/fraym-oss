import { globMatches } from "./glob";

export interface IconSpec {
  readonly icon: string;
  readonly color?: string;
}
export interface IconRule {
  readonly tool: string | readonly string[];
  readonly icon: string;
  readonly color?: string;
}
export interface ToolIconPolicy {
  readonly version: 1;
  readonly exact?: Readonly<Record<string, string | IconSpec>>;
  readonly rules?: readonly IconRule[];
}

export function resolveToolIcon(
  policy: ToolIconPolicy | undefined,
  toolName: string,
): IconSpec | null {
  const exact = policy?.exact?.[toolName];
  if (exact !== undefined)
    return typeof exact === "string" ? { icon: exact } : exact;
  const rule = policy?.rules?.find((candidate) =>
    globMatches(candidate.tool, toolName),
  );
  return rule
    ? { icon: rule.icon, ...(rule.color ? { color: rule.color } : {}) }
    : null;
}

export interface SlashEntrySpec {
  readonly icon?: string;
  readonly color?: string;
  readonly label?: string;
  readonly hidden?: boolean;
}
export interface SlashEntryRule extends SlashEntrySpec {
  readonly match: string | readonly string[];
}
export interface SlashEntryPolicy {
  readonly version: 1;
  readonly exact?: Readonly<Record<string, string | SlashEntrySpec>>;
  readonly rules?: readonly SlashEntryRule[];
}

export function slashEntryKey(value: string): string {
  return value.trim().replace(/^\/+/, "");
}

export function resolveSlashEntry(
  policy: SlashEntryPolicy | undefined,
  key: string,
): SlashEntrySpec | null {
  const exact = policy?.exact?.[key];
  if (exact !== undefined)
    return typeof exact === "string" ? { icon: exact } : exact;
  const rule = policy?.rules?.find((candidate) =>
    globMatches(candidate.match, key),
  );
  if (!rule) return null;
  const { match: _match, ...spec } = rule;
  return spec;
}

export function resolveSlashEntryLayered(
  policies: readonly (SlashEntryPolicy | undefined)[],
  key: string,
): SlashEntrySpec | null {
  let result: SlashEntrySpec | null = null;
  for (const policy of policies) {
    const next = resolveSlashEntry(policy, key);
    if (next)
      result = {
        ...(result ?? {}),
        ...Object.fromEntries(
          Object.entries(next).filter(([, value]) => value !== undefined),
        ),
      };
  }
  return result;
}

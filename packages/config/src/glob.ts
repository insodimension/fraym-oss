const cache = new Map<string, RegExp>();

export function globToRegExp(pattern: string): RegExp {
  const source = [...pattern]
    .map((character) =>
      character === "*"
        ? ".*"
        : character === "?"
          ? "."
          : character.replace(/[\\^$+.()|{}[\]]/g, "\\$&"),
    )
    .join("");
  return new RegExp(`^${source}$`, "i");
}

export function compiledGlob(pattern: string): RegExp {
  const found = cache.get(pattern);
  if (found) return found;
  const compiled = globToRegExp(pattern);
  cache.set(pattern, compiled);
  return compiled;
}

export function globMatches(
  pattern: string | readonly string[],
  value: string,
): boolean {
  return (Array.isArray(pattern) ? pattern : [pattern]).some((candidate) =>
    compiledGlob(candidate).test(value),
  );
}

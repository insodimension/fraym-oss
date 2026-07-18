export const BASE_PATH = {
	"file-code": "src/auth/login.ts",
	markdown: "README.md",
	directory: "src/",
	sqlite: "app.db",
	image: "assets/avatar.png",
	url: "https://example.com/docs/intro",
} as const;

// `:sel` suffix appended to the path for the selector axis. `summary` has none —
// it is a result detail (elided spans), not a path selector.
export const SEL_SUFFIX = {
	whole: "",
	range: ":50-100",
	"multi-range": ":5-16,40-80",
	raw: ":raw",
	summary: "",
	conflicts: ":conflicts",
} as const;

export const CODE_FULL = `import { signToken } from "./jwt";
import type { User, Session } from "./types";

export function login(user: User): Session {
  const token = signToken(user);
  const expires = Date.now() + 3_600_000;
  return { token, user, expires };
}

export function logout(session: Session): void {
  revoke(session.token);
}

export function refresh(session: Session): Session {
  if (session.expires < Date.now()) throw new Error("expired");
  return login(session.user);
}`;

export const CODE_RANGE = `  const token = signToken(user);
  const expires = Date.now() + 3_600_000;
  return { token, user, expires };
}`;

export const CODE_SUMMARY = `import { signToken } from "./jwt";
import type { User, Session } from "./types";

export function login(user: User): Session { .. }

export function logout(session: Session): void { .. }

export function refresh(session: Session): Session { … }`;

export const MD_TEXT = `# Fraym

Pluggable agent platform by **Fraym Labs**. Plug agents into anything.

## Hierarchy

- token → element → component → feature
- the \`read\` tool is a *feature*

> Build first, classify after.`;

export const URL_PREVIEW = `# Introduction

Welcome to the docs. This page is rendered in **reader mode** —
boilerplate stripped, content kept.

- Getting started
- Core concepts
- API reference

## Quick start

Install with \`bun add -d @fraym/cli @fraym/template-web-agent\`, then run
\`bunx fraym template install web-agent --dest ./my-agent --apply\`.

> Reader mode keeps prose, code, and links; it drops nav, ads, and chrome.`;

export const IMG_META = "image/png · 512 × 512 · 84 KB · RGBA";

// Directory + sqlite `list` render from TEXT — `renderRead` parses the listing into
// rows (the same `parseDirEntries` / `parseSqliteTables` path the live driver hits),
// so the showcase feeds the exact listing-text shape, not pre-parsed rows.
export const DIR_LISTING = `auth/
tools/
cli.ts        4.2 KB
index.ts      2.0 KB
config.json   812 B
README.md     6.1 KB`;

export const DB_LISTING = `users (1,240 rows)
sessions (88 rows)
migrations (12 rows)
audit_log (9,031 rows)`;


# CLI discovery — bootstrap from the source of truth

`@fraym-ai/cli` is the machine-readable way to discover what this checkout
actually ships, and to install templates transactionally. Prefer it over
memorized component/API lists: **the CLI reflects the branch's real API; your
memory does not.** Run it from the checkout root.

```bash
bun packages/cli/src/cli.ts <command> --json
```

Every response is a stable envelope (`packages/cli/src/contracts.ts`):

```ts
type CliEnvelope<T> =
  | { ok: true;  version: "1"; data: T }
  | { ok: false; version: "1"; error: { code: string; message: string; suggestion?: string } };
```

There are 14 stable error codes; branch on `code`, not on message text.

## Commands (`packages/cli/src/program.ts`)

### `manifest`
Self-describes every command, option, response type, and error code.
```bash
bun packages/cli/src/cli.ts manifest --json
# → CliEnvelope<CliManifest>: { name, version, globalOptions, commands[] }
```
Run this first on a fresh checkout to see the current command surface.

### `search <query> [--type element|component|feature|…] [--limit N]`
Deterministic token-relevance search over the public catalog.
```bash
bun packages/cli/src/cli.ts search button --type element --json
# → { query, type, results: [{ type, name, package, source, score }], total }
```
Use this to find the right primitive and its `source` path BEFORE writing a new
one — the answer includes the file to read (e.g. `src/elements/button.tsx`).

### `template <list|show|install>`
```bash
bun packages/cli/src/cli.ts template list --json
bun packages/cli/src/cli.ts template show web-agent --json
# dry-run (default): plans, writes nothing
bun packages/cli/src/cli.ts template install web-agent --dest ./my-agent --json
# apply the reviewed plan:
bun packages/cli/src/cli.ts template install web-agent --dest ./my-agent --apply
```
Install is **transactional** (`packages/cli/src/templates.ts`): dry-run by default
(`status:"planned"`), refuses collisions without `--overwrite`, rejects
path-escaping and static symlinks, writes via temp-file + atomic rename, and on
any failure restores backups and reports `rolledBack` / `partialRollback` /
`unrecovered`. Do not move the destination while an applied install runs.

### `doctor`
```bash
bun packages/cli/src/cli.ts doctor --json   # → DoctorReport (environment/health checks)
```

### `skills`
Discover and install bundled Fraym agent skills (this skill included) into a project's agent-harness directories.
```bash
bun packages/cli/src/cli.ts skills list --json
# dry-run (default): plans, writes nothing
bun packages/cli/src/cli.ts skills install build-with-fraym --dest <dir> --target both --json
# apply into .claude/skills/<id>/ and/or .codex/skills/<id>/
bun packages/cli/src/cli.ts skills install build-with-fraym --dest <dir> --target both --apply
```
`--target` is `claude` | `codex` | `both` (default both). Install uses the same transactional engine as `template`: dry-run unless `--apply`, refuses collisions without `--overwrite`, restores on failure. Errors: `CLI_SKILL_NOT_FOUND`, `CLI_SKILL_COLLISION`.

## Discipline

- On a fresh branch, run `manifest` then `search` for the surface you're touching —
  the docs prose can drift (it does; see gotchas), but the CLI reads the code.
- Preview template installs with a dry run and read the `InstallPlan`
  (`order`, `entries`, `collisions`, `summary`) before `--apply`.
- Treat a non-`ok` envelope's `suggestion` as the next action.

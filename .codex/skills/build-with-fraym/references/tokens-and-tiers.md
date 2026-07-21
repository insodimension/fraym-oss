# Tokens, tiers, and theming — the real state

DESIGN.md is the stated design contract and explains the *intent* (calm, dense,
dark-default cockpit; one violet accent; flat/border-driven depth). Read it for
the "why." This file records how the code **actually** works today, including the
two places where code and contract diverge — build against reality, not the prose.

## The live token system

Runtime components style themselves with the **`--fr-*`** custom properties defined
in `packages/ui/src/theme/theme.css` (1425 lines, `@import "tailwindcss"`, Tailwind
v4). `theme.css` exposes them as Tailwind utilities via `@theme inline {}`, so
components use classes like `bg-fr-surface`, `text-fr-text`, `text-fr-sm`,
`border-fr-border`, `bg-fr-accent`. That is how `elements/button.tsx`,
`elements/switch.tsx`, `features/tool-card/*` are written.

Consume tokens through those classes (with the `cn()` helper in
`packages/ui/src/lib/cn.ts` = `clsx` + `tailwind-merge`) and `class-variance-authority`
for variants. Do NOT hand-write hex, and avoid raw `px` outside the ramp
(`rounded-[8px]`/`gap-[7px]` exist in the codebase but are the exception to
minimize, not the pattern to copy).

Extra knobs the `--fr-*` system carries that you get for free: `--fr-ui-size`
(base 14px), `--fr-ui-scale` (size dial), `--fr-contrast` (user contrast dial),
per-`[data-accent]` palettes, light mode under `[data-theme="light"]`, diff/syntax
tokens, scrollbar + control tokens.

### The `.fraym-*` BEM layer (aliases the live palette)
`packages/ui/src/styles.css` (imported at `index.ts:1`) ships a `.fraym-*` BEM
class layer used by some surfaces (e.g. ApprovalCard, MessageSurface). Its
`--fraym-color-*` tokens now ALIAS the live `--fr-*` palette, so BEM surfaces and
Tailwind components share ONE color source and re-theme together (light mode,
presets, accent). For NEW work still prefer `--fr-*` / `*-fr-*` Tailwind classes
and don't add new `.fraym-*` BEM classes — but `var(--fraym-color-*)` is no longer
"dead"; it resolves to the live palette.

> The legacy `--fraym-*` parity assertions guard a namespace tier components
> don't render from. The runtime `--fr-*` layer is now ALSO guarded by
> `design-contract.test.ts` (including `--fr-accent`) — so a green suite means the
> LIVE theme is pinned, not just the legacy layer.

### Accent reality
The canonical SOLID accent is `--fr-accent: #7a60c1` (`theme.css:67`,
`[data-accent="violet"]:214`) — the documented contract (DESIGN.md, reconciled
2026-07-21) and now UNIFIED across both the Tailwind and `.fraym-*` BEM layers
(styles.css aliases `--fraym-color-accent` → `--fr-accent`). A brighter violet
(`#b78cff`) is reserved for the live/working glow and gradient-accent mode. Don't
hardcode a violet — use `--fr-accent`, `--fr-accent-dim`, `--fr-accent-line`,
`--fr-accent-ink`.

## Theme presets and accents (runtime-switchable)

Themes/accents are skins over the same structure, switched via the settings
contract — never separate designs:

```ts
import { useSettings } from "@fraym-ai/ui/settings";
const { config, update } = useSettings();
update("themePreset", "aerogel");   // theme.css | aerogel | architecture | cassette-futurism | liquid-glass
update("accentStyle", "gradient");  // solid | gradient
```

`@fraym-ai/ui/theme/theme-presets` exports `THEME_PRESETS` (name, note, full token
sets) — use it to build a picker. Preset CSS is subpath-exported from
`@fraym-ai/ui` (`./theme.css`, `./aerogel.css`, `./architecture.css`,
`./cassette-futurism.css`, `./liquid-glass.css`, `./fonts.css`). Settings persist
through the host's `fraymConfig` driver, so a user's choice survives reloads.

## Tiers

`@fraym-ai/ui` is layered; a tier imports only from tiers BELOW it:

```
theme (tokens)
  └ elements     single-purpose primitives, no session state (Button, Input, Select, Badge, Spinner…)
      └ components   domain-agnostic molecules (Menu, Popover, ModelPicker, CommandPalette…)
          └ features    agent-aware surfaces bound to the driver (thread, tool cards, composer, rail…)
              └ pages       full screens (settings, models, connections…)
```

Lower tiers are drop-in anywhere; higher tiers are batteries-included surfaces.
Build at the LOWEST tier that fits: a new control is an element; a session-aware
surface is a feature. Import from the matching subpath export:
`@fraym-ai/ui/elements`, `/components`, `/features`, `/theme`, `/settings`,
`/registries`, `/icons`, or the root barrel `@fraym-ai/ui` for the whole cockpit.

> **Enforced by `packages/ui/scripts/check-tiers.mjs`** (runs in `bun test`; also
> `bun run --cwd packages/ui check-tiers`). It flags any upward hop among the five
> canonical tiers — a `features/` import reaching UP into `pages/`, an `elements/`
> file importing a `components/` module, etc. Cross-cutting dirs (`hooks`, `lib`,
> `icons`, `vendor`, `registries`, `shell`, `settings`) are shared and exempt, so
> an `elements/` file importing a `hooks/` helper is allowed by design.

## Extensibility: the registries

Don't fork a feature to change how one thing renders — register a renderer. Five
React-Context registries (`packages/ui/src/registries/`) follow the same
Provider + `use*Map()` + `resolve*()` + fallback-key (`"*"`) pattern with merge
semantics:

- **Surface renderer** (`surface-renderer-registry.tsx`) — host-UI / message-channel surfaces.
- **Tool renderer** (`tool-renderer-registry.tsx`) — tool cards; normalizes names (`mcp__files__read` → `read`), falls back to a default card.
- **Message block** (`message-block-registry.tsx`) — message block types, groups adjacent blocks.
- **Command tag** (`command-tag-registry.tsx`) — resolves `/recipe`-style tags to labels.
- **User context** (`user-context-registry.tsx`).

Wrap your app in the relevant Provider and pass your renderer map (merged over the
defaults) to add a tool card or message type without touching the core package.

## Density

Surfaces are density-aware (`compact` / `comfortable` / `spacious`) via
`features/surface-kit.ts` — density changes LAYOUT structurally, not just padding
(see the thread's `beat`/`trace`/`turn` rhythm tokens in DESIGN.md). New features
should read density from the surface kit, not hardcode spacing.

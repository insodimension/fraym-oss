# `@fraym/ui`

## Contents

- [Purpose](#purpose)
- [Foundation](#foundation)
- [Tool renderers](#tool-renderers)
- [Session surface](#session-surface)

## Purpose

`@fraym/ui` is the React component library for Fraym's reusable agent surfaces.

## Foundation

The package exposes dark-first CSS custom-property tokens, typed token references, composable primitives, and an event-driven `Thread` that consumes `@fraym/driver` streams. `DESIGN.md` is the normative contract: graphite surface and text tiers, Fraym violet, IBM Plex typography, the 3/8/12/16/26 spacing ramp, and the 6/8/10/14 radius family are mirrored in `src/styles.css` and `src/tokens.ts`.

## Tool renderers

`ToolRendererProvider` adds typed tool-name renderers without coupling the thread to a harness. Providers merge when nested; resolution checks the exact name, a normalized lowercase name without `realm/` or `mcp__server__` prefixes, then the `"*"` fallback. Fraym ships read, edit, write, bash, search, todo, task, LSP, and generic fallback bodies inside the shared `ToolCard` disclosure shell.

## Session surface

`SessionThread` is the complete reusable conversation surface: the event-driven transcript, registered tool renderers, and the production `Composer` in one component. The composer supports auto-growth, Enter and Shift+Enter semantics, stop state while streaming, keyboard-navigable slash commands, pasted or dropped image previews, action slots, and a compact context-usage indicator. `Thread` remains available as the lower-level transcript-only primitive.

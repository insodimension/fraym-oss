# `@fraym/ui`

## Contents

- [Purpose](#purpose)
- [Foundation](#foundation)
- [Themes](#themes)
- [Elements](#elements)
- [Renderer registries](#renderer-registries)
- [Shared components](#shared-components)
- [Chat feature modules](#chat-feature-modules)
- [Tool renderers](#tool-renderers)
- [Session surface](#session-surface)
- [Approvals and reasoning](#approvals-and-reasoning)

## Purpose

`@fraym/ui` is the React component library for Fraym's reusable agent surfaces.

## Foundation

The package exposes dark-first CSS custom-property tokens, typed token references, composable primitives, and an event-driven `Thread` that consumes `@fraym/driver` streams. `DESIGN.md` is the normative contract: graphite surface and text tiers, Fraym violet, IBM Plex typography, the 3/8/12/16/26 spacing ramp, and the 6/8/10/14 radius family are mirrored in `src/styles.css` and `src/tokens.ts`.

## Themes

`ThemeProvider` owns mode, named preset, accent, font pairing, and motion resolution for standalone hosts. Import `@fraym/ui/fonts.css` and `@fraym/ui/theme.css` once, then use `useTheme()` for runtime controls. Eleven named presets and the Fraym default share the same semantic `--fr-*` contract; the checked-in token catalog under `/themes` exposes the same resolved values to non-React tooling.

## Elements

The `@fraym/ui/elements` entry point exposes the complete public primitive layer. It includes actions and feedback, native form controls, tabs and disclosure surfaces, settled and streaming Markdown, highlighted and plain code blocks, file mentions and file-type identity, animated counters, responsive capability hooks, diagrams, session boundaries, decorative interaction effects, refractive liquid-glass surfaces, and error recovery. The root `@fraym/ui` export re-exports the same elements for convenient composition.

Elements stay host-neutral: file opening and reveal behavior enter through `FileMentionProvider`, async persistence enters through `OptimisticToggle`, and session navigation enters through `SessionNavigationProvider` or a local callback. Decorative effects honor reduced-motion preferences, Mermaid loads only when a diagram is rendered, and liquid-glass surfaces retain translucent fallbacks when their field or WebGL is unavailable.

## Renderer registries

The `@fraym/ui/registries` entry point owns the renderer contract. Tool renderers may return a body or a rich `ToolView` that controls card identity, badges, status, statistics, disclosure, and body treatment. Resolution checks the exact tool name, its normalized realm or MCP name, and finally the wildcard renderer. Nested providers merge unless `replace` is enabled.

The same provider pattern powers message blocks, host-request/custom-message surfaces, and command tags. Message grouping, surface placement, and fallback behavior are exported as pure helpers so hosts can test their integrations without mounting the full thread. Generic installation, form, authorization, application-liveness, and conversational setup states live under the neutral `fix` catalog.

## Shared components

Reusable renderer-facing components are available from `@fraym/ui/components`: `DiffBlock`, `Collapsible`, coordinated menus, `ConfirmDialog`, `PageHeader`, filter pills, `InputGroup`, responsive `SelectorMenu`, `BottomSheet`, and `DockSplit`.

## Chat feature modules

The `@fraym/ui/features` entry point contains the complete host-neutral chat surface contract. Thread and message modules compose typed blocks through the renderer registries, preserve scroll position while a turn streams or collapses, group adjacent work traces, and expose message actions without binding to a session store. Tool-card and tool-metadata modules provide the shared body, expansion, grouping, and density policies consumed by registry renderers.

The composer accepts controlled or local drafts, slash commands, file mentions, image attachments, ordinary file attachments, and length-delimited `[[paste:...]]` disclosures. Session-keyed draft helpers preserve unsent work across remounts. Optional goal, quota, context, and permission surfaces consume typed props and callbacks; hosts supply their own data rather than importing a product runtime.

Host UI requests use one approval pipeline across modal, docked, and phone-sheet placements. Select, input, confirm, permission, and typed-field requests share the same response contract, while unknown request kinds retain a safe fallback. Permission menus and context breakdowns are responsive standalone features and do not require the complete thread.

## Tool renderers

`ToolRendererProvider` adds typed tool-name renderers without coupling the thread to a harness. Providers merge when nested; resolution checks the exact name, a normalized lowercase name without `realm/` or `mcp__server__` prefixes, then the `"*"` fallback. Fraym ships read, edit, write, bash, search, todo, task, LSP, and generic fallback bodies inside the shared `ToolCard` disclosure shell.

## Session surface

`SessionThread` is the complete reusable conversation surface: the event-driven transcript, registered tool renderers, and the production `Composer` in one component. The composer supports auto-growth, Enter and Shift+Enter semantics, stop state while streaming, keyboard-navigable slash commands, image and text-file attachments, neutral large-paste disclosures, action slots, and a compact context-usage indicator. `Thread` remains available as the lower-level transcript-only primitive.

## Approvals and reasoning

`SessionThread` renders `approval.request` events as inline decision cards and forwards the resulting typed `approval.response` through `onApprovalResponse`. Resolved cards remain in the chronological transcript as compact records. Streamed `reasoning.delta` events accumulate by message ID in a muted, collapsed `ReasoningRow`; the active row shows a thinking indicator and the complete trace remains expandable.

# `@fraym/ui`

## Contents

- [Purpose](#purpose)
- [Foundation](#foundation)
- [Elements](#elements)
- [Tool renderers](#tool-renderers)
- [Session surface](#session-surface)
- [Approvals and reasoning](#approvals-and-reasoning)

## Purpose

`@fraym/ui` is the React component library for Fraym's reusable agent surfaces.

## Foundation

The package exposes dark-first CSS custom-property tokens, typed token references, composable primitives, and an event-driven `Thread` that consumes `@fraym/driver` streams. `DESIGN.md` is the normative contract: graphite surface and text tiers, Fraym violet, IBM Plex typography, the 3/8/12/16/26 spacing ramp, and the 6/8/10/14 radius family are mirrored in `src/styles.css` and `src/tokens.ts`.

## Elements

The `@fraym/ui/elements` entry point exposes the complete public primitive layer. It includes actions and feedback, native form controls, tabs and disclosure surfaces, settled and streaming Markdown, highlighted and plain code blocks, file mentions and file-type identity, animated counters, responsive capability hooks, diagrams, session boundaries, decorative interaction effects, refractive liquid-glass surfaces, and error recovery. The root `@fraym/ui` export re-exports the same elements for convenient composition.

Elements stay host-neutral: file opening and reveal behavior enter through `FileMentionProvider`, async persistence enters through `OptimisticToggle`, and session navigation enters through `SessionNavigationProvider` or a local callback. Decorative effects honor reduced-motion preferences, Mermaid loads only when a diagram is rendered, and liquid-glass surfaces retain translucent fallbacks when their field or WebGL is unavailable.

## Tool renderers

`ToolRendererProvider` adds typed tool-name renderers without coupling the thread to a harness. Providers merge when nested; resolution checks the exact name, a normalized lowercase name without `realm/` or `mcp__server__` prefixes, then the `"*"` fallback. Fraym ships read, edit, write, bash, search, todo, task, LSP, and generic fallback bodies inside the shared `ToolCard` disclosure shell.

## Session surface

`SessionThread` is the complete reusable conversation surface: the event-driven transcript, registered tool renderers, and the production `Composer` in one component. The composer supports auto-growth, Enter and Shift+Enter semantics, stop state while streaming, keyboard-navigable slash commands, pasted or dropped image previews, action slots, and a compact context-usage indicator. `Thread` remains available as the lower-level transcript-only primitive.

## Approvals and reasoning

`SessionThread` renders `approval.request` events as inline decision cards and forwards the resulting typed `approval.response` through `onApprovalResponse`. Resolved cards remain in the chronological transcript as compact records. Streamed `reasoning.delta` events accumulate by message ID in a muted, collapsed `ReasoningRow`; the active row shows a thinking indicator and the complete trace remains expandable.

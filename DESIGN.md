---
version: alpha
name: Fraym
description: A calm, dense, dark-default agent surface with a single violet accent. One React core for rendering live agent sessions.
colors:
  primary: "#b78cff"
  primary-strong: "#a679ff"
  on-primary: "#0b0b0d"
  bg: "#0b0b0d"
  rail: "#0f0f12"
  surface: "#151518"
  surface-2: "#1c1c20"
  surface-3: "#222227"
  border: "#27272c"
  border-soft: "#1b1b1f"
  text: "#ececee"
  text-2: "#9a9aa2"
  text-3: "#65656d"
  success: "#62c08a"
  danger: "#e07a86"
  warning: "#e0b15b"
  info: "#5b8cff"
  iris: "#8f7bff"
typography:
  display:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  heading-xl:
    fontFamily: IBM Plex Sans
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  heading-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: IBM Plex Sans
    fontSize: 12.5px
    fontWeight: 500
    lineHeight: 1.3
  code:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: IBM Plex Mono
    fontSize: 11.5px
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: IBM Plex Mono
    fontSize: 10.5px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  full: 9999px
spacing:
  xs: 3px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 26px
  rail-width: 264px
  dock-width: 380px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  tool-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "12px"
  chip:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  input-field:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: 36px
  message-bubble-user:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  app-canvas:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
  session-rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.text-2}"
    width: "{spacing.rail-width}"
  diff-added-line:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.success}"
    typography: "{typography.code}"
  diff-removed-line:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.code}"
  status-warning:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
  link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.info}"
    typography: "{typography.body-md}"
---

# Fraym — Design Contract

The normative values live in the YAML tokens above; this prose explains *why* they
exist and how to apply them. The runtime source of truth in code is
`packages/ui/src/styles.css` (the `--fraym-*` custom properties) — those variables
must mirror these tokens. When the two disagree, this file wins and the CSS gets
re-synced.

## Overview

Fraym is an open-source React UI kit for coding agents. Its job is to turn a running
agent session into something you can watch, steer, and approve.

The personality is a **calm, dense, dark-default cockpit** — IDE-grade and
terminal-adjacent, not a consumer chat toy. The chrome recedes so the agent's work
leads: the transcript, tool cards, diffs, and live status are the heroes. A single
**violet accent** carries identity and interaction; everything else is graphite and
ink. The feel is precise, quiet, and engineered — restraint over decoration.

The system is **theme-able**: a light mode and accent palettes (violet, coral, blue,
green, amber, mono) exist as skins, and knobs may scale UI size, contrast, density,
and motion. But the **canonical identity is dark + violet**, and that is what these
tokens encode. Accents and light mode are skins over the same structure — never
separate designs.

## Colors

The palette is near-monochrome graphite with one reserved accent.

- **Primary / Accent (#b78cff):** "Fraym violet." The sole driver of identity and
  interaction — focus rings, active state, links, the live/working glow, primary
  CTAs. Used at full strength sparingly; far more often as a 14%-alpha fill
  (`accent-dim`) or 34%-alpha hairline (`accent-line`).
- **Canvas & surfaces:** A near-black `bg` (#0b0b0d) under stacked graphite tiers —
  `rail` (#0f0f12), `surface` (#151518), `surface-2` (#1c1c20), `surface-3`
  (#222227). Hierarchy is built by **stepping up a tier**, not by shadow.
- **Borders:** Hairline `border` (#27272c) and near-invisible `border-soft`
  (#1b1b1f) are the primary separators between surfaces.
- **Text tiers:** `text` (#ececee) for primary, `text-2` (#9a9aa2) for secondary,
  `text-3` (#65656d) for metadata/eyebrows.
- **Semantic signals:** `success`/add (#62c08a), `danger`/del (#e07a86), `warning`
  (#e0b15b), `info` (#5b8cff), and `iris` (#8f7bff). These drive diff add/remove,
  status, and tool outcomes — never decoration.

## Typography

Two families, two roles. The split is semantic, not stylistic.

- **IBM Plex Sans — the primary role.** All UI and prose: headings, body, titles,
  buttons. Quiet, neutral, readable at small sizes.
- **IBM Plex Mono — the secondary role.** Everything "machine": code, file paths,
  command output, metadata, and the **uppercase eyebrow/label caps** that head
  panels and tool cards (10.5px, `0.06em` tracking). Reaching for Mono signals
  "this is data," which keeps the prose calm.

The scale is a **hand-tuned ramp**, including deliberate half-pixel sizes at the
small end (`label` 12.5, `caption` 11.5, `eyebrow` 10.5) for cockpit density. Body
defaults to 14px / 1.5. Never hardcode raw px for type — use a level.

## Layout

The reference shell is a three-zone **app-shell grid**: a **session rail** (264px)
on the left, the message **thread** in the center, and a **right dock** (380px) for
plan/diff/terminal/files. Single-surface apps (like a showcase) keep the same
rhythm: fixed nav rail, generous centered content column.

Vertical rhythm in the thread is owned entirely by three density-scaled tokens,
not per-element margins:

- **beat (12px):** prose blocks within one message (the agent's "speech").
- **trace (3px):** consecutive reasoning/tool cards — the agent's work trace,
  grouped tight.
- **turn (26px):** message-to-message separation.

Density modes scale these as a set: **compact** (8 / 2 / 18) and **spacious**
(16 / 5 / 32). Spacing primitives elsewhere follow an 8px-ish step (`xs` 3, `sm` 8,
`md` 12, `lg` 16, `xl` 26).

## Elevation & Depth

**Flat and border-driven — depth without weight.** No heavy drop shadows.
Hierarchy comes from two devices:

1. **Tonal layering:** step from `bg` up through `surface` → `surface-2` →
   `surface-3` as elements come forward (cards, popovers, hover states).
2. **Hairline borders:** a 1px `border` (or `border-soft`) edge defines every
   surface against its neighbor.

The only "glow" is the **accent**: focus rings and live/working states use an
`accent-dim` ring (and a gentle pulse), never a colored shadow. Popovers sit on
`surface` with a border and the faintest shadow for separation — keep it subtle.

## Shapes

Restrained, slightly-soft rectangles. The base radius is **10px** (`lg`), with a
family of `sm` 6 / `md` 8 / `lg` 10 / `xl` 14 for cards, inputs, and bubbles. The
`full` (9999px) pill is reserved for **chips, tags, status badges, and avatars**.

## Components

Borders and surface-tier shifts do the work; color is reserved for the accent and
semantic signals.

- **Buttons.** `button-primary` is a solid violet fill with dark `on-primary` text and
  `label` type, `rounded.lg`; hover deepens to `primary-strong`. `button-ghost` is
  transparent with `text-2`, and on hover gains a `surface-2` fill and brightens to
  `text`. Most buttons are ghost; primary is for the one true action.
  `button-danger`: hairline danger-tinted border (34%-alpha) over `surface`,
  `danger` text, faint `danger` wash on hover. Reserved for destructive actions.
- **Tool cards.** `surface` fill, hairline border, `rounded.lg`, 12px padding, with
  a Mono `eyebrow` header and `body-sm` content. Collapsed tool calls render as a
  plain row (no card box); expanded gains the bordered card.
- **Chips / tags.** `surface-3` fill, `text-2`, Mono `caption`, `rounded.sm` — used
  for counts, tags, status, and metadata.
- **Inputs.** `surface-2` fill, `text`, `body-md`, `rounded.md`, 36px tall; focus
  shows an `accent-line` ring.
- **User message bubble.** `surface-2` fill, `rounded.xl`, right-aligned; the
  agent's message is unboxed and leads with content.

## Do's and Don'ts

- **Do** reserve violet for identity and interaction. One accent, used sparingly,
  is the whole point.
- **Do** use IBM Plex Mono for anything machine-shaped (code, paths, metadata, caps
  labels) and IBM Plex Sans for everything else.
- **Do** build hierarchy with surface tiers and hairline borders, and let the
  content (transcript, diffs, tool cards) lead.
- **Do** pull every size, radius, and color from a token / `--fraym-*` variable so
  theme and accent swaps keep working.
- **Don't** add heavy or colored drop shadows — this is a flat, tonal system.
- **Don't** introduce new accent hues per component, or use semantic colors
  (success/danger/warning) decoratively.
- **Don't** hardcode raw px outside the type/spacing ramp, and don't put small
  white text on the violet accent — keep on-accent text large/bold or use a
  darker ink.

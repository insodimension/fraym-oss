# @fraym/vibr

Animated presence avatars and physics-driven stream wisps.

## Contents

- [Presence](#presence)
- [Wisp](#wisp)
- [Registry](#registry)

## Presence

`Presence` selects one of the named avatar forms and maps shared idle, thinking,
typing, intent, and energy inputs onto it.

## Wisp

`Wisp` follows a mutable viewport target with spring, fall, wrap, impact, and
teleport behavior. `WispPreview` runs the same renderer in a local canvas.

## Registry

The preset registry owns kinship and compatibility between avatars and wisps.

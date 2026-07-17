# Fraym theme tokens (generated)

Resolved `--fr-*` token values, one file per theme. **Generated — do not edit by hand.**
Regenerate after changing `theme.css` or a preset:

```bash
bun run gen:themes   # → scripts/export-theme-tokens.ts
```

## The model

Fraym is **one structural design system** (token *names*, the type ramp, radii,
spacing, component recipes — see [`../DESIGN.md`](../DESIGN.md)) with **many themes
that re-bind the same `--fr-*` names**. Build against token **names**, never these
values — every theme just swaps what the names resolve to. These files are the
*resolved palette per theme*, for tools/agents that need to preview a specific theme.

## Files

- **`index.json`** — manifest with all theme IDs + pointers to their files.
- **`base.tokens.json`** — theme-invariant tokens (radius, type scale, spacing, geometry, font roles).
- **`<id>.tokens.json`** — `{ id, name, note, font, dark, light }`, where `dark`/`light`
  map each `--fr-*` name to its resolved value.

See `index.json` for the complete theme list and `base.tokens.json` for invariant tokens.
The 5 accent palettes (violet/coral/blue/green/amber) are orthogonal — they swap only
the accent hue and layer on top of any theme.

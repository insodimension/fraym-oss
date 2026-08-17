# Provider logo attribution

The SVG marks in this directory are third-party brand icons bundled so
`src/settings/provider-brand.ts` can render a provider tile offline. They are
**not** Fraym artwork. Our own brand art lives in `../brand/` and needs no
attribution.

Two upstream sources are represented here; the split was determined by
inspecting the markup of every file in this directory.

## LobeHub Icons — MIT (54 files)

Everything except `brave.svg` and `gitlab.svg` carries the
[`@lobehub/icons`](https://github.com/lobehub/lobe-icons) signature
(`height="1em" style="flex:none;line-height:1"`, `viewBox="0 0 24 24"`, a
`<title>` naming the vendor). `litellm.svg` still carries upstream's own
`<title>LobeHub</title>`.

- Source: https://github.com/lobehub/lobe-icons
- License: MIT — `Copyright (c) 2023 LobeHub`
  (https://github.com/lobehub/lobe-icons/blob/master/LICENSE)

The MIT notice above is reproduced by reference as required by that license.

## Simple Icons — CC0-1.0 (2 files)

`brave.svg` and `gitlab.svg` carry the
[Simple Icons](https://github.com/simple-icons/simple-icons) signature
(`role="img"`, a hardcoded brand `fill` hex, no sizing style).

- Source: https://github.com/simple-icons/simple-icons
- License: CC0-1.0
  (https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)

## Trademarks

Licensing of the **files** does not license the **marks**. Every logo remains
the trademark of its respective owner and is included solely for nominative,
descriptive identification of the provider a user is connecting to. Neither
LobeHub, Simple Icons, nor Fraym is affiliated with or endorsed by these
companies.

## Known upstream quirk

`kagi.svg` is byte-identical to `kimi.svg` (both render Kimi's mark and carry
`<title>Kimi</title>`). It is copied as-is from our reference asset tree rather
than silently substituted; the correct Kagi mark is still outstanding.

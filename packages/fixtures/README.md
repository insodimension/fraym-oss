# @fraym/fixtures

Synthetic, deterministic session fixtures replayed through `@fraym/driver/mock`.

## Contents

- [Demo scripts](#demo-scripts)
- [Output variations](#output-variations)
- [Builders](#builders)

## Demo scripts

Each named script contains a seed snapshot and a complete authored turn. Create
a driver with the matching `create*DemoDriver()` helper.

## Output variations

Tool-focused maps expose pending, success, error, and structured result samples.

## Builders

Shared builders keep large diffs, source files, tool results, and memory samples
deterministic and free of host-specific data.

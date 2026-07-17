# @fraym/verber

Configurable working-status language for agent interfaces.

## Contents

- [Resolution](#resolution)
- [Profiles](#profiles)

## Resolution

`resolveVerber()` gives explicit driver text priority, followed by tool intent,
tool activity, rotating language, and the active phase fallback.

## Profiles

Built-in profiles are `tui`, `codex`, `expressive`, and `quiet`. A custom profile
can replace their phrase and tool-verb tables without changing resolution rules.

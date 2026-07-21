# @fraym-ai/config

Typed, dependency-free presentation settings for Fraym.

## Contents

- [Configuration](#configuration)
- [Layout](#layout)
- [Presentation policies](#presentation-policies)

## Configuration

`resolveFraymUiConfig()` validates stored overrides and fills every omitted value
from `DEFAULT_FRAYM_UI_CONFIG`.

## Layout

`resolveBenchLayout()` combines preset, global, derived, and bench-specific
layers without coupling the package to React or a host runtime.

## Presentation policies

Slash-entry and tool-icon policies support exact keys and ordered glob rules.

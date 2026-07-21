# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Report privately through GitHub's coordinated disclosure:

> Repository → **Security** tab → **Report a vulnerability** (Private
> Vulnerability Reporting).

Include, where possible:

- the affected package(s) and version(s) (e.g. `@fraym-ai/ui@0.1.0`),
- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- any suggested fix.

We aim to acknowledge a report within a few days, keep you updated on progress,
and credit you (if you wish) once a fix ships.

## Scope

Fraym is a UI kit: it renders a data-only `AgentEvent` stream and never owns an
agent runtime. The most relevant concerns are things like unsafe rendering of
untrusted session content (XSS via message/tool output), prototype pollution in
event handling, or supply-chain integrity of the published packages. Published
packages carry npm **provenance** — verify it with `npm audit signatures`.

## Supported versions

Fraym is pre-1.0; only the **latest** published version of each `@fraym-ai/*`
package receives security fixes. Please upgrade before reporting.

| Version | Supported |
| ------- | --------- |
| latest `0.x` | ✅ |
| older | ❌ |

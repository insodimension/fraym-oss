# `@fraym/driver`

## Contents

- [Purpose](#purpose)
- [Replay approvals](#replay-approvals)

## Purpose

`@fraym/driver` defines the framework-agnostic event contract shared by agent harnesses and Fraym surfaces. It has no React dependency, and includes a deterministic replay stream for demos and tests.

## Replay approvals

Replay streams pause after `approval.request` until `respondToApproval` receives the matching typed response. Demos can opt into unattended playback with `autoRespond: { decision, delay }`. The event union also includes incremental `reasoning.delta` traces keyed by assistant message ID.

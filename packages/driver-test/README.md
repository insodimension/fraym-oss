# @fraym-ai/driver-test

Reusable behavioral checks and in-memory reference drivers.

## Contents

- [Conformance](#conformance)
- [Replay harness](#replay-harness)
- [Configuration harness](#configuration-harness)

## Conformance

`describeSessionDriverConformance()` installs lifecycle, transcript, delivery,
subscription, and optional configuration checks in a Bun test suite.

## Replay harness

`createReplayDriverHarness()` provides deterministic sessions and records whether
messages used the ordinary prompt lane or the live steer lane.

## Configuration harness

`createReferenceConfigDriver()` exposes an honest push-capable or pull-only
configuration driver.

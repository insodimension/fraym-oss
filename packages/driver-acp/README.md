# `@fraym/driver-acp`

## Contents

- [Purpose](#purpose)
- [Usage](#usage)
- [Protocol mapping](#protocol-mapping)

## Purpose

`@fraym/driver-acp` adapts an Agent Client Protocol v1 WebSocket connection into Fraym's framework-free `AgentEvent` contract. It has no React dependency.

## Usage

```ts
const driver = createAcpDriver("ws://localhost:5196");

driver.subscribe(handleEvent);
await driver.prompt("Inspect this workspace");
```

The driver initializes the connection, opens one ACP session, forwards prompts and cancellations, and closes its socket when the final subscriber unsubscribes.

## Protocol mapping

ACP message and thought chunks become Fraym assistant and reasoning deltas. Tool calls retain their ACP IDs and map into the Fraym tool lifecycle, plans appear as a `todo` tool call, and permission requests become approvals whose selected option is returned over JSON-RPC.

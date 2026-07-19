import { codingSessionFixture, createReplayDriver, type AgentEventStream } from "@fraym/driver";

// Replacement seam: swap this replay driver for your own runtime AgentEventStream adapter.
export const source: AgentEventStream = createReplayDriver(codingSessionFixture, { loop: true });

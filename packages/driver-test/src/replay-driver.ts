import type {
  SessionDriver,
  SessionDriverEvent,
  SessionMessage,
  SessionRef,
  SessionSnapshot,
  WorkspaceRef,
} from "@fraym/driver";
export function journalMessageEntry(
  sequence: number,
  role: "user" | "assistant",
  text: string,
): Record<string, unknown> {
  return {
    sequence,
    version: 1,
    kind: "message",
    payload: {
      id: `event-${sequence}`,
      timestamp: new Date(1_700_000_000_000 + sequence * 1_000).toISOString(),
      message: { role, content: [{ type: "text", text }] },
    },
  };
}
export interface ReplayDelivery {
  readonly via: "prompt" | "steer";
  readonly text: string;
}
export interface ReplayDriverOptions {
  readonly workspace?: WorkspaceRef;
  readonly advertise?: boolean;
  readonly advertiseEffects?: boolean;
  readonly runtimeStatus?: "idle" | "running";
  readonly steerError?: string;
}
export interface ReplayDriverHarness {
  readonly driver: SessionDriver;
  readonly workspace: WorkspaceRef;
  scriptAssistantReply(text: string): void;
  deliveries(): readonly ReplayDelivery[];
  appendJournalEntry(
    sessionId: string,
    role: "user" | "assistant",
    text: string,
  ): void;
  entriesFor(sessionId: string): readonly Record<string, unknown>[];
  replayFromSeqs(): readonly number[];
  initializeCount(): number;
  killConnection(): void;
}
const defaultWorkspace: WorkspaceRef = {
  workspaceId: "workspace-1",
  path: "/tmp/project",
  displayName: "project",
};
export function createReplayDriverHarness(
  options: ReplayDriverOptions = {},
): ReplayDriverHarness {
  const workspace = options.workspace ?? defaultWorkspace;
  const sessions = new Map<string, SessionSnapshot>();
  const entries = new Map<string, Record<string, unknown>[]>();
  const listeners = new Map<string, Set<(event: SessionDriverEvent) => void>>();
  const replies: string[] = [];
  const seen: ReplayDelivery[] = [];
  const replayOffsets: number[] = [];
  let counter = 1;
  let starts = 1;
  const ensure = (id: string): SessionSnapshot => {
    const found = sessions.get(id);
    if (found) return found;
    const snapshot: SessionSnapshot = {
      ref: { workspaceId: workspace.workspaceId, sessionId: id },
      workspace,
      title: "Replay session",
      status: options.runtimeStatus ?? "idle",
      updatedAt: new Date().toISOString(),
      transcript: [],
    };
    sessions.set(id, snapshot);
    entries.set(id, []);
    return snapshot;
  };
  ensure("session-1");
  const append = (id: string, role: "user" | "assistant", text: string) => {
    const snapshot = ensure(id);
    const message: SessionMessage = {
      id: `message-${(snapshot.transcript?.length ?? 0) + 1}`,
      role,
      blocks: [{ type: "text", text }],
    };
    const next = {
      ...snapshot,
      transcript: [...(snapshot.transcript ?? []), message],
      updatedAt: new Date().toISOString(),
    };
    sessions.set(id, next);
    const journal = entries.get(id)!;
    journal.push(journalMessageEntry(journal.length + 1, role, text));
    return next;
  };
  const emit = (
    ref: SessionRef,
    event: { readonly type: string; readonly [key: string]: unknown },
  ) =>
    listeners
      .get(ref.sessionId)
      ?.forEach((listener) =>
        listener({
          ...event,
          sessionRef: ref,
          timestamp: new Date().toISOString(),
        }),
      );
  const driver: SessionDriver = {
    async listSessions() {
      return [...sessions.values()];
    },
    async createSession(_workspace, createOptions) {
      counter += 1;
      const snapshot = ensure(`session-${counter}`);
      const titled = createOptions?.title
        ? { ...snapshot, title: createOptions.title }
        : snapshot;
      sessions.set(titled.ref.sessionId, titled);
      return titled;
    },
    async openSession(ref) {
      const snapshot = ensure(ref.sessionId);
      replayOffsets.push(0);
      queueMicrotask(() =>
        emit(ref, {
          type: "sessionJournalUpdated",
          transcript: snapshot.transcript ?? [],
        }),
      );
      return snapshot;
    },
    async closeSession() {},
    async sendUserMessage(ref, input) {
      const lane =
        input.deliverAs === "steer" && !options.steerError ? "steer" : "prompt";
      seen.push({ via: lane, text: input.text });
      let snapshot = append(ref.sessionId, "user", input.text);
      snapshot = append(ref.sessionId, "assistant", replies.shift() ?? "ok");
      emit(ref, {
        type: "sessionJournalUpdated",
        transcript: snapshot.transcript ?? [],
      });
      emit(ref, { type: "runCompleted", snapshot });
    },
    subscribe(ref, listener) {
      const set = listeners.get(ref.sessionId) ?? new Set();
      set.add(listener);
      listeners.set(ref.sessionId, set);
      return () => {
        const removed = set.delete(listener);
        if (!set.size) listeners.delete(ref.sessionId);
        return removed;
      };
    },
  };
  return {
    driver,
    workspace,
    scriptAssistantReply: (text) => replies.push(text),
    deliveries: () => seen,
    appendJournalEntry: (id, role, text) => {
      append(id, role, text);
    },
    entriesFor: (id) => entries.get(id) ?? [],
    replayFromSeqs: () => replayOffsets,
    initializeCount: () => starts,
    killConnection: () => {
      starts += 1;
      listeners.clear();
    },
  };
}

import type {
  SessionDriver,
  SessionDriverEvent,
  SessionModelSelection,
  SessionQueuedMessage,
  SessionSnapshot,
  SessionTranscriptMessage,
  WorkspaceRef,
} from "@fraym-ai/driver";


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

function nowIso(): string {
  return new Date().toISOString();
}

export function createReplayDriverHarness(
  options: ReplayDriverOptions = {},
): ReplayDriverHarness {
  const workspace = options.workspace ?? defaultWorkspace;
  const sessions = new Map<string, SessionSnapshot>();
  const transcripts = new Map<string, SessionTranscriptMessage[]>();
  const entries = new Map<string, Record<string, unknown>[]>();
  const queues = new Map<string, readonly SessionQueuedMessage[]>();
  const journalSeqs = new Map<string, number>();
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
      updatedAt: nowIso(),
    };
    sessions.set(id, snapshot);
    transcripts.set(id, []);
    entries.set(id, []);
    queues.set(id, []);
    journalSeqs.set(id, 0);
    return snapshot;
  };

  const update = (
    id: string,
    patch: Partial<Omit<SessionSnapshot, "ref" | "workspace">>,
  ): SessionSnapshot => {
    const next = { ...ensure(id), ...patch };
    sessions.set(id, next);
    return next;
  };

  const append = (
    id: string,
    role: "user" | "assistant",
    text: string,
  ): SessionSnapshot => {
    const transcript = transcripts.get(id) ?? [];
    const message: SessionTranscriptMessage = {
      id: `message-${transcript.length + 1}`,
      role: role === "assistant" ? "agent" : "user",
      blocks: [{ type: "text", text }],
    };
    transcripts.set(id, [...transcript, message]);
    const snapshot = update(id, { updatedAt: nowIso() });
    const journal = entries.get(id) ?? [];
    journal.push(journalMessageEntry(journal.length + 1, role, text));
    entries.set(id, journal);
    return snapshot;
  };

  const emit = (event: SessionDriverEvent): void => {
    listeners
      .get(event.sessionRef.sessionId)
      ?.forEach((listener) => listener(event));
  };

  const emitSnapshot = (snapshot: SessionSnapshot): void => {
    emit({
      type: "sessionUpdated",
      snapshot,
      sessionRef: snapshot.ref,
      timestamp: nowIso(),
    });
  };

  const emitJournal = (snapshot: SessionSnapshot): void => {
    const sessionId = snapshot.ref.sessionId;
    const seq = (journalSeqs.get(sessionId) ?? 0) + 1;
    journalSeqs.set(sessionId, seq);
    emit({
      type: "sessionJournalUpdated",
      seq,
      transcript: transcripts.get(sessionId) ?? [],
      customMessages: {},
      sessionRef: snapshot.ref,
      timestamp: nowIso(),
    });
  };
  const replaceQueue = (
    id: string,
    messages: readonly SessionQueuedMessage[],
  ): SessionSnapshot => {
    queues.set(id, messages);
    return update(id, { queuedMessages: messages, updatedAt: nowIso() });
  };


  ensure("session-1");

  const driver: SessionDriver = {
    async listSessions(sessionWorkspace) {
      return [...sessions.values()].filter(
        (snapshot) =>
          snapshot.workspace.workspaceId === sessionWorkspace.workspaceId,
      );
    },

    async createSession(sessionWorkspace, createOptions) {
      counter += 1;
      const id = `session-${counter}`;
      const snapshot: SessionSnapshot = {
        ref: { workspaceId: sessionWorkspace.workspaceId, sessionId: id },
        workspace: sessionWorkspace,
        title: createOptions?.title ?? "Replay session",
        status: "idle",
        updatedAt: nowIso(),
        profile: createOptions?.profile,
        config:
          createOptions?.initialModel || createOptions?.initialThinkingLevel
            ? {
                provider: createOptions.initialModel?.provider,
                modelId: createOptions.initialModel?.modelId,
                thinkingLevel: createOptions.initialThinkingLevel,
              }
            : undefined,
      };
      sessions.set(id, snapshot);
      transcripts.set(id, []);
      entries.set(id, []);
      queues.set(id, []);
      journalSeqs.set(id, 0);
      return snapshot;
    },

    async openSession(ref) {
      const snapshot = ensure(ref.sessionId);
      replayOffsets.push(0);
      queueMicrotask(() => emitJournal(snapshot));
      return snapshot;
    },

    async archiveSession(ref) {
      const snapshot = update(ref.sessionId, {
        archivedAt: nowIso(),
        updatedAt: nowIso(),
      });
      emitSnapshot(snapshot);
    },

    async unarchiveSession(ref) {
      const { archivedAt: _archivedAt, ...rest } = ensure(ref.sessionId);
      const snapshot = { ...rest, updatedAt: nowIso() };
      sessions.set(ref.sessionId, snapshot);
      emitSnapshot(snapshot);
    },

    async pinSession(ref) {
      const snapshot = update(ref.sessionId, { pinnedAt: nowIso() });
      emitSnapshot(snapshot);
    },

    async unpinSession(ref) {
      const { pinnedAt: _pinnedAt, ...rest } = ensure(ref.sessionId);
      sessions.set(ref.sessionId, rest);
      emitSnapshot(rest);
    },

    async deleteSession(ref) {
      const snapshot = sessions.get(ref.sessionId);
      if (!snapshot) return;
      emit({
        type: "sessionClosed",
        reason: "deleted",
        sessionRef: ref,
        timestamp: nowIso(),
      });
      sessions.delete(ref.sessionId);
      transcripts.delete(ref.sessionId);
      entries.delete(ref.sessionId);
      queues.delete(ref.sessionId);
      journalSeqs.delete(ref.sessionId);
      listeners.delete(ref.sessionId);
    },

    async sendUserMessage(ref, input) {
      const lane =
        input.deliverAs === "steer" && !options.steerError ? "steer" : "prompt";
      seen.push({ via: lane, text: input.text });
      append(ref.sessionId, "user", input.text);
      const snapshot = append(ref.sessionId, "assistant", replies.shift() ?? "ok");
      emitJournal(snapshot);
      emit({
        type: "runCompleted",
        snapshot,
        sessionRef: ref,
        timestamp: nowIso(),
      });
    },

    async interruptWithQueuedMessage(ref, next, remaining) {
      const snapshot = replaceQueue(ref.sessionId, remaining);
      emitSnapshot(snapshot);
      await driver.sendUserMessage(ref, next);
    },

    async replaceQueuedMessages(ref, messages) {
      const snapshot = replaceQueue(ref.sessionId, messages);
      emitSnapshot(snapshot);
    },

    async cancelCurrentRun() {},

    async setSessionModel(ref, selection: SessionModelSelection) {
      const snapshot = update(ref.sessionId, {
        config: {
          ...ensure(ref.sessionId).config,
          provider: selection.provider,
          modelId: selection.modelId,
        },
        updatedAt: nowIso(),
      });
      emitSnapshot(snapshot);
    },

    async setSessionThinkingLevel(ref, thinkingLevel) {
      const snapshot = update(ref.sessionId, {
        config: { ...ensure(ref.sessionId).config, thinkingLevel },
        updatedAt: nowIso(),
      });
      emitSnapshot(snapshot);
    },

    async setSessionApprovalMode(ref, approvalMode) {
      const snapshot = update(ref.sessionId, {
        config: { ...ensure(ref.sessionId).config, approvalMode },
        updatedAt: nowIso(),
      });
      emitSnapshot(snapshot);
    },

    async setSessionEphemeral(ref, ephemeral) {
      const snapshot = update(ref.sessionId, {
        config: { ...ensure(ref.sessionId).config, ephemeral },
        updatedAt: nowIso(),
      });
      emitSnapshot(snapshot);
    },

    async renameSession(ref, title) {
      const snapshot = update(ref.sessionId, { title, updatedAt: nowIso() });
      emitSnapshot(snapshot);
    },

    async compactSession(ref) {
      emit({
        type: "compactionStarted",
        reason: "manual",
        sessionRef: ref,
        timestamp: nowIso(),
      });
      emit({
        type: "compactionFinished",
        aborted: false,
        shortSummary: "Context compacted.",
        sessionRef: ref,
        timestamp: nowIso(),
      });
    },

    async reloadSession(ref) {
      emitSnapshot(ensure(ref.sessionId));
    },

    async getSessionTree() {
      return { roots: [], leafId: null };
    },

    async navigateSessionTree() {
      return { cancelled: false };
    },

    async getSessionCommands() {
      return [];
    },

    async queryCompletions() {
      return [];
    },

    async respondToHostUiRequest() {
      return true;
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

    async closeSession(ref) {
      listeners.delete(ref.sessionId);
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

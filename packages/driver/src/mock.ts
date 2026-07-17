import type {
  CreateSessionOptions,
  SessionDriver,
  SessionDriverEvent,
  SessionEventListener,
  SessionMessageInput,
  SessionRef,
  SessionSnapshot,
  WorkspaceRef,
} from "./session-driver";
export type ScriptedEvent = {
  readonly type: string;
  readonly [key: string]: unknown;
};
export interface ScriptStep {
  readonly event: ScriptedEvent;
  readonly delayMs?: number;
}
export interface DemoTurn {
  readonly steps: readonly ScriptStep[];
}
export interface DemoScript {
  readonly snapshot: SessionSnapshot;
  readonly intro?: readonly ScriptStep[];
  readonly replies?: readonly DemoTurn[];
  readonly defaultReply?: DemoTurn;
  readonly speed?: number;
}
interface Runtime {
  snapshot: SessionSnapshot;
  listener?: SessionEventListener;
  reply: number;
  timers: Set<ReturnType<typeof setTimeout>>;
}
export function createScriptedDriver(script: DemoScript): SessionDriver {
  const sessions = new Map<string, Runtime>([
    [
      script.snapshot.ref.sessionId,
      { snapshot: script.snapshot, reply: 0, timers: new Set() },
    ],
  ]);
  const runtime = (ref: SessionRef): Runtime => {
    const found = sessions.get(ref.sessionId);
    if (found) return found;
    const created = {
      snapshot: { ...script.snapshot, ref },
      reply: 0,
      timers: new Set<ReturnType<typeof setTimeout>>(),
    };
    sessions.set(ref.sessionId, created);
    return created;
  };
  const play = (
    ref: SessionRef,
    current: Runtime,
    steps: readonly ScriptStep[],
  ) => {
    let elapsed = 0;
    for (const step of steps) {
      elapsed += (step.delayMs ?? 0) * (script.speed ?? 1);
      const timer = setTimeout(() => {
        current.timers.delete(timer);
        const event: SessionDriverEvent = {
          ...step.event,
          sessionRef: ref,
          timestamp: new Date().toISOString(),
        };
        void current.listener?.(event);
      }, elapsed);
      current.timers.add(timer);
    }
  };
  return {
    async listSessions(workspace) {
      return [...sessions.values()]
        .map((item) => item.snapshot)
        .filter((item) => item.ref.workspaceId === workspace.workspaceId);
    },
    async createSession(
      workspace: WorkspaceRef,
      options?: CreateSessionOptions,
    ) {
      const ref = {
        workspaceId: workspace.workspaceId,
        sessionId: `demo-${sessions.size + 1}`,
      };
      const snapshot: SessionSnapshot = {
        ref,
        workspace,
        title: options?.title ?? "New session",
        status: "idle",
        updatedAt: new Date().toISOString(),
        ...(options?.initialModel
          ? {
              config: {
                ...options.initialModel,
                ...(options.initialThinkingLevel
                  ? { thinkingLevel: options.initialThinkingLevel }
                  : {}),
              },
            }
          : {}),
      };
      sessions.set(ref.sessionId, { snapshot, reply: 0, timers: new Set() });
      return snapshot;
    },
    async openSession(ref) {
      return runtime(ref).snapshot;
    },
    async closeSession(ref) {
      const current = runtime(ref);
      current.timers.forEach(clearTimeout);
      current.timers.clear();
      delete current.listener;
    },
    async sendUserMessage(ref: SessionRef, _input: SessionMessageInput) {
      const current = runtime(ref);
      const turn = script.replies?.[current.reply++] ?? script.defaultReply;
      if (turn) play(ref, current, turn.steps);
    },
    subscribe(ref, listener) {
      const current = runtime(ref);
      current.listener = listener;
      current.reply = 0;
      if (script.intro) play(ref, current, script.intro);
      return () => {
        if (current.listener === listener) delete current.listener;
        current.timers.forEach(clearTimeout);
        current.timers.clear();
      };
    },
  };
}

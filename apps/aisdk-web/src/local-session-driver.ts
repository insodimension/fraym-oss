// A browser-local SessionDriver: the full @fraym/driver session contract backed
// by localStorage (catalog + transcripts) and the Vercel AI SDK (live turns run
// entirely in the page against the provider key saved on the Models settings
// pane). This is what lets the real workspace shell — rail, sessions, dock,
// settings — run with no backend at all.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type {
  CompletionItem,
  ContextBreakdown,
  ContextUsage,
  CreateSessionOptions,
  EngineCommandRecord,
  HostUiResponse,
  NavigateSessionTreeResult,
  SessionTreeSnapshot,
  SessionDriver,
  SessionDriverEvent,
  SessionEventListener,
  SessionMessageInput,
  SessionModelSelection,
  SessionQueuedMessage,
  SessionRef,
  SessionSnapshot,
  SessionTranscriptMessage,
  SessionTranscriptToolCall,
  Unsubscribe,
  WorkspaceRef,
} from "@fraym/driver";
import { type ModelMessage, streamText, stepCountIs } from "ai";
import { PROVIDERS, type ProviderId } from "./providers";
import { demoTools } from "./tools";

const K_INDEX = "fraym-aisdk-sd-index";
const MAX_SESSIONS = 60;
const DEFAULT_CONTEXT_WINDOW = 128_000;
const SYSTEM_PROMPT_CHARS = 160;
const TITLE_MAX = 44;

interface StoredSession {
  readonly snapshot: SessionSnapshot;
  readonly transcript: readonly SessionTranscriptMessage[];
  readonly history: readonly ModelMessage[];
  readonly seq: number;
}

interface Runtime {
  snapshot: SessionSnapshot;
  transcript: SessionTranscriptMessage[];
  history: ModelMessage[];
  seq: number;
  listener: SessionEventListener | null;
  abort: AbortController | null;
  turn: number;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type LocalEvent = DistributiveOmit<SessionDriverEvent, "sessionRef" | "timestamp">;

function nowIso(): string {
  return new Date().toISOString();
}

function titleFrom(text: string): string {
  const line = text.trim().replace(/\s+/g, " ");
  if (line.length === 0) {
    return "New session";
  }
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1)}…` : line;
}

export interface LocalSessionDriverOptions {
  readonly workspace: WorkspaceRef;
  readonly defaultModel?: SessionModelSelection;
  readonly system?: string;
}

export class LocalSessionDriver implements SessionDriver {
  readonly #workspace: WorkspaceRef;
  readonly #system: string;
  readonly #defaultModel: SessionModelSelection;
  readonly #sessions = new Map<string, Runtime>();

  constructor(options: LocalSessionDriverOptions) {
    this.#workspace = options.workspace;
    this.#system = options.system ?? "You are a helpful coding agent.";
    this.#defaultModel = options.defaultModel ?? { provider: "openrouter", modelId: "openai/gpt-4o-mini" };
    for (const id of this.#storedIndex()) {
      const stored = this.#readStored(id);
      if (stored !== null) {
        this.#sessions.set(id, {
          snapshot: { ...stored.snapshot, status: "idle" },
          transcript: [...stored.transcript],
          history: [...stored.history],
          seq: stored.seq,
          listener: null,
          abort: null,
          turn: stored.transcript.length,
        });
      }
    }
  }

  #storedIndex(): readonly string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(K_INDEX) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  #readStored(id: string): StoredSession | null {
    try {
      const raw = localStorage.getItem(`fraym-aisdk-sd-${id}`);
      return raw === null ? null : (JSON.parse(raw) as StoredSession);
    } catch {
      return null;
    }
  }

  #persist(rt: Runtime): void {
    const id = rt.snapshot.ref.sessionId;
    try {
      const stored: StoredSession = {
        snapshot: rt.snapshot,
        transcript: rt.transcript,
        history: rt.history,
        seq: rt.seq,
      };
      localStorage.setItem(`fraym-aisdk-sd-${id}`, JSON.stringify(stored));
      const index = [...this.#sessions.keys()].slice(0, MAX_SESSIONS);
      localStorage.setItem(K_INDEX, JSON.stringify(index));
    } catch {
      // Quota exhausted — the live view still works; persistence is best-effort.
    }
  }

  #runtime(ref: SessionRef): Runtime {
    const existing = this.#sessions.get(ref.sessionId);
    if (existing) {
      return existing;
    }
    const created: Runtime = {
      snapshot: {
        ref,
        workspace: this.#workspace,
        title: "New session",
        status: "idle",
        updatedAt: nowIso(),
        config: { provider: this.#defaultModel.provider, modelId: this.#defaultModel.modelId },
      },
      transcript: [],
      history: [],
      seq: 0,
      listener: null,
      abort: null,
      turn: 0,
    };
    this.#sessions.set(ref.sessionId, created);
    return created;
  }

  #emit(rt: Runtime, event: LocalEvent): void {
    const full = { ...event, sessionRef: rt.snapshot.ref, timestamp: nowIso() } as SessionDriverEvent;
    void rt.listener?.(full);
  }

  #emitJournal(rt: Runtime): void {
    rt.seq += 1;
    this.#emit(rt, { type: "sessionJournalUpdated", seq: rt.seq, transcript: [...rt.transcript], customMessages: {} });
  }

  #patchSnapshot(rt: Runtime, patch: Partial<SessionSnapshot>): void {
    rt.snapshot = { ...rt.snapshot, ...patch, updatedAt: nowIso() };
    this.#emit(rt, { type: "sessionUpdated", snapshot: rt.snapshot });
    this.#persist(rt);
  }

  async listSessions(workspace: WorkspaceRef): Promise<readonly SessionSnapshot[]> {
    return [...this.#sessions.values()]
      .map((rt) => rt.snapshot)
      .filter((snapshot) => snapshot.workspace.workspaceId === workspace.workspaceId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async createSession(_workspace: WorkspaceRef, options?: CreateSessionOptions): Promise<SessionSnapshot> {
    const ref: SessionRef = { workspaceId: this.#workspace.workspaceId, sessionId: `aisdk-${crypto.randomUUID().slice(0, 12)}` };
    const rt = this.#runtime(ref);
    if (options?.title) {
      rt.snapshot = { ...rt.snapshot, title: options.title };
    }
    if (options?.initialModel) {
      rt.snapshot = { ...rt.snapshot, config: { ...rt.snapshot.config, ...options.initialModel } };
    }
    this.#persist(rt);
    return rt.snapshot;
  }

  async openSession(ref: SessionRef): Promise<SessionSnapshot> {
    const rt = this.#runtime(ref);
    return { ...rt.snapshot, loaded: true };
  }

  async closeSession(ref: SessionRef): Promise<void> {
    const rt = this.#sessions.get(ref.sessionId);
    if (rt) {
      rt.listener = null;
    }
  }

  async archiveSession(ref: SessionRef): Promise<void> {
    this.#patchSnapshot(this.#runtime(ref), { archivedAt: nowIso() });
  }

  async unarchiveSession(ref: SessionRef): Promise<void> {
    const rt = this.#runtime(ref);
    const { archivedAt: _archived, ...rest } = rt.snapshot;
    rt.snapshot = rest;
    this.#patchSnapshot(rt, {});
  }

  async pinSession(ref: SessionRef): Promise<void> {
    this.#patchSnapshot(this.#runtime(ref), { pinnedAt: nowIso() });
  }

  async unpinSession(ref: SessionRef): Promise<void> {
    const rt = this.#runtime(ref);
    const { pinnedAt: _pinned, ...rest } = rt.snapshot;
    rt.snapshot = rest;
    this.#patchSnapshot(rt, {});
  }

  async deleteSession(ref: SessionRef): Promise<void> {
    const rt = this.#sessions.get(ref.sessionId);
    if (!rt) {
      return;
    }
    rt.abort?.abort();
    this.#emit(rt, { type: "sessionClosed", reason: "manual" });
    this.#sessions.delete(ref.sessionId);
    localStorage.removeItem(`fraym-aisdk-sd-${ref.sessionId}`);
    localStorage.setItem(K_INDEX, JSON.stringify([...this.#sessions.keys()]));
  }

  async renameSession(ref: SessionRef, title: string): Promise<void> {
    this.#patchSnapshot(this.#runtime(ref), { title });
  }

  async sendUserMessage(ref: SessionRef, input: SessionMessageInput): Promise<void> {
    const rt = this.#runtime(ref);
    rt.turn += 1;
    const userMessage: SessionTranscriptMessage = {
      id: input.clientMessageId ?? `${ref.sessionId}-u${rt.turn}`,
      role: "user",
      blocks: [
        { type: "text", text: input.text },
        ...(input.attachments ?? [])
          .filter((attachment) => attachment.kind === "image")
          .map((attachment) => ({
            type: "image" as const,
            src: `data:${attachment.mimeType};base64,${attachment.kind === "image" ? attachment.data : ""}`,
          })),
      ],
      timestamp: nowIso(),
    };
    rt.transcript.push(userMessage);
    if (rt.transcript.filter((message) => message.role === "user").length === 1) {
      rt.snapshot = { ...rt.snapshot, title: titleFrom(input.text) };
    }
    this.#emitJournal(rt);
    this.#patchSnapshot(rt, { status: "running", preview: input.text.slice(0, 120) });

    const images = (input.attachments ?? []).filter((attachment) => attachment.kind === "image");
    const userContent: ModelMessage = images.length
      ? {
          role: "user",
          content: [
            { type: "text", text: input.expansion ?? input.text },
            ...images.map((image) => ({ type: "image" as const, image: `data:${image.mimeType};base64,${image.data}` })),
          ],
        }
      : { role: "user", content: input.expansion ?? input.text };
    rt.history.push(userContent);

    const providerId: ProviderId = rt.snapshot.config?.provider === "openai" ? "openai" : "openrouter";
    const apiKey = (localStorage.getItem(`fraym-aisdk-${providerId}-key`) ?? "").trim();
    const startedAt = Date.now();
    if (apiKey.length === 0) {
      rt.transcript.push({
        id: `${ref.sessionId}-n${rt.turn}`,
        role: "agent",
        blocks: [
          {
            type: "notice",
            level: "error",
            message: `No API key for ${PROVIDERS[providerId].label}. Open Settings → Models and add one.`,
          },
        ],
        settled: true,
        final: true,
      });
      this.#emitJournal(rt);
      this.#patchSnapshot(rt, { status: "idle" });
      this.#emit(rt, { type: "runCompleted", snapshot: rt.snapshot });
      return;
    }

    const controller = new AbortController();
    rt.abort = controller;
    const factory = createOpenAICompatible({ name: providerId, baseURL: PROVIDERS[providerId].baseURL, apiKey });
    const modelId = rt.snapshot.config?.modelId ?? this.#defaultModel.modelId;
    let text = "";
    let reasoning = "";
    let failed: string | null = null;
    const toolCalls = new Map<string, SessionTranscriptToolCall>();
    try {
      const result = streamText({
        model: factory(modelId),
        system: this.#system,
        tools: demoTools,
        messages: rt.history,
        stopWhen: stepCountIs(8),
        abortSignal: controller.signal,
      });
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          text += part.text;
          this.#emit(rt, { type: "assistantDelta", text: part.text });
        } else if (part.type === "reasoning-delta") {
          reasoning += part.text;
          this.#emit(rt, { type: "thinkingDelta", text: part.text });
        } else if (part.type === "tool-call") {
          toolCalls.set(part.toolCallId, {
            callId: part.toolCallId,
            toolName: part.toolName,
            input: part.input,
            status: "running",
          });
          this.#emit(rt, { type: "toolStarted", toolName: part.toolName, callId: part.toolCallId, input: part.input });
        } else if (part.type === "tool-result") {
          const prev = toolCalls.get(part.toolCallId);
          toolCalls.set(part.toolCallId, {
            callId: part.toolCallId,
            toolName: prev?.toolName ?? part.toolName,
            input: prev?.input,
            status: "success",
            output: part.output,
          });
          this.#emit(rt, { type: "toolFinished", callId: part.toolCallId, success: true, output: part.output });
        } else if (part.type === "tool-error") {
          const prev = toolCalls.get(part.toolCallId);
          const message = part.error instanceof Error ? part.error.message : String(part.error);
          toolCalls.set(part.toolCallId, {
            callId: part.toolCallId,
            toolName: prev?.toolName ?? part.toolName,
            input: prev?.input,
            status: "error",
            output: message,
          });
          this.#emit(rt, { type: "toolFinished", callId: part.toolCallId, success: false, output: message });
        } else if (part.type === "error") {
          failed = part.error instanceof Error ? part.error.message : String(part.error);
        }
      }
      if (!controller.signal.aborted && failed === null) {
        const response = await result.response;
        rt.history.push(...response.messages);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        failed = error instanceof Error ? error.message : String(error);
      }
    }
    rt.abort = null;

    const blocks: SessionTranscriptMessage["blocks"] = [
      ...(reasoning.length > 0 ? [{ type: "reasoning" as const, text: reasoning }] : []),
      ...[...toolCalls.values()].map((call) => ({ type: "tool" as const, call })),
      ...(text.length > 0 ? [{ type: "text" as const, text }] : []),
      ...(failed !== null ? [{ type: "notice" as const, level: "error" as const, message: failed }] : []),
    ];
    if (blocks.length > 0) {
      rt.transcript.push({
        id: `${ref.sessionId}-a${rt.turn}`,
        role: "agent",
        blocks,
        timestamp: nowIso(),
        durationMs: Date.now() - startedAt,
        settled: true,
        final: true,
      });
    }
    this.#emitJournal(rt);
    this.#emit(rt, { type: "turnEnded", durationMs: Date.now() - startedAt, final: true });
    const usage = this.#estimateContext(rt);
    this.#emit(rt, { type: "contextUsage", usage });
    this.#patchSnapshot(rt, {
      status: failed !== null ? "failed" : "idle",
      preview: text.slice(0, 120) || rt.snapshot.preview,
      contextUsage: usage,
    });
    this.#emit(rt, { type: "runCompleted", snapshot: rt.snapshot });
  }

  /** Rough client-side estimate: ~4 chars per token over the seeded history. */
  #estimateContext(rt: Runtime): ContextUsage {
    const chars = rt.history.reduce((total, message) => {
      const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
      return total + content.length;
    }, 0);
    const tokens = Math.ceil((chars + SYSTEM_PROMPT_CHARS) / 4);
    return {
      tokens,
      contextWindow: DEFAULT_CONTEXT_WINDOW,
      percent: Math.min(100, Math.round((tokens / DEFAULT_CONTEXT_WINDOW) * 100)),
    };
  }

  async getContextBreakdown(ref: SessionRef): Promise<ContextBreakdown | null> {
    const rt = this.#runtime(ref);
    const usage = this.#estimateContext(rt);
    const used = usage.tokens ?? 0;
    const system = Math.ceil(SYSTEM_PROMPT_CHARS / 4);
    return {
      contextWindow: usage.contextWindow,
      usedTokens: used,
      autoCompactBufferTokens: 0,
      freeTokens: Math.max(0, usage.contextWindow - used),
      categories: [
        { id: "system", label: "System prompt", tokens: system },
        { id: "conversation", label: "Conversation", tokens: Math.max(0, used - system) },
      ],
    };
  }

  async interruptWithQueuedMessage(
    ref: SessionRef,
    next: SessionMessageInput,
    remaining: readonly SessionQueuedMessage[],
  ): Promise<void> {
    const rt = this.#runtime(ref);
    rt.abort?.abort();
    this.#patchSnapshot(rt, { queuedMessages: remaining });
    await this.sendUserMessage(ref, next);
  }

  async replaceQueuedMessages(ref: SessionRef, messages: readonly SessionQueuedMessage[]): Promise<void> {
    this.#patchSnapshot(this.#runtime(ref), { queuedMessages: messages });
  }

  async cancelCurrentRun(ref: SessionRef): Promise<void> {
    const rt = this.#runtime(ref);
    rt.abort?.abort();
    this.#patchSnapshot(rt, { status: "idle" });
    this.#emit(rt, { type: "runCompleted", snapshot: rt.snapshot });
  }

  async setSessionModel(ref: SessionRef, selection: SessionModelSelection): Promise<void> {
    const rt = this.#runtime(ref);
    this.#patchSnapshot(rt, { config: { ...rt.snapshot.config, provider: selection.provider, modelId: selection.modelId } });
  }

  async setSessionThinkingLevel(ref: SessionRef, thinkingLevel: string): Promise<void> {
    const rt = this.#runtime(ref);
    this.#patchSnapshot(rt, { config: { ...rt.snapshot.config, thinkingLevel } });
  }

  async setSessionApprovalMode(ref: SessionRef, approvalMode: string): Promise<void> {
    const rt = this.#runtime(ref);
    this.#patchSnapshot(rt, { config: { ...rt.snapshot.config, approvalMode } });
  }

  async setSessionEphemeral(ref: SessionRef, ephemeral: boolean): Promise<void> {
    const rt = this.#runtime(ref);
    this.#patchSnapshot(rt, { config: { ...rt.snapshot.config, ephemeral } });
  }

  async compactSession(): Promise<void> {
    // Context lives in this browser; nothing to compact.
  }

  async reloadSession(ref: SessionRef): Promise<void> {
    const rt = this.#runtime(ref);
    this.#emit(rt, { type: "sessionUpdated", snapshot: rt.snapshot });
  }

  async getSessionTree(_ref: SessionRef): Promise<SessionTreeSnapshot> {
    return { roots: [], leafId: null };
  }

  async navigateSessionTree(): Promise<NavigateSessionTreeResult> {
    return { cancelled: false };
  }

  async getSessionCommands(_ref: SessionRef): Promise<readonly EngineCommandRecord[]> {
    return [];
  }

  async queryCompletions(): Promise<readonly CompletionItem[]> {
    return [];
  }

  async respondToHostUiRequest(_ref: SessionRef, _response: HostUiResponse): Promise<boolean> {
    return true;
  }

  subscribe(ref: SessionRef, listener: SessionEventListener): Unsubscribe {
    const rt = this.#runtime(ref);
    rt.listener = listener;
    if (rt.transcript.length > 0) {
      // Timer (not microtask) so the provider's openSession snapshot dispatch
      // lands before the replayed journal, mirroring live transports.
      const handle = setTimeout(() => {
        this.#emit(rt, { type: "sessionJournalUpdated", seq: rt.seq, transcript: [...rt.transcript], customMessages: {} });
      }, 0);
      return () => {
        clearTimeout(handle);
        if (rt.listener === listener) {
          rt.listener = null;
        }
      };
    }
    return () => {
      if (rt.listener === listener) {
        rt.listener = null;
      }
    };
  }
}

export function createLocalSessionDriver(options: LocalSessionDriverOptions): SessionDriver {
  return new LocalSessionDriver(options);
}

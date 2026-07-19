import type { AgentEvent, AgentEventStream, Unsubscribe } from "@fraym/driver";
import type { ModelMessage } from "ai";

// Browser-local session persistence for the AI SDK host. Session metadata and
// each session's event transcript live in localStorage, so the sidebar list and
// the open transcript both survive reloads. Seeding the model context back into
// the driver is handled by `messagesFromEvents`.

export interface SessionMeta {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

const K_SESSIONS = "fraym-aisdk-sessions";
const MAX_SESSIONS = 50;
const MAX_EVENTS_PER_SESSION = 1500;
const TITLE_MAX = 44;

function eventsKey(sessionId: string): string {
  return `fraym-aisdk-session-${sessionId}`;
}

export function loadSessionList(): readonly SessionMeta[] {
  try {
    const raw = localStorage.getItem(K_SESSIONS);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const metas: SessionMeta[] = [];
    for (const item of parsed) {
      if (typeof item === "object" && item !== null && "id" in item && typeof item.id === "string") {
        const record = item as SessionMeta;
        metas.push({
          id: record.id,
          title: typeof record.title === "string" ? record.title : "New session",
          createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
          updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
        });
      }
    }
    return metas;
  } catch {
    return [];
  }
}

export function saveSessionList(sessions: readonly SessionMeta[]): void {
  const kept = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS);
  try {
    localStorage.setItem(K_SESSIONS, JSON.stringify(kept));
  } catch {
    // Quota exceeded — the session list is best-effort.
  }
}

export function loadSessionEvents(sessionId: string): readonly AgentEvent[] {
  try {
    const raw = localStorage.getItem(eventsKey(sessionId));
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AgentEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionEvents(sessionId: string, events: readonly AgentEvent[]): void {
  try {
    localStorage.setItem(eventsKey(sessionId), JSON.stringify(events.slice(-MAX_EVENTS_PER_SESSION)));
  } catch {
    // Quota exceeded — drop transcript persistence rather than crashing the app.
  }
}

export function deleteSessionEvents(sessionId: string): void {
  localStorage.removeItem(eventsKey(sessionId));
}

/** Session title derived from its first user message; "New session" before that. */
export function sessionTitleFromEvents(events: readonly AgentEvent[]): string {
  for (const event of events) {
    if (event.type === "user.message") {
      const line = event.content.trim().replace(/\s+/g, " ");
      if (line.length === 0) {
        return "New session";
      }
      return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1)}…` : line;
    }
  }
  return "New session";
}

/**
 * Rebuilds the model conversation from a persisted event transcript so a
 * restored session keeps its context: user messages verbatim, assistant text
 * reassembled from streamed deltas. Reasoning and tool traffic are display
 * artifacts and stay out of the seeded history.
 */
export function messagesFromEvents(events: readonly AgentEvent[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  let assistantBuffer = "";
  const flush = () => {
    if (assistantBuffer.length > 0) {
      out.push({ role: "assistant", content: assistantBuffer });
      assistantBuffer = "";
    }
  };
  for (const event of events) {
    if (event.type === "user.message") {
      flush();
      out.push({ role: "user", content: event.content });
    } else if (event.type === "assistant.message.delta") {
      assistantBuffer += event.delta;
    }
  }
  flush();
  return out;
}

/**
 * Wraps a live driver in a stream that replays the persisted transcript to
 * every new subscriber before piping live events — so remounting the thread
 * (switching sessions, reloading) repaints the full history.
 */
export function createReplayingStream(live: AgentEventStream, recorded: readonly AgentEvent[]): AgentEventStream {
  return {
    subscribe(listener): Unsubscribe {
      for (const event of recorded) {
        listener(event);
      }
      return live.subscribe(listener);
    },
  };
}

/** Compact relative age label for the session list ("now", "5m", "2h", "3d"). */
export function relativeAge(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) {
    return "now";
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  return `${Math.floor(seconds / 86400)}d`;
}

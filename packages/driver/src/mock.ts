// @fraym/driver/mock — a scripted SessionDriver implementation.
//
// Replays a `DemoScript` (pure SessionDriverEvent data) through the real
// SessionDriver contract, so every consumer renders demo content through exactly
// the same path as a live engine — there is no parallel "mock mode" branch in the
// UI. Reusable by the Fraym demo apps, the kitchen-sink, and event-flow tests.
//
// Zero React / UI dependency: this module only emits events, exactly like a real
// transport driver. The UI's reducer turns those events into view state.

import type { EngineCommandRecord } from "./resource-types";
import type {
	CompletionItem,
	CompletionQuery,
	CreateSessionOptions,
	HostUiResponse,
	NavigateSessionTreeOptions,
	NavigateSessionTreeResult,
	SessionDriver,
	SessionDriverEvent,
	SessionEventListener,
	SessionMessageInput,
	SessionModelSelection,
	SessionQueuedMessage,
	SessionRef,
	SessionRoleCycleResult,
	SessionSnapshot,
	SessionTeamSwitchResult,
	SessionTreeSnapshot,
	SpeechToTextEvents,
	SpeechToTextHandle,
	SpeechToTextStatus,
	Unsubscribe,
	WorkspaceRef,
} from "./session-driver";

/** A `SessionDriverEvent` with the bookkeeping fields the driver fills in removed. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An authored event: a discriminated `SessionDriverEvent` minus `sessionRef`/`timestamp`. */
export type ScriptedEvent = DistributiveOmit<SessionDriverEvent, "sessionRef" | "timestamp">;

/** One emitted step: the event plus an optional pre-emit delay for streaming feel. */
export interface ScriptStep {
	readonly event: ScriptedEvent;
	/** Milliseconds to wait (scaled by `DemoScript.speed`) before emitting. Default 0. */
	readonly delayMs?: number;
}

/** A scripted agent turn — the events emitted in response to one user message. */
export interface DemoTurn {
	readonly steps: readonly ScriptStep[];
}

/** A complete demo: the seed snapshot plus the scripted intro and replies. */
export interface DemoScript {
	/** Initial session state returned by `openSession` and seeded into the store. */
	readonly snapshot: SessionSnapshot;
	/** Session tree returned by `getSessionTree`. */
	readonly tree?: SessionTreeSnapshot;
	/** Slash commands returned by `getSessionCommands`. */
	readonly commands?: readonly EngineCommandRecord[];
	/** Completion items `queryCompletions` filters by query text. */
	readonly completions?: readonly CompletionItem[];
	/** Replayed once after `subscribe` to build the opening transcript. */
	readonly intro?: readonly ScriptStep[];
	/** Consumed in order, one turn per `sendUserMessage`. */
	readonly replies?: readonly DemoTurn[];
	/** Played when the scripted `replies` are exhausted. */
	readonly defaultReply?: DemoTurn;
	/** Delay multiplier: `1` = authored timing, `0` = instant (for tests). Default `1`. */
	readonly speed?: number;
}

interface SessionRuntime {
	snapshot: SessionSnapshot;
	listener: SessionEventListener | null;
	replyIndex: number;
	/** Bumped on every new run; pending timers from a superseded run are ignored. */
	runToken: number;
	readonly timers: Set<ReturnType<typeof setTimeout>>;
}

function nowIso(): string {
	return new Date().toISOString();
}

function mockSessionTitle(options?: CreateSessionOptions): string {
	return options?.title ?? "New session";
}

function mockSessionConfig(options?: CreateSessionOptions): SessionSnapshot["config"] {
	if (!options?.initialModel) return undefined;
	return {
		provider: options.initialModel.provider,
		modelId: options.initialModel.modelId,
		thinkingLevel: options.initialThinkingLevel,
	};
}

function createMockSessionSnapshot(
	workspace: WorkspaceRef,
	sessionId: string,
	options?: CreateSessionOptions,
): SessionSnapshot {
	return {
		ref: { workspaceId: workspace.workspaceId, sessionId },
		workspace,
		title: mockSessionTitle(options),
		status: "idle",
		updatedAt: nowIso(),
		config: mockSessionConfig(options),
	};
}

function nextReplyTurn(script: DemoScript, runtime: SessionRuntime): DemoTurn | undefined {
	const replies = script.replies;
	const reply = replies?.[runtime.replyIndex];
	if (!reply) return script.defaultReply;
	runtime.replyIndex += 1;
	return reply;
}

class ScriptedSessionDriver implements SessionDriver {
	readonly #script: DemoScript;
	readonly #speed: number;
	readonly #sessions = new Map<string, SessionRuntime>();

	constructor(script: DemoScript) {
		this.#script = script;
		this.#speed = script.speed ?? 1;
		const seed = script.snapshot;
		this.#sessions.set(seed.ref.sessionId, this.#freshRuntime(seed));
	}

	#freshRuntime(snapshot: SessionSnapshot): SessionRuntime {
		return { snapshot, listener: null, replyIndex: 0, runToken: 0, timers: new Set() };
	}

	#runtime(ref: SessionRef): SessionRuntime {
		const existing = this.#sessions.get(ref.sessionId);
		if (existing) return existing;
		const created = this.#freshRuntime({ ...this.#script.snapshot, ref });
		this.#sessions.set(ref.sessionId, created);
		return created;
	}

	#emit(rt: SessionRuntime, ref: SessionRef, event: ScriptedEvent): void {
		// Construct the wire event at the boundary: re-add the bookkeeping fields the
		// authored `ScriptedEvent` omitted. The cast is the one place a union-spread is
		// reassembled into the discriminated `SessionDriverEvent`.
		const full = { ...event, sessionRef: ref, timestamp: nowIso() } as SessionDriverEvent;
		void rt.listener?.(full);
	}

	/** Schedule a sequence of steps with cumulative delays, gated by the current run token. */
	#play(rt: SessionRuntime, ref: SessionRef, steps: readonly ScriptStep[]): void {
		rt.runToken += 1;
		const token = rt.runToken;
		let elapsed = 0;
		for (const step of steps) {
			elapsed += (step.delayMs ?? 0) * this.#speed;
			const handle = setTimeout(() => {
				rt.timers.delete(handle);
				if (rt.runToken !== token) return; // cancelled or superseded
				this.#emit(rt, ref, step.event);
			}, elapsed);
			rt.timers.add(handle);
		}
	}

	#clearTimers(rt: SessionRuntime): void {
		for (const handle of rt.timers) clearTimeout(handle);
		rt.timers.clear();
	}

	async listSessions(workspace: WorkspaceRef): Promise<readonly SessionSnapshot[]> {
		return [...this.#sessions.values()]
			.map(runtime => runtime.snapshot)
			.filter(snapshot => snapshot.workspace.workspaceId === workspace.workspaceId)
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
	}

	async createSession(workspace: WorkspaceRef, options?: CreateSessionOptions): Promise<SessionSnapshot> {
		const sessionId = `mock-${this.#sessions.size + 1}`;
		const snapshot = createMockSessionSnapshot(workspace, sessionId, options);
		this.#sessions.set(sessionId, this.#freshRuntime(snapshot));
		return snapshot;
	}

	async openSession(sessionRef: SessionRef, _initialSnapshot?: SessionSnapshot | null): Promise<SessionSnapshot> {
		return this.#runtime(sessionRef).snapshot;
	}

	async archiveSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, archivedAt: nowIso(), updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async unarchiveSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#runtime(sessionRef);
		const { archivedAt: _archivedAt, ...rest } = rt.snapshot;
		rt.snapshot = { ...rest, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async pinSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, pinnedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async unpinSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#runtime(sessionRef);
		const { pinnedAt: _pinnedAt, ...rest } = rt.snapshot;
		rt.snapshot = rest;
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async deleteSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#sessions.get(sessionRef.sessionId);
		if (!rt) return;
		rt.runToken += 1;
		this.#clearTimers(rt);
		this.#emit(rt, sessionRef, { type: "sessionClosed", reason: "manual" });
		this.#sessions.delete(sessionRef.sessionId);
	}

	async sendUserMessage(sessionRef: SessionRef, _input: SessionMessageInput): Promise<void> {
		const rt = this.#runtime(sessionRef);
		const turn = nextReplyTurn(this.#script, rt);
		// The provider optimistically appends the user message, so the driver only
		// plays the agent's reply turn.
		if (turn) this.#play(rt, sessionRef, turn.steps);
	}
	async interruptWithQueuedMessage(
		sessionRef: SessionRef,
		next: SessionMessageInput,
		remaining: readonly SessionQueuedMessage[],
	): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.runToken += 1;
		this.#clearTimers(rt);
		rt.snapshot = { ...rt.snapshot, queuedMessages: remaining, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
		await this.sendUserMessage(sessionRef, next);
	}

	async replaceQueuedMessages(sessionRef: SessionRef, messages: readonly SessionQueuedMessage[]): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, queuedMessages: messages, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async cancelCurrentRun(sessionRef: SessionRef): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.runToken += 1; // invalidate any pending scheduled steps
		this.#clearTimers(rt);
		this.#emit(rt, sessionRef, { type: "runCompleted", snapshot: rt.snapshot });
	}

	async setSessionModel(sessionRef: SessionRef, selection: SessionModelSelection): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = {
			...rt.snapshot,
			config: { ...rt.snapshot.config, provider: selection.provider, modelId: selection.modelId },
			updatedAt: nowIso(),
		};
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	/** Demo cycle: hops slow → default → smol with stand-in models. */
	async cycleSessionRoleModel(
		sessionRef: SessionRef,
		direction: "forward" | "backward",
	): Promise<SessionRoleCycleResult | null> {
		const order = ["slow", "default", "smol"];
		const models: Record<string, { provider: string; modelId: string }> = {
			slow: { provider: "openai", modelId: "gpt-5.5" },
			default: { provider: "openai", modelId: "gpt-4o" },
			smol: { provider: "openai", modelId: "gpt-4o-mini" },
		};
		const rt = this.#runtime(sessionRef);
		const currentIndex = order.findIndex(role => models[role]?.modelId === rt.snapshot.config?.modelId);
		const step = direction === "backward" ? -1 : 1;
		const role = order[(Math.max(currentIndex, 0) + step + order.length) % order.length] ?? "default";
		const next = models[role] ?? { provider: "openai", modelId: "gpt-4o" };
		await this.setSessionModel(sessionRef, next);
		return { role, order, provider: next.provider, modelId: next.modelId };
	}

	async setSessionTeam(sessionRef: SessionRef, team: string | null): Promise<SessionTeamSwitchResult> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = {
			...rt.snapshot,
			config: { ...(rt.snapshot.config ?? {}), activeTeam: team },
			updatedAt: nowIso(),
		};
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
		return { team };
	}

	async speechToTextStatus(): Promise<SpeechToTextStatus | null> {
		return { modelKey: "parakeet", cached: true };
	}

	/** Scripted capture: replays a fixed dictation on a timer; audio is ignored. */
	async startSpeechToText(events: SpeechToTextEvents): Promise<SpeechToTextHandle> {
		const words = "Refactor the session rail so pinned sessions stay above the fold.".split(" ");
		let spoken = 0;
		let finals = "";
		const timer = setInterval(() => {
			if (spoken >= words.length) return;
			spoken += 1;
			const partial = words.slice(Math.max(0, spoken - 4), spoken).join(" ");
			if (spoken % 4 === 0 || spoken === words.length) {
				const segment = words.slice(Math.max(0, spoken - 4), spoken).join(" ");
				finals = finals ? `${finals} ${segment}` : segment;
				events.onSegment?.(segment, Math.floor(spoken / 4));
			} else {
				events.onPartial?.(partial);
			}
		}, 260);
		queueMicrotask(() => events.onReady?.());
		return {
			sendAudio: () => undefined,
			stop: async () => {
				clearInterval(timer);
				return finals;
			},
			cancel: () => clearInterval(timer),
		};
	}
	async liveEndpoint(): Promise<{ url: string | null }> {
		return { url: null };
	}

	async setSessionThinkingLevel(sessionRef: SessionRef, thinkingLevel: string): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, config: { ...rt.snapshot.config, thinkingLevel }, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async setSessionApprovalMode(sessionRef: SessionRef, approvalMode: string): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, config: { ...rt.snapshot.config, approvalMode }, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async setSessionEphemeral(sessionRef: SessionRef, ephemeral: boolean): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, config: { ...rt.snapshot.config, ephemeral }, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async renameSession(sessionRef: SessionRef, title: string): Promise<void> {
		const rt = this.#runtime(sessionRef);
		rt.snapshot = { ...rt.snapshot, title, updatedAt: nowIso() };
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async compactSession(sessionRef: SessionRef, _customInstructions?: string): Promise<void> {
		const rt = this.#runtime(sessionRef);
		this.#play(rt, sessionRef, [
			{ event: { type: "compactionStarted", reason: "threshold" } },
			{ delayMs: 450, event: { type: "compactionFinished", aborted: false, shortSummary: "Context compacted." } },
		]);
	}

	async reloadSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#runtime(sessionRef);
		this.#emit(rt, sessionRef, { type: "sessionUpdated", snapshot: rt.snapshot });
	}

	async getSessionTree(_sessionRef: SessionRef): Promise<SessionTreeSnapshot> {
		return this.#script.tree ?? { roots: [], leafId: null };
	}

	async navigateSessionTree(
		_sessionRef: SessionRef,
		_targetId: string,
		_options?: NavigateSessionTreeOptions,
	): Promise<NavigateSessionTreeResult> {
		return { cancelled: false };
	}

	async getSessionCommands(_sessionRef: SessionRef): Promise<readonly EngineCommandRecord[]> {
		return this.#script.commands ?? [];
	}

	async queryCompletions(_sessionRef: SessionRef, query: CompletionQuery): Promise<readonly CompletionItem[]> {
		const all = this.#script.completions ?? [];
		const needle = query.text.slice(0, query.cursor).trim().toLowerCase();
		if (!needle) return all;
		return all.filter(item => item.label.toLowerCase().includes(needle) || item.value.toLowerCase().includes(needle));
	}

	async respondToHostUiRequest(_sessionRef: SessionRef, _response: HostUiResponse): Promise<boolean> {
		// The provider optimistically clears the resolved request from view state, so a
		// scripted driver has nothing to replay here.
		return true;
	}

	subscribe(sessionRef: SessionRef, listener: SessionEventListener): Unsubscribe {
		const rt = this.#runtime(sessionRef);
		rt.listener = listener;
		// Each subscribe replays the opening transcript into a fresh view (the provider
		// dispatches sessionReset first), so the scripted replies restart in lockstep.
		rt.replyIndex = 0;
		// Scheduling via timers (even at 0ms) lets the provider's openSession() snapshot
		// dispatch — a microtask — land before the first replayed event.
		if (this.#script.intro?.length) this.#play(rt, sessionRef, this.#script.intro);
		return () => {
			if (rt.listener === listener) rt.listener = null;
			this.#clearTimers(rt);
		};
	}

	async closeSession(sessionRef: SessionRef): Promise<void> {
		const rt = this.#sessions.get(sessionRef.sessionId);
		if (!rt) return;
		this.#clearTimers(rt);
		rt.listener = null;
	}
}

/** Create a `SessionDriver` that replays a scripted demo through the real contract. */
export function createScriptedDriver(script: DemoScript): SessionDriver {
	return new ScriptedSessionDriver(script);
}

// Adapts a flat `AgentEventStream` (the harness contract every transport driver
// speaks — replay, ACP, Codex, AI SDK) into the rich `SessionDriver` contract
// the workspace surfaces render. One thread implementation everywhere: hosts
// with only an event stream still get the full session pane — transcript,
// streaming deltas, reasoning, tool cards, approvals.
import type {
	AgentEvent,
	AgentEventStream,
	ApprovalResponseEvent,
	Unsubscribe as AgentUnsubscribe,
} from "./index";
import type { EngineCommandRecord } from "./resource-types";
import type {
	CompletionItem,
	CreateSessionOptions,
	HostUiResponse,
	NavigateSessionTreeResult,
	SessionDriver,
	SessionDriverEvent,
	SessionEventListener,
	SessionMessageInput,
	SessionModelSelection,
	SessionRef,
	SessionSnapshot,
	SessionTranscriptBlock,
	SessionTranscriptMessage,
	SessionTranscriptToolCall,
	SessionTreeSnapshot,
	Unsubscribe,
	WorkspaceRef,
} from "./session-driver";

export interface EventStreamSessionDriverHandle extends SessionDriver {
	/** The single session this adapter exposes. */
	readonly sessionRef: SessionRef;
}

export interface EventStreamSessionDriverOptions {
	/** Send one user turn to the underlying harness (e.g. `driver.prompt`). */
	readonly prompt?: (input: SessionMessageInput) => void | Promise<void>;
	/** Abort the active turn (e.g. `driver.cancel`). */
	readonly cancel?: () => void;
	/** Answer an approval request raised on the stream. */
	readonly respondToApproval?: (response: ApprovalResponseEvent) => void;
	/** Switch the model the underlying harness uses for the next turn. When set,
	 *  the shell's model menu becomes live; absent, `setSessionModel` is a no-op. */
	readonly setModel?: (selection: SessionModelSelection) => void | Promise<void>;
	/** Change the engine's reasoning effort for this session. Absent, the shell's
	 *  effort control is inert - which is what it was: `setSessionThinkingLevel`
	 *  shipped as an empty method, so every selection was silently discarded. */
	readonly setThinkingLevel?: (level: string) => void | Promise<void>;
	/** The engine's thinking state at construction: its current level, and exactly
	 *  the levels THIS model accepts. Both change with the model, so the live values
	 *  arrive later on the `session.config` event. */
	readonly thinking?: { readonly level?: string; readonly levels?: readonly string[] };
	readonly workspace?: WorkspaceRef;
	readonly title?: string;
	readonly model?: string;
	/**
	 * The session's real id, when the host has one. Omitted, the adapter invents a
	 * synthetic `stream-N`, which cannot match a session catalog entry — so the rail
	 * never highlights the open session.
	 */
	readonly sessionId?: string;
	readonly provider?: string;
}

const DEFAULT_WORKSPACE: WorkspaceRef = {
	workspaceId: "stream-local",
	path: "stream",
	displayName: "Agent",
};

type LocalEvent = DistributiveOmit<SessionDriverEvent, "sessionRef" | "timestamp">;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

class EventStreamSessionDriver implements EventStreamSessionDriverHandle {
	readonly #stream: AgentEventStream;
	readonly #options: EventStreamSessionDriverOptions;
	readonly #workspace: WorkspaceRef;
	#snapshot: SessionSnapshot;
	#transcript: SessionTranscriptMessage[] = [];
	#seq = 0;
	#turn = 0;
	/**
	 * The current turn's blocks, IN THE ORDER THEY HAPPENED.
	 *
	 * Reasoning, prose and tool calls interleave in a real turn, and a settled
	 * message has to reproduce that: keeping only two text buffers meant every tool
	 * call was ephemeral - rendered live from `toolStarted`/`toolFinished`, then
	 * dropped on the floor when the turn settled, because nothing ever wrote it to
	 * the transcript. Measured: six tool cards on screen during a turn, zero the
	 * instant it finished, and none at all on resume.
	 */
	#pending: SessionTranscriptBlock[] = [];
	/** Where each in-flight tool call sits in {@link #pending}, by call id. */
	#toolBlocks = new Map<string, number>();
	#listener: SessionEventListener | null = null;
	#streamUnsubscribe: AgentUnsubscribe | null = null;

	constructor(sessionId: string, stream: AgentEventStream, options: EventStreamSessionDriverOptions) {
		this.#stream = stream;
		this.#options = options;
		this.#workspace = options.workspace ?? DEFAULT_WORKSPACE;
		this.#snapshot = {
			ref: { workspaceId: this.#workspace.workspaceId, sessionId },
			workspace: this.#workspace,
			title: options.title ?? "Agent session",
			status: "idle",
			updatedAt: new Date().toISOString(),
			config: {
				...(options.provider ? { provider: options.provider } : {}),
				...(options.model ? { modelId: options.model } : {}),
				...(options.thinking?.level === undefined ? {} : { thinkingLevel: options.thinking.level }),
				...(options.thinking?.levels === undefined ? {} : { thinkingLevels: options.thinking.levels }),
			},
		};
	}

	get sessionRef(): SessionRef {
		return this.#snapshot.ref;
	}

	#emit(event: LocalEvent): void {
		const full = {
			...event,
			sessionRef: this.#snapshot.ref,
			timestamp: new Date().toISOString(),
		} as SessionDriverEvent;
		void this.#listener?.(full);
	}

	#patch(patch: Partial<SessionSnapshot>): void {
		this.#snapshot = { ...this.#snapshot, ...patch, updatedAt: new Date().toISOString() };
		this.#emit({ type: "sessionUpdated", snapshot: this.#snapshot });
	}

	#journal(): void {
		this.#seq += 1;
		this.#emit({
			type: "sessionJournalUpdated",
			seq: this.#seq,
			transcript: [...this.#transcript],
			customMessages: {},
		});
	}

	/** Extend the trailing text/reasoning block, or open a new one. Keeping deltas
	 *  merged means a turn's prose is one block per run of prose, with tool calls
	 *  sitting between the runs exactly where they happened. */
	#appendProse(type: "text" | "reasoning", delta: string): void {
		const last = this.#pending.at(-1);
		if (last !== undefined && last.type === type) {
			this.#pending[this.#pending.length - 1] = { type, text: last.text + delta };
			return;
		}
		this.#pending.push({ type, text: delta });
	}

	/** Patch a recorded tool call in place, by call id. */
	#patchToolBlock(callId: string, patch: Partial<SessionTranscriptToolCall>): void {
		const at = this.#toolBlocks.get(callId);
		if (at === undefined) return;
		const block = this.#pending[at];
		if (block === undefined || block.type !== "tool") return;
		this.#pending[at] = { type: "tool", call: { ...block.call, ...patch } };
	}

	/** Settle the streamed agent segment into a durable transcript message. */
	#settleAgentMessage(extra?: SessionTranscriptMessage["blocks"][number]): void {
		const blocks: SessionTranscriptMessage["blocks"][number][] = [...this.#pending];
		if (extra) blocks.push(extra);
		if (blocks.length > 0) {
			this.#transcript.push({
				id: `${this.#snapshot.ref.sessionId}-a${this.#turn}`,
				role: "agent",
				blocks,
				timestamp: new Date().toISOString(),
				settled: true,
				final: true,
			});
			this.#journal();
		}
		this.#pending = [];
		this.#toolBlocks.clear();
	}

	#onAgentEvent(event: AgentEvent): void {
		switch (event.type) {
			case "session.start":
				break;
			case "user.message":
				this.#turn += 1;
				this.#transcript.push({
					id: event.messageId,
					role: "user",
					blocks: [{ type: "text", text: event.content }],
					timestamp: new Date().toISOString(),
				});
				this.#journal();
				this.#patch({ status: "running", preview: event.content.slice(0, 120) });
				break;
			case "assistant.message.delta":
				this.#appendProse("text", event.delta);
				this.#emit({ type: "assistantDelta", text: event.delta });
				break;
			case "reasoning.delta":
				this.#appendProse("reasoning", event.delta);
				this.#emit({ type: "thinkingDelta", text: event.delta });
				break;
			case "tool_call.start":
				// Recorded in the turn's block order, not just streamed: this is what
				// keeps the card in the thread once the turn settles.
				this.#toolBlocks.set(event.toolCallId, this.#pending.length);
				this.#pending.push({
					type: "tool",
					call: {
						callId: event.toolCallId,
						toolName: event.toolName,
						status: "running",
						...(event.input === undefined ? {} : { input: event.input }),
					},
				});
				this.#emit({
					type: "toolStarted",
					toolName: event.toolName,
					callId: event.toolCallId,
					input: event.input,
				});
				break;
			case "tool_call.update":
				this.#patchToolBlock(
					event.toolCallId,
					typeof event.output === "string" ? { text: event.output } : { output: event.output },
				);
				this.#emit({
					type: "toolUpdated",
					callId: event.toolCallId,
					...(typeof event.output === "string" ? { text: event.output } : { partialResult: event.output }),
				});
				break;
			case "tool_call.end": {
				const success = event.status !== "failed" && event.status !== "cancelled";
				this.#patchToolBlock(event.toolCallId, {
					status: success ? "success" : "error",
					...(event.output === undefined ? {} : { output: event.output }),
				});
				this.#emit({
					type: "toolFinished",
					callId: event.toolCallId,
					success,
					output: event.output,
				});
				break;
			}
			case "approval.request":
				this.#emit({
					type: "hostUiRequest",
					request: {
						kind: "confirm",
						requestId: event.approvalId,
						title: "Approval required",
						message: event.prompt,
					},
				});
				break;
			case "approval.response":
				break;
			case "session.notice":
				// Stands alone on purpose: settling here would cut an in-flight reply in
				// half just because the engine mentioned something.
				this.#transcript.push({
					id: `${this.#snapshot.ref.sessionId}-notice-${this.#transcript.length}`,
					role: "agent",
					blocks: [{ type: "notice", level: event.level, message: event.message }],
					timestamp: new Date().toISOString(),
					settled: true,
					final: true,
				});
				this.#journal();
				break;
			case "session.config": {
				// Merge, never replace: the engine reports the model and the thinking row
				// on the same lane but not always together, so a config frame carrying
				// only a new thinking level must not erase the known model id.
				this.#patch({
					config: {
						...this.#snapshot.config,
						...(event.modelId === undefined ? {} : { modelId: event.modelId }),
						...(event.thinkingLevel === undefined ? {} : { thinkingLevel: event.thinkingLevel }),
						...(event.thinkingLevels === undefined ? {} : { thinkingLevels: event.thinkingLevels }),
					},
				});
				break;
			}
			case "context.usage": {
				// The context ring reads `snapshot.contextUsage`; percent is derived here
				// so every consumer agrees on the arithmetic. `tokens: null` (the engine
				// cannot say, e.g. straight after compaction) must stay null rather than
				// collapsing to a confident 0%.
				const contextWindow = event.contextWindow;
				const tokens = event.tokens;
				this.#patch({
					contextUsage: {
						tokens,
						contextWindow,
						percent: tokens === null || contextWindow <= 0 ? null : (tokens / contextWindow) * 100,
					},
				});
				break;
			}
			case "session.done":
				this.#settleAgentMessage();
				this.#emit({ type: "turnEnded", final: true });
				this.#patch({ status: "idle" });
				this.#emit({ type: "runCompleted", snapshot: this.#snapshot });
				break;
			case "session.error":
				this.#settleAgentMessage({ type: "notice", level: "error", message: event.message });
				this.#patch({ status: "failed" });
				this.#emit({ type: "runCompleted", snapshot: this.#snapshot });
				break;
		}
	}

	async listSessions(workspace: WorkspaceRef): Promise<readonly SessionSnapshot[]> {
		return workspace.workspaceId === this.#workspace.workspaceId ? [this.#snapshot] : [];
	}

	async createSession(_workspace: WorkspaceRef, _options?: CreateSessionOptions): Promise<SessionSnapshot> {
		return this.#snapshot;
	}

	async openSession(): Promise<SessionSnapshot> {
		return { ...this.#snapshot, loaded: true };
	}

	async closeSession(): Promise<void> {
		this.#listener = null;
	}

	async archiveSession(): Promise<void> {}
	async unarchiveSession(): Promise<void> {}
	async pinSession(): Promise<void> {}
	async unpinSession(): Promise<void> {}
	async deleteSession(): Promise<void> {}

	async renameSession(_ref: SessionRef, title: string): Promise<void> {
		this.#patch({ title });
	}

	async sendUserMessage(_ref: SessionRef, input: SessionMessageInput): Promise<void> {
		await this.#options.prompt?.(input);
	}

	async interruptWithQueuedMessage(ref: SessionRef, next: SessionMessageInput): Promise<void> {
		this.#options.cancel?.();
		await this.sendUserMessage(ref, next);
	}

	async replaceQueuedMessages(): Promise<void> {}

	async cancelCurrentRun(): Promise<void> {
		this.#options.cancel?.();
		this.#patch({ status: "idle" });
		this.#emit({ type: "runCompleted", snapshot: this.#snapshot });
	}

	async setSessionModel(_ref: SessionRef, selection: SessionModelSelection): Promise<void> {
		await this.#options.setModel?.(selection);
		this.#patch({
			config: { ...this.#snapshot.config, provider: selection.provider, modelId: selection.modelId },
		});
	}
	async setSessionThinkingLevel(_ref: SessionRef, thinkingLevel: string): Promise<void> {
		// Patch AFTER the host call, and only the level: the option list belongs to the
		// model, so a level change must not be read as a change to what is available.
		await this.#options.setThinkingLevel?.(thinkingLevel);
		this.#patch({ config: { ...this.#snapshot.config, thinkingLevel } });
	}
	async setSessionApprovalMode(): Promise<void> {}
	async setSessionEphemeral(): Promise<void> {}
	async compactSession(): Promise<void> {}

	async reloadSession(): Promise<void> {
		this.#emit({ type: "sessionUpdated", snapshot: this.#snapshot });
	}

	async getSessionTree(): Promise<SessionTreeSnapshot> {
		return { roots: [], leafId: null };
	}

	async navigateSessionTree(): Promise<NavigateSessionTreeResult> {
		return { cancelled: false };
	}

	async getSessionCommands(): Promise<readonly EngineCommandRecord[]> {
		return [];
	}

	async queryCompletions(): Promise<readonly CompletionItem[]> {
		return [];
	}

	async respondToHostUiRequest(_ref: SessionRef, response: HostUiResponse): Promise<boolean> {
		const respond = this.#options.respondToApproval;
		if (respond) {
			const confirmed = "confirmed" in response ? response.confirmed : !("cancelled" in response);
			respond({
				type: "approval.response",
				sessionId: this.#snapshot.ref.sessionId,
				approvalId: response.requestId,
				decision: confirmed ? "approved" : "rejected",
			});
		}
		return true;
	}

	subscribe(_ref: SessionRef, listener: SessionEventListener): Unsubscribe {
		this.#listener = listener;
		// Replay the accumulated transcript on a macrotask so the provider's
		// openSession snapshot dispatch lands first, mirroring live transports.
		const replay = setTimeout(() => {
			if (this.#transcript.length > 0) {
				this.#emit({
					type: "sessionJournalUpdated",
					seq: this.#seq,
					transcript: [...this.#transcript],
					customMessages: {},
				});
			}
		}, 0);
		this.#streamUnsubscribe ??= this.#stream.subscribe(event => this.#onAgentEvent(event));
		return () => {
			clearTimeout(replay);
			if (this.#listener === listener) this.#listener = null;
		};
	}
}

let adapterCount = 0;

/**
 * Wraps a flat `AgentEventStream` in the full `SessionDriver` contract, so the
 * workspace session pane (thread + composer + approvals) can render any harness.
 */
export function createEventStreamSessionDriver(
	stream: AgentEventStream,
	options: EventStreamSessionDriverOptions = {},
): EventStreamSessionDriverHandle {
	adapterCount += 1;
	// A host with REAL session ids — an engine that persists and lists sessions —
	// must be able to say so. The rail marks the active session by matching its
	// catalog entry's ref against the live one, and a synthetic `stream-N` matches
	// nothing, so the session a user just clicked never highlighted.
	return new EventStreamSessionDriver(options.sessionId ?? `stream-${adapterCount}`, stream, options);
}

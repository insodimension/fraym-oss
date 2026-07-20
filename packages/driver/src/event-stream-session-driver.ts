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
	SessionTranscriptMessage,
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
	readonly workspace?: WorkspaceRef;
	readonly title?: string;
	readonly model?: string;
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
	#agentText = "";
	#agentReasoning = "";
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

	/** Settle the streamed agent segment into a durable transcript message. */
	#settleAgentMessage(extra?: SessionTranscriptMessage["blocks"][number]): void {
		const blocks: SessionTranscriptMessage["blocks"][number][] = [];
		if (this.#agentReasoning.length > 0) blocks.push({ type: "reasoning", text: this.#agentReasoning });
		if (this.#agentText.length > 0) blocks.push({ type: "text", text: this.#agentText });
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
		this.#agentText = "";
		this.#agentReasoning = "";
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
				this.#agentText += event.delta;
				this.#emit({ type: "assistantDelta", text: event.delta });
				break;
			case "reasoning.delta":
				this.#agentReasoning += event.delta;
				this.#emit({ type: "thinkingDelta", text: event.delta });
				break;
			case "tool_call.start":
				this.#emit({
					type: "toolStarted",
					toolName: event.toolName,
					callId: event.toolCallId,
					input: event.input,
				});
				break;
			case "tool_call.update":
				this.#emit({
					type: "toolUpdated",
					callId: event.toolCallId,
					...(typeof event.output === "string" ? { text: event.output } : { partialResult: event.output }),
				});
				break;
			case "tool_call.end":
				this.#emit({
					type: "toolFinished",
					callId: event.toolCallId,
					success: event.status !== "failed" && event.status !== "cancelled",
					output: event.output,
				});
				break;
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
	async setSessionThinkingLevel(): Promise<void> {}
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
	return new EventStreamSessionDriver(`stream-${adapterCount}`, stream, options);
}

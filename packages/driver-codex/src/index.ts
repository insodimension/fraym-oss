import {
	createEventStreamSessionDriver,
	type EngineMarketplaceEntry,
	type EngineModelRecord,
	type EngineResourceDriver,
	type EngineResourceSnapshot,
	type EventStreamSessionDriverHandle,
	type PluginConnectState,
	type WorkspaceRef,
} from "@fraym/driver";
import type {
	AgentEvent,
	AgentEventListener,
	AgentEventStream,
	ApprovalResponseEvent,
	Unsubscribe,
} from "@fraym/driver";

/** JSON-RPC notification or bridge control frame emitted by `codex app-server`. */
export interface CodexFrame {
	readonly type?: string;
	readonly method?: string;
	readonly params?: unknown;
	readonly requestId?: string;
	readonly item?: Record<string, unknown>;
	readonly message?: string;
	readonly [key: string]: unknown;
}

type FetchTransport = (input: string | URL, init?: RequestInit) => Promise<Response>;

export const CODEX_DEFAULT_MODEL = "gpt-5.6-sol";
export const CODEX_DEFAULT_REASONING = "medium";

export interface CodexDriverOptions {
	/** Local bridge URL. Defaults to the bundled bridge's localhost port. */
	readonly bridgeUrl?: string;
	/** Stable session id reported on every emitted event. */
	readonly sessionId?: string;
	/** Model passed to `codex exec` (defaults to gpt-5.6-sol). */
	readonly model?: string;
	/** Reasoning effort passed to `codex exec` (low | medium | high). */
	readonly reasoning?: string;
	/** Run Codex with full workspace access (no per-action approval prompts). */
	readonly fullAccess?: boolean;
	/** Optional transport override, primarily for deterministic integration tests. */
	readonly fetch?: FetchTransport;
}

/** A Fraym `AgentEventStream` backed by the local Codex CLI bridge. */
export interface CodexDriver extends AgentEventStream {
	/** Sends one text turn through the Codex bridge. */
	prompt(text: string): Promise<void>;
	/** Returns an inline Fraym approval decision to Codex. */
	respondToApproval(response: ApprovalResponseEvent): void;
	/** Cancels the active Codex turn. */
	cancel(): void;
	/** Switch the model (and optionally reasoning) sent on the NEXT turn. */
	setModel(model: string, reasoning?: string): void;
}

/** Per-turn message ids so streamed deltas aggregate into single thread rows. */
interface TurnContext {
	readonly sessionId: string;
	readonly assistantMessageId: string;
	readonly reasoningMessageId: string;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function fileChangeOutput(item: Record<string, unknown>): { readonly details: { readonly totalFiles: number; readonly perFileResults: readonly { readonly path: string; readonly op: "create" | "delete" | "update"; readonly diff: string }[] } } {
	const changes = Array.isArray(item.changes) ? item.changes : [];
	const perFileResults: { path: string; op: "create" | "delete" | "update"; diff: string }[] = [];
	for (const changeValue of changes) {
		const change = recordValue(changeValue);
		if (!change) continue;
		const kind = stringValue(recordValue(change.kind)?.type);
		const op = kind === "add" ? "create" : kind === "delete" ? "delete" : "update";
		const rawDiff = stringValue(change.diff) ?? "";
		const marker = op === "create" ? "+" : op === "delete" ? "-" : " ";
		const diff = rawDiff
			.split("\n")
			.filter(line => line.length > 0)
			.map((line, index) => `${marker}${index + 1}|${line}`)
			.join("\n");
		perFileResults.push({ path: stringValue(change.path) ?? "", op, diff });
	}
	return { details: { totalFiles: perFileResults.length, perFileResults } };
}

function itemTool(item: Record<string, unknown>): { toolName: string; displayName?: string; input?: unknown; output?: unknown; success: boolean } | undefined {
	const type = stringValue(item.type);
	if (!type) return undefined;
	if (type === "commandExecution" || type === "command_execution") {
		const command = stringValue(item.command);
		const output = item.aggregatedOutput ?? item.aggregated_output ?? item.output;
		const exitCode = item.exitCode ?? item.exit_code;
		return {
			toolName: "bash",
			displayName: "Run command",
			...(command ? { input: { command } } : {}),
			...(output !== undefined ? { output } : {}),
			success: typeof exitCode === "number" ? exitCode === 0 : item.status !== "failed" && item.status !== "declined",
		};
	}
	if (type === "fileChange" || type === "file_change") {
		const changes = Array.isArray(item.changes) ? item.changes : [];
		const firstChange = recordValue(changes[0]);
		return {
			toolName: "edit",
			displayName: "Change files",
			...(item.changes !== undefined ? { input: { path: stringValue(firstChange?.path) ?? "", changes: item.changes } } : {}),
			output: fileChangeOutput(item),
			success: item.status !== "failed",
		};
	}
	if (type === "mcpToolCall" || type === "mcp_tool_call") {
		const server = stringValue(item.server) ?? stringValue(item.server_name);
		const tool = stringValue(item.tool) ?? stringValue(item.tool_name) ?? "tool";
		return {
			toolName: server ? `mcp__${server}__${tool}` : `mcp__${tool}`,
			displayName: tool,
			...(item.arguments !== undefined ? { input: item.arguments } : item.input !== undefined ? { input: item.input } : {}),
			output: item.result ?? item,
			success: item.error === undefined && item.status !== "failed",
		};
	}
	if (type === "todoList" || type === "todo_list") {
		return { toolName: "todo_write", displayName: "Update tasks", input: item, output: item, success: true };
	}
	return undefined;
}

/**
 * Maps one Codex app-server JSON-RPC notification (or bridge control frame)
 * into Fraym `AgentEvent`s. Delta notifications deliberately emit immediately
 * and repeatedly so the thread streams token-by-token.
 */
export function codexFrameToAgentEvents(frame: CodexFrame, ctx: TurnContext): readonly AgentEvent[] {
	const { sessionId, assistantMessageId, reasoningMessageId } = ctx;
	if (frame.type === "bridge.error" || frame.type === "error") {
		return [{ type: "session.error", sessionId, message: stringValue(frame.message) ?? "Codex failed to complete the turn" }];
	}
	if (frame.type === "bridge.request") {
		const requestId = stringValue(frame.requestId);
		const method = stringValue(frame.method);
		if (!requestId || !method) return [];
		const params = recordValue(frame.params);
		const command = stringValue(params?.command);
		const title = method === "item/commandExecution/requestApproval"
			? "Allow command?"
			: method === "item/fileChange/requestApproval"
				? "Allow file changes?"
				: "Allow file read?";
		return [{ type: "approval.request", sessionId, approvalId: requestId, prompt: command ? `${title}\n${command}` : title }];
	}
	const method = stringValue(frame.method) ?? stringValue(frame.type);
	if (!method) return [];
	const params = recordValue(frame.params);
	if (method === "turn/completed" || method === "turn.completed") {
		const turn = recordValue(params?.turn);
		const error = recordValue(turn?.error);
		if (turn?.status === "failed") {
			return [{ type: "session.error", sessionId, message: stringValue(error?.message) ?? "Codex failed to complete the turn" }];
		}
		return [{ type: "session.done", sessionId }];
	}
	if (method === "item/agentMessage/delta") {
		const delta = stringValue(params?.delta);
		return delta ? [{ type: "assistant.message.delta", sessionId, messageId: assistantMessageId, delta }] : [];
	}
	if (method === "item/reasoning/textDelta" || method === "item/reasoning/summaryTextDelta") {
		const delta = stringValue(params?.delta);
		return delta ? [{ type: "reasoning.delta", sessionId, messageId: reasoningMessageId, delta }] : [];
	}
	const item = recordValue(params?.item) ?? frame.item;
	const itemId = stringValue(params?.itemId) ?? stringValue(item?.id);
	if (method === "item/commandExecution/outputDelta" || method === "item/fileChange/outputDelta") {
		const delta = stringValue(params?.delta);
		return itemId && delta ? [{ type: "tool_call.update", sessionId, toolCallId: itemId, status: "running", output: delta }] : [];
	}
	if (!item) return [];
	if (stringValue(item.type) === "error") {
		return [{ type: "session.error", sessionId, message: stringValue(item.message) ?? stringValue(item.text) ?? "Codex reported an error" }];
	}
	const tool = itemTool(item);
	if (!tool || !itemId) return [];
	if (method === "item/started" || method === "item.started") {
		return [{ type: "tool_call.start", sessionId, toolCallId: itemId, toolName: tool.toolName, input: tool.input, status: "running" }];
	}
	if (method === "item/updated" || method === "item.updated") {
		return [{ type: "tool_call.update", sessionId, toolCallId: itemId, status: "running", ...(tool.output !== undefined ? { output: tool.output } : {}) }];
	}
	if (method === "item/completed" || method === "item.completed") {
		return [{ type: "tool_call.end", sessionId, toolCallId: itemId, status: tool.success ? "succeeded" : "failed", ...(tool.output !== undefined ? { output: tool.output } : {}) }];
	}
	return [];
}

/** Fraym approval decisions mapped to the bridge's Codex approval option ids. */
const APPROVAL_DECISION: Record<string, string> = {
	approved: "allow-once",
	rejected: "reject",
};

/**
 * Creates a browser-safe `AgentEventStream` that connects to the local Codex
 * CLI through the bundled bridge (`bun bridge.ts`). Mounts directly in
 * `<SessionThread source={...} />`, exactly like the ACP driver.
 */
export function createCodexDriver(options: CodexDriverOptions = {}): CodexDriver {
	const bridgeUrl = (options.bridgeUrl ?? "http://localhost:4319").replace(/\/$/, "");
	const sessionId = options.sessionId ?? `codex-${crypto.randomUUID()}`;
	let model = options.model ?? CODEX_DEFAULT_MODEL;
	let reasoning = options.reasoning ?? CODEX_DEFAULT_REASONING;
	const fullAccess = options.fullAccess ?? true;
	const doFetch: FetchTransport = options.fetch ?? globalThis.fetch;
	const listeners = new Set<AgentEventListener>();
	let started = false;
	let turn = 0;
	let abort: AbortController | undefined;

	const emit = (event: AgentEvent): void => {
		for (const listener of listeners) listener(event);
	};

	const consume = async (ctx: TurnContext, body: ReadableStream<Uint8Array>): Promise<void> => {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		while (true) {
			const next = await reader.read();
			if (next.done) break;
			buffer += decoder.decode(next.value, { stream: true });
			let boundary = buffer.indexOf("\n\n");
			while (boundary >= 0) {
				const block = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				const data = block
					.split("\n")
					.filter(line => line.startsWith("data:"))
					.map(line => line.slice(5).trimStart())
					.join("\n");
				if (data) {
					try {
						for (const event of codexFrameToAgentEvents(JSON.parse(data) as CodexFrame, ctx)) emit(event);
					} catch {
						emit({ type: "session.error", sessionId, message: "Codex bridge sent an invalid JSON frame" });
					}
				}
				boundary = buffer.indexOf("\n\n");
			}
		}
	};

	const prompt = async (text: string): Promise<void> => {
		if (!started) {
			started = true;
			emit({ type: "session.start", sessionId });
		}
		turn += 1;
		emit({ type: "user.message", sessionId, messageId: `${sessionId}-u${turn}`, content: text });
		const ctx: TurnContext = {
			sessionId,
			assistantMessageId: `${sessionId}-a${turn}`,
			reasoningMessageId: `${sessionId}-r${turn}`,
		};
		abort = new AbortController();
		let response: Response;
		try {
			response = await doFetch(`${bridgeUrl}/turn`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId, prompt: text, model, reasoning, fullAccess }),
				signal: abort.signal,
			});
		} catch (error) {
			emit({ type: "session.error", sessionId, message: error instanceof Error ? error.message : "Codex bridge is unreachable" });
			return;
		}
		if (!response.ok) {
			emit({ type: "session.error", sessionId, message: `Codex bridge returned ${response.status}` });
			return;
		}
		if (!response.body) {
			emit({ type: "session.error", sessionId, message: "Codex bridge returned no event stream" });
			return;
		}
		try {
			await consume(ctx, response.body);
		} catch (error) {
			if (!abort.signal.aborted) {
				emit({ type: "session.error", sessionId, message: error instanceof Error ? error.message : "Codex turn failed" });
			}
		}
	};

	const respondToApproval = (response: ApprovalResponseEvent): void => {
		void doFetch(`${bridgeUrl}/approval`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ sessionId, requestId: response.approvalId, decision: APPROVAL_DECISION[response.decision] ?? "reject" }),
		}).catch(() => undefined);
	};

	const cancel = (): void => {
		abort?.abort();
	};

	return {
		subscribe(listener: AgentEventListener): Unsubscribe {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		prompt,
		respondToApproval,
		cancel,
		setModel(nextModel: string, nextReasoning?: string) {
			model = nextModel;
			if (nextReasoning) reasoning = nextReasoning;
		},
	};
}

export const CODEX_WORKSPACE: WorkspaceRef = { workspaceId: "codex-local", path: "codex", displayName: "Codex CLI" };

/** The full `SessionDriver` for the Codex bridge: the flat stream wrapped so the
 * shared shell (rail, composer, approvals) renders around it. */
export function createCodexSessionDriver(options: CodexDriverOptions = {}): EventStreamSessionDriverHandle {
	const stream = createCodexDriver(options);
	return createEventStreamSessionDriver(stream, {
		prompt: (input) => stream.prompt(input.text),
		cancel: () => stream.cancel(),
		respondToApproval: (response) => stream.respondToApproval(response),
		setModel: (selection) => stream.setModel(selection.modelId),
		workspace: CODEX_WORKSPACE,
		title: "Codex CLI",
		model: options.model ?? CODEX_DEFAULT_MODEL,
		provider: "codex",
	});
}

interface CodexBridgeModel {
	readonly model?: string;
	readonly id?: string;
	readonly displayName?: string;
	readonly isDefault?: boolean;
	readonly supportedReasoningEfforts?: readonly string[];
}

function codexModelRecords(models: readonly CodexBridgeModel[]): EngineModelRecord[] {
	return models
		.map((entry): EngineModelRecord | undefined => {
			const modelId = entry.model ?? entry.id;
			if (!modelId) return undefined;
			return {
				providerId: "codex",
				providerName: "Codex",
				modelId,
				label: entry.displayName ?? modelId,
				available: true,
				authType: "none",
				reasoning: (entry.supportedReasoningEfforts?.length ?? 0) > 0,
				supportsImages: false,
			};
		})
		.filter((record): record is EngineModelRecord => record !== undefined);
}

/** Browser-local `EngineResourceDriver` for Codex: the model catalog surfaced by
 * the bridge's `GET /models`. Codex owns auth + config, so every mutation is an
 * honest no-op returning the current snapshot. */
export function createCodexResourceDriver(options: CodexDriverOptions = {}): EngineResourceDriver {
	const bridgeUrl = (options.bridgeUrl ?? "http://localhost:4319").replace(/\/$/, "");
	const doFetch: FetchTransport = options.fetch ?? globalThis.fetch;
	let snapshot: EngineResourceSnapshot | null = null;

	async function build(): Promise<EngineResourceSnapshot> {
		let models: EngineModelRecord[] = [];
		try {
			const response = await doFetch(`${bridgeUrl}/models`);
			if (response.ok) {
				const payload = (await response.json()) as { readonly models?: readonly CodexBridgeModel[] };
				models = codexModelRecords(payload.models ?? []);
			}
		} catch {
			// Bridge down: no catalog. The chip still shows the default model.
		}
		const defaultModel = models[0]?.modelId;
		snapshot = {
			workspace: CODEX_WORKSPACE,
			providers: [
				{
					id: "codex",
					name: "Codex",
					hasAuth: true,
					authType: "none",
					authSource: "external",
					oauthSupported: false,
					apiKeySetupSupported: false,
				},
			],
			models,
			skills: [],
			extensions: [],
			mcpServers: [],
			plugins: [],
			permissions: [],
			settings: {
				defaultProvider: "codex",
				...(defaultModel ? { defaultModelId: defaultModel } : {}),
				enableSkillCommands: false,
				enabledModelPatterns: [],
			},
		};
		return snapshot;
	}

	async function current(): Promise<EngineResourceSnapshot> {
		return snapshot ?? build();
	}

	return {
		getResourceSnapshot: () => current(),
		refreshResources: () => build(),
		getLastSnapshot: () => snapshot,
		login: () => current(),
		logout: () => current(),
		setProviderApiKey: () => current(),
		pinProviderAccount: () => current(),
		setProviderAccountPolicy: () => current(),
		setProviderAccountPriorityOrder: () => current(),
		removeProviderAccount: () => current(),
		setDefaultModel: () => current(),
		setDefaultThinkingLevel: () => current(),
		setEnableSkillCommands: () => current(),
		setScopedModelPatterns: () => current(),
		setSkillEnabled: () => current(),
		setExtensionEnabled: () => current(),
		setMcpServerEnabled: () => current(),
		listMarketplaces: async (): Promise<readonly EngineMarketplaceEntry[]> => [],
		addMarketplace: async (): Promise<readonly EngineMarketplaceEntry[]> => [],
		removeMarketplace: async (): Promise<readonly EngineMarketplaceEntry[]> => [],
		updateMarketplace: async (): Promise<readonly EngineMarketplaceEntry[]> => [],
		listAvailablePlugins: async () => [],
		listInstalledPlugins: async () => [],
		installPlugin: () => current(),
		uninstallPlugin: () => current(),
		setPluginEnabled: () => current(),
		setPluginToolLoading: () => current(),
		setPluginProjectScope: () => current(),
		checkPluginUpdates: async () => [],
		upgradePlugin: () => current(),
		pluginConnectStatus: async (): Promise<PluginConnectState> => ({ status: "not-connected" }),
		pluginConnect: async (): Promise<PluginConnectState> => ({ status: "not-connected" }),
		pluginDisconnect: async (): Promise<PluginConnectState> => ({ status: "not-connected" }),
		pluginInstallRequirement: async (): Promise<PluginConnectState> => ({ status: "not-connected" }),
		pluginOAuthConnect: async (): Promise<PluginConnectState> => ({ status: "not-connected" }),
	};
}

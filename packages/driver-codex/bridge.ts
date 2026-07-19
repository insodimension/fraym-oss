import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Codex writes land here (a scratch workspace), not in the repo. Override with CODEX_WORKSPACE_DIR.
const workspaceDir = process.env.CODEX_WORKSPACE_DIR ?? join(tmpdir(), "codex-workspace");
mkdirSync(workspaceDir, { recursive: true });

const port = Number.parseInt(process.env.CODEX_BRIDGE_PORT ?? "4319", 10);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface TurnRequest {
	sessionId?: unknown;
	prompt?: unknown;
	model?: unknown;
	reasoning?: unknown;
	fullAccess?: unknown;
}

interface ApprovalRequest {
	sessionId?: unknown;
	requestId?: unknown;
	decision?: unknown;
}

interface ParsedTurnRequest {
	readonly sessionId: string;
	readonly prompt: string;
	readonly model: string;
	readonly reasoning: string;
	readonly fullAccess: boolean;
}

interface ThreadState {
	readonly id: string;
}

interface PendingRequest {
	readonly method: string;
	readonly timeout: Timer;
	readonly resolve: (value: unknown) => void;
	readonly reject: (reason?: unknown) => void;
}

interface ActiveTurn {
	readonly sessionId: string;
	readonly controller: ReadableStreamDefaultController<Uint8Array>;
	closed: boolean;
	cancelled: boolean;
	turnId?: string;
	fileChangeItemId?: string;
	fileChangeItem?: Record<string, unknown>;
}

interface PendingApproval {
	readonly jsonRpcId: string | number;
}

interface CodexModelInfo {
	readonly id: string;
	readonly model: string;
	readonly displayName: string;
	readonly description: string;
	readonly isDefault: boolean;
	readonly hidden: boolean;
	readonly defaultReasoningEffort: string;
	readonly supportedReasoningEfforts: readonly string[];
}

let appServer: Bun.Subprocess<"pipe", "pipe", "pipe"> | undefined;
let startingAppServer: Promise<void> | undefined;
let nextRequestId = 1;
let activeTurn: ActiveTurn | undefined;
let modelCache: CodexModelInfo[] | undefined;
const threads = new Map<string, ThreadState>();
const pending = new Map<string, PendingRequest>();
const pendingApprovals = new Map<string, PendingApproval>();

function corsHeaders(): Record<string, string> {
	return {
		"access-control-allow-origin": "*",
		"access-control-allow-methods": "GET, POST, OPTIONS",
		"access-control-allow-headers": "content-type",
	};
}

function sseFrame(frame: unknown): Uint8Array {
	return encoder.encode(`data: ${JSON.stringify(frame)}\n\n`);
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numericId(value: unknown): string | number | undefined {
	return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function readString(record: Record<string, unknown>, key: string, fallback = ""): string {
	return stringValue(record[key]) ?? fallback;
}

function parseTurnRequest(body: TurnRequest): ParsedTurnRequest | undefined {
	if (typeof body.sessionId !== "string" || body.sessionId.length === 0) return undefined;
	if (typeof body.prompt !== "string" || body.prompt.trim().length === 0) return undefined;
	if (body.model !== undefined && !stringValue(body.model)) return undefined;
	if (body.reasoning !== undefined && !["low", "medium", "high"].includes(String(body.reasoning))) return undefined;
	if (body.fullAccess !== undefined && typeof body.fullAccess !== "boolean") return undefined;
	return {
		sessionId: body.sessionId,
		prompt: body.prompt,
		model: stringValue(body.model) ?? "gpt-5.6-sol",
		reasoning: stringValue(body.reasoning) ?? "medium",
		fullAccess: body.fullAccess === true,
	};
}

function toModelInfo(entry: unknown): CodexModelInfo | undefined {
	const record = recordValue(entry);
	if (!record) return undefined;
	const model = readString(record, "model") || readString(record, "id");
	if (!model) return undefined;
	const efforts: string[] = [];
	if (Array.isArray(record.supportedReasoningEfforts)) {
		for (const option of record.supportedReasoningEfforts) {
			const optionRecord = recordValue(option);
			const effort = optionRecord ? readString(optionRecord, "effort") : stringValue(option) ?? "";
			if (effort) efforts.push(effort);
		}
	}
	return {
		id: readString(record, "id", model),
		model,
		displayName: readString(record, "displayName", model),
		description: readString(record, "description"),
		isDefault: record.isDefault === true,
		hidden: record.hidden === true,
		defaultReasoningEffort: readString(record, "defaultReasoningEffort", "medium"),
		supportedReasoningEfforts: efforts.length > 0 ? efforts : ["low", "medium", "high"],
	};
}

function killChildTree(child: Bun.Subprocess<"pipe", "pipe", "pipe">): void {
	if (process.platform === "win32") {
		try {
			Bun.spawn(["taskkill", "/pid", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore" }).unref();
			return;
		} catch {
			// Fall through to Bun's direct child termination.
		}
	}
	try {
		child.kill();
	} catch {
		// The process has already exited.
	}
}

function closeTurn(turn: ActiveTurn): void {
	if (turn.closed) return;
	turn.closed = true;
	if (activeTurn === turn) activeTurn = undefined;
	try {
		turn.controller.close();
	} catch {
		// The browser disconnected before Codex completed.
	}
}

function emitToActiveTurn(frame: unknown): void {
	if (!activeTurn || activeTurn.closed || activeTurn.cancelled) return;
	try {
		activeTurn.controller.enqueue(sseFrame(frame));
	} catch {
		activeTurn.closed = true;
		activeTurn = undefined;
	}
}

function rejectPending(message: string): void {
	for (const pendingRequest of pending.values()) {
		clearTimeout(pendingRequest.timeout);
		pendingRequest.reject(new Error(message));
	}
	pending.clear();
}

function finishAppServer(child: Bun.Subprocess<"pipe", "pipe", "pipe">): void {
	if (appServer !== child) return;
	appServer = undefined;
	startingAppServer = undefined;
	rejectPending("codex app-server exited");
	if (activeTurn) {
		emitToActiveTurn({ type: "bridge.error", message: "codex app-server exited before the turn completed" });
		closeTurn(activeTurn);
	}
}

function handleAppServerMessage(value: unknown): void {
	const message = recordValue(value);
	if (!message) return;
	const id = numericId(message.id);
	const method = stringValue(message.method);
	if (id !== undefined && method) {
		const requestId = String(id);
		if (method === "item/commandExecution/requestApproval" || method === "item/fileRead/requestApproval" || method === "item/fileChange/requestApproval") {
			pendingApprovals.set(requestId, { jsonRpcId: id });
			emitToActiveTurn({ type: "bridge.request", requestId, method, params: message.params });
			return;
		}
		void writeJsonRpc({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unsupported server request: ${method}` } });
		return;
	}
	if (id !== undefined) {
		const pendingRequest = pending.get(String(id));
		if (!pendingRequest) return;
		pending.delete(String(id));
		clearTimeout(pendingRequest.timeout);
		const error = recordValue(message.error);
		if (error) {
			pendingRequest.reject(new Error(`${pendingRequest.method} failed: ${readString(error, "message", "Unknown JSON-RPC error")}`));
		} else {
			pendingRequest.resolve(message.result);
		}
		return;
	}
	if (!method) return;
	const params = recordValue(message.params);
	if (method === "item/started" && activeTurn && stringValue(recordValue(params?.item)?.type) === "fileChange") {
		activeTurn.fileChangeItem = recordValue(params?.item);
		activeTurn.fileChangeItemId = stringValue(activeTurn.fileChangeItem?.id);
	}
	if (method === "turn/diff/updated" && activeTurn?.fileChangeItemId) {
		const diff = stringValue(params?.unifiedDiff) ?? stringValue(params?.diff) ?? stringValue(params?.patch);
		if (diff) {
			emitToActiveTurn({
				method: "item/fileChange/outputDelta",
				params: { ...params, itemId: activeTurn.fileChangeItemId, item: activeTurn.fileChangeItem, delta: diff },
			});
		}
	}
	emitToActiveTurn({ method, params: message.params });
	if (method === "turn/completed" || method === "turn/aborted") {
		if (activeTurn) closeTurn(activeTurn);
	}
}

async function consumeAppServerStdout(child: Bun.Subprocess<"pipe", "pipe", "pipe">): Promise<void> {
	let buffer = "";
	try {
		for await (const chunk of child.stdout) {
			buffer += decoder.decode(chunk, { stream: true });
			let newline = buffer.indexOf("\n");
			while (newline >= 0) {
				const line = buffer.slice(0, newline).trim();
				buffer = buffer.slice(newline + 1);
				if (line) {
					try {
						handleAppServerMessage(JSON.parse(line) as unknown);
					} catch {
						emitToActiveTurn({ type: "bridge.error", message: "codex app-server wrote malformed JSON-RPC" });
					}
				}
				newline = buffer.indexOf("\n");
			}
		}
	} finally {
		finishAppServer(child);
	}
}

async function consumeAppServerStderr(child: Bun.Subprocess<"pipe", "pipe", "pipe">): Promise<void> {
	let buffer = "";
	for await (const chunk of child.stderr) {
		buffer += decoder.decode(chunk, { stream: true });
		let newline = buffer.indexOf("\n");
		while (newline >= 0) {
			const line = buffer.slice(0, newline).trim();
			buffer = buffer.slice(newline + 1);
			if (line && /\\bERROR\\b/i.test(line)) console.error(`[codex-bridge] ${line}`);
			newline = buffer.indexOf("\n");
		}
	}
}

async function writeJsonRpc(message: unknown): Promise<void> {
	const child = appServer;
	if (!child) throw new Error("codex app-server is not running");
	await child.stdin.write(encoder.encode(`${JSON.stringify(message)}\n`));
	await child.stdin.flush();
}

async function sendRequest(method: string, params: unknown, timeoutMs = 20_000): Promise<unknown> {
	await ensureAppServer();
	const id = nextRequestId++;
	const deferred = Promise.withResolvers<unknown>();
	const timeout = setTimeout(() => {
		const request = pending.get(String(id));
		if (!request) return;
		pending.delete(String(id));
		request.reject(new Error(`Timed out waiting for ${method}`));
	}, timeoutMs);
	pending.set(String(id), { method, timeout, resolve: deferred.resolve, reject: deferred.reject });
	try {
		await writeJsonRpc({ jsonrpc: "2.0", id, method, params });
	} catch (error) {
		clearTimeout(timeout);
		pending.delete(String(id));
		throw error;
	}
	return deferred.promise;
}

async function ensureAppServer(): Promise<void> {
	if (appServer) return;
	if (startingAppServer) return startingAppServer;
	startingAppServer = (async () => {
		const child = Bun.spawn(["codex", "app-server"], { cwd: workspaceDir, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
		appServer = child;
		void consumeAppServerStdout(child);
		void consumeAppServerStderr(child);
		try {
			await sendRequest("initialize", { clientInfo: { name: "fraym-codex-bridge", version: "0.1.0" } });
		} catch (error) {
			killChildTree(child);
			throw error;
		}
	})();
	try {
		await startingAppServer;
	} finally {
		startingAppServer = undefined;
	}
}

function responseThreadId(response: unknown): string | undefined {
	const record = recordValue(response);
	const thread = recordValue(record?.thread);
	return stringValue(thread?.id) ?? stringValue(record?.threadId);
}

function responseTurnId(response: unknown): string | undefined {
	const record = recordValue(response);
	return stringValue(recordValue(record?.turn)?.id);
}

async function ensureThread(input: ParsedTurnRequest): Promise<string> {
	const existing = threads.get(input.sessionId);
	if (existing) return existing.id;
	const response = await sendRequest("thread/start", {
		cwd: workspaceDir,
		model: input.model,
		approvalPolicy: input.fullAccess ? "never" : "untrusted",
		sandbox: input.fullAccess ? "danger-full-access" : "workspace-write",
	});
	const threadId = responseThreadId(response);
	if (!threadId) throw new Error("thread/start response did not include a thread id");
	threads.set(input.sessionId, { id: threadId });
	return threadId;
}

function turnStream(input: ParsedTurnRequest): ReadableStream<Uint8Array> {
	let currentTurn: ActiveTurn | undefined;
	return new ReadableStream({
		start(controller) {
			if (activeTurn) {
				controller.enqueue(sseFrame({ type: "bridge.error", message: "A Codex turn is already running" }));
				controller.close();
				return;
			}
			currentTurn = { sessionId: input.sessionId, controller, closed: false, cancelled: false };
			activeTurn = currentTurn;
			void (async () => {
				try {
					const threadId = await ensureThread(input);
					if (currentTurn?.cancelled) return;
					const response = await sendRequest("turn/start", {
						threadId,
						input: [{ type: "text", text: input.prompt, text_elements: [] }],
						model: input.model,
						effort: input.reasoning,
						approvalPolicy: input.fullAccess ? "never" : "untrusted",
						sandboxPolicy: input.fullAccess ? { type: "dangerFullAccess" } : { type: "workspaceWrite" },
					});
					if (currentTurn) currentTurn.turnId = responseTurnId(response);
				} catch (error) {
					emitToActiveTurn({ type: "bridge.error", message: error instanceof Error ? error.message : String(error) });
					if (currentTurn) closeTurn(currentTurn);
				}
			})();
		},
		cancel() {
			if (!currentTurn) return;
			currentTurn.cancelled = true;
			if (activeTurn === currentTurn) activeTurn = undefined;
			if (currentTurn.turnId) void sendRequest("turn/interrupt", { threadId: threads.get(input.sessionId)?.id, turnId: currentTurn.turnId });
		},
	});
}

async function fetchCodexModels(): Promise<CodexModelInfo[]> {
	if (modelCache && modelCache.length > 0) return modelCache;
	const response = recordValue(await sendRequest("model/list", { includeHidden: false }));
	const entries = Array.isArray(response?.data) ? response.data : [];
	const models: CodexModelInfo[] = [];
	for (const entry of entries) {
		const model = toModelInfo(entry);
		if (model && !model.hidden) models.push(model);
	}
	if (models.length > 0) modelCache = models;
	return models;
}

async function respondToApproval(body: ApprovalRequest): Promise<Response> {
	const sessionId = stringValue(body.sessionId);
	const requestId = stringValue(body.requestId);
	if (!sessionId || !requestId) return new Response("Expected sessionId and requestId", { status: 400, headers: corsHeaders() });
	const approval = pendingApprovals.get(requestId);
	if (!approval) return new Response("Unknown approval request", { status: 404, headers: corsHeaders() });
	const decision = body.decision === "allow-always" ? "acceptForSession" : body.decision === "allow-once" ? "accept" : "decline";
	pendingApprovals.delete(requestId);
	try {
		await writeJsonRpc({ jsonrpc: "2.0", id: approval.jsonRpcId, result: { decision } });
		return new Response(null, { status: 204, headers: corsHeaders() });
	} catch (error) {
		return new Response(error instanceof Error ? error.message : String(error), { status: 502, headers: corsHeaders() });
	}
}

process.once("exit", () => {
	if (appServer) killChildTree(appServer);
});

Bun.serve({
	port,
	// Codex turns (especially edits and multi-step work) can exceed Bun's normal idle timeout.
	idleTimeout: 255,
	async fetch(request) {
		if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
		const pathname = new URL(request.url).pathname;
		if (request.method === "GET" && pathname === "/models") {
			try {
				return new Response(JSON.stringify({ models: await fetchCodexModels() }), { headers: { ...corsHeaders(), "content-type": "application/json" } });
			} catch (error) {
				return new Response(error instanceof Error ? error.message : String(error), { status: 502, headers: corsHeaders() });
			}
		}
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return new Response("Expected JSON body", { status: 400, headers: corsHeaders() });
		}
		if (request.method === "POST" && pathname === "/approval") return respondToApproval(recordValue(body) ?? {});
		if (request.method !== "POST" || pathname !== "/turn") return new Response("Not found", { status: 404, headers: corsHeaders() });
		const input = parseTurnRequest(recordValue(body) ?? {});
		if (!input) return new Response("Expected non-empty sessionId and prompt", { status: 400, headers: corsHeaders() });
		return new Response(turnStream(input), {
			headers: { ...corsHeaders(), "content-type": "text/event-stream", "cache-control": "no-cache" },
		});
	},
});

console.log(`Codex bridge listening on http://localhost:${port}`);

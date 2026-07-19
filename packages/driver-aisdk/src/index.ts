import type { AgentEvent, AgentEventListener, AgentEventStream, Unsubscribe } from "@fraym/driver";
import { type LanguageModel, type ModelMessage, type TextStreamPart, type ToolSet, stepCountIs, streamText } from "ai";

/** Default number of agent steps (model + tool rounds) allowed per turn. */
export const AISDK_DEFAULT_MAX_STEPS = 8;

export interface AiSdkDriverOptions<TOOLS extends ToolSet = ToolSet> {
	/**
	 * The AI SDK language model to run, e.g. `openai("gpt-4o")`. The model runs
	 * wherever it is created — including fully in the browser with a
	 * browser-usable provider (bring-your-own key or a CORS-enabled endpoint).
	 */
	readonly model: LanguageModel;
	/** Tools the model may call. They auto-execute as the model requests them. */
	readonly tools?: TOOLS;
	/** System prompt applied to every turn. */
	readonly system?: string;
	/** Stable session id reported on every emitted event. */
	readonly sessionId?: string;
	/**
	 * Conversation history to seed the model context with (e.g. a persisted
	 * transcript restored after a reload). Turns prompted through this driver
	 * are appended after these messages.
	 */
	readonly initialMessages?: readonly ModelMessage[];
	/** Maximum agent steps (model + tool rounds) per turn. Defaults to 8. */
	readonly maxSteps?: number;
}

/** A Fraym `AgentEventStream` backed by the Vercel AI SDK. */
export interface AiSdkDriver extends AgentEventStream {
	/** Streams one text turn through the model's agent loop. */
	prompt(text: string): Promise<void>;
	/** Aborts the active turn. */
	cancel(): void;
}

function errorText(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string" && error.length > 0) return error;
	return "Unknown error";
}

/**
 * Maps one AI SDK `fullStream` part into Fraym `AgentEvent`s. Text and reasoning
 * deltas stream token-by-token; a tool call opens a card and its result (or
 * error) closes it. Terminal parts (`finish` / `error` / `abort`) and the
 * session lifecycle are owned by the driver, so they map to nothing here.
 */
export function streamPartToAgentEvents<TOOLS extends ToolSet>(part: TextStreamPart<TOOLS>, sessionId: string): readonly AgentEvent[] {
	switch (part.type) {
		case "text-delta":
			return [{ type: "assistant.message.delta", sessionId, messageId: part.id, delta: part.text }];
		case "reasoning-delta":
			return [{ type: "reasoning.delta", sessionId, messageId: part.id, delta: part.text }];
		case "tool-call":
			return [{ type: "tool_call.start", sessionId, toolCallId: part.toolCallId, toolName: part.toolName, input: part.input, status: "running" }];
		case "tool-result":
			return [{ type: "tool_call.end", sessionId, toolCallId: part.toolCallId, status: "succeeded", output: part.output }];
		case "tool-error":
			return [{ type: "tool_call.end", sessionId, toolCallId: part.toolCallId, status: "failed", output: errorText(part.error) }];
		default:
			return [];
	}
}

/**
 * Creates a browser-native `AgentEventStream` backed by the Vercel AI SDK. Pass
 * any AI SDK model — the whole agent loop (streaming text, reasoning, and
 * auto-executed tool calls) runs client-side and mounts directly in
 * `<SessionThread source={...} />`, exactly like the replay and ACP drivers.
 */
export function createAiSdkDriver<TOOLS extends ToolSet = ToolSet>(options: AiSdkDriverOptions<TOOLS>): AiSdkDriver {
	const sessionId = options.sessionId ?? `aisdk-${crypto.randomUUID()}`;
	const maxSteps = options.maxSteps ?? AISDK_DEFAULT_MAX_STEPS;
	const listeners = new Set<AgentEventListener>();
	const messages: ModelMessage[] = [...(options.initialMessages ?? [])];
	let started = false;
	let turn = 0;
	let abort: AbortController | undefined;

	const emit = (event: AgentEvent): void => {
		for (const listener of listeners) listener(event);
	};

	const prompt = async (text: string): Promise<void> => {
		if (!started) {
			started = true;
			emit({ type: "session.start", sessionId });
		}
		turn += 1;
		emit({ type: "user.message", sessionId, messageId: `${sessionId}-u${turn}`, content: text });
		messages.push({ role: "user", content: text });

		const controller = new AbortController();
		abort = controller;
		let failed = false;
		try {
			const result = streamText({
				model: options.model,
				system: options.system,
				tools: options.tools,
				messages,
				stopWhen: stepCountIs(maxSteps),
				abortSignal: controller.signal,
			});
			for await (const part of result.fullStream) {
				if (part.type === "error") {
					failed = true;
					emit({ type: "session.error", sessionId, message: errorText(part.error) });
					continue;
				}
				for (const event of streamPartToAgentEvents(part, sessionId)) emit(event);
			}
			if (controller.signal.aborted || failed) return;
			const response = await result.response;
			messages.push(...response.messages);
			emit({ type: "session.done", sessionId });
		} catch (error) {
			if (controller.signal.aborted) return;
			emit({ type: "session.error", sessionId, message: errorText(error) });
		}
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
		cancel,
	};
}

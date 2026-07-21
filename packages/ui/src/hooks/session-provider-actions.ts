import type {
	HostUiResponse,
	SessionDriver,
	SessionMessageInput,
	SessionModelSelection,
	SessionQueuedMessage,
	SessionRef,
} from "@fraym-ai/driver";
import { type Dispatch, useCallback, useMemo } from "react";
import { errorMessageText } from "./session-error";
import { undeliveredQueuedMessages } from "./session-transcript";
import type { SessionState, SessionStateAction } from "./session-types";

type SessionDispatch = Dispatch<SessionStateAction>;
type SessionRun = (operation: DriverOperation) => Promise<boolean>;
type DriverOperation = (driver: SessionDriver, sessionRef: SessionRef) => Promise<void>;
type DriverValueOperation<T> = (driver: SessionDriver, sessionRef: SessionRef, value: T) => Promise<void>;

const EMPTY_QUEUE_MESSAGES: readonly SessionQueuedMessage[] = [];

export interface SessionProviderActions {
	readonly sendMessage: (input: string | SessionMessageInput) => Promise<void>;
	readonly replaceQueuedMessages: (messages: readonly SessionQueuedMessage[]) => Promise<void>;
	readonly removeQueuedMessage: (messageId: string) => Promise<void>;
	readonly cancelRun: () => Promise<void>;
	readonly interruptRunForQueuedMessage: () => Promise<void>;
	readonly setModel: (selection: SessionModelSelection) => Promise<void>;
	readonly setThinkingLevel: (thinkingLevel: string) => Promise<void>;
	readonly setApprovalMode: (approvalMode: string) => Promise<void>;
	readonly compact: (customInstructions?: string) => Promise<void>;
	readonly reload: () => Promise<void>;
	readonly respondToHostUiRequest: (response: HostUiResponse) => Promise<void>;
	readonly dismissNotice: (index: number) => void;
}

export function queuedMessagesForRunInterrupt(
	state: Pick<SessionState, "snapshot" | "transcript">,
): readonly SessionQueuedMessage[] {
	return undeliveredQueuedMessages(state.snapshot?.queuedMessages ?? EMPTY_QUEUE_MESSAGES, state.transcript);
}

export function nextQueuedMessageForRunInterrupt(
	queuedMessages: readonly SessionQueuedMessage[],
): { readonly next: SessionQueuedMessage; readonly remaining: readonly SessionQueuedMessage[] } | null {
	const [next, ...remaining] = queuedMessages;
	return next ? { next, remaining } : null;
}

function queuedMessageInput(message: SessionQueuedMessage): SessionMessageInput {
	return {
		text: message.text,
		...(message.attachments && message.attachments.length > 0 ? { attachments: message.attachments } : {}),
	};
}

function queuedMessageEchoText(message: SessionQueuedMessage): string {
	if (!message.attachments?.length) return message.text.trim();
	if (message.text === "[Image]") return "";
	return message.text.replace(/^\[Image\]\s*/, "").trim();
}

export async function interruptCurrentRunForQueuedMessage(
	driver: SessionDriver,
	sessionRef: SessionRef,
	queuedMessages: readonly SessionQueuedMessage[],
	onQueuedPromptStart?: (message: SessionQueuedMessage) => void,
): Promise<void> {
	const plan = nextQueuedMessageForRunInterrupt(queuedMessages);
	if (!plan) {
		await driver.cancelCurrentRun(sessionRef);
		return;
	}
	onQueuedPromptStart?.(plan.next);
	await driver.interruptWithQueuedMessage(sessionRef, queuedMessageInput(plan.next), plan.remaining);
}

interface UseSessionActionsArgs {
	readonly driver: SessionDriver | null;
	readonly sessionRef: SessionRef | null;
	readonly state: SessionState;
	readonly dispatch: SessionDispatch;
}

export function useSessionActions({
	driver,
	sessionRef,
	state,
	dispatch,
}: UseSessionActionsArgs): SessionProviderActions {
	const run = useSessionRun(driver, sessionRef, dispatch);
	const sendMessage = useSendMessageAction(run, state.isOpening, dispatch);
	const replaceQueuedMessages = useReplaceQueuedMessagesAction(run);
	const queuedMessages = state.snapshot?.queuedMessages ?? EMPTY_QUEUE_MESSAGES;
	const removeQueuedMessage = useRemoveQueuedMessageAction(replaceQueuedMessages, queuedMessages);
	const cancelRun = useDriverAction(run, cancelCurrentRun);
	const interruptRunForQueuedMessage = useInterruptRunForQueuedMessageAction(run, state, dispatch);
	const setModel = useDriverValueAction(run, setSessionModel);
	const setThinkingLevel = useDriverValueAction(run, setSessionThinkingLevel);
	const setApprovalMode = useDriverValueAction(run, setSessionApprovalMode);
	const compact = useDriverValueAction(run, compactSession);
	const reload = useDriverAction(run, reloadSession);
	const dismissNotice = useCallback((index: number) => dispatch({ type: "dismissNotice", index }), [dispatch]);
	const respondToHostUiRequest = useRespondToHostUiRequestAction(driver, sessionRef, dispatch);

	return useMemo(
		() => ({
			sendMessage,
			replaceQueuedMessages,
			removeQueuedMessage,
			cancelRun,
			interruptRunForQueuedMessage,
			setModel,
			setThinkingLevel,
			setApprovalMode,
			dismissNotice,
			compact,
			reload,
			respondToHostUiRequest,
		}),
		[
			sendMessage,
			replaceQueuedMessages,
			removeQueuedMessage,
			cancelRun,
			interruptRunForQueuedMessage,
			setModel,
			setThinkingLevel,
			setApprovalMode,
			compact,
			reload,
			respondToHostUiRequest,
			dismissNotice,
		],
	);
}

function useSessionRun(
	driver: SessionDriver | null,
	sessionRef: SessionRef | null,
	dispatch: SessionDispatch,
): SessionRun {
	return useCallback(
		(operation: DriverOperation): Promise<boolean> => runSessionOperation(driver, sessionRef, dispatch, operation),
		[dispatch, driver, sessionRef],
	);
}

async function runSessionOperation(
	driver: SessionDriver | null,
	sessionRef: SessionRef | null,
	dispatch: SessionDispatch,
	operation: DriverOperation,
): Promise<boolean> {
	if (!driver || !sessionRef) return false;
	return runAvailableSessionOperation(driver, sessionRef, dispatch, operation);
}

async function runAvailableSessionOperation(
	driver: SessionDriver,
	sessionRef: SessionRef,
	dispatch: SessionDispatch,
	operation: DriverOperation,
): Promise<boolean> {
	try {
		await operation(driver, sessionRef);
		return true;
	} catch (error) {
		dispatch({ type: "sessionOpenFailed", message: errorMessageText(error) });
		return false;
	}
}

function useSendMessageAction(run: SessionRun, isOpening: boolean, dispatch: SessionDispatch) {
	return useCallback(
		async (input: string | SessionMessageInput) => {
			const payload: SessionMessageInput = typeof input === "string" ? { text: input } : input;
			const text = payload.text.trim();
			// Allow a send with no text as long as there's at least one attachment (image-only).
			if ((!text && !payload.attachments?.length) || isOpening) return;
			// Commands own their transcript surface. Running-turn steer/follow-up sends
			// own the pending-queue surface instead: the authoritative
			// queuedMessagesChanged event adds the dashed queued bubble, and a consumed
			// steer reaches the transcript through queuedMessageStarted/journal replay.
			// Optimistically appending either as an ordinary user turn hides that queue
			// entry via undeliveredQueuedMessages until the session is reopened.
			let clientMessageId: string | undefined;
			if (!text.trimStart().startsWith("/") && !payload.deliverAs) {
				clientMessageId = crypto.randomUUID();
				dispatch({
					clientMessageId,
					type: "localUserMessage",
					text,
					attachments: payload.attachments,
					timestamp: new Date().toISOString(),
				});
			}
			void (await run((driver, sessionRef) =>
				driver.sendUserMessage(sessionRef, {
					...payload,
					text,
					...(clientMessageId ? { clientMessageId } : {}),
				}),
			));
		},
		[dispatch, isOpening, run],
	);
}

function useReplaceQueuedMessagesAction(run: SessionRun) {
	return useCallback(
		async (messages: readonly SessionQueuedMessage[]) => {
			void (await run((driver, sessionRef) => driver.replaceQueuedMessages(sessionRef, messages)));
		},
		[run],
	);
}

function useRemoveQueuedMessageAction(
	replaceQueuedMessages: (messages: readonly SessionQueuedMessage[]) => Promise<void>,
	queuedMessages: readonly SessionQueuedMessage[],
) {
	return useCallback(
		(messageId: string) => {
			const next = queuedMessages.filter(message => message.id !== messageId);
			return replaceQueuedMessages(next);
		},
		[queuedMessages, replaceQueuedMessages],
	);
}

function useDriverAction(run: SessionRun, operation: DriverOperation) {
	return useCallback(async () => {
		void (await run(operation));
	}, [operation, run]);
}

function useInterruptRunForQueuedMessageAction(run: SessionRun, state: SessionState, dispatch: SessionDispatch) {
	return useCallback(async () => {
		const queuedMessages = queuedMessagesForRunInterrupt(state);
		void (await run((driver, sessionRef) =>
			interruptCurrentRunForQueuedMessage(driver, sessionRef, queuedMessages, message =>
				dispatch({
					type: "localUserMessage",
					clientMessageId: message.id,
					text: queuedMessageEchoText(message),
					attachments: message.attachments,
					timestamp: new Date().toISOString(),
				}),
			),
		));
	}, [dispatch, run, state]);
}

function useDriverValueAction<T>(run: SessionRun, operation: DriverValueOperation<T>) {
	return useCallback(
		async (value: T) => {
			void (await run((driver, sessionRef) => operation(driver, sessionRef, value)));
		},
		[operation, run],
	);
}

function useRespondToHostUiRequestAction(
	driver: SessionDriver | null,
	sessionRef: SessionRef | null,
	dispatch: SessionDispatch,
) {
	return useCallback(
		async (response: HostUiResponse) => {
			if (!driver || !sessionRef) return;
			let resolved: boolean;
			try {
				resolved = await driver.respondToHostUiRequest(sessionRef, response);
			} catch (error) {
				dispatch({ type: "sessionOpenFailed", message: errorMessageText(error) });
				return;
			}
			// Always clear the stale picker — a `false` result means the request was
			// already gone (double-resolved, superseded by reconnect), so leaving the
			// dead card on screen only invites the user to click it again for nothing.
			// Surface a notice instead of the prior silent hang: the click "worked"
			// visually (the picker vanished) but genuinely delivered no answer.
			dispatch({ type: "hostUiRequestResolved", requestId: response.requestId });
			if (!resolved) {
				dispatch({
					type: "notice",
					sessionRef,
					timestamp: new Date().toISOString(),
					level: "warning",
					message: "That prompt already expired — if the agent is waiting on you, try again.",
				});
			}
		},
		[dispatch, driver, sessionRef],
	);
}

function cancelCurrentRun(driver: SessionDriver, sessionRef: SessionRef) {
	return driver.cancelCurrentRun(sessionRef);
}

function setSessionModel(driver: SessionDriver, sessionRef: SessionRef, selection: SessionModelSelection) {
	return driver.setSessionModel(sessionRef, selection);
}

function setSessionThinkingLevel(driver: SessionDriver, sessionRef: SessionRef, thinkingLevel: string) {
	return driver.setSessionThinkingLevel(sessionRef, thinkingLevel);
}

function setSessionApprovalMode(driver: SessionDriver, sessionRef: SessionRef, approvalMode: string) {
	return driver.setSessionApprovalMode(sessionRef, approvalMode);
}

function compactSession(driver: SessionDriver, sessionRef: SessionRef, customInstructions?: string) {
	return driver.compactSession(sessionRef, customInstructions);
}

function reloadSession(driver: SessionDriver, sessionRef: SessionRef) {
	return driver.reloadSession(sessionRef);
}

import type {
	HostUiResponse,
	SessionDriver,
	SessionMessageInput,
	SessionModelSelection,
	SessionQueuedMessage,
	SessionRef,
	SessionSnapshot,
} from "@fraym-ai/driver";
import { createContext, useMemo } from "react";
import { useSessionActions } from "./session-provider-actions";
import { useSessionReducer } from "./session-provider-session";
import type { SessionState } from "./session-types";

export interface SessionContextValue extends SessionState {
	readonly driver: SessionDriver | null;
	readonly sessionRef: SessionRef | null;
	readonly sendMessage: (input: string | SessionMessageInput) => Promise<void>;
	readonly replaceQueuedMessages: (messages: readonly SessionQueuedMessage[]) => Promise<void>;
	readonly removeQueuedMessage: (messageId: string) => Promise<void>;
	readonly cancelRun: () => Promise<void>;
	readonly interruptRunForQueuedMessage: () => Promise<void>;
	readonly setModel: (selection: SessionModelSelection) => Promise<void>;
	readonly setThinkingLevel: (thinkingLevel: string) => Promise<void>;
	readonly setApprovalMode: (approvalMode: string) => Promise<void>;
	readonly compact: (customInstructions?: string) => Promise<void>;
	readonly dismissNotice: (index: number) => void;
	readonly reload: () => Promise<void>;
	readonly respondToHostUiRequest: (response: HostUiResponse) => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
	readonly driver?: SessionDriver | null;
	readonly sessionRef?: SessionRef | null;
	readonly initialSnapshot?: SessionSnapshot | null;
	readonly children: React.ReactNode;
}

export function SessionProvider({
	driver = null,
	sessionRef = null,
	initialSnapshot = null,
	children,
}: SessionProviderProps) {
	const { state, dispatch } = useSessionReducer({ driver, sessionRef, initialSnapshot });
	const actions = useSessionActions({ driver, sessionRef, state, dispatch });

	const value = useMemo<SessionContextValue>(
		() => ({
			...state,
			driver,
			sessionRef,
			...actions,
		}),
		[state, driver, sessionRef, actions],
	);

	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

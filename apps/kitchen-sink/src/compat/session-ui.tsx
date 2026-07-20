import type { AgentEvent, AgentEventStream, SessionDriver, SessionDriverEvent, SessionRef } from "@fraym/driver";
import {
	Composer,
	GoalComposerSurface,
	MessageBlockProvider,
	Thread as PublicThread,
	ToolDisplaySettingsProvider,
	ToolRendererProvider,
	type FraymDensity,
	type MessageBlockRendererMap,
	type ToolDefaultOpen,
	type ToolDisplaySettings,
	type ToolRendererMap,
} from "@fraym/ui";
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
} from "react";
import { cn, Icon, type IconName } from "./ui";

export { Composer, GoalComposerSurface, MessageBlockProvider, ToolDisplaySettingsProvider, ToolRendererProvider };
export type { FraymDensity, IconName, MessageBlockRendererMap, ToolDefaultOpen, ToolDisplaySettings, ToolRendererMap };
export { cn, Icon };

interface SessionValue {
	readonly source: AgentEventStream;
	readonly sendMessage: (value: string) => Promise<void>;
	readonly isStreaming: boolean;
	readonly cancelRun: () => Promise<void>;
	readonly goal: null;
}

const Context = createContext<SessionValue | null>(null);

function toAgentEvent(event: SessionDriverEvent): AgentEvent | null {
	const sessionId = event.sessionRef.sessionId;
	switch (event.type) {
		case "queuedMessageStarted":
			return {
				type: "user.message",
				sessionId,
				messageId: event.message.id,
				content: event.message.text,
			};
		case "assistantDelta":
			return {
				type: "assistant.message.delta",
				sessionId,
				messageId: "assistant",
				delta: event.text,
			};
		case "thinkingDelta":
			return {
				type: "reasoning.delta",
				sessionId,
				messageId: "reasoning",
				delta: event.text,
			};
		case "toolStarted":
			return {
				type: "tool_call.start",
				sessionId,
				toolCallId: event.callId,
				toolName: event.toolName,
				input: event.input,
				status: "running",
			};
		case "toolFinished":
			return {
				type: "tool_call.end",
				sessionId,
				toolCallId: event.callId,
				status: event.success ? "succeeded" : "failed",
				output: event.output,
			};
		case "runCompleted":
			return { type: "session.done", sessionId };
		case "runFailed":
			return {
				type: "session.error",
				sessionId,
				message: event.error.message,
			};
		default:
			return null;
	}
}

function sessionDriverStream(driver: SessionDriver, sessionRef: SessionRef): AgentEventStream {
	return {
		subscribe(listener) {
			void driver.openSession(sessionRef).then(() => listener({ type: "session.start", sessionId: sessionRef.sessionId }));
			return driver.subscribe(sessionRef, event => {
				const converted = toAgentEvent(event);
				if (converted) listener(converted);
			});
		},
	};
}

export function SessionProvider({
	driver,
	sessionRef,
	children,
}: {
	readonly driver: AgentEventStream | SessionDriver;
	readonly sessionRef: SessionRef;
	readonly children: ReactNode;
}) {
	const source = useMemo(() => "openSession" in driver ? sessionDriverStream(driver, sessionRef) : driver, [driver, sessionRef]);
	const value = useMemo<SessionValue>(() => ({
		source,
		sendMessage: async text => {
			if ("sendUserMessage" in driver) await driver.sendUserMessage(sessionRef, { text });
		},
		isStreaming: false,
		cancelRun: async () => undefined,
		goal: null,
	}), [driver, sessionRef, source]);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): SessionValue {
	const value = useContext(Context);
	if (!value) throw new Error("SessionProvider is required");
	return value;
}

type ConnectedThreadProps = Omit<React.ComponentProps<typeof PublicThread>, "source"> & {
	readonly presence?: ReactNode;
	readonly verberProfile?: string | undefined;
};

export function ConnectedMessageThread({ presence: _presence, verberProfile: _profile, ...props }: ConnectedThreadProps) {
	const { source } = useSession();
	return <PublicThread source={source} {...props} />;
}

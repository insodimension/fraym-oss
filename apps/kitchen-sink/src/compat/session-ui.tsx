import type { AgentEventStream } from "@fraym/driver";
import {
	Composer as PublicComposer,
	GoalComposerSurface,
	MessageBlockProvider,
	Thread as PublicThread,
	ToolDisplaySettingsProvider,
	ToolRendererProvider,
	type ComposerProps as PublicComposerProps,
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

export { GoalComposerSurface, MessageBlockProvider, ToolDisplaySettingsProvider, ToolRendererProvider };
export type { FraymDensity, IconName, MessageBlockRendererMap, ToolDefaultOpen, ToolDisplaySettings, ToolRendererMap };
export { cn, Icon };

export interface OpenDiffPayload {
	readonly path?: string;
	readonly files: readonly unknown[];
}

export interface OpenFilePayload {
	readonly path: string;
}

export type SessionContextValue = Record<string, unknown>;

interface SessionValue {
	readonly source: AgentEventStream;
	readonly sendMessage: (value: string) => Promise<void>;
	readonly isStreaming: boolean;
	readonly cancelRun: () => Promise<void>;
	readonly goal: null;
}

const Context = createContext<SessionValue | null>(null);

export function SessionProvider({
	driver,
	children,
}: {
	readonly driver: AgentEventStream;
	readonly sessionRef: unknown;
	readonly children: ReactNode;
}) {
	const value = useMemo<SessionValue>(() => ({
		source: driver,
		sendMessage: async () => undefined,
		isStreaming: false,
		cancelRun: async () => undefined,
		goal: null,
	}), [driver]);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): SessionValue {
	const value = useContext(Context);
	if (!value) throw new Error("SessionProvider is required");
	return value;
}

type ConnectedThreadProps = Omit<React.ComponentProps<typeof PublicThread>, "source"> & {
	readonly presence?: ReactNode;
	readonly verberProfile?: string;
};

export function ConnectedMessageThread({ presence: _presence, verberProfile: _profile, ...props }: ConnectedThreadProps) {
	const { source } = useSession();
	return <PublicThread source={source} {...props} />;
}

export const Thread = ConnectedMessageThread;

type ComposerProps = Omit<PublicComposerProps, "onSubmit"> & {
	readonly onSubmit?: (value: string) => void;
};

export function Composer({ onSubmit, ...props }: ComposerProps) {
	return <PublicComposer {...props} onSubmit={(submission) => onSubmit?.(submission.value)} />;
}

export function WorkbenchDockProvider({ children }: { readonly commands: unknown; readonly children: ReactNode }) {
	return <>{children}</>;
}

export function DiffViewer({ files, showToolbar }: { readonly files: readonly unknown[]; readonly showToolbar?: boolean }) {
	return (
		<div className="rounded-lg border border-fr-border-soft bg-fr-surface font-secondary text-fr-xs">
			{showToolbar ? <div className="border-b border-fr-border-soft px-3 py-2 text-fr-text-3">Diff</div> : null}
			<pre className="overflow-auto p-3 text-fr-text-2">{JSON.stringify(files, null, 2)}</pre>
		</div>
	);
}

import {
	Composer,
	ConnectedMessageThread,
	cn,
	type FraymDensity,
	GoalComposerSurface,
	Icon,
	type IconName,
	MessageBlockProvider,
	SessionProvider,
	ToolDisplaySettingsProvider,
	ToolRendererProvider,
	useSession,
} from "../compat/session-ui";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useToolConfig } from "./tool-config";
import type { EntryDemo } from "./types";

// Shared, context-aware Demo Dock. Hosts a live, interactive conversation
// (thread + composer) driven by an entry's scripted SessionDriver, so any
// tool/feature is verified in a real chat next to its isolated showcase.
//
// The dock owns ONLY playback (replay speed). The tool-card VIEW (collapsed /
// comfortable / compact / spacious) is a tool-config **display pref**
// (`useToolConfig().displayValues.view`); the dock reflects it via
// ToolDisplaySettings — `collapsed` closes the thread's cards, the others set the
// open density (ToolRender falls back to the provider's density).

const SPEED_MULT: Record<string, number> = { slow: 2, medium: 1, fast: 0.4 };

/** Composer wired to the session: typing a message drives the (mock) driver. */
function ConnectedComposer() {
	const { sendMessage, isStreaming, cancelRun, goal } = useSession();
	const [value, setValue] = useState("");
	const goalCommand = (command: string) => () => {
		void sendMessage(command);
	};
	return (
		<Composer
			value={value}
			onChange={setValue}
			streaming={isStreaming}
			onStop={() => {
				void cancelRun();
			}}
			topSlot={
				<GoalComposerSurface
					goal={goal}
					onEditGoal={objective => void sendMessage(`/goal set ${objective}`)}
					onPauseGoal={goalCommand("/goal pause")}
					onResumeGoal={goalCommand("/goal resume")}
					onClearGoal={goalCommand("/goal drop")}
				/>
			}
			placeholder="Message the demo…"
			onSubmit={v => {
				const text = v.trim();
				if (!text) return;
				void sendMessage(text);
				setValue("");
			}}
		/>
	);
}

function IconButton({ icon, title, onClick }: { icon: IconName; title: string; onClick: () => void }) {
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className="flex size-7 items-center justify-center rounded-[7px] text-fr-text-3 transition-colors hover:bg-fr-surface hover:text-fr-text"
		>
			<Icon name={icon} size={14} strokeWidth={2} />
		</button>
	);
}

function Segmented({
	label,
	options,
	value,
	onChange,
}: {
	label?: ReactNode;
	options: readonly { value: string; label: string }[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex items-center gap-1.5">
			{label != null && <span className="flex items-center text-fr-text-3">{label}</span>}
			<div className="flex rounded-[6px] border border-fr-border-soft p-0.5">
				{options.map(o => (
					<button
						key={o.value}
						type="button"
						onClick={() => onChange(o.value)}
						className={cn(
							"rounded-[4px] px-1.5 py-0.5 transition-colors",
							value === o.value ? "bg-fr-surface-2 text-fr-text" : "text-fr-text-3 hover:text-fr-text-2",
						)}
					>
						{o.label}
					</button>
				))}
			</div>
		</div>
	);
}

export interface DemoDockProps {
	readonly demo: EntryDemo;
	readonly entryName: string;
	readonly onClose: () => void;
}

function DemoDockHeader({
	title,
	onReplay,
	onClose,
}: {
	readonly title: string;
	readonly onReplay: () => void;
	readonly onClose: () => void;
}) {
	return (
		<header className="flex flex-none items-center gap-2 border-b border-fr-border-soft px-3 py-2">
			<Icon name="chat" size={14} className="shrink-0 text-fr-accent" />
			<span className="truncate text-fr-sm font-medium text-fr-text">{title}</span>
			<span className="ml-auto flex shrink-0 items-center gap-0.5">
				<IconButton icon="history" title="Replay conversation" onClick={onReplay} />
				<IconButton icon="x" title="Close demo" onClick={onClose} />
			</span>
		</header>
	);
}

function DemoSpeedBar({
	speed,
	onSpeedChange,
}: {
	readonly speed: string;
	readonly onSpeedChange: (speed: string) => void;
}) {
	return (
		<div className="flex flex-none items-center gap-2 border-b border-fr-border-soft px-3 py-1.5 font-secondary text-fr-2xs">
			<Segmented
				label={<Icon name="bolt" size={12} className="text-fr-text-3" />}
				value={speed}
				onChange={onSpeedChange}
				options={[
					{ value: "slow", label: "slow" },
					{ value: "medium", label: "med" },
					{ value: "fast", label: "fast" },
				]}
			/>
		</div>
	);
}

function BaseDemoThread({
	demo,
	view,
	values,
}: {
	readonly demo: EntryDemo;
	readonly view: string;
	readonly values: Record<string, unknown>;
}) {
	const verberProfile = typeof demo.verberProfile === "function" ? demo.verberProfile(values) : demo.verberProfile;
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<ConnectedMessageThread
				key={view === "collapsed" ? "collapsed" : "open"}
				presence={demo.presence}
				verberProfile={verberProfile}
				showHeader={false}
				showAvatar
			/>
			<ConnectedComposer />
		</div>
	);
}

function DemoRendererProviders({ demo, children }: { readonly demo: EntryDemo; readonly children: ReactNode }) {
	let body = children;
	if (demo.renderers) body = <ToolRendererProvider renderers={demo.renderers}>{body}</ToolRendererProvider>;
	if (demo.messageBlocks) body = <MessageBlockProvider renderers={demo.messageBlocks}>{body}</MessageBlockProvider>;
	return body;
}

function demoDisplaySettings(view: string): { readonly defaultOpen: "none" | "all"; readonly density: FraymDensity } {
	return {
		defaultOpen: view === "collapsed" ? "none" : "all",
		density: (view === "collapsed" ? "comfortable" : view) as FraymDensity,
	};
}

function DemoThreadBody({
	demo,
	view,
	values,
}: {
	readonly demo: EntryDemo;
	readonly view: string;
	readonly values: Record<string, unknown>;
}) {
	return (
		<ToolDisplaySettingsProvider settings={{ ...demoDisplaySettings(view), ...demo.threadSettings }}>
			<DemoRendererProviders demo={demo}>
				<BaseDemoThread demo={demo} view={view} values={values} />
			</DemoRendererProviders>
		</ToolDisplaySettingsProvider>
	);
}

function useDemoSessionDriver(demo: EntryDemo, speed: string, nonce: number) {
	const mult = SPEED_MULT[speed] ?? 1;
	// eslint-disable-next-line react-hooks/exhaustive-deps -- re-mint on Replay, speed, or demo identity.
	return useMemo(() => demo.createDriver({ speed: mult }), [nonce, demo, mult]);
}

export function DemoDock({ demo, entryName, onClose }: DemoDockProps) {
	const [nonce, setNonce] = useState(0);
	const [speed, setSpeed] = useState(() => localStorage.getItem("ks-demo-speed") ?? "medium");
	useEffect(() => {
		localStorage.setItem("ks-demo-speed", speed);
	}, [speed]);

	const { displayValues, values } = useToolConfig();
	const view = (displayValues.view as string) ?? "comfortable";
	const driver = useDemoSessionDriver(demo, speed, nonce);
	const streamKey = `${nonce}:${speed}`;

	return (
		<div className="relative flex h-full min-h-0 flex-col bg-fr-bg">
			<DemoDockHeader title={demo.title ?? entryName} onReplay={() => setNonce(n => n + 1)} onClose={onClose} />
			<DemoSpeedBar speed={speed} onSpeedChange={setSpeed} />
			<SessionProvider key={streamKey} driver={driver} sessionRef={demo.sessionRef}>
				<DemoThreadBody demo={demo} view={view} values={values} />
			</SessionProvider>
		</div>
	);
}

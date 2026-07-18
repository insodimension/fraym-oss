import {
	Icon,
	SessionProvider,
	Thread,
	type ToolDefaultOpen,
	ToolDisplaySettingsProvider,
	type ToolRendererMap,
	ToolRendererProvider,
} from "../compat/session-ui";
import { useMemo, useState } from "react";

// Reusable conversation harness. A scripted SessionDriver is replayed through the
// real session-driver pipeline (SessionProvider → reducer → the canonical `<Thread>`
// composition → renderer registries) — the exact path a live engine takes. Optionally scope a
// `renderers` map so a specific tool (e.g. `read`) renders through a custom body
// for the duration of this thread, without touching the global registry.

// Derive driver/ref prop types from SessionProvider so the app needs no direct
// @fraym/driver dependency.
type ThreadDriver = NonNullable<React.ComponentProps<typeof SessionProvider>["driver"]>;
type ThreadRef = NonNullable<React.ComponentProps<typeof SessionProvider>["sessionRef"]>;

export interface DemoThreadProps {
	/** Stable factory — minting a fresh driver on Replay re-arms the stream from the top. */
	readonly createDriver: () => ThreadDriver;
	readonly sessionRef: ThreadRef;
	/** Optional per-thread tool renderer overrides (merged over the defaults). */
	readonly renderers?: ToolRendererMap;
	/** Override the thread's tool-card expansion policy (defaults to the global "none"). */
	readonly toolDefaultOpen?: ToolDefaultOpen;
	readonly height?: number;
	readonly showAvatar?: boolean;
	readonly replayLabel?: string;
}

export function DemoThread({
	createDriver,
	sessionRef,
	renderers,
	toolDefaultOpen,
	height = 560,
	showAvatar = true,
	replayLabel = "Replay demo",
}: DemoThreadProps) {
	const [nonce, setNonce] = useState(0);
	// eslint-disable-next-line react-hooks/exhaustive-deps -- re-mint only on Replay.
	const driver = useMemo(() => createDriver(), [nonce]);

	let content: React.ReactNode = (
		<SessionProvider key={nonce} driver={driver} sessionRef={sessionRef}>
			<Thread showAvatar={showAvatar} contentClassName="px-4 py-4" />
		</SessionProvider>
	);
	if (renderers) content = <ToolRendererProvider renderers={renderers}>{content}</ToolRendererProvider>;
	if (toolDefaultOpen)
		content = (
			<ToolDisplaySettingsProvider settings={{ defaultOpen: toolDefaultOpen }}>
				{content}
			</ToolDisplaySettingsProvider>
		);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center justify-end">
				<button
					type="button"
					onClick={() => setNonce(n => n + 1)}
					className="inline-flex items-center gap-2 rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm font-medium text-fr-text transition-colors hover:bg-fr-surface-2"
				>
					<Icon name="history" size={14} strokeWidth={2} />
					{replayLabel}
				</button>
			</div>
			<div
				className="flex w-full flex-col overflow-hidden rounded-xl border border-fr-border-soft bg-fr-bg"
				style={{ height }}
			>
				{content}
			</div>
		</div>
	);
}

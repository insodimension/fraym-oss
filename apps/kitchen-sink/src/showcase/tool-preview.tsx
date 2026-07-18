import { type ActiveToolCall, type FraymDensity, ToolRender } from "@fraym/ui";
import type { ControlDef } from "./controls";
import { Note } from "./demo";

export type ToolPreviewView = "collapsed" | FraymDensity;

const TOOL_PREVIEW_VIEWS: readonly ToolPreviewView[] = ["collapsed", "comfortable", "compact", "spacious"];

export function toolPreviewControl(defaultValue: ToolPreviewView = "comfortable"): ControlDef {
	return {
		kind: "select",
		label: "view",
		options: TOOL_PREVIEW_VIEWS,
		default: defaultValue,
		scope: "display",
	};
}

export function selectControlValue<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

export function toolPreviewView(value: unknown): ToolPreviewView {
	return selectControlValue(value, TOOL_PREVIEW_VIEWS, "comfortable");
}

export function toolPreviewDisplay(view: ToolPreviewView): { readonly open: boolean; readonly density: FraymDensity } {
	return {
		open: view !== "collapsed",
		density: view === "collapsed" ? "comfortable" : view,
	};
}

export function ToolReplayButton({
	streaming,
	onReplay,
}: {
	readonly streaming: boolean;
	readonly onReplay: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onReplay}
			className="inline-flex items-center gap-2 self-start rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm font-medium text-fr-text transition-colors hover:bg-fr-surface-2"
		>
			{streaming ? "Streaming\u2026" : "Replay"}
		</button>
	);
}

export function ToolStreamingReplay({
	active,
	streaming,
	onReplay,
}: {
	readonly active: boolean;
	readonly streaming: boolean;
	readonly onReplay: () => void;
}) {
	if (!active) return null;
	return <ToolReplayButton streaming={streaming} onReplay={onReplay} />;
}

export function ToolMainPreview({
	keySeed,
	call,
	view,
}: {
	readonly keySeed: string;
	readonly call: ActiveToolCall;
	readonly view: ToolPreviewView;
}) {
	const { open, density } = toolPreviewDisplay(view);
	return (
		<div className="w-full max-w-2xl">
			<ToolRender key={keySeed} call={call} defaultOpen={open} density={density} />
		</div>
	);
}

export function ToolVariationGrid<T extends string>({
	label,
	view,
	items,
	active,
	buildCall,
}: {
	readonly label: string;
	readonly view: ToolPreviewView;
	readonly items: readonly T[];
	readonly active: T;
	readonly buildCall: (item: T) => ActiveToolCall;
}) {
	const { open, density } = toolPreviewDisplay(view);
	const previews = items.filter(item => item !== active);
	return (
		<>
			<Note>
				{label} {"\u00b7"} {view}
			</Note>
			<div className="grid w-full max-w-2xl gap-2">
				{previews.map(item => (
					<ToolRender key={`${item}-${view}`} call={buildCall(item)} defaultOpen={open} density={density} />
				))}
			</div>
		</>
	);
}

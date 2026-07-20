import { cn } from "../../lib/cn";
import type { FraymSurfaceConfig, ToolMetadataItem, ToolTimelineStatus } from "../surface-kit";
import { resolveToolDefaultOpen, ToolBodyTerm, ToolCard, type ToolDefaultOpen, type ToolKind } from "../tool-card";
import type { ToolBodyVariant } from "../tool-card/tool-card";
import { ToolMetadataRow } from "../tool-metadata";

export interface ToolTimelineItem {
	readonly id: string;
	readonly kind: ToolKind;
	readonly title: React.ReactNode;
	readonly stat?: string;
	readonly status?: ToolTimelineStatus;
	readonly defaultOpen?: boolean;
	readonly args?: readonly (readonly [string, string])[];
	readonly output?: readonly (readonly string[])[];
	readonly body?: React.ReactNode;
	readonly metadata?: readonly ToolMetadataItem[];
	readonly bodyVariant?: ToolBodyVariant;
}
export interface ToolTimelineSettings extends FraymSurfaceConfig {
	readonly defaultOpen?: ToolDefaultOpen;
	readonly showArgs?: boolean;
	readonly showOutputs?: boolean;
}

export interface ToolTimelineProps {
	readonly tools: readonly ToolTimelineItem[];
	readonly settings?: ToolTimelineSettings;
	readonly className?: string;
}
function toolDefaultOpen(item: ToolTimelineItem, settings?: ToolTimelineSettings) {
	return resolveToolDefaultOpen(item.status, settings, item.defaultOpen);
}

function timelineWrapClassName(density: NonNullable<ToolTimelineSettings["density"]>): string {
	if (density === "compact") return "flex flex-col divide-y divide-fr-border-soft";
	if (density === "spacious") return "flex flex-col gap-3";
	return "flex flex-col gap-1";
}

function ToolTimelineCard({
	tool,
	settings,
	showArgs,
	showOutputs,
	density,
}: {
	readonly tool: ToolTimelineItem;
	readonly settings?: ToolTimelineSettings;
	readonly showArgs: boolean;
	readonly showOutputs: boolean;
	readonly density: NonNullable<ToolTimelineSettings["density"]>;
}) {
	return (
		<ToolCard
			kind={tool.kind}
			label={tool.title}
			stat={tool.stat}
			success={tool.status !== "failed"}
			defaultOpen={toolDefaultOpen(tool, settings)}
			bodyVariant={tool.bodyVariant ?? (tool.output ? "term" : "default")}
			density={density}
		>
			<div className="flex flex-col gap-2">
				{showArgs && tool.args && <ToolArgsPreview args={tool.args} />}
				{showOutputs && tool.output && <ToolBodyTerm lines={tool.output} />}
				{tool.body}
				{tool.metadata && <ToolMetadataRow items={tool.metadata} />}
			</div>
		</ToolCard>
	);
}

function ToolArgsPreview({ args }: { readonly args: NonNullable<ToolTimelineItem["args"]> }) {
	return (
		<div data-slot="tool-args-preview" className="grid gap-1">
			{args.map(([key, value]) => (
				<div key={key} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
					<span className="text-fr-text-3">{key}</span>
					<span className="fr-overflow text-fr-text-2">{value}</span>
				</div>
			))}
		</div>
	);
}

export function ToolTimeline({ tools, settings, className }: ToolTimelineProps) {
	const showArgs = settings?.showArgs ?? true;
	const showOutputs = settings?.showOutputs ?? true;
	const density = settings?.density ?? "comfortable";

	if (settings?.visible === false || settings?.placement === "hidden") return null;

	return (
		<div data-slot="tool-timeline" data-density={density} className={cn(timelineWrapClassName(density), className)}>
			{tools.map(tool => (
				<ToolTimelineCard
					key={tool.id}
					tool={tool}
					settings={settings}
					showArgs={showArgs}
					showOutputs={showOutputs}
					density={density}
				/>
			))}
		</div>
	);
}

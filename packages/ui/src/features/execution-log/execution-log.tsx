import { Badge } from "../../elements/badge";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { StatusDot } from "../density-ui";
import {
	type ComposerControlTone,
	type FraymSurfaceConfig,
	resolveDensity,
	type ToolMetadataItem,
} from "../surface-kit";
import { ToolBodyTerm } from "../tool-card/tool-card";
import { ToolMetadataRow } from "../tool-metadata";

export interface ExecutionLogBodyProps {
	readonly title?: React.ReactNode;
	readonly command?: React.ReactNode;
	readonly lines: readonly (readonly string[])[];
	readonly status?: { readonly label: string; readonly tone?: ComposerControlTone };
	readonly metadata?: readonly ToolMetadataItem[];
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

type ExecutionLogDensity = NonNullable<FraymSurfaceConfig["density"]>;
type ExecutionLogMode = "compact" | "spacious" | "comfortable";

interface ExecutionLogViewProps extends ExecutionLogBodyProps {
	readonly density: ExecutionLogDensity;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly metadata: readonly ToolMetadataItem[];
	readonly mode: ExecutionLogMode;
}

function hasExecutionHeader({ title, command, status }: Pick<ExecutionLogBodyProps, "title" | "command" | "status">) {
	return Boolean(title || command || status);
}

function CompactExecutionHeader({ title, command, status }: ExecutionLogViewProps) {
	if (!hasExecutionHeader({ title, command, status })) return null;

	return (
		<div className="flex min-w-0 items-center gap-1.5 text-fr-xs">
			<Icon name="termBox" size={12} className="shrink-0 text-fr-text-3" />
			{title && <span className="fr-overflow font-primary font-medium text-fr-text">{title}</span>}
			{command && (
				<>
					<span className="shrink-0 text-fr-text-3">-</span>
					<span className="min-w-0 fr-overflow font-secondary text-fr-2xs text-fr-text-3">{command}</span>
				</>
			)}
			{status && (
				<StatusDot
					tone={status.tone === "default" ? "mute" : status.tone}
					breathe={status.tone === "accent"}
					size={6}
					className="ml-auto"
				/>
			)}
		</div>
	);
}

function FullExecutionIcon({ d, mode }: Pick<ExecutionLogViewProps, "d" | "mode">) {
	if (mode !== "spacious") return <Icon name="termBox" size={13} className="text-fr-text-3" />;

	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center bg-fr-surface-2 text-fr-accent",
				d.tile,
				d.tileRadius,
			)}
		>
			<Icon name="termBox" size={d.icon} />
		</span>
	);
}

function FullExecutionHeader({ title, command, status, d, mode }: ExecutionLogViewProps) {
	if (!hasExecutionHeader({ title, command, status })) return null;
	const spacious = mode === "spacious";

	return (
		<div
			className={cn(
				"flex min-w-0 border-b border-fr-border-soft",
				spacious ? "items-start gap-3 pb-3" : "items-center gap-2 pb-2",
			)}
		>
			<FullExecutionIcon d={d} mode={mode} />
			<div className="min-w-0 flex-1">
				{title && (
					<div
						className={
							spacious
								? cn("fr-overflow font-display font-semibold text-fr-text", d.title)
								: "fr-overflow text-fr-sm font-medium text-fr-text"
						}
					>
						{title}
					</div>
				)}
				{command && (
					<div
						className={
							spacious
								? "mt-1 fr-overflow font-secondary text-fr-xs text-fr-text-3"
								: "fr-overflow font-secondary text-fr-xs text-fr-text-3"
						}
					>
						{command}
					</div>
				)}
			</div>
			{status && <Badge tone={status.tone === "default" ? "mute" : status.tone}>{status.label}</Badge>}
		</div>
	);
}

function ExecutionLines({
	lines,
	mode,
}: {
	readonly lines: ExecutionLogBodyProps["lines"];
	readonly mode: ExecutionLogMode;
}) {
	const className =
		mode === "spacious"
			? "font-secondary text-fr-sm leading-[1.85] text-fr-text-2"
			: mode === "compact"
				? "font-secondary text-fr-xs leading-[1.45] text-fr-text-2"
				: "font-secondary text-fr-xs leading-[1.7] text-fr-text-2";
	return (
		<div className={className}>
			<ToolBodyTerm lines={lines} />
		</div>
	);
}

function CompactMetadata({ metadata }: Pick<ExecutionLogViewProps, "metadata">) {
	const visible = metadata.filter(item => !item.hidden);
	if (visible.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-secondary text-fr-2xs text-fr-text-3">
			{visible.map(item => (
				<span key={item.id} className="inline-flex items-center gap-1">
					<span>{item.label}</span>
					<span>{item.value}</span>
				</span>
			))}
		</div>
	);
}

function ExecutionMetadata({ metadata, mode }: Pick<ExecutionLogViewProps, "metadata" | "mode">) {
	if (mode === "compact") return <CompactMetadata metadata={metadata} />;
	if (metadata.length === 0) return null;
	return <ToolMetadataRow items={metadata} />;
}

function ExecutionLogShell(props: ExecutionLogViewProps) {
	const { density, d, className, mode, lines } = props;
	const shellClass =
		mode === "spacious"
			? cn("grid gap-3", d.card, d.pad, className)
			: mode === "compact"
				? cn("grid gap-1 font-secondary text-fr-xs text-fr-text-2", className)
				: cn("grid gap-2 rounded-[9px] border border-fr-border-soft bg-fr-surface px-3 py-[9px]", className);

	return (
		<section data-slot="execution-log-body" data-density={density} className={shellClass}>
			{mode === "compact" ? <CompactExecutionHeader {...props} /> : <FullExecutionHeader {...props} />}
			<ExecutionLines lines={lines} mode={mode} />
			<ExecutionMetadata metadata={props.metadata} mode={mode} />
		</section>
	);
}

export function ExecutionLogBody(props: ExecutionLogBodyProps) {
	const { metadata = [], settings } = props;
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);

	if (settings?.visible === false || settings?.placement === "hidden") return null;

	return (
		<ExecutionLogShell
			{...props}
			density={density}
			d={d}
			metadata={metadata}
			mode={d.isCompact ? "compact" : d.isSpacious ? "spacious" : "comfortable"}
		/>
	);
}

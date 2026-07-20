import { Badge } from "../../elements/badge";
import { Button } from "../../elements/button";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import {
	type ComposerControlTone,
	type DisplaySurfaceAction,
	type FraymSurfaceConfig,
	resolveDensity,
	type ToolMetadataItem,
	toneClass,
} from "../surface-kit";
import { ToolMetadataRow } from "../tool-metadata";

export interface EntitySummaryField {
	readonly id: string;
	readonly label: string;
	readonly value: React.ReactNode;
	readonly description?: React.ReactNode;
	readonly tone?: ComposerControlTone;
}
export interface EntitySummaryBodyProps {
	readonly title: React.ReactNode;
	readonly subtitle?: React.ReactNode;
	readonly description?: React.ReactNode;
	readonly icon?: IconName;
	readonly tone?: ComposerControlTone;
	readonly status?: { readonly label: string; readonly tone?: ComposerControlTone };
	readonly fields?: readonly EntitySummaryField[];
	readonly metadata?: readonly ToolMetadataItem[];
	readonly actions?: readonly DisplaySurfaceAction[];
	readonly settings?: FraymSurfaceConfig;
	readonly onAction?: (id: string) => void;
	readonly className?: string;
}

type EntityDensity = NonNullable<FraymSurfaceConfig["density"]>;
type EntitySummaryMode = "compact" | "spacious" | "comfortable";

interface EntitySummaryViewProps extends EntitySummaryBodyProps {
	readonly density: EntityDensity;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly icon: IconName;
	readonly tone: ComposerControlTone;
	readonly fields: readonly EntitySummaryField[];
	readonly metadata: readonly ToolMetadataItem[];
	readonly actions: readonly DisplaySurfaceAction[];
}

function EntityStatusBadge({ status }: Pick<EntitySummaryViewProps, "status">) {
	if (!status) return null;
	return <Badge tone={status.tone === "default" ? "mute" : status.tone}>{status.label}</Badge>;
}

function entityActionSize(
	action: DisplaySurfaceAction,
	mode: EntitySummaryMode,
): React.ComponentProps<typeof Button>["size"] {
	return mode === "spacious" && action.variant === "default" ? "default" : "sm";
}

function entityActionVariant(
	action: DisplaySurfaceAction,
	mode: EntitySummaryMode,
): React.ComponentProps<typeof Button>["variant"] {
	if (action.variant === "default") return mode === "compact" ? "outline" : "default";
	if (action.variant) return action.variant;
	return mode === "compact" ? "ghost" : "outline";
}

function entityActionIconSize(mode: EntitySummaryMode): number {
	if (mode === "compact") return 12;
	if (mode === "spacious") return 14;
	return 13;
}

function EntityActionButtons({
	actions,
	onAction,
	mode,
}: Pick<EntitySummaryViewProps, "actions" | "onAction"> & {
	readonly mode: EntitySummaryMode;
}) {
	if (actions.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap", mode === "compact" ? "gap-1.5" : "gap-2")}>
			{actions.map(action => (
				<Button
					key={action.id}
					size={entityActionSize(action, mode)}
					variant={entityActionVariant(action, mode)}
					onClick={() => onAction?.(action.id)}
				>
					{action.icon && <Icon name={action.icon} size={entityActionIconSize(mode)} />}
					{action.label}
				</Button>
			))}
		</div>
	);
}

function CompactEntityFields({ fields }: Pick<EntitySummaryViewProps, "fields">) {
	if (fields.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1">
			{fields.map(field => (
				<span
					key={field.id}
					className={cn(
						"min-w-0 rounded-[6px] bg-fr-surface-2 px-1.5 py-0.5 font-secondary text-fr-2xs text-fr-text-3",
						toneClass(field.tone),
					)}
				>
					<span className="text-fr-text-3">{field.label}:</span>{" "}
					<span className="text-fr-text-2">{field.value}</span>
				</span>
			))}
		</div>
	);
}

function EntityFieldGrid({
	fields,
	mode,
}: Pick<EntitySummaryViewProps, "fields"> & { readonly mode: "spacious" | "comfortable" }) {
	if (fields.length === 0) return null;

	return (
		<div className={cn("grid sm:grid-cols-2", mode === "spacious" ? "gap-2" : "gap-1")}>
			{fields.map(field => (
				<div
					key={field.id}
					className={cn(
						"min-w-0 border border-fr-border-soft bg-fr-bg",
						mode === "spacious" ? "rounded-[10px] px-3 py-2.5" : "rounded-[8px] px-2.5 py-2",
					)}
				>
					<div className="fr-eyebrow">{field.label}</div>
					<div
						className={cn(
							"min-w-0 fr-overflow",
							mode === "spacious" ? "mt-1 text-fr-base font-semibold" : "mt-0.5 text-fr-sm",
							toneClass(field.tone),
						)}
					>
						{field.value}
					</div>
					{field.description && (
						<div className={cn("text-fr-xs text-fr-text-3", mode === "spacious" ? "mt-1" : "mt-0.5")}>
							{field.description}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

function CompactEntitySummary(props: EntitySummaryViewProps) {
	const { title, subtitle, icon, tone, status, fields, metadata, actions, onAction, density, className } = props;

	return (
		<section
			data-slot="entity-summary-body"
			data-density={density}
			className={cn("grid gap-2 rounded-[8px] border border-fr-border-soft bg-fr-surface px-2.5 py-2", className)}
		>
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<span
					className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px]", toneClass(tone, true))}
				>
					<Icon name={icon} size={12} />
				</span>
				<h3 className="min-w-0 fr-overflow font-display text-fr-sm font-semibold text-fr-text">{title}</h3>
				<EntityStatusBadge status={status} />
				{subtitle && (
					<span className="min-w-0 fr-overflow font-secondary text-fr-2xs text-fr-text-3">{subtitle}</span>
				)}
			</div>
			<CompactEntityFields fields={fields} />
			{metadata.length > 0 && <ToolMetadataRow items={metadata} />}
			<EntityActionButtons actions={actions} onAction={onAction} mode="compact" />
		</section>
	);
}

function FullEntityHeader(props: EntitySummaryViewProps & { readonly mode: "spacious" | "comfortable" }) {
	const { title, subtitle, description, icon, tone, status, d, mode } = props;
	const spacious = mode === "spacious";

	return (
		<div className={cn("flex min-w-0 items-start", spacious ? "gap-4" : "gap-3")}>
			<span
				className={cn(
					"flex shrink-0 items-center justify-center",
					spacious ? [d.tile, d.tileRadius] : "size-8 rounded-[8px]",
					toneClass(tone, true),
				)}
			>
				<Icon name={icon} size={spacious ? d.icon : 15} />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<h3 className={cn("min-w-0 fr-overflow font-display font-semibold text-fr-text", d.title)}>{title}</h3>
					<EntityStatusBadge status={status} />
				</div>
				{subtitle && (
					<p className={cn("fr-overflow font-secondary text-fr-xs text-fr-text-3", spacious ? "mt-1" : "mt-0.5")}>
						{subtitle}
					</p>
				)}
				{description && (
					<p
						className={cn(
							"text-fr-text-2",
							spacious ? "mt-2 text-fr-base leading-6" : "mt-1 text-fr-sm leading-5",
						)}
					>
						{description}
					</p>
				)}
			</div>
		</div>
	);
}

function FullEntitySummary(props: EntitySummaryViewProps & { readonly mode: "spacious" | "comfortable" }) {
	const { metadata, actions, onAction, density, d, className, mode } = props;
	const spacious = mode === "spacious";

	return (
		<section
			data-slot="entity-summary-body"
			data-density={density}
			className={cn(
				"grid border border-fr-border-soft bg-fr-surface",
				spacious ? ["gap-4 rounded-[12px]", d.pad] : "gap-3 rounded-[10px] p-3",
				className,
			)}
		>
			<FullEntityHeader {...props} />
			<EntityFieldGrid fields={props.fields} mode={mode} />
			{metadata.length > 0 && <ToolMetadataRow items={metadata} />}
			<EntityActionButtons actions={actions} onAction={onAction} mode={mode} />
		</section>
	);
}

export function EntitySummaryBody(props: EntitySummaryBodyProps) {
	const { icon = "shield", tone = "accent", fields = [], metadata = [], actions = [], settings } = props;
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);

	if (settings?.visible === false || settings?.placement === "hidden") return null;

	const viewProps: EntitySummaryViewProps = { ...props, density, d, icon, tone, fields, metadata, actions };

	if (d.isCompact) return <CompactEntitySummary {...viewProps} />;
	return <FullEntitySummary {...viewProps} mode={fullEntitySummaryMode(d)} />;
}

function fullEntitySummaryMode(d: ReturnType<typeof resolveDensity>): "spacious" | "comfortable" {
	return d.isSpacious ? "spacious" : "comfortable";
}

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

export type ArtifactKind = "image" | "screenshot" | "file" | "browser" | "link";

export interface ArtifactPreviewItem {
	readonly id: string;
	readonly title: React.ReactNode;
	readonly description?: React.ReactNode;
	readonly detail?: React.ReactNode;
	readonly kind?: ArtifactKind;
	readonly src?: string;
	readonly alt?: string;
	readonly icon?: IconName;
	readonly tone?: ComposerControlTone;
	readonly metadata?: readonly ToolMetadataItem[];
	readonly actions?: readonly DisplaySurfaceAction[];
}

export interface ArtifactPreviewBodyProps {
	readonly items: readonly ArtifactPreviewItem[];
	readonly settings?: FraymSurfaceConfig;
	readonly onAction?: (itemId: string, actionId: string) => void;
	readonly className?: string;
}

function artifactIcon(kind?: ArtifactKind): IconName {
	if (kind === "browser" || kind === "link") return "globe";
	if (kind === "image" || kind === "screenshot") return "eye";
	return "file";
}

type ArtifactDensity = NonNullable<FraymSurfaceConfig["density"]>;

interface ArtifactPreviewViewProps extends ArtifactPreviewBodyProps {
	readonly density: ArtifactDensity;
	readonly d: ReturnType<typeof resolveDensity>;
}

function canPreviewImage(item: ArtifactPreviewItem) {
	return Boolean(item.src && (item.kind === "image" || item.kind === "screenshot"));
}

function CompactArtifactActions({
	item,
	onAction,
}: {
	readonly item: ArtifactPreviewItem;
	readonly onAction?: ArtifactPreviewBodyProps["onAction"];
}) {
	if (!item.actions || item.actions.length === 0) return null;

	return (
		<div className="ml-auto flex shrink-0 items-center gap-1">
			{item.actions.map(action => (
				<Button
					key={action.id}
					size="icon"
					variant={action.variant === "default" ? "default" : (action.variant ?? "ghost")}
					aria-label={action.label}
					title={action.label}
					className="size-6 rounded-[6px]"
					onClick={() => onAction?.(item.id, action.id)}
				>
					<Icon name={action.icon ?? item.icon ?? artifactIcon(item.kind)} size={12} />
				</Button>
			))}
		</div>
	);
}

function ArtifactActions({
	item,
	onAction,
	mode,
}: {
	readonly item: ArtifactPreviewItem;
	readonly onAction?: ArtifactPreviewBodyProps["onAction"];
	readonly mode: "spacious" | "comfortable";
}) {
	if (!item.actions || item.actions.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap gap-2", mode === "spacious" && "justify-end")}>
			{item.actions.map(action => (
				<Button
					key={action.id}
					size={mode === "spacious" ? "default" : "sm"}
					variant={action.variant === "default" ? "default" : (action.variant ?? "outline")}
					onClick={() => onAction?.(item.id, action.id)}
				>
					{action.icon && <Icon name={action.icon} size={mode === "spacious" ? 14 : 13} />}
					{action.label}
				</Button>
			))}
		</div>
	);
}

function CompactArtifactRow({
	item,
	onAction,
}: { readonly item: ArtifactPreviewItem } & Pick<ArtifactPreviewBodyProps, "onAction">) {
	return (
		<article data-kind={item.kind ?? "file"} className="flex min-w-0 items-center gap-2 px-2 py-1.5 text-fr-xs">
			<span className={cn("shrink-0", toneClass(item.tone ?? "blue"))}>
				<Icon name={item.icon ?? artifactIcon(item.kind)} size={12} />
			</span>
			<div className="flex min-w-0 flex-1 items-baseline gap-2">
				<div className="min-w-0 flex-1 fr-overflow font-medium text-fr-text">{item.title}</div>
				{item.detail && (
					<div className="min-w-0 shrink fr-overflow font-secondary text-fr-2xs text-fr-text-3">{item.detail}</div>
				)}
			</div>
			<CompactArtifactActions item={item} onAction={onAction} />
		</article>
	);
}

function ArtifactPreviewMedia({
	item,
	d,
	mode,
}: {
	readonly item: ArtifactPreviewItem;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly mode: "spacious" | "comfortable";
}) {
	if (canPreviewImage(item)) {
		return (
			<img
				src={item.src}
				alt={item.alt ?? ""}
				className={cn("w-full object-cover", mode === "spacious" ? "h-44" : "h-32")}
			/>
		);
	}

	return (
		<div className={cn("flex items-center justify-center bg-fr-bg", mode === "spacious" ? "h-44" : "h-24")}>
			<span
				className={cn(
					"flex items-center justify-center",
					mode === "spacious" ? [d.tile, d.tileRadius] : "size-9 rounded-[10px]",
					toneClass(item.tone ?? "blue", true),
				)}
			>
				<Icon name={item.icon ?? artifactIcon(item.kind)} size={mode === "spacious" ? d.icon : 17} />
			</span>
		</div>
	);
}

function ArtifactText({
	item,
	d,
	mode,
}: {
	readonly item: ArtifactPreviewItem;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly mode: "spacious" | "comfortable";
}) {
	return (
		<div className="min-w-0">
			<div
				className={cn(
					"fr-overflow font-semibold text-fr-text",
					mode === "spacious" ? ["font-display", d.title] : "text-fr-sm",
				)}
			>
				{item.title}
			</div>
			{item.description && (
				<p
					className={
						mode === "spacious"
							? "mt-1 text-fr-base leading-5 text-fr-text-2"
							: "mt-0.5 text-fr-xs text-fr-text-2"
					}
				>
					{item.description}
				</p>
			)}
			{item.detail && (
				<p
					className={cn(
						"font-secondary text-fr-text-3",
						mode === "spacious" ? "mt-1 text-fr-xs" : "mt-0.5 fr-overflow text-fr-2xs",
					)}
				>
					{item.detail}
				</p>
			)}
		</div>
	);
}

function ArtifactCard({
	item,
	d,
	onAction,
	mode,
}: {
	readonly item: ArtifactPreviewItem;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly onAction?: ArtifactPreviewBodyProps["onAction"];
	readonly mode: "spacious" | "comfortable";
}) {
	return (
		<article
			data-kind={item.kind ?? "file"}
			className={cn(
				"min-w-0 overflow-hidden",
				mode === "spacious" ? d.card : "rounded-[10px] border border-fr-border-soft bg-fr-surface",
			)}
		>
			<ArtifactPreviewMedia item={item} d={d} mode={mode} />
			<div className={cn("grid", mode === "spacious" ? ["gap-3", d.pad] : "gap-2 p-3")}>
				<ArtifactText item={item} d={d} mode={mode} />
				{item.metadata && item.metadata.length > 0 && <ToolMetadataRow items={item.metadata} />}
				<ArtifactActions item={item} onAction={onAction} mode={mode} />
			</div>
		</article>
	);
}

function CompactArtifactPreview({ items, onAction, density, className }: ArtifactPreviewViewProps) {
	return (
		<div
			data-slot="artifact-preview-body"
			data-density={density}
			className={cn("overflow-hidden rounded-[9px] border border-fr-border-soft bg-fr-surface", className)}
		>
			<div className="divide-y divide-fr-border-soft">
				{items.map(item => (
					<CompactArtifactRow key={item.id} item={item} onAction={onAction} />
				))}
			</div>
		</div>
	);
}

function ArtifactCardGrid(props: ArtifactPreviewViewProps & { readonly mode: "spacious" | "comfortable" }) {
	const { items, onAction, density, d, className, mode } = props;

	return (
		<div
			data-slot="artifact-preview-body"
			data-density={density}
			className={cn("grid sm:grid-cols-2", mode === "spacious" ? "gap-3" : "gap-2", className)}
		>
			{items.map(item => (
				<ArtifactCard key={item.id} item={item} d={d} onAction={onAction} mode={mode} />
			))}
		</div>
	);
}

export function ArtifactPreviewBody(props: ArtifactPreviewBodyProps) {
	const { settings } = props;
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);

	if (settings?.visible === false || settings?.placement === "hidden") return null;

	const viewProps: ArtifactPreviewViewProps = { ...props, density, d };
	if (d.isCompact) return <CompactArtifactPreview {...viewProps} />;
	return <ArtifactCardGrid {...viewProps} mode={d.isSpacious ? "spacious" : "comfortable"} />;
}

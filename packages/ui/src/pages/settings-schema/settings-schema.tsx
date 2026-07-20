import { Badge } from "../../elements/badge";
import { ModeEyebrow } from "../../features/density-ui";
import { type FraymSurfaceConfig, resolveDensity } from "../../features/surface-kit";
import { cn } from "../../lib/cn";

export interface SettingsControlPreview {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
	readonly value?: React.ReactNode;
	readonly control?: React.ReactNode;
	readonly enabled?: boolean;
}

export interface SettingsPreviewSection {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	readonly rows: readonly SettingsControlPreview[];
}

export interface SettingsSchemaPreviewProps {
	readonly sections: readonly SettingsPreviewSection[];
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

type DensityModel = ReturnType<typeof resolveDensity>;
type SettingsSchemaLayout = "compact" | "spacious" | "comfortable";

interface SettingsSchemaLayoutProps {
	readonly sections: readonly SettingsPreviewSection[];
	readonly density: string;
	readonly d: DensityModel;
	readonly className?: string;
}

const SETTINGS_SCHEMA_COMPONENTS = {
	compact: CompactSettingsSchema,
	spacious: SpaciousSettingsSchema,
	comfortable: ComfortableSettingsSchema,
} satisfies Record<SettingsSchemaLayout, (props: SettingsSchemaLayoutProps) => React.ReactNode>;

function settingsSchemaLayout(d: DensityModel): SettingsSchemaLayout {
	if (d.isCompact) return "compact";
	if (d.isSpacious) return "spacious";
	return "comfortable";
}

function settingsSchemaHidden(settings: FraymSurfaceConfig | undefined): boolean {
	return settings?.visible === false || settings?.placement === "hidden";
}

export function SettingsSchemaPreview({ sections, settings, className }: SettingsSchemaPreviewProps) {
	const density = settings?.density ?? "comfortable";
	const d = resolveDensity(density);

	if (settingsSchemaHidden(settings)) return null;
	const Schema = SETTINGS_SCHEMA_COMPONENTS[settingsSchemaLayout(d)];
	return <Schema sections={sections} density={density} d={d} className={className} />;
}

function CompactSettingsSchema({ sections, density, className }: SettingsSchemaLayoutProps) {
	return (
		<div data-slot="settings-schema-preview" data-density={density} className={cn("flex flex-col gap-3", className)}>
			{sections.map(section => (
				<CompactSettingsSection key={section.id} section={section} />
			))}
		</div>
	);
}

function CompactSettingsSection({ section }: { readonly section: SettingsPreviewSection }) {
	return (
		<section className="flex flex-col gap-1">
			<ModeEyebrow trailing={`${section.rows.length}`}>{section.title}</ModeEyebrow>
			<div className="divide-y divide-fr-border-soft">
				{section.rows.map(row => (
					<CompactSettingsRow key={row.id} row={row} />
				))}
			</div>
		</section>
	);
}

function SettingsDisabledBadge({ enabled }: { readonly enabled: SettingsControlPreview["enabled"] }) {
	return enabled === false ? <Badge tone="mute">off</Badge> : null;
}

function settingsRowValue(value: React.ReactNode, className: string): React.ReactNode {
	return value && <div className={className}>{value}</div>;
}

function settingsRowControl(control: React.ReactNode): React.ReactNode {
	return control && <div className="shrink-0">{control}</div>;
}

function CompactSettingsRow({ row }: { readonly row: SettingsControlPreview }) {
	return (
		<div data-slot="settings-control-preview" className="flex items-center gap-3 py-[5px] text-fr-xs">
			<div className="min-w-0 flex-1 fr-overflow font-medium text-fr-text-2">{row.label}</div>
			<SettingsDisabledBadge enabled={row.enabled} />
			{settingsRowValue(row.value, "shrink-0 font-secondary text-fr-2xs text-fr-text-3")}
			{settingsRowControl(row.control)}
		</div>
	);
}

function SpaciousSettingsSchema({ sections, density, d, className }: SettingsSchemaLayoutProps) {
	return (
		<div data-slot="settings-schema-preview" data-density={density} className={cn("grid gap-4", className)}>
			{sections.map(section => (
				<SpaciousSettingsSection key={section.id} section={section} d={d} />
			))}
		</div>
	);
}

function SpaciousSettingsSection({
	section,
	d,
}: {
	readonly section: SettingsPreviewSection;
	readonly d: DensityModel;
}) {
	return (
		<section className={d.card}>
			<SettingsSectionHeader section={section} d={d} spacious />
			<div className="divide-y divide-fr-border-soft">
				{section.rows.map(row => (
					<SpaciousSettingsRow key={row.id} row={row} d={d} />
				))}
			</div>
		</section>
	);
}

function SpaciousSettingsRow({ row, d }: { readonly row: SettingsControlPreview; readonly d: DensityModel }) {
	return (
		<div data-slot="settings-control-preview" className={cn(d.row, "flex items-center gap-5 py-4")}>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-fr-base font-semibold text-fr-text md:text-fr-md">{row.label}</span>
					<SettingsDisabledBadge enabled={row.enabled} />
				</div>
				{row.description && <p className="mt-1 text-fr-sm leading-5 text-fr-text-3">{row.description}</p>}
			</div>
			{settingsRowValue(row.value, "shrink-0 font-secondary text-fr-sm text-fr-text-2")}
			{settingsRowControl(row.control)}
		</div>
	);
}

function ComfortableSettingsSchema({ sections, density, d, className }: SettingsSchemaLayoutProps) {
	return (
		<div data-slot="settings-schema-preview" data-density={density} className={cn("grid gap-3", className)}>
			{sections.map(section => (
				<ComfortableSettingsSection key={section.id} section={section} d={d} />
			))}
		</div>
	);
}

function ComfortableSettingsSection({
	section,
	d,
}: {
	readonly section: SettingsPreviewSection;
	readonly d: DensityModel;
}) {
	return (
		<section className="rounded-[10px] border border-fr-border-soft bg-fr-surface">
			<SettingsSectionHeader section={section} d={d} />
			<div className="divide-y divide-fr-border-soft">
				{section.rows.map(row => (
					<ComfortableSettingsRow key={row.id} row={row} d={d} />
				))}
			</div>
		</section>
	);
}

function SettingsSectionHeader({
	section,
	d,
	spacious,
}: {
	readonly section: SettingsPreviewSection;
	readonly d: DensityModel;
	readonly spacious?: boolean;
}) {
	return (
		<div className={cn("border-b border-fr-border-soft", d.pad)}>
			<h3 className={cn("font-display font-semibold text-fr-text", d.title)}>{section.title}</h3>
			{section.description && (
				<p className={cn("mt-1 text-fr-text-2", spacious ? "text-fr-base leading-6" : "text-fr-sm")}>
					{section.description}
				</p>
			)}
		</div>
	);
}

function ComfortableSettingsRow({ row, d }: { readonly row: SettingsControlPreview; readonly d: DensityModel }) {
	return (
		<div data-slot="settings-control-preview" className={cn("flex items-center gap-4", d.row)}>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-fr-base font-medium text-fr-text">{row.label}</span>
					<SettingsDisabledBadge enabled={row.enabled} />
				</div>
				{row.description && <p className="mt-0.5 text-fr-sm text-fr-text-3">{row.description}</p>}
			</div>
			{settingsRowValue(row.value, "shrink-0 font-secondary text-fr-xs text-fr-text-3")}
			{settingsRowControl(row.control)}
		</div>
	);
}

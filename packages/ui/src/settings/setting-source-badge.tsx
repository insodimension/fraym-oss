import type { EngineConfigSettingRecord, EngineConfigValueRecord } from "@fraym/driver";
import { cn } from "../lib/cn";

export interface SettingSourceBadgeProps {
	readonly record: EngineConfigSettingRecord;
	readonly value?: EngineConfigValueRecord;
	readonly className?: string;
}

/** Small badge showing whether a setting is at its default or a changed scope. */
export function SettingSourceBadge({ record, value, className }: SettingSourceBadgeProps) {
	const changed = Boolean(value?.changed);
	const label = changed ? (value?.scope ?? "changed") : "default";
	return (
		<span
			data-slot="setting-source-badge"
			data-setting-path={record.path}
			data-scope={label}
			data-changed={changed ? "true" : "false"}
			className={cn(
				"inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 font-secondary text-[10px] uppercase tracking-normal",
				changed
					? "border-fr-accent-line bg-[var(--fr-accent-dim)] text-fr-accent"
					: "border-fr-border-soft bg-fr-surface text-fr-text-3",
				className,
			)}
		>
			{label}
		</span>
	);
}

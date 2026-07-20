import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function SettingsTitle({ children }: { readonly children: ReactNode }) {
	return <h1 className="mb-1 text-fr-2xl font-display font-semibold tracking-[-0.01em]">{children}</h1>;
}

export function SettingsSub({ children }: { readonly children: ReactNode }) {
	return <p className="mb-7 text-fr-base text-fr-text-2">{children}</p>;
}

export function SettingsGroup({ heading, children }: { readonly heading?: string; readonly children: ReactNode }) {
	return (
		<div className="mb-[30px]">
			{heading && <div className="mb-3 fr-eyebrow">{heading}</div>}
			{children}
		</div>
	);
}

export interface SettingsRowProps {
	readonly name: string;
	readonly desc?: string;
	readonly stack?: boolean;
	readonly children?: ReactNode;
}

export function SettingsRow({ name, desc, stack, children }: SettingsRowProps) {
	return (
		<div
			data-slot="settings-row"
			className={cn(
				"flex gap-4 border-t border-fr-border-soft py-3.5",
				stack ? "flex-col items-start" : "items-center",
			)}
		>
			<div className="min-w-0 flex-1">
				<div className="text-fr-base font-medium">{name}</div>
				{desc && <div className="mt-0.5 text-xs text-fr-text-3">{desc}</div>}
			</div>
			{children}
		</div>
	);
}

export interface SegmentedProps<T extends string> {
	readonly options: readonly T[];
	readonly value: T;
	readonly onChange: (value: T) => void;
	readonly className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
	return (
		<div
			data-slot="segmented"
			className={cn("flex shrink-0 gap-0.5 rounded-lg border border-fr-border bg-fr-surface p-[3px]", className)}
		>
			{options.map(o => (
				<button
					key={o}
					type="button"
					aria-pressed={value === o}
					className={cn(
						"rounded-md px-3 py-[5px] font-secondary text-xs text-fr-text-2",
						value === o && "bg-fr-surface-3 text-fr-text",
					)}
					onClick={() => onChange(o)}
				>
					{o}
				</button>
			))}
		</div>
	);
}

export interface NumberInputProps {
	readonly value: string | number;
	readonly unit?: string;
	readonly onChange: (value: string) => void;
	readonly className?: string;
}

export function NumberInput({ value, unit = "px", onChange, className }: NumberInputProps) {
	return (
		<div data-slot="number-input" className={cn("flex shrink-0 items-center gap-2", className)}>
			<input
				className="w-16 rounded-lg border border-fr-border bg-fr-surface px-2.5 py-[7px] text-center font-secondary text-xs text-fr-text"
				value={value}
				onChange={e => onChange(e.target.value)}
			/>
			<span className="text-xs text-fr-text-3">{unit}</span>
		</div>
	);
}

export interface SliderProps {
	readonly value: number;
	readonly min?: number;
	readonly max?: number;
	readonly onChange: (value: number) => void;
	readonly className?: string;
}

export function Slider({ value, min = 0, max = 100, onChange, className }: SliderProps) {
	return (
		<input
			data-slot="slider"
			type="range"
			min={min}
			max={max}
			value={value}
			onChange={e => onChange(+e.target.value)}
			className={cn(
				"h-1 w-40 shrink-0 appearance-none rounded-[3px] bg-fr-surface-3 outline-none",
				"[&::-webkit-slider-thumb]:size-[15px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fr-accent",
				"[&::-moz-range-thumb]:size-[15px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-fr-accent",
				className,
			)}
		/>
	);
}

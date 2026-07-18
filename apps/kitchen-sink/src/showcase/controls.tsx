import { Input, Slider, Switch } from "@fraym/ui";
import { cn } from "../compat/ui";
import { type ReactNode, useState } from "react";

// A tiny typed "knobs" system so every entry ships a live configuration panel
// instead of a hardcoded blob of markup.

type ControlScope = "preview" | "display";

type ControlBase = { readonly label: string; readonly scope?: ControlScope };

export type ControlDef =
	| (ControlBase & { readonly kind: "boolean"; readonly default: boolean })
	| (ControlBase & { readonly kind: "select"; readonly options: readonly string[]; readonly default: string })
	| (ControlBase & { readonly kind: "text"; readonly default: string; readonly placeholder?: string })
	| (ControlBase & { readonly kind: "color"; readonly default: string })
	| (ControlBase & {
			readonly kind: "number";
			readonly default: number;
			readonly min?: number;
			readonly max?: number;
			readonly step?: number;
	  });

export type ControlsSchema = Record<string, ControlDef>;

type ValueOf<D> = D extends { kind: "boolean" } ? boolean : D extends { kind: "number" } ? number : string;
export type ControlValues<S extends ControlsSchema> = { [K in keyof S]: ValueOf<S[K]> };

export function useControls<S extends ControlsSchema>(schema: S): { values: ControlValues<S>; panel: ReactNode } {
	const [values, setValues] = useState<ControlValues<S>>(() => {
		const init: Record<string, unknown> = {};
		for (const key in schema) init[key] = schema[key]?.default;
		return init as ControlValues<S>;
	});
	const set = (key: string, value: unknown) => setValues(prev => ({ ...prev, [key]: value }));
	return {
		values,
		panel: <ControlsPanel schema={schema} values={values as Record<string, unknown>} onChange={set} />,
	};
}

function ControlsList({
	schema,
	values,
	onChange,
	keys,
}: {
	readonly schema: ControlsSchema;
	readonly values: Record<string, unknown>;
	readonly onChange: (key: string, value: unknown) => void;
	readonly keys: readonly string[];
}) {
	return (
		<>
			{keys.map(key => {
				const def = schema[key];
				if (!def) return null;
				// A bounded number renders as the smooth fill-bar Slider and a color as a
				// swatch row — both carry their own inline label, so skip the stacked caption.
				const selfLabeled =
					(def.kind === "number" && def.min !== undefined && def.max !== undefined) || def.kind === "color";
				if (selfLabeled) {
					return (
						<div key={key} className="grid gap-1.5">
							<ControlInput def={def} value={values[key]} onChange={v => onChange(key, v)} />
						</div>
					);
				}
				return (
					<label key={key} className="grid gap-1.5">
						<span className="text-fr-xs font-medium text-fr-text-2">{def.label}</span>
						<ControlInput def={def} value={values[key]} onChange={v => onChange(key, v)} />
					</label>
				);
			})}
		</>
	);
}

// Renders the live config knobs, grouped by scope: "Preview" knobs configure the
// isolated card only; "Display" knobs are cross-cutting prefs that also drive the
// Demo Dock. A single-scope schema renders flat under "Configuration".
function ControlsPanel({
	schema,
	values,
	onChange,
}: {
	readonly schema: ControlsSchema;
	readonly values: Record<string, unknown>;
	readonly onChange: (key: string, value: unknown) => void;
}) {
	const keys = Object.keys(schema);
	if (keys.length === 0) return null;
	const displayKeys = keys.filter(k => schema[k]?.scope === "display");
	const previewKeys = keys.filter(k => schema[k]?.scope !== "display");
	const grouped = displayKeys.length > 0 && previewKeys.length > 0;
	return (
		<div data-slot="controls" className="grid gap-5">
			<div className="grid gap-3.5">
				<div className="fr-eyebrow">{grouped ? "Preview · this card" : "Configuration"}</div>
				<ControlsList schema={schema} values={values} onChange={onChange} keys={grouped ? previewKeys : keys} />
			</div>
			{grouped && (
				<div className="grid gap-3.5">
					<div className="fr-eyebrow">Display · everywhere (incl. dock)</div>
					<ControlsList schema={schema} values={values} onChange={onChange} keys={displayKeys} />
				</div>
			)}
		</div>
	);
}

function ControlInput({
	def,
	value,
	onChange,
}: {
	readonly def: ControlDef;
	readonly value: unknown;
	readonly onChange: (value: unknown) => void;
}) {
	if (def.kind === "boolean") {
		return (
			<span className="flex items-center gap-2">
				<Switch checked={Boolean(value)} onCheckedChange={onChange} />
				<span className="font-secondary text-fr-xs text-fr-text-3">{String(Boolean(value))}</span>
			</span>
		);
	}
	if (def.kind === "select") {
		return (
			<span className="flex flex-wrap gap-1">
				{def.options.map(opt => (
					<button
						key={opt}
						type="button"
						onClick={() => onChange(opt)}
						className={cn(
							"rounded-md border px-2 py-1 font-secondary text-fr-xs transition-colors duration-[120ms]",
							value === opt
								? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
								: "border-fr-border-soft text-fr-text-2 hover:bg-fr-surface hover:text-fr-text",
						)}
					>
						{opt || "—"}
					</button>
				))}
			</span>
		);
	}
	if (def.kind === "number") {
		if (def.min !== undefined && def.max !== undefined) {
			return (
				<Slider
					label={def.label}
					value={Number(value)}
					min={def.min}
					max={def.max}
					step={def.step}
					onValueChange={onChange}
				/>
			);
		}
		return (
			<Input
				type="number"
				value={String(value)}
				min={def.min}
				max={def.max}
				step={def.step}
				onChange={e => onChange(Number(e.target.value))}
			/>
		);
	}
	if (def.kind === "color") {
		const hex = String(value);
		const swatch = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000";
		return (
			<span className="flex h-9 items-center gap-2 rounded-md border border-fr-border-soft bg-fr-surface-2 px-3">
				<span className="truncate text-fr-xs font-medium text-fr-text-2">{def.label}</span>
				<input
					type="color"
					value={swatch}
					onChange={e => onChange(e.target.value)}
					aria-label={def.label}
					className="ml-auto size-5 shrink-0 cursor-pointer rounded border border-fr-border-soft bg-transparent p-0"
				/>
				<input
					value={hex}
					onChange={e => onChange(e.target.value)}
					aria-label={`${def.label} value`}
					className="w-24 shrink-0 bg-transparent text-right font-secondary text-fr-xs text-fr-text outline-none"
				/>
			</span>
		);
	}
	return <Input value={String(value)} placeholder={def.placeholder} onChange={e => onChange(e.target.value)} />;
}

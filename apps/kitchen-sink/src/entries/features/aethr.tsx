import {
	AETHR_STATES,
	Aethr,
	type AethrParams,
	type AethrState,
	type NebulaVariantName,
	THEMES,
	type ThemeName,
} from "@fraym/aethr";
import { cn } from "@fraym/ui";
import { useMemo, useState } from "react";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import type { ShowcaseEntry } from "../../showcase/types";

const STATES: readonly AethrState[] = ["idle", "nudge", "dreaming", "uncertain", "satisfied"];
const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
const VARIANTS: readonly NebulaVariantName[] = ["supernova", "smoke"];

interface Tune {
	theme: ThemeName;
	growth: number;
	recede: number;
	bloomStrength: number;
	grainStrength: number;
	breathSpeed: number;
	breathDepth: number;
	breathBloom: number;
	rotationSpeed: number;
	fpsCap: number;
}

// Mood presets only carry the eased params (not growth/recede/fps), so loading a
// preset keeps the current sparse↔dense + recede + fps where the user left them.
function presetTune(name: AethrState, prev?: Tune): Tune {
	const p = AETHR_STATES[name];
	return {
		theme: p.theme,
		bloomStrength: p.bloomStrength,
		grainStrength: p.grainStrength,
		breathSpeed: p.breathSpeed,
		breathDepth: p.breathDepth,
		breathBloom: p.breathBloom,
		rotationSpeed: p.rotationSpeed,
		growth: prev?.growth ?? 0.7,
		recede: prev?.recede ?? 0,
		fpsCap: prev?.fpsCap ?? 30,
	};
}

function buildSnippet(base: AethrState, t: Tune): string {
	return [
		`${base}: {`,
		`\ttheme: "${t.theme}",`,
		`\tbloomStrength: ${t.bloomStrength},`,
		`\tbreathSpeed: ${t.breathSpeed},`,
		`\tbreathDepth: ${t.breathDepth},`,
		`\tbreathBloom: ${t.breathBloom},`,
		`\trotationSpeed: ${t.rotationSpeed},`,
		`\tgrainStrength: ${t.grainStrength},`,
		"},",
		`// growth ${t.growth.toFixed(2)} | recede ${t.recede.toFixed(2)} | fps ${t.fpsCap}`,
	].join("\n");
}

function Knob({
	label,
	value,
	min,
	max,
	step,
	fmt,
	onChange,
}: {
	readonly label: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly fmt?: (v: number) => string;
	readonly onChange: (v: number) => void;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="flex items-center justify-between font-secondary text-fr-xs text-fr-text-2">
				<span>{label}</span>
				<span className="tabular-nums text-fr-text-3">{(fmt ?? (v => v.toFixed(2)))(value)}</span>
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={e => onChange(Number(e.target.value))}
				className="w-full"
				style={{ accentColor: "var(--fr-accent)" }}
			/>
		</label>
	);
}

function ChipRow<T extends string>({
	options,
	value,
	onSelect,
}: {
	readonly options: readonly T[];
	readonly value: T;
	readonly onSelect: (v: T) => void;
}) {
	return (
		<span className="flex flex-wrap gap-1">
			{options.map(opt => (
				<button
					key={opt}
					type="button"
					onClick={() => onSelect(opt)}
					className={cn(
						"rounded-md border px-2 py-1 font-secondary text-fr-xs transition-colors duration-[120ms]",
						value === opt
							? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
							: "border-fr-border-soft text-fr-text-2 hover:bg-fr-surface hover:text-fr-text",
					)}
				>
					{opt}
				</button>
			))}
		</span>
	);
}

function AethrEntry() {
	const [base, setBase] = useState<AethrState>("idle");
	const [tune, setTune] = useState<Tune>(() => presetTune("idle"));
	const [variant, setVariant] = useState<NebulaVariantName>("smoke");

	const params = useMemo<Partial<AethrParams>>(
		() => ({
			theme: tune.theme,
			bloomStrength: tune.bloomStrength,
			grainStrength: tune.grainStrength,
			breathSpeed: tune.breathSpeed,
			breathDepth: tune.breathDepth,
			breathBloom: tune.breathBloom,
			rotationSpeed: tune.rotationSpeed,
		}),
		[tune],
	);
	const snippet = useMemo(() => buildSnippet(base, tune), [base, tune]);

	const loadPreset = (name: AethrState) => {
		setBase(name);
		setTune(prev => presetTune(name, prev));
	};
	const set = <K extends keyof Tune>(key: K, value: Tune[K]) => setTune(prev => ({ ...prev, [key]: value }));

	const panel = (
		<div className="flex flex-col gap-3">
			<div>
				<p className="fr-eyebrow mb-1.5">variant</p>
				<ChipRow options={VARIANTS} value={variant} onSelect={setVariant} />
			</div>
			<div>
				<p className="fr-eyebrow mb-1.5">load preset</p>
				<ChipRow options={STATES} value={base} onSelect={loadPreset} />
			</div>
			<div>
				<p className="fr-eyebrow mb-1.5">theme</p>
				<ChipRow options={THEME_NAMES} value={tune.theme} onSelect={t => set("theme", t)} />
			</div>
			<Knob
				label="growth: sparse to dense"
				value={tune.growth}
				min={0}
				max={1}
				step={0.01}
				onChange={v => set("growth", v)}
			/>
			<Knob label="recede" value={tune.recede} min={0} max={1} step={0.01} onChange={v => set("recede", v)} />
			<Knob
				label="bloom"
				value={tune.bloomStrength}
				min={0}
				max={0.4}
				step={0.005}
				fmt={v => v.toFixed(3)}
				onChange={v => set("bloomStrength", v)}
			/>
			<Knob
				label="grain"
				value={tune.grainStrength}
				min={0}
				max={0.2}
				step={0.005}
				fmt={v => v.toFixed(3)}
				onChange={v => set("grainStrength", v)}
			/>
			<Knob
				label="breath speed"
				value={tune.breathSpeed}
				min={0}
				max={4}
				step={0.05}
				onChange={v => set("breathSpeed", v)}
			/>
			<Knob
				label="breath depth"
				value={tune.breathDepth}
				min={0}
				max={0.2}
				step={0.005}
				fmt={v => v.toFixed(3)}
				onChange={v => set("breathDepth", v)}
			/>
			<Knob
				label="breath bloom"
				value={tune.breathBloom}
				min={0}
				max={2}
				step={0.05}
				onChange={v => set("breathBloom", v)}
			/>
			<Knob
				label="rotation"
				value={tune.rotationSpeed}
				min={0}
				max={0.3}
				step={0.005}
				fmt={v => v.toFixed(3)}
				onChange={v => set("rotationSpeed", v)}
			/>
			<Knob
				label="fps cap"
				value={tune.fpsCap}
				min={15}
				max={60}
				step={5}
				fmt={v => String(v)}
				onChange={v => set("fpsCap", v)}
			/>
			<div>
				<div className="mb-1 flex items-center justify-between">
					<p className="fr-eyebrow">values</p>
					<button
						type="button"
						onClick={() => void navigator.clipboard?.writeText(snippet)}
						className="rounded-md border border-fr-border-soft px-2 py-0.5 font-secondary text-fr-2xs text-fr-text-2 hover:bg-fr-surface hover:text-fr-text"
					>
						copy
					</button>
				</div>
				<pre className="overflow-auto whitespace-pre rounded-md border border-fr-border-soft bg-fr-bg p-2 font-secondary text-fr-2xs leading-relaxed text-fr-text-3">
					{snippet}
				</pre>
			</div>
		</div>
	);

	return (
		<Demo
			summary="Aethr - the breathing companion-core presence from fraym-aethr. Switch the variant (supernova raymarch or smoke 2D cloud), then tune every parameter live: load a mood preset and slide growth (sparse to dense), recede, bloom, grain, breath, rotation, and theme. Both variants share the same themes, states, growth and recede. Copy the values straight into AETHR_STATES."
			importPath="@fraym/aethr"
			controls={panel}
			stage="center"
		>
			<div className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-fr-border-soft bg-black">
				<Aethr
					key={variant}
					variant={variant}
					state={base}
					growth={tune.growth}
					recede={tune.recede}
					fpsCap={tune.fpsCap}
					params={params}
					renderScale={0.85}
					className="block size-full"
				/>
			</div>
		</Demo>
	);
}

const aethrDocs: EntryDocs = {
	import:
		'import { Aethr, AETHR_STATES, type AethrParams, type AethrState, type NebulaVariantName, THEMES } from "@fraym/aethr";',
	anatomy: JSON.stringify(
		[
			"// Aethr is a self-contained WebGL canvas (purely visual / aria-hidden). One mount,",
			"// props-driven; all heavy work is lazy-loaded + lifecycle-managed by useAethr.",
			"// `state` selects an eased mood envelope from AETHR_STATES; the engine eases toward it.",
			'<div className="relative h-[460px] w-full overflow-hidden rounded-2xl bg-black">',
			"  <Aethr",
			'    variant="smoke"         // supernova (raymarched) | smoke (2D domain-warped cloud)',
			'    state="idle"            // idle | nudge | dreaming | uncertain | satisfied',
			"    growth={0.7}            // 0..1 sparse -> dense (densifies + zooms in as it grows)",
			"    recede={0}              // 0..1 pulls the nebula deep/back into the canvas",
			"    fpsCap={30}             // frame-rate ceiling",
			"    renderScale={0.85}      // internal resolution multiplier 0..1",
			'    params={{ theme: "amber", bloomStrength: 0.05, breathSpeed: 1.5 }}  // live overrides',
			'    className="block size-full"',
			"  />",
			"</div>",
			"// params is Partial<AethrParams> (theme, bloomStrength, grainStrength, breathSpeed,",
			"// breathDepth, breathBloom, rotationSpeed, signal) and overrides the eased mood live.",
		].join("\n"),
	),
	examples: [
		{
			label: "Mood preset (idle)",
			code: JSON.stringify('<Aethr state="idle" />  // calm, slow breath'),
		},
		{
			label: "Smoke variant (2D cloud)",
			code: JSON.stringify('<Aethr variant="smoke" state="idle" params={{ theme: "cosmic" }} />'),
		},
		{
			label: "Dreaming, fully grown, custom theme",
			code: JSON.stringify('<Aethr state="dreaming" growth={1} params={{ theme: "twilight" }} />'),
		},
		{
			label: "Bright nudge signal",
			code: JSON.stringify('<Aethr state="nudge" params={{ bloomStrength: 0.09, breathBloom: 1.1 }} />'),
		},
		{
			label: "Receded low-power background",
			code: JSON.stringify('<Aethr state="idle" recede={0.6} fpsCap={20} renderScale={0.6} />'),
		},
		{
			label: "Tune a new mood for AETHR_STATES",
			code: JSON.stringify(
				[
					"const params: Partial<AethrParams> = {",
					'  theme: "sunset",',
					"  bloomStrength: 0.07,",
					"  breathSpeed: 1.7,",
					"  breathDepth: 0.06,",
					"  breathBloom: 0.8,",
					"  rotationSpeed: 0.05,",
					"  grainStrength: 0.035,",
					"};",
					'<Aethr state="satisfied" growth={0.7} params={params} />',
				].join("\n"),
			),
		},
	],
	api: [
		{
			name: "state",
			type: "AethrState",
			default: '"idle"',
			description:
				"Current companion mood; selects an eased parameter envelope from AETHR_STATES (idle | nudge | dreaming | uncertain | satisfied).",
		},
		{
			name: "variant",
			type: "NebulaVariantName",
			default: '"supernova"',
			description:
				'Rendering technique: "supernova" (the raymarched 3D nebula) or "smoke" (a cheaper 2D domain-warped cloud). Both share the same themes, states, growth and recede.',
		},
		{
			name: "growth",
			type: "number",
			default: "1",
			description: "Nebula maturity 0..1 -- starts sparse/deep, densifies and zooms in as it grows.",
		},
		{
			name: "recede",
			type: "number",
			default: "0",
			description: "Recede 0..1 -- pulls the nebula deep/back inside the static canvas.",
		},
		{
			name: "fpsCap",
			type: "number",
			default: "30",
			description: "Frame-rate ceiling for the animation loop.",
		},
		{
			name: "renderScale",
			type: "number",
			default: "0.85",
			description: "Internal resolution multiplier 0..1 (lower = cheaper, softer).",
		},
		{
			name: "maxPixelRatio",
			type: "number",
			default: "1.5",
			description: "devicePixelRatio clamp; caps the backing-store resolution on high-DPI screens.",
		},
		{
			name: "params",
			type: "Partial<AethrParams>",
			description:
				"Live overrides for the eased mood params: theme, bloomStrength, grainStrength, breathSpeed, breathDepth, breathBloom, rotationSpeed, signal.",
		},
		{
			name: "className",
			type: "string",
			description: "Classes merged onto the underlying <canvas> element.",
		},
	],
};

export const aethrEntries: readonly ShowcaseEntry[] = [
	{ id: "aethr", name: "Aethr", Component: AethrEntry, docs: aethrDocs },
];

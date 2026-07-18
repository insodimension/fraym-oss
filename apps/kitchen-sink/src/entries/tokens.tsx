import { STATE_TOKENS, SURFACE_TOKENS, TEXT_TOKENS } from "../fixtures";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

function Swatch({ token, label }: { readonly token: string; readonly label: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="size-14 rounded-lg border border-fr-border-soft" style={{ background: `var(${token})` }} />
			<span className="font-secondary text-fr-2xs text-fr-text-2">{label}</span>
			<span className="font-secondary text-fr-2xs text-fr-text-3">{token}</span>
		</div>
	);
}

function SurfacesEntry() {
	return (
		<Demo
			summary="Background and surface elevation tokens. Every component reads these — switch theme/accent in the top bar and they re-resolve live."
			importPath="@fraym/ui/theme/tokens"
			stage="start"
		>
			<div className="flex flex-wrap gap-4">
				{SURFACE_TOKENS.map(t => (
					<Swatch key={t.token} {...t} />
				))}
			</div>
		</Demo>
	);
}

function TextEntry() {
	return (
		<Demo
			summary="Foreground text ramp — primary, secondary, and tertiary."
			importPath="@fraym/ui/theme/tokens"
			stage="start"
		>
			<div className="flex flex-wrap gap-4">
				{TEXT_TOKENS.map(t => (
					<Swatch key={t.token} {...t} />
				))}
			</div>
		</Demo>
	);
}

function StateEntry() {
	return (
		<Demo
			summary="Semantic state + accent tokens (accent, add, blue, warn, del) used by badges, tones, and surfaces across the kit."
			importPath="@fraym/ui/theme/tokens"
			stage="start"
		>
			<div className="flex flex-wrap gap-4">
				{STATE_TOKENS.map(t => (
					<Swatch key={t.token} {...t} />
				))}
			</div>
		</Demo>
	);
}

function TypographyEntry() {
	return (
		<Demo
			summary="IBM Plex Sans for UI, IBM Plex Mono for code/metadata. Loaded via @fraym/ui/fonts.css; theme.css only declares the family names."
			importPath="@fraym/ui/fonts.css"
			stage="start"
		>
			<div className="flex flex-col gap-2">
				<span className="text-fr-2xl font-semibold tracking-tight">IBM Plex Sans — 22 / 600</span>
				<span className="text-fr-lg font-medium">IBM Plex Sans — 15 / 500</span>
				<span className="text-sm text-fr-text-2">IBM Plex Sans — 14 / 400 · body text</span>
				<span className="font-secondary text-fr-sm text-fr-text-2">
					IBM Plex Mono — 12.5 · code, paths, metadata
				</span>
			</div>
		</Demo>
	);
}
const surfacesDocs: EntryDocs = {
	import: 'import "@fraym/ui/theme.css";',
	anatomy: `<div className="bg-fr-bg text-fr-text">
  Surface tokens live on the CSS custom properties cascade.
</div>`,
	examples: [
		{
			label: "Usage",
			code: `<div className="rounded-lg border border-fr-border-soft bg-fr-surface p-4">
  A card on a —fr-bg background.
</div>`,
		},
	],
	api: SURFACE_TOKENS.map(t => ({
		name: t.token,
		type: "var(--…)",
		default: '"none"',
		description: t.label,
	})),
};

const textDocs: EntryDocs = {
	import: 'import "@fraym/ui/theme.css";',
	anatomy: `<span className="text-fr-text">Foreground text</span>
<span className="text-fr-text-2">Secondary text</span>`,
	examples: [
		{
			label: "Text ramp",
			code: `<p className="text-fr-text">Primary — highest emphasis</p>
<p className="text-fr-text-2">Secondary — medium emphasis</p>
<p className="text-fr-text-3">Tertiary — low emphasis, hints</p>`,
		},
	],
	api: TEXT_TOKENS.map(t => ({
		name: t.token,
		type: "var(--…)",
		default: '"none"',
		description: t.label,
	})),
};

const stateDocs: EntryDocs = {
	import: 'import "@fraym/ui/theme.css";',
	anatomy: `<span className="text-fr-accent">Accent text</span>`,
	examples: [
		{
			label: "Semantic states",
			code: `<span className="text-fr-accent">Accent</span>
<span className="text-fr-add">Add / success</span>
<span className="text-fr-del">Delete / danger</span>
<span className="text-fr-warn">Warning</span>
<span className="text-fr-blue">Info / link</span>`,
		},
	],
	api: STATE_TOKENS.map(t => ({
		name: t.token,
		type: "var(--…)",
		default: '"none"',
		description: t.label,
	})),
};

const typographyDocs: EntryDocs = {
	import: 'import "@fraym/ui/fonts.css";',
	anatomy: `<span className="text-fr-sm font-secondary">UI text</span>`,
	examples: [
		{
			label: "Font families",
			code: `<span className="font-sans">IBM Plex Sans — UI labels, body text</span>
<span className="font-secondary">IBM Plex Mono — code, paths, metadata</span>`,
		},
		{
			label: "Type scale",
			code: `<span className="text-fr-2xl font-semibold tracking-tight">Display XL</span>
<span className="text-fr-lg font-medium">Heading LG</span>
<span className="text-fr-sm">Body SM</span>
<span className="font-secondary text-fr-2xs">Code XS</span>`,
		},
	],
	api: [
		{
			name: "font-sans",
			type: '"font-sans"',
			default: '"IBM Plex Sans"',
			description: "Primary UI font — IBM Plex Sans.",
		},
		{
			name: "font-secondary",
			type: '"font-secondary"',
			default: '"IBM Plex Mono"',
			description: "Monospace font for code, paths, metadata — IBM Plex Mono.",
		},
	],
};

export const tokensEntries: readonly ShowcaseEntry[] = [
	{ id: "surfaces", name: "Surfaces", Component: SurfacesEntry, docs: surfacesDocs },
	{ id: "text", name: "Text", Component: TextEntry, docs: textDocs },
	{ id: "state", name: "State & accent", Component: StateEntry, docs: stateDocs },
	{ id: "typography", name: "Typography", Component: TypographyEntry, docs: typographyDocs },
];

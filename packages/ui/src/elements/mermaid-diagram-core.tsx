"use client";

// We do NOT use streamdown's built-in mermaid plugin: it double-borders the
// diagram (CodeBlock chrome + zoom box) and caps the SVG tiny. This owns the whole
// presentation. Backed by the direct `mermaid` dependency because this package
// dynamically imports it at runtime.
//
// Theming: mermaid's stock "dark" theme is low-contrast on our surface (and its
// subgraph fill clashes), so we drive the "base" theme from the LIVE --fr-* tokens
// at render time. Mermaid fills must be opaque to stay legible over the chat
// surface, while themes (incl. translucent presets like Liquid Glass) may supply
// rgba tokens — so resolved colors are flattened against the canvas (--fr-bg).

import { type PointerEvent as ReactPointerEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons";
import { cn } from "../lib/cn";

interface MermaidApi {
	initialize: (config: Record<string, unknown>) => void;
	render: (id: string, source: string) => Promise<{ svg: string }>;
}

type Rgb = readonly [number, number, number];

function parseColor(value: string): { readonly rgb: Rgb; readonly alpha: number } | null {
	const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(value);
	if (!m) return null;
	const raw = m[4];
	const alpha = raw === undefined ? 1 : raw.endsWith("%") ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw);
	return {
		rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
		alpha: Number.isNaN(alpha) ? 1 : alpha,
	};
}

function toHex(rgb: Rgb): string {
	return `#${rgb
		.map(channel =>
			Math.round(Math.min(255, Math.max(0, channel)))
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
}

/** Resolve a token to a solid hex by compositing any alpha over the canvas. */
function flattenOver(value: string, canvas: Rgb): string {
	const parsed = parseColor(value);
	if (!parsed) return value;
	if (parsed.alpha >= 1) return toHex(parsed.rgb);
	const blend = (i: 0 | 1 | 2) => parsed.rgb[i] * parsed.alpha + canvas[i] * (1 - parsed.alpha);
	return toHex([blend(0), blend(1), blend(2)]);
}

/** Read the LIVE Fraym tokens (theme presets apply inline rgba/hex vars on :root). */
function liveThemeVariables(): Record<string, unknown> {
	const probe = document.createElement("span");
	probe.style.display = "none";
	document.body.appendChild(probe);
	const token = (name: string): string => {
		probe.style.color = `var(${name})`;
		return window.getComputedStyle(probe).color;
	};
	const darkMode = document.documentElement.getAttribute("data-theme") !== "light";
	// Composite --fr-bg over an OPAQUE base so a translucent surface (e.g. the
	// Aether chat, which sets --fr-bg: transparent) never resolves the canvas to
	// pure black — that would flatten every translucent node/border to near-black.
	const base: Rgb = darkMode ? [11, 11, 13] : [251, 251, 250];
	const bg = parseColor(token("--fr-bg"));
	const canvas: Rgb = !bg
		? base
		: bg.alpha >= 1
			? bg.rgb
			: [
					bg.rgb[0] * bg.alpha + base[0] * (1 - bg.alpha),
					bg.rgb[1] * bg.alpha + base[1] * (1 - bg.alpha),
					bg.rgb[2] * bg.alpha + base[2] * (1 - bg.alpha),
				];
	const solid = (name: string) => flattenOver(token(name), canvas);
	const vars = {
		darkMode,
		background: "transparent",
		fontFamily: "inherit",
		fontSize: "14px",
		primaryColor: solid("--fr-surface-2"),
		mainBkg: solid("--fr-surface-2"),
		secondaryColor: solid("--fr-surface-3"),
		tertiaryColor: solid("--fr-surface"),
		// A visible outline carries the node: on translucent themes the fill ≈ the
		// canvas, so the border (not the fill) is what makes a node legible. --fr-border
		// is ~invisible there; the muted text tier reads as a clean hairline anywhere.
		primaryBorderColor: solid("--fr-text-3-base"),
		nodeBorder: solid("--fr-text-3-base"),
		primaryTextColor: solid("--fr-text"),
		secondaryTextColor: solid("--fr-text"),
		tertiaryTextColor: solid("--fr-text-2-base"),
		textColor: solid("--fr-text"),
		titleColor: solid("--fr-text"),
		nodeTextColor: solid("--fr-text"),
		lineColor: solid("--fr-text-3-base"),
		edgeLabelBackground: solid("--fr-surface"),
		// A subgraph reads as a RAISED panel; --fr-rail is darker than the canvas in
		// the default dark theme, which inverts the grouping into a dark hole.
		clusterBkg: solid("--fr-surface"),
		clusterBorder: solid("--fr-border"),
	};
	probe.remove();
	return vars;
}

let loaded: Promise<MermaidApi> | null = null;

function ensureMermaid(): Promise<MermaidApi> {
	if (!loaded) {
		loaded = import("mermaid").then(mod => mod.default as unknown as MermaidApi);
	}
	return loaded;
}

// Inline: center the diagram at its natural size when it fits, otherwise shrink it
// to the column width. Popup: natural size, scrollable, for reading.
const SVG_FIT = "[&_svg]:block [&_svg]:h-auto [&_svg]:!w-auto [&_svg]:!max-w-full";
const SVG_NATURAL = "[&_svg]:h-auto [&_svg]:!w-auto [&_svg]:!max-w-none";

// Single unsafe-HTML sink for mermaid output (rendered with securityLevel "strict").
function dangerousSvg(html: string) {
	return { dangerouslySetInnerHTML: { __html: html } };
}

export function MermaidDiagram({ code, className }: { readonly code: string; readonly className?: string }) {
	const [rendered, setRendered] = useState<{
		readonly key: string;
		readonly svg: string | null;
		readonly error: string | null;
	} | null>(null);
	const [open, setOpen] = useState(false);
	const idBase = `fr-mmd-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	const renderKey = `${idBase}:${code}`;
	const currentRender = rendered?.key === renderKey ? rendered : null;
	const svg = currentRender?.svg ?? null;
	const error = currentRender?.error ?? null;
	const scrollRef = useRef<HTMLDivElement>(null);
	const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

	const onPanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
		const el = scrollRef.current;
		if (!el) return;
		panRef.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
		el.setPointerCapture?.(event.pointerId);
	};
	const onPanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const el = scrollRef.current;
		const pan = panRef.current;
		if (!el || !pan) return;
		el.scrollLeft = pan.left - (event.clientX - pan.x);
		el.scrollTop = pan.top - (event.clientY - pan.y);
	};
	const onPanEnd = () => {
		panRef.current = null;
	};

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const mermaid = await ensureMermaid();
				// Re-initialize per render so diagrams pick up the CURRENT theme
				// preset/mode (tokens are read live; initialize merges config).
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: "strict",
					theme: "base",
					themeVariables: liveThemeVariables(),
					flowchart: { useMaxWidth: false, htmlLabels: true },
				});
				const { svg: out } = await mermaid.render(idBase, code);
				if (!cancelled) setRendered({ key: renderKey, svg: out, error: null });
			} catch (err) {
				if (!cancelled)
					setRendered({ key: renderKey, svg: null, error: err instanceof Error ? err.message : String(err) });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [code, idBase, renderKey]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.isComposing) return;
			event.preventDefault();
			setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

	if (error) {
		return (
			<div data-slot="mermaid-diagram" className={cn("my-2 rounded-[8px] bg-fr-surface-2 px-3 py-2", className)}>
				<div className="mb-1 text-fr-xs text-fr-del">Mermaid render failed: {error}</div>
				<pre className="m-0 overflow-x-auto whitespace-pre font-secondary text-fr-xs text-fr-text-2">{code}</pre>
			</div>
		);
	}

	if (!svg) {
		return (
			<div
				data-slot="mermaid-diagram"
				className={cn("my-2 h-20 animate-[fr-soft-fade_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-[8px] bg-fr-surface-2", className)}
				aria-label="Rendering diagram…"
			/>
		);
	}

	return (
		<>
			<div data-slot="mermaid-diagram" className={cn("group relative my-2", className)}>
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-[6px] border border-fr-border bg-fr-surface-2/90 px-2 py-1 text-fr-2xs text-fr-text-2 backdrop-blur transition-colors hover:text-fr-text"
				>
					<Icon name="maximize" size={12} strokeWidth={1.8} />
					Expand
				</button>
				<div
					className={cn("grid max-h-[340px] min-h-[120px] place-items-center overflow-auto", SVG_FIT)}
					{...dangerousSvg(svg)}
				/>
			</div>
			{open && typeof document !== "undefined"
				? createPortal(
						<div
							data-slot="mermaid-lightbox"
							onClick={() => setOpen(false)}
							className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
						>
							<button
								type="button"
								onClick={() => setOpen(false)}
								aria-label="Close"
								className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
							>
								<Icon name="x" size={18} strokeWidth={2} />
							</button>
							<div
								ref={scrollRef}
								onClick={event => event.stopPropagation()}
								onPointerDown={onPanStart}
								onPointerMove={onPanMove}
								onPointerUp={onPanEnd}
								onPointerCancel={onPanEnd}
								className={cn(
									"h-[92vh] w-[96vw] cursor-grab touch-none overflow-auto rounded-[10px] bg-fr-surface p-6 active:cursor-grabbing",
									SVG_NATURAL,
								)}
								{...dangerousSvg(svg.replaceAll(idBase, `${idBase}-zoom`))}
							/>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}

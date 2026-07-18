/**
 * ShaderBackground — the ONE WebGL host every Fraym shader background rides.
 * An effect (aurora, rays, galaxy, …) is just a fragment shader + uniforms;
 * this host owns everything else, so every background gets the house
 * lifecycle for free and none of them reimplements it:
 *
 * - Fullscreen-triangle raw WebGL1 (zero dependencies), transparent canvas
 *   with premultiplied-alpha blending — effects are ADDITIVE LIGHT over the
 *   caller's surface, which is what makes them theme-native: the page keeps
 *   `bg-fr-bg`, the glow reads on light AND dark.
 * - Pauses off-screen (IntersectionObserver) and on hidden tabs
 *   (visibilitychange); ~`fps` cap (default 30); DPR capped at 2 with an
 *   optional `renderScale` downsample for heavy shaders.
 * - Reduced motion (`prefers-reduced-motion` unless `data-fr-motion="full"`,
 *   or `data-fr-motion="reduced"`) renders ONE still frame — never a hole.
 * - ResizeObserver-kept `iResolution`; resolution-dependent uniforms are
 *   ALWAYS primed on (re)size (a remount reuses a sized canvas — a
 *   changed-only guard would leave them zeroed).
 * - Optional smoothed pointer (`iMouse`, 0..1, y-up) for effects that follow
 *   the cursor; window-level listener, exponential smoothing, no React state.
 * - WEBGL_lose_context + listener cleanup on unmount.
 *
 * Reserved uniforms the host feeds every frame: `iTime` (seconds) and
 * `iResolution` (drawing-buffer px, vec2). Everything else arrives via
 * `uniforms` (rebuilt when the object identity changes) or `onFrame`.
 *
 * Colors: resolve CSS colors — INCLUDING `var(--fr-*)` tokens — with
 * {@link useCssColors}; resolution happens inside the themed tree and
 * re-resolves when the document theme attributes change, so token-fed
 * backgrounds retint on theme/accent switches without a remount.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

/** A uniform value: float, vecN (2/3/4), or an int flag. */
export type ShaderUniformValue = number | readonly number[] | Float32Array;

export interface ShaderBackgroundProps {
	/** GLSL ES 1.00 fragment source. `precision highp float;` is prepended. */
	readonly fragment: string;
	/** Effect uniforms (name → value). Rebound when the object identity changes. */
	readonly uniforms: Readonly<Record<string, ShaderUniformValue>>;
	/** Per-frame hook for time-driven uniforms beyond iTime. */
	readonly onFrame?: (set: (name: string, value: ShaderUniformValue) => void, timeSeconds: number) => void;
	/** Feed a smoothed 0..1 pointer (y-up) into this vec2 uniform (e.g. "iMouse"). */
	readonly mouseUniform?: string | undefined;
	/** Pointer smoothing factor per frame (0..1, higher = snappier). Default 0.08. */
	readonly mouseSmoothing?: number;
	/** Frame cap. Default 30 — these are backdrops, not games. */
	readonly fps?: number | undefined;
	/** Backing-store downsample (0.4..1). Default 1. */
	readonly renderScale?: number | undefined;
	/** data-slot identity for the host div (default "shader-background"). */
	readonly slot?: string;
	readonly className?: string | undefined;
}

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
	vUv = position * 0.5 + 0.5;
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

function motionReduced(): boolean {
	const forced = document.documentElement.getAttribute("data-fr-motion");
	if (forced === "full") return false;
	if (forced === "reduced") return true;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		// A broken effect shader must never take the app down — log and bail to
		// a transparent (invisible) background.
		console.warn("[ShaderBackground] shader compile failed:", gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function applyUniform(gl: WebGLRenderingContext, location: WebGLUniformLocation, value: ShaderUniformValue): void {
	if (typeof value === "number") {
		gl.uniform1f(location, value);
		return;
	}
	const values = value instanceof Float32Array ? value : Float32Array.from(value);
	if (values.length === 2) gl.uniform2fv(location, values);
	else if (values.length === 3) gl.uniform3fv(location, values);
	else if (values.length === 4) gl.uniform4fv(location, values);
	else console.warn("[ShaderBackground] unsupported uniform length:", values.length);
}

export function ShaderBackground({
	fragment,
	uniforms,
	onFrame,
	mouseUniform,
	mouseSmoothing = 0.08,
	fps = 30,
	renderScale = 1,
	slot,
	className,
}: ShaderBackgroundProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	// Live refs so per-frame reads never force an effect rebuild.
	const uniformsRef = useRef(uniforms);
	uniformsRef.current = uniforms;
	const onFrameRef = useRef(onFrame);
	onFrameRef.current = onFrame;

	// biome-ignore lint/correctness/useExhaustiveDependencies: `uniforms` is intentionally a dependency so the whole WebGL pipeline is torn down and re-run (re-binding via bindAll, which reads uniformsRef.current) when the uniforms OBJECT IDENTITY changes. Per-frame reads go through uniformsRef; static uniforms are only bound at setup/resize, so dropping this dep would stop uniform updates from applying.
	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		const canvas = document.createElement("canvas");
		canvas.style.position = "absolute";
		canvas.style.inset = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.display = "block";
		host.appendChild(canvas);

		const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
		if (!gl) {
			host.removeChild(canvas);
			return;
		}
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX);
		const fs = compileShader(gl, gl.FRAGMENT_SHADER, `precision highp float;\n${fragment}`);
		const program = gl.createProgram();
		if (!vs || !fs || !program) {
			host.removeChild(canvas);
			return;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.warn("[ShaderBackground] program link failed:", gl.getProgramInfoLog(program));
			host.removeChild(canvas);
			return;
		}
		// biome-ignore lint/correctness/useHookAtTopLevel: `gl.useProgram` is a WebGL1 rendering-context method, not a React hook — the `use` prefix is a false positive.
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const positionLoc = gl.getAttribLocation(program, "position");
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		const locations = new Map<string, WebGLUniformLocation | null>();
		const locate = (name: string): WebGLUniformLocation | null => {
			if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
			return locations.get(name) ?? null;
		};
		const setUniform = (name: string, value: ShaderUniformValue) => {
			const location = locate(name);
			if (location) applyUniform(gl, location, value);
		};
		const bindAll = () => {
			for (const [name, value] of Object.entries(uniformsRef.current)) setUniform(name, value);
		};
		bindAll();

		const dpr = Math.min(2, window.devicePixelRatio || 1) * Math.min(1, Math.max(0.4, renderScale));
		const resize = () => {
			const w = Math.max(1, Math.round((host.clientWidth || 1) * dpr));
			const h = Math.max(1, Math.round((host.clientHeight || 1) * dpr));
			canvas.width = w;
			canvas.height = h;
			gl.viewport(0, 0, w, h);
			// ALWAYS primed on (re)size, never guarded — remount safety.
			setUniform("iResolution", [w, h]);
			bindAll();
			if (reduced) renderFrame(lastTime);
		};

		const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
		const onPointer = (event: PointerEvent) => {
			const rect = host.getBoundingClientRect();
			if (rect.width < 1 || rect.height < 1) return;
			mouse.tx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
			mouse.ty = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
		};
		if (mouseUniform) window.addEventListener("pointermove", onPointer, { passive: true });

		const frameMs = 1000 / Math.max(1, fps);
		const t0 = performance.now();
		let raf = 0;
		let lastPaint = 0;
		let lastTime = 0;
		let visible = document.visibilityState === "visible";
		let shown = true;
		const reduced = motionReduced();

		const renderFrame = (time: number) => {
			setUniform("iTime", time);
			if (mouseUniform) {
				mouse.x += (mouse.tx - mouse.x) * mouseSmoothing;
				mouse.y += (mouse.ty - mouse.y) * mouseSmoothing;
				setUniform(mouseUniform, [mouse.x, mouse.y]);
			}
			onFrameRef.current?.(setUniform, time);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const tick = (now: number) => {
			raf = 0;
			if (!visible || !shown) return;
			if (now - lastPaint >= frameMs) {
				lastPaint = now;
				lastTime = (now - t0) * 0.001;
				renderFrame(lastTime);
			}
			raf = requestAnimationFrame(tick);
		};
		const start = () => {
			if (reduced || raf) return;
			raf = requestAnimationFrame(tick);
		};
		const stop = () => {
			if (!raf) return;
			cancelAnimationFrame(raf);
			raf = 0;
		};

		const io = new IntersectionObserver(entries => {
			shown = entries.some(entry => entry.isIntersecting);
			if (shown) start();
			else stop();
		});
		io.observe(host);
		const onVisibility = () => {
			visible = document.visibilityState === "visible";
			if (visible) start();
			else stop();
		};
		document.addEventListener("visibilitychange", onVisibility);
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(host);

		resize();
		if (reduced) renderFrame(0);
		else start();

		return () => {
			stop();
			io.disconnect();
			resizeObserver.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			if (mouseUniform) window.removeEventListener("pointermove", onPointer);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
			if (canvas.parentElement === host) host.removeChild(canvas);
		};
	}, [fragment, uniforms, mouseUniform, mouseSmoothing, fps, renderScale]);

	return (
		<div
			ref={hostRef}
			aria-hidden
			data-slot={slot ?? "shader-background"}
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
		/>
	);
}

// ── Token-aware color resolution ─────────────────────────────────────────────

/** Parse "rgb(a)(r, g, b[, a])" into normalized [r, g, b]. */
function parseComputedRgb(computed: string): readonly [number, number, number] {
	const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(computed);
	if (!match) return [1, 1, 1];
	return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}

/**
 * Resolve CSS colors — hex, rgb/hsl, named, AND `var(--fr-*)` tokens — into
 * normalized RGB triples, from INSIDE the themed tree (a hidden probe span),
 * re-resolving when the document theme/accent attributes change. Returns a
 * stable array identity per resolution so it can key uniform rebuilds.
 */
export function useCssColors(colors: readonly string[]): readonly (readonly [number, number, number])[] {
	const [resolved, setResolved] = useState<readonly (readonly [number, number, number])[]>(() =>
		colors.map(() => [1, 1, 1] as const),
	);
	const key = colors.join("|");
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed by the joined color list (colors.join) so it re-resolves on color-content change, not on caller array identity.
	useEffect(() => {
		const probe = document.createElement("span");
		probe.style.display = "none";
		document.body.appendChild(probe);
		const resolve = () => {
			setResolved(
				colors.map(color => {
					probe.style.color = color;
					return parseComputedRgb(getComputedStyle(probe).color);
				}),
			);
		};
		resolve();
		// Theme/accent swaps land as attribute flips on <html> (data-theme,
		// data-accent, class); re-resolve on any of them.
		const observer = new MutationObserver(resolve);
		observer.observe(document.documentElement, { attributes: true });
		return () => {
			observer.disconnect();
			probe.remove();
		};
	}, [key]);
	return resolved;
}

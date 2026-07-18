/**
 * PrismBackground — a glass prism refracting spectral light, as a reusable
 * Fraym background layer. Ported from react-bits' "Prism" (MIT,
 * https://reactbits.dev/backgrounds/prism) with the ogl dependency removed:
 * the same fragment shader (100-step raymarched anisotropic octahedron, tanh
 * tone-map, hue rotation) runs on a raw WebGL fullscreen triangle — zero new
 * dependencies, matching the house pattern for shader backdrops.
 *
 * House lifecycle, non-negotiable for every Fraym shader layer:
 * - Pauses off-screen (IntersectionObserver) and when the tab hides
 *   (visibilitychange); resumes where it left off.
 * - Reduced motion (`prefers-reduced-motion` unless `data-fr-motion="full"`,
 *   or `data-fr-motion="reduced"`) renders ONE static frame — the prism
 *   stands still instead of vanishing.
 * - DPR capped at 2 AND a `renderScale` downsample (default 0.75): the
 *   raymarch is heavy, the glow is soft, upscaling is invisible.
 * - Absolutely positioned; the caller supplies a `relative overflow-hidden`
 *   ancestor and layers content above (the StudioSmoke convention).
 */

import { useEffect, useRef } from "react";
import { cn } from "../lib/cn";

export interface PrismBackgroundProps {
	readonly className?: string;
	/** Prism height in scene units. */
	readonly height?: number;
	/** Prism base width in scene units. */
	readonly baseWidth?: number;
	/** Scene zoom: larger = closer prism. */
	readonly scale?: number;
	/** Beam glow multiplier. */
	readonly glow?: number;
	/** Film-grain strength (0 disables). */
	readonly noise?: number;
	/** Hue rotation in radians (bias the dispersion toward a brand hue). */
	readonly hueShift?: number;
	/** Spectral banding frequency. */
	readonly colorFrequency?: number;
	/** Bloom multiplier. */
	readonly bloom?: number;
	/** Animation speed (0 freezes). */
	readonly timeScale?: number;
	/** Pixel offset of the prism from center, in CSS px. */
	readonly offset?: { readonly x?: number; readonly y?: number };
	/** "rotate" = gentle base wobble (default) · "3drotate" = full tumble. */
	readonly animationType?: "rotate" | "3drotate";
	/** Backing-store downsample (0.4..1). Default 0.75. */
	readonly renderScale?: number;
}

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2  iResolution;
uniform float iTime;
uniform mat3  uRot;
uniform int   uUseBaseWobble;
uniform float uGlow;
uniform vec2  uOffsetPx;
uniform float uNoise;
uniform float uSaturation;
uniform float uHueShift;
uniform float uColorFreq;
uniform float uBloom;
uniform float uCenterShift;
uniform float uInvBaseHalf;
uniform float uInvHeight;
uniform float uMinAxis;
uniform float uPxScale;
uniform float uTimeScale;

vec4 tanh4(vec4 x){ vec4 e2x = exp(2.0*x); return (e2x - 1.0) / (e2x + 1.0); }
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123); }

float sdOctaAnisoInv(vec3 p){
	vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
	float m = q.x + q.y + q.z - 1.0;
	return m * uMinAxis * 0.5773502691896258;
}
float sdPyramidUpInv(vec3 p){
	float oct = sdOctaAnisoInv(p);
	return max(oct, -p.y);
}
mat3 hueRotation(float a){
	float c = cos(a), s = sin(a);
	mat3 W = mat3(0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114);
	mat3 U = mat3(0.701, -0.587, -0.114, -0.299, 0.413, -0.114, -0.300, -0.588, 0.886);
	mat3 V = mat3(0.168, -0.331, 0.500, 0.328, 0.035, -0.500, -0.497, 0.296, 0.201);
	return W + U * c + V * s;
}

void main(){
	vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;
	float z = 5.0;
	float d = 0.0;
	vec3 p;
	vec4 o = vec4(0.0);
	mat2 wob = mat2(1.0);
	if (uUseBaseWobble == 1) {
		float t = iTime * uTimeScale;
		float c0 = cos(t);
		float c1 = cos(t + 33.0);
		float c2 = cos(t + 11.0);
		wob = mat2(c0, c1, c2, c0);
	}
	const int STEPS = 100;
	for (int i = 0; i < STEPS; i++) {
		p = vec3(f, z);
		p.xz = p.xz * wob;
		p = uRot * p;
		vec3 q = p;
		q.y += uCenterShift;
		d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
		z -= d;
		o += (sin((p.y + z) * uColorFreq + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
	}
	o = tanh4(o * o * (uGlow * uBloom) / 1e5);
	vec3 col = o.rgb;
	float n = rand(gl_FragCoord.xy + vec2(iTime));
	col += (n - 0.5) * uNoise;
	col = clamp(col, 0.0, 1.0);
	float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
	col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);
	if (abs(uHueShift) > 0.0001) col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
	gl_FragColor = vec4(col, o.a);
}
`;

function motionReduced(): boolean {
	const forced = document.documentElement.getAttribute("data-fr-motion");
	if (forced === "full") return false;
	if (forced === "reduced") return true;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

/** Row-major Euler → column-major mat3 (matches the source's ogl layout). */
function setMat3FromEuler(yawY: number, pitchX: number, rollZ: number, out: Float32Array): Float32Array {
	const cy = Math.cos(yawY);
	const sy = Math.sin(yawY);
	const cx = Math.cos(pitchX);
	const sx = Math.sin(pitchX);
	const cz = Math.cos(rollZ);
	const sz = Math.sin(rollZ);
	out[0] = cy * cz + sy * sx * sz;
	out[1] = cx * sz;
	out[2] = -sy * cz + cy * sx * sz;
	out[3] = -cy * sz + sy * sx * cz;
	out[4] = cx * cz;
	out[5] = sy * sz + cy * sx * cz;
	out[6] = sy * cx;
	out[7] = -sx;
	out[8] = cy * cx;
	return out;
}

export function PrismBackground({
	className,
	height = 3.5,
	baseWidth = 5.5,
	scale = 3.6,
	glow = 1,
	noise = 0.3,
	hueShift = 0,
	colorFrequency = 1,
	bloom = 1,
	timeScale = 0.5,
	offset,
	animationType = "rotate",
	renderScale = 0.75,
}: PrismBackgroundProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);

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
		gl.disable(gl.BLEND);

		const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
		const program = gl.createProgram();
		if (!vs || !fs || !program) {
			host.removeChild(canvas);
			return;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			host.removeChild(canvas);
			return;
		}
		// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is the WebGL API (WebGLRenderingContext.useProgram), not a React hook — the use* name is coincidental.
		gl.useProgram(program);

		// Fullscreen triangle.
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const positionLoc = gl.getAttribLocation(program, "position");
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		const u = (name: string) => gl.getUniformLocation(program, name);
		const loc = {
			iResolution: u("iResolution"),
			iTime: u("iTime"),
			uRot: u("uRot"),
			uUseBaseWobble: u("uUseBaseWobble"),
			uGlow: u("uGlow"),
			uOffsetPx: u("uOffsetPx"),
			uNoise: u("uNoise"),
			uSaturation: u("uSaturation"),
			uHueShift: u("uHueShift"),
			uColorFreq: u("uColorFreq"),
			uBloom: u("uBloom"),
			uCenterShift: u("uCenterShift"),
			uInvBaseHalf: u("uInvBaseHalf"),
			uInvHeight: u("uInvHeight"),
			uMinAxis: u("uMinAxis"),
			uPxScale: u("uPxScale"),
			uTimeScale: u("uTimeScale"),
		};

		const H = Math.max(0.001, height);
		const BASE_HALF = Math.max(0.001, baseWidth) * 0.5;
		const SCALE = Math.max(0.001, scale);
		const TS = Math.max(0, timeScale);
		const offX = offset?.x ?? 0;
		const offY = offset?.y ?? 0;
		const dpr = Math.min(2, window.devicePixelRatio || 1) * Math.min(1, Math.max(0.4, renderScale));

		// Static uniforms (transparent canvas → the source's boosted saturation).
		gl.uniform1f(loc.uGlow, Math.max(0, glow));
		gl.uniform1f(loc.uNoise, Math.max(0, noise));
		gl.uniform1f(loc.uSaturation, 1.5);
		gl.uniform1f(loc.uHueShift, hueShift);
		gl.uniform1f(loc.uColorFreq, Math.max(0, colorFrequency));
		gl.uniform1f(loc.uBloom, Math.max(0, bloom));
		gl.uniform1f(loc.uCenterShift, H * 0.25);
		gl.uniform1f(loc.uInvBaseHalf, 1 / BASE_HALF);
		gl.uniform1f(loc.uInvHeight, 1 / H);
		gl.uniform1f(loc.uMinAxis, Math.min(BASE_HALF, H));
		gl.uniform1f(loc.uTimeScale, TS);
		gl.uniform1i(loc.uUseBaseWobble, animationType === "rotate" ? 1 : 0);

		const resize = () => {
			const w = Math.max(1, Math.round((host.clientWidth || 1) * dpr));
			const h = Math.max(1, Math.round((host.clientHeight || 1) * dpr));
			canvas.width = w;
			canvas.height = h;
			gl.viewport(0, 0, w, h);
			// ALWAYS prime resolution-dependent uniforms on (re)size — a remount
			// reuses a sized canvas, and a changed-only guard leaves them zeroed.
			gl.uniform2f(loc.iResolution, w, h);
			gl.uniform2f(loc.uOffsetPx, offX * dpr, offY * dpr);
			gl.uniform1f(loc.uPxScale, 1 / (h * 0.1 * SCALE));
		};
		const resizeObserver = new ResizeObserver(() => {
			resize();
			if (reduced) renderFrame(lastTime);
		});
		resizeObserver.observe(host);

		const rotBuf = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
		const wX = 0.3 + Math.random() * 0.6;
		const wY = 0.2 + Math.random() * 0.7;
		const wZ = 0.1 + Math.random() * 0.5;
		const phX = Math.random() * Math.PI * 2;
		const phZ = Math.random() * Math.PI * 2;

		const FRAME_MS = 33; // ~30fps: the wobble is slow, half rate is invisible.
		const t0 = performance.now();
		let raf = 0;
		let lastTime = 0;
		let lastPaint = 0;
		let visible = true;
		let shown = true;
		const reduced = motionReduced();

		const renderFrame = (time: number) => {
			gl.uniform1f(loc.iTime, time);
			if (animationType === "3drotate") {
				const t = time * TS;
				setMat3FromEuler(t * wY, Math.sin(t * wX + phX) * 0.6, Math.sin(t * wZ + phZ) * 0.5, rotBuf);
			}
			gl.uniformMatrix3fv(loc.uRot, false, rotBuf);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const tick = (now: number) => {
			raf = 0;
			if (!visible || !shown) return;
			if (now - lastPaint >= FRAME_MS) {
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

		resize();
		if (reduced)
			renderFrame(0); // one still frame, never a blank hole
		else start();

		return () => {
			stop();
			io.disconnect();
			resizeObserver.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
			if (canvas.parentElement === host) host.removeChild(canvas);
		};
	}, [
		height,
		baseWidth,
		scale,
		glow,
		noise,
		hueShift,
		colorFrequency,
		bloom,
		timeScale,
		offset?.x,
		offset?.y,
		animationType,
		renderScale,
	]);

	return (
		<div
			ref={hostRef}
			aria-hidden
			data-slot="prism-background"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
		/>
	);
}

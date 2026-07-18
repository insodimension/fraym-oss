// Liquid Glass — WebGL lens renderer.
//
// Adapted from `ogtirth/liquidglass-oss` (MIT). Departures from the upstream
// renderer, all to fit Fraym:
//   · The texture source is ALWAYS a live <canvas> (the procedural ambient
//     field), re-uploaded every frame — upstream's image/video URL loading and
//     its global `[data-liquid-glass-background]` querySelector are dropped.
//   · The background element (whose rect maps the field onto the viewport) is
//     passed explicitly, so multiple independent fields (e.g. a scoped showcase
//     stage + the app-wide backdrop) never collide.
//   · `setAnimating(false)` (reduced motion / field frozen) stops the per-frame
//     redraw — the lens then repaints only when it moves/resizes.
//
// One renderer == one <canvas> == one WebGL context. Contexts are scarce
// (~16/page), so callers mount lenses only on a bounded set of surfaces.

import type { LiquidGlassSettings } from "./settings";
import { fragmentShader, vertexShader } from "./shaders";

/** The shared ambient field a lens refracts. */
export interface LiquidGlassFieldSource {
	/** The live 2D canvas painted by the ambient field; uploaded as the lens texture each frame. */
	readonly canvas: HTMLCanvasElement;
	/** The full-bleed element whose client rect maps the field texture onto the viewport. */
	readonly backgroundEl: HTMLElement;
}

const UNIFORM_NAMES = [
	"u_bg",
	"u_res",
	"u_center",
	"u_size",
	"u_bgScale",
	"u_bgOffset",
	"u_blurAmount",
	"u_radius",
	"u_zRadius",
	"u_refract",
	"u_chroma",
	"u_edgeHL",
	"u_specular",
	"u_fresnel",
	"u_brightness",
	"u_saturation",
	"u_shadowAlpha",
	"u_shadowSpread",
	"u_darkTint",
	"u_bevelMode",
	"u_button",
	"u_pressed",
	"u_trackStart",
	"u_trackEnd",
	"u_trackY",
	"u_valueX",
	"u_distortion",
	"u_tintStrength",
	"u_opacity",
	"u_sampleBackground",
	"u_materialMorph",
	"u_tint",
	"u_tintColor",
	"u_trackBaseColor",
	"u_trackFillColor",
	"u_trackRadius",
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

export class LiquidGlassRenderer {
	private readonly gl: WebGLRenderingContext;
	private readonly uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;
	private readonly texture: WebGLTexture;
	private settings: LiquidGlassSettings;
	private center = { x: 0, y: 0 };
	private size: { width: number; height: number };
	private stretch = 0;
	private morph = 1;
	private materialMorph = 1;
	private pressed = false;
	private button = 0;
	// Track is a slider-only feature; park it far off-lens so its mask never paints.
	private track = { start: -1000, end: -900, y: -1000, value: -950, radius: 2.5 };
	private trackColors = {
		base: [0.5, 0.5, 0.5] as [number, number, number],
		fill: [0.9, 0.9, 0.9] as [number, number, number],
	};
	private animating = true;
	private disposed = false;
	private positionFrame = 0;
	private lastViewport = { width: 0, height: 0 };
	private lastScroll = { x: Number.NaN, y: Number.NaN };
	private lastRect = { left: Number.NaN, top: Number.NaN, width: Number.NaN, height: Number.NaN };

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly source: LiquidGlassFieldSource,
		settings: LiquidGlassSettings,
	) {
		const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
		if (!gl) throw new Error("Liquid Glass requires WebGL.");
		this.gl = gl;
		this.settings = settings;
		this.size = { width: settings.lensWidth, height: settings.lensHeight };

		const compile = (type: number, src: string): WebGLShader => {
			const shader = gl.createShader(type);
			if (!shader) throw new Error("Unable to create WebGL shader.");
			gl.shaderSource(shader, src);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				const stage = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
				throw new Error(gl.getShaderInfoLog(shader)?.trim() || `Liquid Glass ${stage} shader failed to compile.`);
			}
			return shader;
		};
		const program = gl.createProgram();
		if (!program) throw new Error("Unable to create WebGL program.");
		gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
		gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program) ?? "Liquid Glass shader link failed.");
		}
		// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL call, not a React hook.
		gl.useProgram(program);

		const quad = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const position = gl.getAttribLocation(program, "a_pos");
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

		for (const name of UNIFORM_NAMES) this.uniforms[name] = gl.getUniformLocation(program, name);

		const texture = gl.createTexture();
		if (!texture) throw new Error("Unable to create WebGL texture.");
		this.texture = texture;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(this.uniforms.u_bg, 0);
		// The lens always refracts the live field (Fraym has no solid-glass mode), so this flag stays 1
		// for the renderer's lifetime — set once here, not re-uploaded every frame.
		gl.uniform1f(this.uniforms.u_sampleBackground, 1);

		this.watchPosition();
	}

	private readonly watchPosition = (): void => {
		if (this.disposed) return;
		const rect = this.canvas.getBoundingClientRect();
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		const scroll = { x: window.scrollX, y: window.scrollY };
		const visible = rect.right > 0 && rect.bottom > 0 && rect.left < viewport.width && rect.top < viewport.height;
		const moved =
			Math.abs(rect.left - this.lastRect.left) > 0.05 ||
			Math.abs(rect.top - this.lastRect.top) > 0.05 ||
			Math.abs(rect.width - this.lastRect.width) > 0.05 ||
			Math.abs(rect.height - this.lastRect.height) > 0.05 ||
			Math.abs(scroll.x - this.lastScroll.x) > 0.05 ||
			Math.abs(scroll.y - this.lastScroll.y) > 0.05 ||
			viewport.width !== this.lastViewport.width ||
			viewport.height !== this.lastViewport.height;

		if (moved || (this.animating && visible)) {
			this.lastRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
			this.lastViewport = viewport;
			this.lastScroll = scroll;
			this.draw();
		}
		this.positionFrame = window.requestAnimationFrame(this.watchPosition);
	};

	setSettings(settings: LiquidGlassSettings): void {
		this.settings = settings;
		this.size = { width: settings.lensWidth, height: settings.lensHeight };
		this.draw();
	}

	setGeometry(
		x: number,
		y: number,
		stretch: number,
		pressed: boolean,
		morph = 1,
		materialMorph = 1,
		button = 0,
	): void {
		this.center = { x, y };
		this.stretch = stretch;
		this.pressed = pressed;
		this.button = button;
		this.morph = Math.max(0, Math.min(1, morph));
		this.materialMorph = Math.max(0, Math.min(1, materialMorph));
		this.draw();
	}

	/** Freeze (false) or resume (true) the per-frame redraw — wired to reduced motion / a paused field. */
	setAnimating(animating: boolean): void {
		this.animating = animating;
		if (!animating) this.draw();
	}

	resize(width: number, height: number): void {
		// Supersample small lenses so the rim/specular stay crisp; cap to keep fill cost bounded.
		const deviceScale = window.devicePixelRatio || 1;
		const supersample = height <= 80 ? 3 : height <= 140 ? 2.5 : 2;
		const renderScale = Math.min(4, Math.max(deviceScale, supersample));
		this.canvas.width = Math.max(1, Math.round(width * renderScale));
		this.canvas.height = Math.max(1, Math.round(height * renderScale));
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.draw();
	}

	dispose(): void {
		this.disposed = true;
		window.cancelAnimationFrame(this.positionFrame);
		this.gl.deleteTexture(this.texture);
		this.gl.clearColor(0, 0, 0, 0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.getExtension("WEBGL_lose_context")?.loseContext();
	}

	draw(): void {
		if (this.disposed) return;
		const gl = this.gl;
		const canvas = this.canvas;
		const s = this.settings;
		const field = this.source.canvas;
		if (field.width === 0 || field.height === 0 || canvas.width === 0) return;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);

		const dpr = canvas.width / Math.max(1, canvas.clientWidth);
		const rect = canvas.getBoundingClientRect();
		const bgRect = this.source.backgroundEl.getBoundingClientRect();
		const viewportWidth = Math.max(1, bgRect.width);
		const viewportHeight = Math.max(1, bgRect.height);
		// "cover"-fit the field texture into the background element's rect.
		const imageRatio = field.width / field.height;
		const viewRatio = viewportWidth / viewportHeight;
		const cover =
			imageRatio > viewRatio
				? { sx: viewRatio / imageRatio, sy: 1, ox: (1 - viewRatio / imageRatio) / 2, oy: 0 }
				: { sx: 1, sy: imageRatio / viewRatio, ox: 0, oy: (1 - imageRatio / viewRatio) / 2 };
		const localScaleX = rect.width / viewportWidth;
		const localScaleY = rect.height / viewportHeight;
		const localOffsetX = (rect.left - bgRect.left) / viewportWidth;
		const localOffsetY = (bgRect.bottom - rect.bottom) / viewportHeight;

		const restingWidth = this.button > 0.5 ? 36 : 34;
		const restingHeight = this.button > 0.5 ? 24 : 22;
		const baseWidth = restingWidth + (this.size.width - restingWidth) * this.morph;
		const baseHeight = restingHeight + (this.size.height - restingHeight) * this.morph;
		const width = baseWidth * (1 + this.stretch);
		const height = baseHeight * (1 - this.stretch * 0.48);

		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		// No GL blend: one quad, no overdraw — the straight-alpha fragment composites with the page.

		gl.uniform2f(this.uniforms.u_res, canvas.width, canvas.height);
		gl.uniform2f(this.uniforms.u_center, this.center.x * dpr, this.center.y * dpr);
		gl.uniform2f(this.uniforms.u_size, width * dpr, height * dpr);
		gl.uniform2f(this.uniforms.u_bgScale, localScaleX * cover.sx, localScaleY * cover.sy);
		gl.uniform2f(this.uniforms.u_bgOffset, localOffsetX * cover.sx + cover.ox, localOffsetY * cover.sy + cover.oy);
		gl.uniform1f(this.uniforms.u_blurAmount, s.blur);
		gl.uniform1f(this.uniforms.u_radius, Math.min(s.radius, height * 0.5) * dpr);
		gl.uniform1f(this.uniforms.u_zRadius, s.depth * dpr);
		gl.uniform1f(this.uniforms.u_refract, s.refraction);
		gl.uniform1f(this.uniforms.u_chroma, s.chromaticAberration);
		gl.uniform1f(this.uniforms.u_edgeHL, s.edgeHighlight);
		gl.uniform1f(this.uniforms.u_specular, s.specular);
		gl.uniform1f(this.uniforms.u_fresnel, s.fresnel);
		gl.uniform1f(this.uniforms.u_brightness, s.brightness);
		gl.uniform1f(this.uniforms.u_saturation, s.saturation);
		gl.uniform1f(this.uniforms.u_shadowAlpha, s.shadow);
		gl.uniform1f(this.uniforms.u_shadowSpread, (12 + s.shadow * 18) * dpr);
		gl.uniform1f(this.uniforms.u_darkTint, s.darkTint);
		gl.uniform1f(this.uniforms.u_distortion, s.distortion);
		gl.uniform1f(this.uniforms.u_tintStrength, s.tintStrength);
		gl.uniform1f(this.uniforms.u_tint, s.tint);
		gl.uniform3f(this.uniforms.u_tintColor, s.tintColor[0], s.tintColor[1], s.tintColor[2]);
		gl.uniform1f(this.uniforms.u_materialMorph, this.materialMorph);
		gl.uniform3f(
			this.uniforms.u_trackBaseColor,
			this.trackColors.base[0],
			this.trackColors.base[1],
			this.trackColors.base[2],
		);
		gl.uniform3f(
			this.uniforms.u_trackFillColor,
			this.trackColors.fill[0],
			this.trackColors.fill[1],
			this.trackColors.fill[2],
		);
		gl.uniform1f(this.uniforms.u_bevelMode, s.bevel);
		gl.uniform1f(this.uniforms.u_button, this.button);
		gl.uniform1f(this.uniforms.u_pressed, this.pressed ? 1 : 0);
		gl.uniform1f(this.uniforms.u_trackStart, this.track.start * dpr);
		gl.uniform1f(this.uniforms.u_trackEnd, this.track.end * dpr);
		gl.uniform1f(this.uniforms.u_trackY, this.track.y * dpr);
		gl.uniform1f(this.uniforms.u_valueX, this.track.value * dpr);
		gl.uniform1f(this.uniforms.u_trackRadius, this.track.radius * dpr);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
}

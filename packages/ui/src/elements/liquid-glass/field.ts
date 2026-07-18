// Liquid Glass — procedural ambient field.
//
// A 2D-canvas animator that paints a slow MONOCHROME aurora: drifting silver
// light pools on near-black (dark) or soft graphite clouds on pale silver
// (light). This canvas is BOTH the visible app background AND the texture every
// WebGL lens refracts — so the glass has living light to bend, with no shipped
// wallpaper asset. Pure luminance, no hue (an optional faint accent wash aside),
// to stay on Fraym's monochrome liquid-glass identity.
//
// Backing store is rendered below CSS size (the field is always seen through
// blur/refraction, so softness is free) to keep per-frame paint + the lens
// texture upload cheap.

export type LiquidGlassTone = "dark" | "light";

/** Ambient field brightness: "deep" = darker base + dimmer pools; "bright" = luminous silver. */
export type LiquidGlassIntensity = "deep" | "bright";

export interface LiquidGlassFieldOptions {
	readonly tone: LiquidGlassTone;
	/** Field brightness. Default "bright". */
	readonly intensity?: LiquidGlassIntensity;
	/** Optional accent, linear 0..1 RGB, lightly washed into the pools for identity. */
	readonly accent?: readonly [number, number, number];
}

interface Blob {
	readonly cx: number;
	readonly cy: number;
	readonly rangeX: number;
	readonly rangeY: number;
	readonly radius: number;
	readonly speed: number;
	readonly phase: number;
	readonly level: number;
}

// Authored in normalized [0..1] space, scaled to the backing store at paint time.
const BLOBS: readonly Blob[] = [
	{ cx: 0.2, cy: 0.22, rangeX: 0.1, rangeY: 0.08, radius: 0.5, speed: 0.05, phase: 0.0, level: 1.0 },
	{ cx: 0.82, cy: 0.14, rangeX: 0.09, rangeY: 0.07, radius: 0.42, speed: 0.043, phase: 1.7, level: 0.74 },
	{ cx: 0.62, cy: 0.4, rangeX: 0.12, rangeY: 0.1, radius: 0.4, speed: 0.037, phase: 3.1, level: 0.5 },
	{ cx: 0.34, cy: 0.66, rangeX: 0.11, rangeY: 0.09, radius: 0.46, speed: 0.031, phase: 4.6, level: 0.62 },
	{ cx: 0.78, cy: 0.74, rangeX: 0.1, rangeY: 0.11, radius: 0.38, speed: 0.047, phase: 5.9, level: 0.44 },
];

const MAX_BACKING_LONG_EDGE = 768;
const BACKING_SCALE = 0.6;

export class LiquidGlassField {
	private readonly ctx: CanvasRenderingContext2D;
	private options: LiquidGlassFieldOptions;
	private frame = 0;
	private running = false;
	private startTime = 0;
	private frozenAt = 0;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		options: LiquidGlassFieldOptions,
	) {
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Liquid Glass field requires a 2D canvas context.");
		this.ctx = ctx;
		this.options = options;
	}

	setOptions(options: LiquidGlassFieldOptions): void {
		this.options = options;
		this.paint(this.now());
	}

	resize(cssWidth: number, cssHeight: number): void {
		if (cssWidth <= 0 || cssHeight <= 0) return;
		const longEdge = Math.max(cssWidth, cssHeight);
		const scale = Math.min(BACKING_SCALE, MAX_BACKING_LONG_EDGE / longEdge);
		this.canvas.width = Math.max(2, Math.round(cssWidth * scale));
		this.canvas.height = Math.max(2, Math.round(cssHeight * scale));
		this.paint(this.now());
	}

	/** Run the drift animation. */
	start(): void {
		if (this.running) return;
		this.running = true;
		this.startTime = performance.now() - this.frozenAt;
		const loop = (): void => {
			if (!this.running) return;
			this.paint(this.now());
			this.frame = window.requestAnimationFrame(loop);
		};
		this.frame = window.requestAnimationFrame(loop);
	}

	/** Freeze on the current frame (reduced motion). The field stays painted; it just stops drifting. */
	stop(): void {
		if (!this.running) return;
		this.running = false;
		this.frozenAt = this.now();
		window.cancelAnimationFrame(this.frame);
	}

	destroy(): void {
		this.running = false;
		window.cancelAnimationFrame(this.frame);
	}

	private now(): number {
		return this.running ? performance.now() - this.startTime : this.frozenAt;
	}

	private paint(elapsedMs: number): void {
		const ctx = this.ctx;
		const canvas = this.canvas;
		if (canvas.width === 0 || canvas.height === 0) return;
		const w = canvas.width;
		const h = canvas.height;
		const t = elapsedMs / 1000;
		const light = this.options.tone === "light";
		const deep = this.options.intensity === "deep";

		ctx.globalCompositeOperation = "source-over";
		ctx.fillStyle = light ? "#e7e7ea" : deep ? "#050507" : "#0a0a10";
		ctx.fillRect(0, 0, w, h);

		// Dark: pools ADD silver light. Light: clouds are translucent graphite drifting over the field.
		ctx.globalCompositeOperation = light ? "source-over" : "lighter";
		const accent = this.options.accent;
		const span = Math.max(w, h);
		for (const blob of BLOBS) {
			const cx = (blob.cx + Math.sin(t * blob.speed * Math.PI * 2 + blob.phase) * blob.rangeX) * w;
			const cy = (blob.cy + Math.cos(t * blob.speed * Math.PI * 2 + blob.phase * 0.7) * blob.rangeY) * h;
			const r = blob.radius * span * (0.92 + 0.08 * Math.sin(t * blob.speed * Math.PI * 4 + blob.phase));
			const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
			if (light) {
				// Graphite cloud — darkens the silver field, with a faint accent wash.
				const a = blob.level * 0.16;
				const tint = accent
					? `rgba(${Math.round(accent[0] * 90)}, ${Math.round(accent[1] * 90)}, ${Math.round(accent[2] * 90)}, ${a})`
					: `rgba(70, 70, 78, ${a})`;
				grad.addColorStop(0, tint);
				grad.addColorStop(1, "rgba(70, 70, 78, 0)");
			} else {
				// Silver light pool — accent-washed toward the core, fading to nothing.
				const a = blob.level * (deep ? 0.26 : 0.4);
				const core = accent
					? `rgba(${Math.round(180 + accent[0] * 75)}, ${Math.round(180 + accent[1] * 75)}, ${Math.round(190 + accent[2] * 65)}, ${a})`
					: `rgba(216, 220, 234, ${a})`;
				grad.addColorStop(0, core);
				grad.addColorStop(1, "rgba(216, 220, 234, 0)");
			}
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, w, h);
		}
		ctx.globalCompositeOperation = "source-over";
	}
}

import { AETHR_STATES, type AethrParams, type AethrState } from "./states";
import { THEMES } from "./themes";
export type NebulaVariantName = "supernova" | "smoke";
export interface AethrOptions {
  state?: AethrState;
  variant?: NebulaVariantName;
  growth?: number;
  recede?: number;
  fpsCap?: number;
  renderScale?: number;
  maxPixelRatio?: number;
  zoom?: number;
}
const css = (rgb: readonly [number, number, number], alpha = 1) =>
  `rgba(${rgb.map((value) => Math.round(value * 255)).join(",")},${alpha})`;
export class AethrEngine {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D | null;
  #params: AethrParams;
  #growth: number;
  #recede: number;
  #fps: number;
  #variant: NebulaVariantName;
  #raf = 0;
  #running = false;
  #last = 0;
  #time = 0;
  #flare = 0;
  constructor(canvas: HTMLCanvasElement, options: AethrOptions = {}) {
    this.#canvas = canvas;
    this.#context = canvas.getContext("2d");
    this.#params = { ...AETHR_STATES[options.state ?? "idle"] };
    this.#growth = options.growth ?? 1;
    this.#recede = options.recede ?? 0;
    this.#fps = options.fpsCap ?? 30;
    this.#variant = options.variant ?? "supernova";
  }
  setFpsCap(fps: number): void {
    this.#fps = Math.max(1, fps);
  }
  setState(state: AethrState): void {
    this.#params = { ...AETHR_STATES[state] };
    this.#flare = Math.max(this.#flare, this.#params.flare ?? 0);
  }
  setGrowth(value: number): void {
    this.#growth = Math.min(1, Math.max(0, value));
  }
  setRecede(value: number): void {
    this.#recede = Math.min(1, Math.max(0, value));
  }
  setParams(value: Partial<AethrParams>): void {
    this.#params = { ...this.#params, ...value };
    this.#flare = Math.max(this.#flare, value.flare ?? 0);
  }
  resize(): void {
    const host = this.#canvas.parentElement;
    const width = host?.clientWidth || this.#canvas.clientWidth || 1;
    const height = host?.clientHeight || this.#canvas.clientHeight || 1;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    this.#canvas.width = Math.round(width * ratio);
    this.#canvas.height = Math.round(height * ratio);
  }
  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#last = performance.now();
    this.resize();
    this.#raf = requestAnimationFrame(this.#tick);
  }
  stop(): void {
    this.#running = false;
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }
  dispose(): void {
    this.stop();
    this.#context?.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }
  #tick = (now: number): void => {
    if (!this.#running) return;
    this.#raf = requestAnimationFrame(this.#tick);
    const interval = 1000 / this.#fps;
    if (now - this.#last < interval) return;
    const dt = Math.min(0.1, (now - this.#last) / 1000);
    this.#last = now;
    this.#time += dt;
    this.#flare = Math.max(0, this.#flare - dt * 1.1);
    this.#draw();
  };
  #draw(): void {
    const ctx = this.#context;
    if (!ctx) return;
    const w = this.#canvas.width,
      h = this.#canvas.height,
      params = this.#params,
      colors = THEMES[params.theme],
      breath = (Math.sin(this.#time * params.breathSpeed) + 1) / 2,
      presence = this.#growth * (1 - this.#recede),
      radius =
        Math.min(w, h) *
        (0.08 + 0.32 * presence) *
        (1 + breath * params.breathDepth);
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      radius * (this.#variant === "smoke" ? 1.5 : 1),
    );
    gradient.addColorStop(0, css(colors.glowColor, 0.7 + this.#flare));
    gradient.addColorStop(0.28, css(colors.baseColor, 0.5));
    gradient.addColorStop(0.62, css(colors.accentColor, 0.24));
    gradient.addColorStop(1, css(colors.edgeColor, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
}
export type { AethrState } from "./states";
export type { ThemeName } from "./themes";

export type LiquidGlassTone = "dark" | "light";
export type LiquidGlassIntensity = "deep" | "bright";
export interface LiquidGlassFieldOptions { readonly tone: LiquidGlassTone; readonly intensity?: LiquidGlassIntensity; readonly accent?: readonly [number, number, number] }

const pools = [
  [.2, .22, .5, .05, 0, 1], [.82, .14, .42, .043, 1.7, .74], [.62, .4, .4, .037, 3.1, .5],
  [.34, .66, .46, .031, 4.6, .62], [.78, .74, .38, .047, 5.9, .44],
] as const;

export class LiquidGlassField {
  private readonly context: CanvasRenderingContext2D;
  private options: LiquidGlassFieldOptions;
  private frame = 0;
  private running = false;
  private origin = 0;
  private elapsed = 0;

  constructor(private readonly canvas: HTMLCanvasElement, options: LiquidGlassFieldOptions) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Liquid glass needs a 2D canvas context.");
    this.context = context;
    this.options = options;
  }
  setOptions(options: LiquidGlassFieldOptions) { this.options = options; this.paint(this.time()); }
  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    const scale = Math.min(.6, 768 / Math.max(width, height));
    this.canvas.width = Math.max(2, Math.round(width * scale));
    this.canvas.height = Math.max(2, Math.round(height * scale));
    this.paint(this.time());
  }
  start() {
    if (this.running) return;
    this.running = true; this.origin = performance.now() - this.elapsed;
    const tick = () => { if (!this.running) return; this.paint(this.time()); this.frame = requestAnimationFrame(tick); };
    this.frame = requestAnimationFrame(tick);
  }
  stop() { if (!this.running) return; this.elapsed = this.time(); this.running = false; cancelAnimationFrame(this.frame); }
  destroy() { this.running = false; cancelAnimationFrame(this.frame); }
  private time() { return this.running ? performance.now() - this.origin : this.elapsed; }
  private paint(milliseconds: number) {
    const { width, height } = this.canvas;
    if (!width || !height) return;
    const light = this.options.tone === "light";
    const deep = this.options.intensity === "deep";
    const context = this.context;
    context.globalCompositeOperation = "source-over";
    context.fillStyle = light ? "#e7e7ea" : deep ? "#050507" : "#0a0a10";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = light ? "source-over" : "lighter";
    const time = milliseconds / 1000;
    for (const [baseX, baseY, size, speed, phase, level] of pools) {
      const x = (baseX + Math.sin(time * speed * Math.PI * 2 + phase) * .1) * width;
      const y = (baseY + Math.cos(time * speed * Math.PI * 2 + phase * .7) * .09) * height;
      const radius = size * Math.max(width, height);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      const accent = this.options.accent;
      const alpha = level * (light ? .16 : deep ? .26 : .4);
      const channels = accent
        ? light ? accent.map(value => Math.round(value * 90)) : accent.map((value, index) => Math.round((index === 2 ? 190 : 180) + value * (index === 2 ? 65 : 75)))
        : light ? [70, 70, 78] : [216, 220, 234];
      gradient.addColorStop(0, `rgba(${channels.join(",")},${alpha})`);
      gradient.addColorStop(1, `rgba(${channels.join(",")},0)`);
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
    }
    context.globalCompositeOperation = "source-over";
  }
}

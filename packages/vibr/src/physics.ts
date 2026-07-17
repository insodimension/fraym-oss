import type { WispFrame, WispPhysicsOptions, WispTarget } from "./types";
const defaults = {
  stiffness: 0.16,
  damping: 0.78,
  dropThreshold: 44,
  gravity: 1.35,
  teleportThreshold: 500,
  maxStretch: 2.1,
  wrapThreshold: 10,
};
export class WispPhysics {
  readonly #options: Required<WispPhysicsOptions>;
  #x = 0;
  #y = 0;
  #vx = 0;
  #vy = 0;
  #tx = 0;
  #ty = 0;
  #seen = false;
  #falling = false;
  #teleported = false;
  #squash = 0;
  #warp = 0;
  constructor(options: WispPhysicsOptions = {}) {
    this.#options = { ...defaults, ...options };
  }
  setTarget(target: WispTarget): void {
    if (!this.#seen) {
      this.#x = target.x;
      this.#y = target.y;
      this.#seen = true;
    } else {
      const dx = target.x - this.#tx;
      const dy = target.y - this.#ty;
      if (
        Math.hypot(dx, dy) > this.#options.teleportThreshold &&
        Math.abs(dy) > this.#options.dropThreshold
      ) {
        this.#x = target.x;
        this.#y = target.y;
        this.#vx = 0;
        this.#vy = 0;
        this.#falling = false;
        this.#teleported = true;
      } else if (dy > this.#options.dropThreshold) this.#falling = true;
      else if (dy > this.#options.wrapThreshold && Math.abs(dx) > 24)
        this.#warp = 1;
    }
    this.#tx = target.x;
    this.#ty = target.y;
  }
  clearTarget(): void {
    this.#seen = false;
  }
  step(dt: number): WispFrame {
    const factor = Math.min(2.5, Math.max(0.25, dt * 60));
    let impact = 0;
    if (this.#seen) {
      if (this.#warp > 0) {
        this.#x = this.#tx;
        this.#y = this.#ty;
        this.#warp = Math.max(0, this.#warp - 0.15 * factor);
      } else if (this.#falling) {
        this.#vy += this.#options.gravity * factor;
        this.#x += this.#vx * factor;
        this.#y += this.#vy * factor;
        if (this.#y >= this.#ty) {
          this.#y = this.#ty;
          impact = Math.min(1, Math.abs(this.#vy) / 12);
          this.#squash = impact;
          this.#falling = false;
        }
      } else {
        this.#vx =
          (this.#vx + (this.#tx - this.#x) * this.#options.stiffness * factor) *
          this.#options.damping ** factor;
        this.#vy =
          (this.#vy + (this.#ty - this.#y) * this.#options.stiffness * factor) *
          this.#options.damping ** factor;
        this.#x += this.#vx * factor;
        this.#y += this.#vy * factor;
      }
    }
    this.#squash *= 0.78 ** factor;
    const speed = Math.hypot(this.#vx, this.#vy);
    const frame = {
      x: this.#x,
      y: this.#y,
      vx: this.#vx,
      vy: this.#vy,
      speed,
      angle: Math.atan2(this.#vy, this.#vx),
      stretch: 1 + Math.min(speed * 0.085, this.#options.maxStretch - 1),
      squash: this.#squash,
      impact,
      falling: this.#falling,
      warp: this.#warp,
      skid: 0,
      settled:
        this.#seen &&
        !this.#falling &&
        speed < 0.18 &&
        Math.hypot(this.#tx - this.#x, this.#ty - this.#y) < 1.6,
      targetX: this.#tx,
      targetY: this.#ty,
      teleported: this.#teleported,
    };
    this.#teleported = false;
    return frame;
  }
}
export { WispPhysics as CursorPhysics };
export type CursorPhysicsOptions = WispPhysicsOptions;

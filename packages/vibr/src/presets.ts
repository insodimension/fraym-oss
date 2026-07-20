import type { WispPresetFactory } from "./types";

function color(mode: string): string {
  return mode === "edit"
    ? "#e07a86"
    : mode === "search"
      ? "#5b8cff"
      : "#b78cff";
}

export const createSmileyCursorPreset: WispPresetFactory = () => ({
  draw(ctx, frame, env) {
    ctx.save();
    ctx.globalAlpha = env.opacity;
    ctx.translate(frame.x, frame.y);
    ctx.fillStyle = color(env.mode);
    ctx.strokeStyle = color(env.mode);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7 * frame.stretch, 7 * (1 - frame.squash * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();
  },
});

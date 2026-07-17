import type { WispPresetFactory, WispPresetInstance } from "./types";
function color(mode: string): string {
  return mode === "edit"
    ? "#e07a86"
    : mode === "search"
      ? "#5b8cff"
      : "#b78cff";
}
function dot(
  shape: "round" | "fish" | "duel" | "blade" | "moth" | "smile",
): WispPresetFactory {
  return () => ({
    draw(ctx, frame, env) {
      ctx.save();
      ctx.globalAlpha = env.opacity;
      ctx.translate(frame.x, frame.y);
      ctx.rotate(shape === "fish" || shape === "blade" ? frame.angle : 0);
      ctx.fillStyle = color(env.mode);
      ctx.strokeStyle = color(env.mode);
      ctx.lineWidth = 2;
      if (shape === "blade") {
        ctx.beginPath();
        ctx.moveTo(-12, 4);
        ctx.lineTo(13, -4);
        ctx.stroke();
      } else if (shape === "duel") {
        ctx.beginPath();
        ctx.arc(-5, -2, 3, 0, Math.PI * 2);
        ctx.arc(5, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, 1);
        ctx.lineTo(-7, 9);
        ctx.moveTo(5, 1);
        ctx.lineTo(7, 9);
        ctx.stroke();
      } else if (shape === "moth") {
        ctx.beginPath();
        ctx.ellipse(-4, 0, 6, 3, -0.5, 0, Math.PI * 2);
        ctx.ellipse(4, 0, 6, 3, 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          shape === "fish" ? 10 : 7 * frame.stretch,
          shape === "fish" ? 4 : 7 * (1 - frame.squash * 0.4),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        if (shape === "smile") {
          ctx.strokeStyle = "#111";
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0.15, Math.PI - 0.15);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  });
}
export const createLiquidCursorPreset = dot("round");
export const createKoiCursorPreset = dot("fish");
export const createDuelCursorPreset = dot("duel");
export const createBladeCursorPreset = dot("blade");
export const createRoninCursorPreset = dot("blade");
export const createLanternMothCursorPreset = dot("moth");
export const createSmileyCursorPreset = dot("smile");
const shapes = [
  ["00100", "01110", "11111", "01110", "00100"],
  ["10101", "01110", "11111", "01110", "10101"],
  ["11111", "00100", "00100", "00100", "11111"],
  ["10001", "01010", "00100", "01010", "10001"],
  ["00100", "00100", "11111", "00100", "00100"],
  ["11111", "10001", "10101", "10001", "11111"],
];
export function createPixelCursorPreset(): WispPresetInstance {
  return {
    draw(ctx, frame, env) {
      const phase = Math.floor(env.t * 12) % (shapes.length * 5);
      const grid = shapes[phase % shapes.length]!;
      const dropout = Math.floor(phase / shapes.length);
      ctx.save();
      ctx.fillStyle = color(env.mode);
      ctx.globalAlpha = env.opacity;
      for (let row = 0; row < 5; row += 1)
        for (let column = 0; column < 5; column += 1)
          if (
            grid[row]?.[column] === "1" &&
            (row * 5 + column + dropout) % 7 !== 0
          ) {
            ctx.beginPath();
            ctx.roundRect(
              frame.targetX + (column - 2) * 5 - 1.75,
              frame.targetY + (row - 2) * 5 - 1.75,
              3.5,
              3.5,
              1,
            );
            ctx.fill();
          }
      ctx.restore();
    },
  };
}

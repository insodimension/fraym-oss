import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WispPhysics } from "./physics";
import { createWispPreset } from "./registry";
import type { AvatarMode, AvatarState, WispPresetId, WispProps } from "./types";
function animate(
  canvas: HTMLCanvasElement,
  preset: WispPresetId,
  target: () => { x: number; y: number } | null,
  props: { energy: number; state: AvatarState; mode: AvatarMode },
  physicsOptions?: WispProps["physics"],
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const physics = new WispPhysics(physicsOptions);
  const renderer = createWispPreset(preset);
  let frameId = 0;
  let last = performance.now();
  let clock = 0;
  let opacity = 0;
  const draw = (now: number) => {
    const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
    last = now;
    clock += dt;
    const point = target();
    if (point) {
      physics.setTarget(point);
      opacity = Math.min(1, opacity + dt * 5);
    } else opacity = Math.max(0, opacity - dt * 5);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    renderer.draw(ctx, physics.step(dt), {
      t: clock,
      dt,
      ...props,
      dpr: ratio,
      width,
      height,
      opacity,
    });
    frameId = requestAnimationFrame(draw);
  };
  frameId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frameId);
}
export function Wisp({
  preset = "liquid",
  targetRef,
  energy = 0,
  state = "idle",
  mode = "",
  zIndex = 60,
  className,
  physics,
}: WispProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(
    () =>
      ref.current
        ? animate(
            ref.current,
            preset,
            () => targetRef.current,
            { energy, state, mode },
            physics,
          )
        : undefined,
    [preset, targetRef, energy, state, mode, physics],
  );
  if (typeof document === "undefined") return null;
  return createPortal(
    <canvas
      aria-hidden="true"
      className={className}
      data-preset={preset}
      data-slot="vibr-wisp"
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex,
      }}
    />,
    document.body,
  );
}
export interface WispPreviewProps {
  readonly preset: WispPresetId;
  readonly state?: AvatarState;
  readonly mode?: AvatarMode;
  readonly energy?: number;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}
export function WispPreview({
  preset,
  state = "typing",
  mode = "think",
  energy = 0.5,
  width = 120,
  height = 60,
  className,
}: WispPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let start = performance.now();
    return ref.current
      ? animate(
          ref.current,
          preset,
          () => {
            const t = (performance.now() - start) / 1000;
            return {
              x: width * (0.15 + 0.7 * ((t / 4) % 1)),
              y: height * (Math.floor(t / 2) % 2 ? 0.7 : 0.35),
            };
          },
          { energy, state, mode },
        )
      : undefined;
  }, [preset, state, mode, energy, width, height]);
  return (
    <canvas
      aria-hidden="true"
      className={className}
      data-slot="vibr-wisp-preview"
      ref={ref}
      style={{ width, height, display: "block" }}
    />
  );
}
export { Wisp as Cursor, WispPreview as CursorPreview };
export type CursorPreviewProps = WispPreviewProps;

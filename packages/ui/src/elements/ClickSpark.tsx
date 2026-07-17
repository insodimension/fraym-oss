import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useRef } from "react";

import { classNames } from "./utils";

export type ClickSparkEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
export interface ClickSparkProps { children: ReactNode; className?: string; sparkColor?: string; sparkSize?: number; sparkRadius?: number; sparkCount?: number; duration?: number; easing?: ClickSparkEasing; extraScale?: number }
interface Spark { x: number; y: number; angle: number; startedAt: number; color: string }

const easings: Record<ClickSparkEasing, (value: number) => number> = {
  linear: (value) => value,
  "ease-in": (value) => value * value,
  "ease-out": (value) => value * (2 - value),
  "ease-in-out": (value) => value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value,
};

function motionReduced(): boolean { return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function concreteColor(value: string, probe: HTMLElement): string { if (!value.includes("var(")) return value; const previous = probe.style.color; probe.style.color = value; const resolved = getComputedStyle(probe).color; probe.style.color = previous; return resolved || value; }

export function ClickSpark({ children, className, sparkColor = "var(--fraym-color-accent)", sparkSize = 10, sparkRadius = 15, sparkCount = 8, duration = 400, easing = "ease-out", extraScale = 1 }: ClickSparkProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const sparks = useRef<Spark[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    const host = root.current;
    const surface = canvas.current;
    if (!host || !surface) return;
    const resize = () => { const bounds = host.getBoundingClientRect(); surface.width = Math.round(bounds.width); surface.height = Math.round(bounds.height); };
    const observer = new ResizeObserver(resize);
    observer.observe(host); resize();
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const draw = (now: number) => {
    frame.current = 0;
    const surface = canvas.current;
    const context = surface?.getContext("2d");
    if (!surface || !context) return;
    context.clearRect(0, 0, surface.width, surface.height);
    sparks.current = sparks.current.filter((spark) => {
      const elapsed = now - spark.startedAt;
      if (elapsed >= duration) return false;
      const progress = easings[easing](elapsed / duration);
      const distance = progress * sparkRadius * extraScale;
      const length = sparkSize * (1 - progress);
      context.beginPath(); context.strokeStyle = spark.color; context.lineWidth = 2;
      context.moveTo(spark.x + Math.cos(spark.angle) * distance, spark.y + Math.sin(spark.angle) * distance);
      context.lineTo(spark.x + Math.cos(spark.angle) * (distance + length), spark.y + Math.sin(spark.angle) * (distance + length));
      context.stroke(); return true;
    });
    if (sparks.current.length) frame.current = requestAnimationFrame(draw);
  };

  const click = (event: ReactMouseEvent<HTMLDivElement>) => {
    const surface = canvas.current;
    if (!surface || motionReduced()) return;
    const bounds = surface.getBoundingClientRect();
    const color = concreteColor(sparkColor, surface);
    const startedAt = performance.now();
    for (let index = 0; index < Math.max(1, sparkCount); index += 1) sparks.current.push({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, angle: Math.PI * 2 * index / Math.max(1, sparkCount), startedAt, color });
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  };

  return <div className={classNames("fraym-click-spark", className)} data-slot="click-spark" ref={root} onClick={click}>{children}<canvas aria-hidden="true" className="fraym-click-spark__canvas" ref={canvas} /></div>;
}

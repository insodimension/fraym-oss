import type { CSSProperties, HTMLAttributes } from "react";

import { classNames } from "./utils";

type SkeletonRadius = "sm" | "md" | "lg" | "full";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  w?: number | string;
  h?: number | string;
  rounded?: SkeletonRadius;
  circle?: boolean;
}

function cssLength(value: number | string | undefined): string | undefined {
  return typeof value === "number" ? `${value}px` : value;
}

export function Skeleton({ w, h, rounded = "md", circle = false, className, style, ...props }: SkeletonProps) {
  const sizeStyle: CSSProperties = { width: cssLength(w), height: cssLength(h), ...style };
  return <div {...props} aria-hidden="true" className={classNames("fraym-skeleton", `fraym-skeleton--${circle ? "full" : rounded}`, className)} data-slot="skeleton" style={sizeStyle} />;
}

export interface SkeletonTextProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  lines?: number;
  lineHeight?: number | string;
  gap?: number | string;
  lastWidth?: number | string;
}

export function SkeletonText({ lines = 3, lineHeight = 10, gap = 8, lastWidth = "60%", className, style, ...props }: SkeletonTextProps) {
  const count = Math.max(1, lines);
  return (
    <div {...props} aria-hidden="true" className={classNames("fraym-skeleton-text", className)} data-slot="skeleton-text" style={{ gap: cssLength(gap), ...style }}>
      {Array.from({ length: count }, (_, index) => <Skeleton h={lineHeight} key={index} rounded="sm" w={index === count - 1 && count > 1 ? lastWidth : "100%"} />)}
    </div>
  );
}

export interface SkeletonGroupProps extends HTMLAttributes<HTMLDivElement> { label?: string }

export function SkeletonGroup({ label = "Loading…", className, children, ...props }: SkeletonGroupProps) {
  return <div {...props} aria-busy="true" className={className} data-slot="skeleton-group" role="status"><span className="fraym-sr-only">{label}</span>{children}</div>;
}

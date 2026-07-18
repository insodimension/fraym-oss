const dockMinWidth = 320;
const dockMaxWidth = 720;

export const demoDockBounds = {
  min: dockMinWidth,
  max: dockMaxWidth,
} as const;

export function clampDockWidth(width: number): number {
  const viewportMaximum = typeof window === "undefined"
    ? dockMaxWidth
    : Math.max(dockMinWidth, window.innerWidth - dockMinWidth);
  return Math.min(
    Math.min(dockMaxWidth, viewportMaximum),
    Math.max(dockMinWidth, width),
  );
}
